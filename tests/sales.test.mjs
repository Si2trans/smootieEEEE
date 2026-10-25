import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

async function loadClient(entry, globals = {}) {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: "browser", format: "cjs",
    define: { "import.meta.env.VITE_APPS_SCRIPT_URL": '"https://example.test/exec"' }
  });
  const context = vm.createContext({ module: { exports: {} }, exports: {}, URL, console, ...globals });
  vm.runInContext(result.outputFiles[0].text, context);
  return context.module?.exports || context.exports;
}

function loadBackend() {
  const context = vm.createContext({});
  vm.runInContext(readFileSync("apps-script/Code.gs", "utf8"), context);
  // Isolate spreadsheet writes; exercise the actual backend calculation and saved sale.
  Object.assign(context, {
    dedupeObjectsById() {}, deleteSaleItems() {}, readObjects: () => [],
    saveObject: (_sheet, item) => ({ item: { ...item } })
  });
  return context;
}

const sales = await loadClient("src/lib/sales.ts");

function queuedDatabase(queued) {
  return { open() {
    const request = {};
    queueMicrotask(() => {
      request.result = { transaction: () => ({ objectStore: () => ({ getAll() {
        const read = {};
        queueMicrotask(() => { read.result = queued; read.onsuccess(); });
        return read;
      } }) }) };
      request.onsuccess();
    });
    return request;
  } };
}

test("platform GP rates validate settings, preserve zero, and match the LINE MAN statement", () => {
  const rates = sales.normalizePlatformGpRates({ "LINE MAN": 30, Grab: 25.5, ShopeeFood: 0 });
  assert.equal(sales.gpRateForChannel("LINE MAN", rates), 30);
  assert.equal(sales.gpRateForChannel("Grab", rates), 25.5);
  assert.equal(sales.gpRateForChannel("ShopeeFood", rates), 0);
  assert.equal(sales.gpRateForChannel("หน้าร้าน", rates), 0);
  for (const invalid of [undefined, null, "", -1, 101, NaN]) {
    assert.equal(sales.normalizeGpRate(invalid), 32.1);
  }
  assert.equal(sales.normalizePlatformGpRates("bad json").Grab, 32.1);
  const result = sales.calculateSaleRevenue(125, 6.4, "LINE MAN", "before_promotion", 7, rates["LINE MAN"]);
  assert.equal(result.gpAmount, 37.5);
  assert.equal(result.gpVatAmount, 2.63);
  assert.equal(result.netRevenue, 78.47);
  assert.equal(sales.calculateSaleRevenue(125, 6.4, "ShopeeFood", "before_promotion", 7, 0).netRevenue, 118.6);
  assert.equal(sales.calculateSaleRevenue(125, 0, "หน้าร้าน", undefined, 7, 30).gpAmount, 0);
});

