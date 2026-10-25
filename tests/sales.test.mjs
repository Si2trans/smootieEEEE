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

test("GP uses the selected promotion basis and defaults to the legacy formula", () => {
  const before = sales.calculateSaleRevenue(100, 10, "Grab", "before_promotion");
  const after = sales.calculateSaleRevenue(100, 10, "Grab", "after_promotion");
  assert.equal(before.gpBase, 100);
  assert.equal(before.gpAmount, 32.1);
  assert.equal(before.netRevenue, 57.9);
  assert.equal(after.gpBase, 90);
  assert.equal(after.gpAmount, 28.89);
  assert.equal(after.netRevenue, 61.11);
  assert.deepEqual(sales.calculateSaleRevenue(100, 10, "Grab"), after);
  assert.equal(sales.normalizeGpCalculationBasis("invalid"), "after_promotion");
});

test("client and Apps Script agree for channels, rounding, invalid amounts and large discounts", () => {
  const backend = loadBackend();
  for (const channel of ["Grab", "LINE MAN", "ShopeeFood", "หน้าร้าน", "อื่นๆ"]) {
    for (const basis of ["before_promotion", "after_promotion", undefined, "invalid"]) {
      for (const [gross, discount] of [[100, 10], [100, 0], [100, 100], [100, 150], [100, -10], [0, 0], [-1, 10], [NaN, NaN], [123.45, 12.34]]) {
        const client = sales.calculateSaleRevenue(gross, discount, channel, basis);
        const saved = backend.saveSale({ sale: {
          id: "test", sale_date: "2026-10-25", channel, gross_revenue: gross,
          promotion_amount: discount, gp_calculation_basis: basis, total_cost: 20
        }, items: [] }).sale;
        const label = JSON.stringify({ channel, basis, gross, discount });
        assert.equal(saved.gp_calculation_basis, client.gpCalculationBasis, label);
        assert.equal(saved.gp_amount, client.gpAmount, label);
        assert.equal(saved.total_revenue, client.netRevenue, label);
        assert.equal(saved.total_profit, client.netRevenue - 20, label);
        assert.equal(saved.promotion_amount, client.promotionAmount, label);
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
        ...saved, id: "legacy", gp_calculation_basis: undefined, gp_amount: 28.89, total_revenue: 61.11
      }] }) };
    }
  });
  await api.saveSale({ id: "test", saleDate: "2026-10-25", channel: "Grab",
    grossRevenue: 100, promotionAmount: 10, gpCalculationBasis: "before_promotion", totalCost: 20, items: [] });
  assert.equal(saved.gp_calculation_basis, "before_promotion");
  assert.equal(saved.gp_amount, 32.1);
  assert.equal(saved.total_revenue, 57.9);
  assert.equal(saved.total_profit, 37.9);
  const data = await api.fetchAppData({ cache: false });
  assert.equal(data.sales[0].gpCalculationBasis, "before_promotion");
  assert.equal(data.sales[0].totalRevenue, 57.9);
  assert.equal(data.sales[1].gpCalculationBasis, "after_promotion");
  assert.equal(data.sales[1].totalRevenue, 61.11);
  api.cacheAppData(data);
  assert.equal(api.getCachedAppData().sales[0].gpCalculationBasis, "before_promotion");
});

test("offline queue replay keeps the basis and recalculates revenue and profit consistently", async () => {
  const queued = ["before_promotion", "after_promotion", undefined].map((basis, index) => ({
    id: `mutation-${index}`, createdAt: index, action: "saveSale", entityId: `sale-${index}`,
    payload: { id: `sale-${index}`, saleDate: "2026-10-25", channel: "Grab", grossRevenue: 100,
      promotionAmount: 10, gpCalculationBasis: basis, totalRevenue: 0, totalCost: 20, items: [] }
  }));
  const queue = await loadClient("src/lib/syncQueue.ts", {
    indexedDB: { open() {
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
    } }
  });
  const data = await queue.applyQueuedMutations({ categories: [], ingredients: [], recipes: [], sales: [], dailyClosings: [] });
  for (const sale of data.sales) {
    const expected = sale.id === "sale-0" ? 57.9 : 61.11;
    assert.equal(sale.totalRevenue, expected);
    assert.equal(sale.totalProfit, expected - 20);
    assert.equal(sale.gpCalculationBasis, sale.id === "sale-0" ? "before_promotion" : "after_promotion");
  }
});