test("settings persist through API, backend, bootstrap and cache; sales keep their own rate", async () => {
  const backend = loadBackend();
  const storedSettings = [];
  const storedSales = [];
  backend.readObjects = (sheet) => sheet === "Settings" ? storedSettings : [];
  backend.saveObject = (sheet, item) => {
    const rows = sheet === "Settings" ? storedSettings : storedSales;
    const index = rows.findIndex((row) => row.id === item.id);
    if (index >= 0) rows[index] = { ...item }; else rows.push({ ...item });
    return { item };
  };
  const storage = new Map([["drink-cost-studio:access-key:v1", "test-only"]]);
  const api = await loadClient("src/lib/appsScriptApi.ts", {
    window: { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } },
    fetch: async (url, options) => {
      const action = new URL(url).searchParams.get("action");
      const payload = JSON.parse(options.body);
      const result = action === "savePlatformGpRates" ? backend.savePlatformGpRates(payload)
        : action === "saveSale" ? backend.saveSale(payload)
          : { ok: true, settings: storedSettings, sales: storedSales };
      return { ok: true, json: async () => result };
    }
  });
  const rates = { "LINE MAN": 30, Grab: 25.5, ShopeeFood: 0 };
  await api.savePlatformGpRates(rates);
  const bootstrap = await api.fetchAppData();
  assert.equal(bootstrap.platformGpRates["LINE MAN"], 30);
  assert.equal(bootstrap.platformGpRates.Grab, 25.5);
  assert.equal(bootstrap.platformGpRates.ShopeeFood, 0);
  // Unrelated recipe/sale cache writes must not erase the saved GP settings.
  const { platformGpRates, ...withoutSettings } = bootstrap;
  api.cacheAppData(withoutSettings);
  assert.equal(api.getCachedAppData().platformGpRates["LINE MAN"], 30);
  const sale = { id: "statement", saleDate: "2026-10-25", channel: "LINE MAN", grossRevenue: 125,
    promotionAmount: 6.4, gpCalculationBasis: "before_promotion", gpVatRate: 7, gpRate: 30, totalCost: 20, items: [] };
  await api.saveSale(sale);
  assert.equal(storedSales[0].gp_rate, 30);
  assert.equal(storedSales[0].total_revenue, 78.47);
  await api.savePlatformGpRates({ ...rates, "LINE MAN": 35 });
  await api.saveSale(sale);
  assert.equal(storedSales[0].gp_rate, 30);
  assert.equal(storedSales[0].total_revenue, 78.47);
  await api.saveSale({ ...sale, channel: "ShopeeFood", gpRate: 0 });
  assert.equal(storedSales[0].gp_rate, 0);
  assert.equal(storedSales[0].gp_vat_amount, 0);
  assert.equal(storedSales[0].total_revenue, 118.6);
  const fallback = backend.saveSale({ sale: { id: "fallback", channel: "LINE MAN", gross_revenue: 100, gp_vat_rate: 7 }, items: [] });
  assert.equal(fallback.sale.gp_rate, 35);
  assert.throws(() => backend.saveSale({ sale: { ...sale, gp_rate: -1 }, items: [] }), /GP/);
  assert.throws(() => backend.savePlatformGpRates({ rates: { ...rates, Grab: 101 } }), /GP/);
});

test("offline setting changes do not replace GP snapshots on pending or historical sales", async () => {
  const rates = { "LINE MAN": 35, Grab: 25, ShopeeFood: 0 };
  const snapshot = { id: "pending", channel: "LINE MAN", grossRevenue: 125, promotionAmount: 6.4,
    gpCalculationBasis: "before_promotion", gpVatRate: 7, gpRate: 30, totalCost: 20, items: [] };
  const queued = [
    { action: "saveSale", createdAt: 0, payload: snapshot },
    { action: "savePlatformGpRates", createdAt: 1, payload: rates }
  ];
  const queue = await loadClient("src/lib/syncQueue.ts", { indexedDB: queuedDatabase(queued) });
  const data = await queue.applyQueuedMutations({ categories: [], ingredients: [], recipes: [],
    sales: [{ ...snapshot, id: "old", gpRate: 32.1, totalRevenue: 76 }], dailyClosings: [] });
  assert.equal(data.platformGpRates["LINE MAN"], 35);
  assert.equal(data.platformGpRates.ShopeeFood, 0);
  assert.equal(data.sales.find((sale) => sale.id === "pending").gpRate, 30);
  assert.equal(data.sales.find((sale) => sale.id === "pending").totalRevenue, 78.47);
  assert.equal(data.sales.find((sale) => sale.id === "old").gpRate, 32.1);
  assert.equal(data.sales.find((sale) => sale.id === "old").totalRevenue, 76);
});

test("GP and its VAT use the selected promotion basis", () => {
  const before = sales.calculateSaleRevenue(100, 10, "Grab", "before_promotion");
  const after = sales.calculateSaleRevenue(100, 10, "Grab", "after_promotion");
  assert.equal(before.gpBase, 100);
  assert.equal(before.gpAmount, 32.1);
  assert.equal(before.gpVatAmount, 2.25);
  assert.equal(before.totalPlatformFee, 34.35);
  assert.equal(before.netRevenue, 55.65);
  assert.equal(after.gpBase, 90);
  assert.equal(after.gpAmount, 28.89);
  assert.equal(after.gpVatAmount, 2.02);
  assert.equal(after.totalPlatformFee, 30.91);
  assert.equal(after.netRevenue, 59.09);
  assert.deepEqual(sales.calculateSaleRevenue(100, 10, "Grab"), after);
  assert.equal(sales.normalizeGpCalculationBasis("invalid"), "after_promotion");
});

test("VAT is calculated on rounded GP, with the agreed price examples", () => {
  const examples = [
    [35, 11.24, 0.79, 22.97], [50, 16.05, 1.12, 32.83], [80, 25.68, 1.80, 52.52],
    [100, 32.1, 2.25, 65.65], [120, 38.52, 2.7, 78.78], [150, 48.15, 3.37, 98.48],
    [200, 64.2, 4.49, 131.31], [250, 80.25, 5.62, 164.13], [500, 160.5, 11.24, 328.26]
  ];
  for (const [price, gp, vat, net] of examples) {
    const result = sales.calculateSaleRevenue(price, 0, "Grab");
    assert.equal(result.gpAmount, gp, `GP for ${price}`);
    assert.equal(result.gpVatAmount, vat, `VAT for ${price}`);
    assert.equal(result.netRevenue, net, `net for ${price}`);
    assert.equal(result.totalPlatformFee, sales.roundCurrency(gp + vat));
  }
  const counterSale = sales.calculateSaleRevenue(150, 10, "หน้าร้าน");
  assert.equal(counterSale.gpAmount, 0);
  assert.equal(counterSale.gpVatAmount, 0);
  assert.equal(counterSale.netRevenue, 140);
});

test("delivery pricing offsets GP plus VAT and supports custom GP rates", async () => {
  const cost = await loadClient("src/lib/cost.ts");
  assert.equal(cost.calculateGpOffsetPrice(100, 32.1), 155);
  assert.equal(cost.calculateGpOffsetPrice(150, 32.1), 230);
  assert.equal(cost.calculateGpOffsetPrice(100, 30), 150);
  assert.equal(cost.calculateGpOffsetPrice(100, 0), 100);
  assert.equal(cost.calculateGpOffsetPrice(100, 100), 0);
  assert.equal(cost.calculateGpOffsetPrice(100, 94), 0);
  const fees = sales.calculateGpCharges(150, 32.1);
  assert.equal(fees.gpAmount, 48.15);
  assert.equal(fees.gpVatAmount, 3.37);
  assert.equal(fees.totalPlatformFee, 51.52);
  for (const originalPrice of [35, 50, 80, 100, 150, 250, 500]) {
    const price = cost.calculateGpOffsetPrice(originalPrice, 32.1);
    const fee = sales.calculateGpCharges(price, 32.1);
    assert.ok(sales.roundCurrency(price - fee.totalPlatformFee) >= originalPrice);
  }
});

test("client and Apps Script agree for channels, rounding, invalid amounts and large discounts", () => {
  const backend = loadBackend();
  for (const channel of ["Grab", "LINE MAN", "ShopeeFood", "หน้าร้าน", "อื่นๆ"]) {
    for (const basis of ["before_promotion", "after_promotion", undefined, "invalid"]) {
      for (const vatRate of [7, 0, undefined, -1, 101, NaN]) {
        for (const [gross, discount] of [[100, 10], [100, 0], [100, 100], [100, 150], [100, -10], [0, 0], [-1, 10], [NaN, NaN], [123.45, 12.34]]) {
          const client = sales.calculateSaleRevenue(gross, discount, channel, basis, sales.normalizeGpVatRate(vatRate));
          const saved = backend.saveSale({ sale: {
            id: "test", sale_date: "2026-10-25", channel, gross_revenue: gross,
            promotion_amount: discount, gp_calculation_basis: basis, gp_vat_rate: vatRate, total_cost: 20
          }, items: [] }).sale;
          const label = JSON.stringify({ channel, basis, vatRate, gross, discount });
          assert.equal(saved.gp_calculation_basis, client.gpCalculationBasis, label);
          assert.equal(saved.gp_amount, client.gpAmount, label);
          assert.equal(saved.gp_vat_rate, client.gpVatRate, label);
          assert.equal(saved.gp_vat_amount, client.gpVatAmount, label);
          assert.equal(saved.total_revenue, client.netRevenue, label);
          assert.equal(saved.total_profit, client.netRevenue - 20, label);
          assert.equal(saved.promotion_amount, client.promotionAmount, label);
        }
      }
    }
  }
});

test("API persists the selected basis and reads it back without changing historical totals", async () => {
  const storage = new Map([["drink-cost-studio:access-key:v1", "test-only"]]);
  let saved;
  const api = await loadClient("src/lib/appsScriptApi.ts", {
    window: { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } },
    fetch: async (url, options) => {
      if (new URL(url).searchParams.get("action") === "saveSale") {
        saved = JSON.parse(options.body).sale;
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => ({ ok: true, sales: [saved, {
        ...saved, id: "legacy", gp_calculation_basis: undefined, gp_vat_rate: undefined,
        gp_vat_amount: undefined, gp_amount: 28.89, total_revenue: 61.11
      }] }) };
    }
  });
  await api.saveSale({ id: "test", saleDate: "2026-10-25", channel: "Grab",
    grossRevenue: 100, promotionAmount: 10, gpCalculationBasis: "before_promotion", gpVatRate: 7, totalCost: 20, items: [] });
  assert.equal(saved.gp_calculation_basis, "before_promotion");
  assert.equal(saved.gp_amount, 32.1);
  assert.equal(saved.gp_vat_rate, 7);
  assert.equal(saved.gp_vat_amount, 2.25);
  assert.equal(saved.total_revenue, 55.65);
  assert.equal(saved.total_profit, 35.65);
  const data = await api.fetchAppData({ cache: false });
  assert.equal(data.sales[0].gpCalculationBasis, "before_promotion");
  assert.equal(data.sales[0].gpVatRate, 7);
  assert.equal(data.sales[0].gpVatAmount, 2.25);
  assert.equal(data.sales[0].totalRevenue, 55.65);
  assert.equal(data.sales[1].gpCalculationBasis, "after_promotion");
  assert.equal(data.sales[1].totalRevenue, 61.11);
  assert.equal(data.sales[1].gpVatRate, 0);
  assert.equal(data.sales[1].gpVatAmount, 0);
  api.cacheAppData(data);
  assert.equal(api.getCachedAppData().sales[0].gpCalculationBasis, "before_promotion");
  assert.equal(api.getCachedAppData().sales[0].gpVatAmount, 2.25);
  // Editing an old sale keeps the old formula rather than adding VAT retroactively.
  await api.saveSale(data.sales[1]);
  assert.equal(saved.gp_vat_rate, 0);
  assert.equal(saved.gp_vat_amount, 0);
  assert.equal(saved.total_revenue, 61.11);
});

test("offline queue replay keeps the basis and recalculates revenue and profit consistently", async () => {
  const queued = ["before_promotion", "after_promotion", undefined].map((basis, index) => ({
    id: `mutation-${index}`, createdAt: index, action: "saveSale", entityId: `sale-${index}`,
    payload: { id: `sale-${index}`, saleDate: "2026-10-25", channel: "Grab", grossRevenue: 100,
      promotionAmount: 10, gpCalculationBasis: basis, gpVatRate: index < 2 ? 7 : undefined,
      totalRevenue: 0, totalCost: 20, items: [] }
  }));
  const queue = await loadClient("src/lib/syncQueue.ts", {
    indexedDB: queuedDatabase(queued)
  });
  const data = await queue.applyQueuedMutations({ categories: [], ingredients: [], recipes: [], sales: [], dailyClosings: [] });
  for (const sale of data.sales) {
    const expected = sale.id === "sale-0" ? 55.65 : sale.id === "sale-1" ? 59.09 : 61.11;
    assert.equal(sale.totalRevenue, expected);
    assert.equal(sale.totalProfit, expected - 20);
    assert.equal(sale.gpCalculationBasis, sale.id === "sale-0" ? "before_promotion" : "after_promotion");
    assert.equal(sale.gpVatRate, sale.id === "sale-2" ? 0 : 7);
  }
});
