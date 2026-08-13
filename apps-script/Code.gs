const SHEETS = {
  settings: "Settings",
  categories: "Categories",
  ingredients: "Ingredients",
  recipes: "Recipes",
  recipeItems: "RecipeItems",
  favorites: "Favorites",
  sales: "Sales",
  saleItems: "SaleItems",
  dailyClosings: "DailyClosings",
  monthlyArchives: "MonthlyArchives"
};

const DEFAULT_CATEGORIES = [
  ["tea", "ชา", "CupSoda", "#f2b634", 1, "แก้ว", true],
  ["milk", "นม", "Milk", "#77bfd3", 2, "แก้ว", true],
  ["coffee", "กาแฟ", "Coffee", "#8a4f1e", 3, "แก้ว", true],
  ["smoothie", "สมูทตี้", "Cherry", "#f04646", 4, "แก้ว", true],
  ["soda", "โซดา", "GlassWater", "#6ea4e8", 5, "แก้ว", true],
  ["toast", "ปังปิ้ง", "Package", "#d48632", 6, "แผ่น", true],
  ["pangyen", "ปังเย็น", "GlassWater", "#8fb7f1", 7, "แก้ว", true]
];
const MAX_SAFE_IMAGE_URL_LENGTH = 2000;

function setupSpreadsheet() {
  const setup = [
    {
      name: SHEETS.settings,
      headers: ["id", "key", "value", "updated_at"],
      rows: [
        ["set_shop_name", "shop_name", "ร้านเครื่องดื่มของฉัน", new Date().toISOString()],
        ["set_currency", "currency", "THB", new Date().toISOString()],
        ["set_default_margin", "default_margin", 60, new Date().toISOString()]
      ]
    },
    {
      name: SHEETS.categories,
      headers: ["id", "label", "icon", "color", "sort_order", "count_unit", "active"],
      rows: DEFAULT_CATEGORIES
    },
    {
      name: SHEETS.ingredients,
      headers: ["id", "name", "category", "buy_qty", "buy_unit", "buy_price", "base_unit", "cost_per_unit", "addon_price", "addon_amount", "addon_unit", "note", "updated_at"],
      rows: [
        ["ing_tea", "ผงชาไทย", "วัตถุดิบน้ำ", 500, "g", 120, "g", 0.24, 0, 0, "g", "", new Date().toISOString()],
        ["ing_milk", "นมสด", "วัตถุดิบน้ำ", 2000, "ml", 95, "ml", 0.0475, 0, 0, "ml", "", new Date().toISOString()],
        ["ing_condensed", "นมข้นหวาน", "วัตถุดิบน้ำ", 388, "g", 28, "g", 0.072, 0, 0, "g", "", new Date().toISOString()],
        ["ing_creamer", "ครีมเทียมข้นจืด", "วัตถุดิบน้ำ", 1000, "ml", 52, "ml", 0.052, 0, 0, "ml", "", new Date().toISOString()],
        ["ing_syrup", "น้ำเชื่อม", "วัตถุดิบน้ำ", 750, "ml", 42, "ml", 0.056, 0, 0, "ml", "", new Date().toISOString()],
        ["ing_boba", "ไข่มุก", "ท็อปปิ้ง", 1000, "g", 80, "g", 0.08, 10, 40, "g", "", new Date().toISOString()],
        ["ing_cocoa", "ผงโกโก้", "วัตถุดิบน้ำ", 500, "g", 135, "g", 0.27, 0, 0, "g", "", new Date().toISOString()],
        ["ing_matcha", "มัทฉะ", "วัตถุดิบน้ำ", 100, "g", 230, "g", 2.3, 0, 0, "g", "", new Date().toISOString()],
        ["ing_cup16", "แก้ว 16 oz + ฝา", "บรรจุภัณฑ์", 100, "piece", 250, "piece", 2.5, 0, 0, "piece", "", new Date().toISOString()]
      ]
    },
    {
      name: SHEETS.recipes,
      headers: [
        "id",
        "name",
        "category_id",
        "image_url",
        "image_file_id",
        "status",
        "prep_time",
        "sweetness",
        "size_oz",
        "selling_price",
        "delivery_price",
        "favorite",
        "rating",
        "steps",
        "active",
        "created_at",
        "updated_at"
      ],
      rows: [
        [
          "rec_thai_boba",
          "ชาไทยไข่มุก",
          "tea",
          "",
          "",
          "ขายดี",
          5,
          75,
          16,
          35,
          52,
          true,
          4.8,
          "ชงชาไทยกับน้ำร้อน คนให้ละลาย|เติมนมข้นหวาน นมสด ครีมเทียม และน้ำเชื่อม|เติมน้ำแข็ง เขย่าหรือคนให้เย็น|เทใส่แก้ว ตามด้วยไข่มุก พร้อมเสิร์ฟ",
          true,
          new Date().toISOString(),
          new Date().toISOString()
        ],
        [
          "rec_matcha",
          "ชาเขียวมัทฉะนมสด",
          "tea",
          "",
          "",
          "",
          5,
          50,
          16,
          45,
          67,
          true,
          4.6,
          "ละลายมัทฉะกับน้ำอุ่น|เติมนมสดและน้ำเชื่อม|เทลงแก้วน้ำแข็ง",
          true,
          new Date().toISOString(),
          new Date().toISOString()
        ],
        [
          "rec_cocoa",
          "โกโก้เย็น",
          "milk",
          "",
          "",
          "",
          5,
          65,
          16,
          35,
          52,
          false,
          4.7,
          "ละลายโกโก้กับน้ำร้อน|ผสมนมและนมข้นหวาน|เติมน้ำแข็งแล้วเสิร์ฟ",
          true,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      ]
    },
    {
      name: SHEETS.recipeItems,
      headers: ["id", "recipe_id", "ingredient_id", "amount", "unit", "note", "sort_order"],
      rows: [
        ["ritem_001", "rec_thai_boba", "ing_tea", 12, "g", "2 ช้อนโต๊ะ", 1],
        ["ritem_002", "rec_thai_boba", "ing_milk", 120, "ml", "", 2],
        ["ritem_003", "rec_thai_boba", "ing_condensed", 25, "g", "", 3],
        ["ritem_004", "rec_thai_boba", "ing_creamer", 20, "ml", "", 4],
        ["ritem_005", "rec_thai_boba", "ing_syrup", 15, "ml", "", 5],
        ["ritem_006", "rec_thai_boba", "ing_boba", 40, "g", "", 6],
        ["ritem_007", "rec_thai_boba", "ing_cup16", 1, "piece", "", 7],
        ["ritem_008", "rec_matcha", "ing_matcha", 5, "g", "", 1],
        ["ritem_009", "rec_matcha", "ing_milk", 150, "ml", "", 2],
        ["ritem_010", "rec_matcha", "ing_syrup", 15, "ml", "", 3],
        ["ritem_011", "rec_matcha", "ing_cup16", 1, "piece", "", 4],
        ["ritem_012", "rec_cocoa", "ing_cocoa", 18, "g", "", 1],
        ["ritem_013", "rec_cocoa", "ing_milk", 140, "ml", "", 2],
        ["ritem_014", "rec_cocoa", "ing_condensed", 20, "g", "", 3],
        ["ritem_015", "rec_cocoa", "ing_cup16", 1, "piece", "", 4]
      ]
    },
    {
      name: SHEETS.favorites,
      headers: ["id", "recipe_id", "sort_order"],
      rows: [
        ["fav_001", "rec_thai_boba", 1],
        ["fav_002", "rec_matcha", 2]
      ]
    },
    {
      name: SHEETS.sales,
      headers: ["id", "sale_date", "channel", "payment_method", "gross_revenue", "promotion_name", "promotion_amount", "gp_rate", "gp_amount", "total_revenue", "total_cost", "total_profit", "note", "created_at", "updated_at"],
      rows: []
    },
    {
      name: SHEETS.saleItems,
      headers: ["id", "sale_id", "parent_id", "item_id", "kind", "name", "qty", "unit_price", "unit_cost", "line_revenue", "line_cost", "line_profit", "category_id", "count_unit", "note", "sort_order"],
      rows: []
    },
    {
      name: SHEETS.dailyClosings,
      headers: ["id", "business_date", "order_count", "item_count", "total_revenue", "total_cost", "total_profit", "note", "closed_at", "updated_at"],
      rows: []
    },
    {
      name: SHEETS.monthlyArchives,
      headers: ["id", "month_key", "order_count", "item_count", "total_revenue", "total_cost", "total_profit", "daily_json", "source_count", "source_hash", "status", "archived_at", "updated_at"],
      rows: []
    }
  ];

  setup.forEach((config) => {
    const sheet = getOrCreateSheet(config.name);
    ensureSheetHeaders(sheet, config.headers);
    if (config.name === SHEETS.categories) ensureDefaultCategories(sheet);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  });

  backfillCategoryCountUnits();
  backfillSaleItemCountUnits();
  SpreadsheetApp.getActive().toast("ตรวจสอบโครงสร้างชีตแล้ว ข้อมูลเดิมไม่ถูกลบ", "Setup complete", 5);
}

function ensureSheetHeaders(sheet, requiredHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return;
  }
  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(cleanId);
  requiredHeaders.forEach((header) => {
    if (currentHeaders.indexOf(header) >= 0) return;
    currentHeaders.push(header);
    sheet.getRange(1, currentHeaders.length).setValue(header);
  });
}

function ensureDefaultCategories(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 1) return;
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  if (idIndex < 0) return;
  const existing = {};
  for (let row = 1; row < values.length; row++) {
    const id = cleanId(values[row][idIndex]);
    if (id) existing[id] = true;
  }
  if (Object.keys(existing).length > 0) return;
  DEFAULT_CATEGORIES.forEach((category) => {
    const id = cleanId(category[0]);
    if (existing[id]) return;
    appendObject(sheet, headers, {
      id: category[0],
      label: category[1],
      icon: category[2],
      color: category[3],
      sort_order: category[4],
      count_unit: category[5],
      active: category[6]
    });
  });
}

function doGet(e) {
  return jsonResponse({ ok: false, code: "POST_REQUIRED", error: "Use an authenticated POST request." }, 405);
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || "";
  const payload = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  let lock = null;
  try {
    if (action === "authenticate") return jsonResponse(authenticateRequest(payload));
    if (!isAuthorized(payload.access_key)) return unauthorizedResponse();
    if (action === "getBootstrapData") return jsonResponse(getBootstrapData());
    if (action === "getRecipe") return jsonResponse(getRecipe(payload.id));
    if (action === "getIngredients") return jsonResponse({ ok: true, ingredients: readObjects(SHEETS.ingredients) });

    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    if (action === "saveCategory") return jsonResponse(saveCategory(payload));
    if (action === "saveCategoryOrder") return jsonResponse(saveCategoryOrder(payload));
    if (action === "deleteCategory") return jsonResponse(deleteCategory(payload));
    if (action === "saveIngredient") return jsonResponse(saveObject(SHEETS.ingredients, payload));
    if (action === "saveRecipe") return jsonResponse(saveRecipe(payload));
    if (action === "deleteIngredient") return jsonResponse(deleteIngredient(payload.id));
    if (action === "deleteRecipe") return jsonResponse(deleteRecipe(payload.id));
    if (action === "toggleFavorite") return jsonResponse(toggleFavorite(payload.recipe_id, payload.favorite));
    if (action === "calculateCost") return jsonResponse(calculateCost(payload.recipe_id));
    if (action === "uploadRecipeImage") return jsonResponse(uploadRecipeImage(payload));
    if (action === "saveSale") return jsonResponse(saveSale(payload));
    if (action === "deleteSale") return jsonResponse(deleteSale(payload.id));
    if (action === "saveDailyClosing") return jsonResponse(saveDailyClosing(payload));
    if (action === "archiveSalesMonth") return jsonResponse(archiveSalesMonth(payload.month_key));
    return jsonResponse({ ok: false, error: "Unknown action: " + action }, 404);
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  } finally {
    if (lock) lock.releaseLock();
  }
}

function configureAppSecret() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt("ตั้งรหัสลับ Drink Cost Studio", "กรอกรหัสอย่างน้อย 8 ตัว และเก็บไว้เฉพาะคุณ", ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const secret = cleanId(response.getResponseText());
  if (secret.length < 8) {
    ui.alert("รหัสลับต้องมีอย่างน้อย 8 ตัว");
    return;
  }
  PropertiesService.getScriptProperties().setProperty("APP_SECRET_HASH", hashSecret(secret));
  SpreadsheetApp.getActive().toast("ตั้งรหัสลับเรียบร้อยแล้ว", "Drink Cost Studio", 5);
}

function authenticateRequest(payload) {
  if (!isAuthorized(payload.access_key)) return { ok: false, code: "UNAUTHORIZED", error: "รหัสลับไม่ถูกต้อง" };
  return { ok: true, authorized: true };
}

function unauthorizedResponse() {
  return jsonResponse({ ok: false, code: "UNAUTHORIZED", error: "รหัสลับไม่ถูกต้อง" }, 401);
}

function isAuthorized(secret) {
  const expectedHash = PropertiesService.getScriptProperties().getProperty("APP_SECRET_HASH") || "";
  if (!expectedHash || !secret) return false;
  return secureEqual(expectedHash, hashSecret(String(secret)));
}

function hashSecret(secret) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, secret, Utilities.Charset.UTF_8);
  return bytes.map((value) => ((value + 256) % 256).toString(16).padStart(2, "0")).join("");
}

function secureEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function getBootstrapData() {
  const allSales = readObjects(SHEETS.sales);
  const startDate = bootstrapSalesStartDate();
  const sales = allSales.filter((sale) => cleanId(sale.sale_date) >= startDate);
  const activeSaleIds = {};
  sales.forEach((sale) => (activeSaleIds[cleanId(sale.id)] = true));
  const archiveMonths = {};
  const currentMonth = currentMonthKey();
  allSales.forEach((sale) => {
    const month = cleanId(sale.sale_date).slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(month) && month < currentMonth) archiveMonths[month] = true;
  });
  return {
    ok: true,
    settings: readObjects(SHEETS.settings),
    categories: getCategories(),
    ingredients: readObjects(SHEETS.ingredients),
    recipes: readObjects(SHEETS.recipes),
    recipeItems: readObjects(SHEETS.recipeItems),
    favorites: readObjects(SHEETS.favorites),
    sales: sales,
    saleItems: readObjects(SHEETS.saleItems).filter((item) => activeSaleIds[cleanId(item.sale_id)]),
    dailyClosings: readObjects(SHEETS.dailyClosings).filter((closing) => cleanId(closing.business_date) >= startDate),
    monthlyArchives: readObjects(SHEETS.monthlyArchives).filter((archive) => cleanId(archive.status) === "complete"),
    archiveMonths: Object.keys(archiveMonths).sort().reverse()
  };
}

function getCategories() {
  return readObjects(SHEETS.categories).sort((left, right) => Number(left.sort_order || 999) - Number(right.sort_order || 999));
}

function saveCategory(payload) {
  const category = payload.category || payload;
  category.id = normalizeCategoryId(category.id);
  category.label = cleanId(category.label).slice(0, 50);
  if (!category.label) throw new Error("Category name is required.");
  if (category.id === "all") throw new Error("The all category is reserved.");
  category.icon = normalizeCategoryIcon(category.icon);
  category.color = normalizeCategoryColor(category.color);
  category.sort_order = Math.max(1, Math.min(999, Number(category.sort_order || 999)));
  category.count_unit = normalizeCountUnit(category.count_unit);
  category.active = true;
  const duplicate = readObjects(SHEETS.categories).find((row) =>
    cleanId(row.id) !== category.id &&
    cleanId(row.label).toLowerCase() === category.label.toLowerCase() &&
    String(row.active).toLowerCase() !== "false"
  );
  if (duplicate) throw new Error("Category name already exists.");
  return saveObject(SHEETS.categories, category);
}

function saveCategoryOrder(payload) {
  const requestedIds = Array.isArray(payload.category_ids) ? payload.category_ids.map(normalizeCategoryId) : [];
  const uniqueIds = requestedIds.filter((id, index) => id !== "all" && requestedIds.indexOf(id) === index);
  if (!uniqueIds.length) throw new Error("Category order is required.");

  const categories = readObjects(SHEETS.categories)
    .filter((category) => String(category.active).toLowerCase() !== "false")
    .sort((left, right) => Number(left.sort_order || 999) - Number(right.sort_order || 999));
  const activeIds = categories.map((category) => cleanId(category.id));
  uniqueIds.forEach((id) => {
    if (activeIds.indexOf(id) < 0) throw new Error("Category no longer exists: " + id);
  });
  const orderedIds = uniqueIds.concat(activeIds.filter((id) => uniqueIds.indexOf(id) < 0));
  const orderById = {};
  orderedIds.forEach((id, index) => (orderById[id] = index + 1));

  const sheet = getSheet(SHEETS.categories);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: true, category_ids: orderedIds };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanId);
  const idIndex = headers.indexOf("id");
  const sortIndex = headers.indexOf("sort_order");
  if (idIndex < 0 || sortIndex < 0) throw new Error("Categories columns are missing.");
  const ids = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
  const sortValues = sheet.getRange(2, sortIndex + 1, lastRow - 1, 1).getValues();
  ids.forEach((row, index) => {
    const id = cleanId(row[0]);
    if (orderById[id]) sortValues[index][0] = orderById[id];
  });
  sheet.getRange(2, sortIndex + 1, sortValues.length, 1).setValues(sortValues);
  return { ok: true, category_ids: orderedIds };
}

function deleteCategory(payload) {
  const categoryId = normalizeCategoryId(payload.id);
  const replacementId = payload.replacement_category_id ? normalizeCategoryId(payload.replacement_category_id) : "";
  if (categoryId === "all") throw new Error("The all category cannot be deleted.");
  if (replacementId === categoryId) throw new Error("Replacement category must be different.");

  const categories = readObjects(SHEETS.categories);
  const current = categories.find((row) => cleanId(row.id) === categoryId && String(row.active).toLowerCase() !== "false");
  if (!current) return { ok: true, id: categoryId, mode: "already_deleted" };
  const activeCategories = categories.filter((row) => cleanId(row.id) !== categoryId && String(row.active).toLowerCase() !== "false");
  if (!activeCategories.length) throw new Error("At least one category must remain.");

  const recipes = readObjects(SHEETS.recipes);
  const hasRecipes = recipes.some((recipe) => cleanId(recipe.category_id) === categoryId);
  if (hasRecipes) {
    const replacement = activeCategories.find((row) => cleanId(row.id) === replacementId);
    if (!replacement) throw new Error("Choose a replacement category.");
    reassignRecipeCategory(categoryId, replacementId);
  }

  return saveObject(SHEETS.categories, {
    id: categoryId,
    label: current.label,
    icon: current.icon,
    color: current.color,
    sort_order: current.sort_order,
    count_unit: current.count_unit,
    active: false
  });
}

function reassignRecipeCategory(sourceId, replacementId) {
  const sheet = getSheet(SHEETS.recipes);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(cleanId);
  const categoryIndex = headers.indexOf("category_id");
  if (categoryIndex < 0) throw new Error("Recipes.category_id column is missing.");
  const values = sheet.getRange(2, categoryIndex + 1, lastRow - 1, 1).getValues();
  let changed = false;
  values.forEach((row) => {
    if (cleanId(row[0]) !== sourceId) return;
    row[0] = replacementId;
    changed = true;
  });
  if (changed) sheet.getRange(2, categoryIndex + 1, values.length, 1).setValues(values);
}

function normalizeCategoryId(value) {
  const id = cleanId(value);
  if (!/^[a-z0-9][a-z0-9_-]{1,59}$/i.test(id)) throw new Error("Invalid category id.");
  return id;
}

function normalizeCategoryIcon(value) {
  value = cleanId(value);
  return ["Store", "CupSoda", "Milk", "Coffee", "GlassWater", "Sparkles", "Cherry", "Package"].indexOf(value) >= 0 ? value : "CupSoda";
}

function normalizeCategoryColor(value) {
  value = cleanId(value);
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#3f8f18";
}

function normalizeCountUnit(value) {
  return cleanId(value).slice(0, 20);
}

function getRecipe(id) {
  const recipe = readObjects(SHEETS.recipes).find((item) => item.id === id);
  const items = readObjects(SHEETS.recipeItems).filter((item) => item.recipe_id === id);
  return { ok: true, recipe: recipe || null, items: items };
}

function saveRecipe(payload) {
  const recipe = payload.recipe || payload;
  if (!recipe.id) recipe.id = "rec_" + Date.now();
  recipe.id = cleanId(recipe.id);
  recipe.category_id = normalizeCategoryId(recipe.category_id);
  const categoryExists = readObjects(SHEETS.categories).some((category) =>
    cleanId(category.id) === recipe.category_id &&
    String(category.active).toLowerCase() !== "false"
  );
  if (!categoryExists) throw new Error("Selected category is no longer available. Refresh the app and choose another category.");
  sanitizeRecipeImageFields(recipe);
  dedupeObjectsById(SHEETS.recipes, recipe.id);
  if (!recipe.created_at) recipe.created_at = new Date().toISOString();
  recipe.updated_at = new Date().toISOString();
  const saved = saveObject(SHEETS.recipes, recipe);
  if (Array.isArray(payload.items)) {
    deleteRecipeItems(recipe.id);
    payload.items.forEach((item, index) => {
      item.id = item.id || "ritem_" + Date.now() + "_" + index;
      item.recipe_id = recipe.id;
      item.sort_order = index + 1;
      saveObject(SHEETS.recipeItems, item);
    });
    dedupeRecipeItems(recipe.id);
  }
  return { ok: true, recipe: saved.item || recipe, mode: saved.mode || "saved" };
}

function sanitizeRecipeImageFields(recipe) {
  const existing = getExistingRecipe(recipe.id);
  const incomingUrl = Object.prototype.hasOwnProperty.call(recipe, "image_url") ? cleanId(recipe.image_url) : "";
  const existingUrl = existing ? cleanId(existing.image_url) : "";
  const incomingFileId = Object.prototype.hasOwnProperty.call(recipe, "image_file_id") ? cleanId(recipe.image_file_id) : "";
  const existingFileId = existing ? cleanId(existing.image_file_id) : "";

  if (isSafeImageUrl(incomingUrl)) {
    recipe.image_url = incomingUrl;
    recipe.image_file_id = incomingFileId || existingFileId;
    return;
  }

  recipe.image_url = isSafeImageUrl(existingUrl) ? existingUrl : "";
  recipe.image_file_id = recipe.image_url ? existingFileId : "";
}

function getExistingRecipe(recipeId) {
  recipeId = cleanId(recipeId);
  if (!recipeId) return null;
  const rows = readObjects(SHEETS.recipes);
  for (let index = 0; index < rows.length; index++) {
    if (cleanId(rows[index].id) === recipeId) return rows[index];
  }
  return null;
}

function isSafeImageUrl(value) {
  const url = cleanId(value);
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.indexOf("data:") === 0 || lower.indexOf("blob:") === 0) return false;
  if (url.length > MAX_SAFE_IMAGE_URL_LENGTH) return false;
  return /^https?:\/\//i.test(url);
}

function cleanupInvalidRecipeImages() {
  const sheet = getSheet(SHEETS.recipes);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { ok: true, cleaned: 0 };
  const headers = values[0];
  const imageUrlIndex = headers.indexOf("image_url");
  const imageFileIdIndex = headers.indexOf("image_file_id");
  if (imageUrlIndex < 0) throw new Error("Missing image_url column.");

  let cleaned = 0;
  for (let row = 1; row < values.length; row++) {
    const imageUrl = cleanId(values[row][imageUrlIndex]);
    if (!imageUrl || isSafeImageUrl(imageUrl)) continue;
    sheet.getRange(row + 1, imageUrlIndex + 1).setValue("");
    if (imageFileIdIndex >= 0) sheet.getRange(row + 1, imageFileIdIndex + 1).setValue("");
    cleaned += 1;
  }

  SpreadsheetApp.getActive().toast("ล้าง image_url ที่ไม่ปลอดภัยแล้ว " + cleaned + " รายการ", "Drink Cost Studio", 5);
  return { ok: true, cleaned: cleaned };
}

function deleteRecipe(recipeId) {
  recipeId = cleanId(recipeId);
  const sheet = getSheet(SHEETS.recipes);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  if (!recipeId) throw new Error("Missing recipe id.");

  for (let row = 1; row < values.length; row++) {
    if (cleanId(values[row][idIndex]) === recipeId) {
      sheet.deleteRow(row + 1);
      deleteRecipeItems(recipeId);
      removeFavorite(recipeId);
      return { ok: true, id: recipeId, mode: "deleted" };
    }
  }
  return { ok: true, id: recipeId, mode: "not_found" };
}

function deleteIngredient(ingredientId) {
  ingredientId = cleanId(ingredientId);
  if (!ingredientId) throw new Error("Missing ingredient id.");
  const deleted = deleteObject(SHEETS.ingredients, ingredientId);
  deleteRecipeItemsByIngredient(ingredientId);
  return deleted;
}

function deleteRecipeItems(recipeId) {
  recipeId = cleanId(recipeId);
  const sheet = getSheet(SHEETS.recipeItems);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const recipeIndex = headers.indexOf("recipe_id");
  for (let row = values.length - 1; row >= 1; row--) {
    if (cleanId(values[row][recipeIndex]) === recipeId) sheet.deleteRow(row + 1);
  }
}

function deleteRecipeItemsByIngredient(ingredientId) {
  ingredientId = cleanId(ingredientId);
  const sheet = getSheet(SHEETS.recipeItems);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const ingredientIndex = headers.indexOf("ingredient_id");
  for (let row = values.length - 1; row >= 1; row--) {
    if (cleanId(values[row][ingredientIndex]) === ingredientId) sheet.deleteRow(row + 1);
  }
}

function dedupeRecipeItems(recipeId) {
  recipeId = cleanId(recipeId);
  const sheet = getSheet(SHEETS.recipeItems);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const recipeIndex = headers.indexOf("recipe_id");
  const ingredientIndex = headers.indexOf("ingredient_id");
  const amountIndex = headers.indexOf("amount");
  const unitIndex = headers.indexOf("unit");
  const noteIndex = headers.indexOf("note");
  const seen = {};
  for (let row = values.length - 1; row >= 1; row--) {
    if (cleanId(values[row][recipeIndex]) !== recipeId) continue;
    const key = [
      cleanId(values[row][ingredientIndex]),
      String(values[row][amountIndex]),
      cleanId(values[row][unitIndex]),
      cleanId(values[row][noteIndex])
    ].join("|");
    if (seen[key]) sheet.deleteRow(row + 1);
    seen[key] = true;
  }
}

function removeFavorite(recipeId) {
  recipeId = cleanId(recipeId);
  const sheet = getSheet(SHEETS.favorites);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const recipeIndex = headers.indexOf("recipe_id");
  for (let row = values.length - 1; row >= 1; row--) {
    if (cleanId(values[row][recipeIndex]) === recipeId) sheet.deleteRow(row + 1);
  }
}

function toggleFavorite(recipeId, requestedFavorite) {
  recipeId = cleanId(recipeId);
  const sheet = getSheet(SHEETS.favorites);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const recipeIndex = headers.indexOf("recipe_id");
  let exists = false;
  for (let row = 1; row < rows.length; row++) {
    if (cleanId(rows[row][recipeIndex]) === recipeId) {
      exists = true;
      if (requestedFavorite === false) sheet.deleteRow(row + 1);
      break;
    }
  }
  const nextFavorite = requestedFavorite === undefined || requestedFavorite === null ? !exists : Boolean(requestedFavorite);
  if (nextFavorite && !exists) appendObject(sheet, headers, { id: "fav_" + Date.now(), recipe_id: recipeId, sort_order: rows.length });
  setRecipeFavorite(recipeId, nextFavorite);
  return { ok: true, favorite: nextFavorite };
}

function setRecipeFavorite(recipeId, favorite) {
  const sheet = getSheet(SHEETS.recipes);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  const favoriteIndex = headers.indexOf("favorite");
  const updatedIndex = headers.indexOf("updated_at");
  if (favoriteIndex < 0) return;
  for (let row = 1; row < values.length; row++) {
    if (cleanId(values[row][idIndex]) === recipeId) {
      sheet.getRange(row + 1, favoriteIndex + 1).setValue(Boolean(favorite));
      if (updatedIndex >= 0) sheet.getRange(row + 1, updatedIndex + 1).setValue(new Date().toISOString());
    }
  }
}

function saveSale(payload) {
  const sale = payload.sale || payload;
  const items = payload.items || [];
  if (!sale.id) sale.id = "sale_" + Date.now();
  sale.id = cleanId(sale.id);
  sale.sale_date = cleanId(sale.sale_date);
  sale.channel = cleanId(sale.channel) || "หน้าร้าน";
  sale.payment_method = normalizePaymentMethod(sale.payment_method);
  sale.promotion_name = cleanId(sale.promotion_name || "");
  sale.promotion_amount = Number(sale.promotion_amount || 0);
  if (!isFinite(sale.promotion_amount)) sale.promotion_amount = 0;
  sale.promotion_amount = Math.max(0, sale.promotion_amount);
  sale.gross_revenue = Number(sale.gross_revenue === undefined ? sale.total_revenue || 0 : sale.gross_revenue);
  if (!isFinite(sale.gross_revenue)) sale.gross_revenue = 0;
  sale.gross_revenue = Math.max(0, sale.gross_revenue);
  sale.promotion_amount = Math.min(sale.promotion_amount, sale.gross_revenue);
  const subtotalAfterPromotion = roundCurrency(sale.gross_revenue - sale.promotion_amount);
  sale.gp_rate = isDeliveryChannel(sale.channel) ? 32.1 : 0;
  sale.gp_amount = roundCurrency((subtotalAfterPromotion * sale.gp_rate) / 100);
  sale.total_revenue = roundCurrency(Math.max(0, subtotalAfterPromotion - sale.gp_amount));
  sale.total_cost = Number(sale.total_cost || 0);
  if (!isFinite(sale.total_cost)) sale.total_cost = 0;
  sale.total_cost = Math.max(0, sale.total_cost);
  sale.total_profit = sale.total_revenue - sale.total_cost;
  sale.note = cleanId(sale.note || "");
  if (!sale.created_at) sale.created_at = new Date().toISOString();
  sale.updated_at = new Date().toISOString();

  dedupeObjectsById(SHEETS.sales, sale.id);
  deleteSaleItems(sale.id);
  const saved = saveObject(SHEETS.sales, sale);
  const recipes = readObjects(SHEETS.recipes);
  const categories = readObjects(SHEETS.categories);
  const recipeById = {};
  const categoryById = {};
  recipes.forEach((recipe) => (recipeById[cleanId(recipe.id)] = recipe));
  categories.forEach((category) => (categoryById[cleanId(category.id)] = category));
  items.forEach((item, index) => {
    item.id = cleanId(item.id) || "sitem_" + Date.now() + "_" + index;
    item.sale_id = sale.id;
    item.parent_id = cleanId(item.parent_id || "");
    item.item_id = cleanId(item.item_id);
    item.kind = cleanId(item.kind) || "custom";
    item.name = cleanId(item.name);
    item.qty = Number(item.qty || 0);
    item.unit_price = Number(item.unit_price || 0);
    item.unit_cost = Number(item.unit_cost || 0);
    item.line_revenue = Number(item.line_revenue || 0);
    item.line_cost = Number(item.line_cost || 0);
    item.line_profit = Number(item.line_profit || 0);
    const recipe = recipeById[item.item_id];
    item.category_id = cleanId(item.category_id || (recipe && recipe.category_id));
    const category = categoryById[item.category_id];
    item.count_unit = normalizeCountUnit(item.count_unit || (category && category.count_unit));
    item.note = cleanId(item.note || "");
    item.sort_order = index + 1;
    saveObject(SHEETS.saleItems, item);
  });
  return { ok: true, sale: saved.item || sale, item_count: items.length };
}

function isDeliveryChannel(channel) {
  return ["LINE MAN", "Grab", "ShopeeFood"].indexOf(cleanId(channel)) >= 0;
}

function normalizePaymentMethod(value) {
  value = cleanId(value);
  return ["เงินสด", "E-Payment", "ธนาคาร", "พร้อมเพย์"].indexOf(value) >= 0 ? value : "";
}

function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function deleteSale(saleId) {
  saleId = cleanId(saleId);
  if (!saleId) throw new Error("Missing sale id.");
  deleteSaleItems(saleId);
  return deleteObject(SHEETS.sales, saleId);
}

function deleteSaleItems(saleId) {
  saleId = cleanId(saleId);
  const sheet = getSheet(SHEETS.saleItems);
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const saleIndex = headers.indexOf("sale_id");
  if (saleIndex < 0) return;
  for (let row = values.length - 1; row >= 1; row--) {
    if (cleanId(values[row][saleIndex]) === saleId) sheet.deleteRow(row + 1);
  }
}

function saveDailyClosing(payload) {
  const closing = payload || {};
  if (!closing.id) closing.id = "close_" + Date.now();
  closing.id = cleanId(closing.id);
  closing.business_date = cleanId(closing.business_date);
  closing.order_count = Number(closing.order_count || 0);
  closing.item_count = Number(closing.item_count || 0);
  closing.total_revenue = Number(closing.total_revenue || 0);
  closing.total_cost = Number(closing.total_cost || 0);
  closing.total_profit = Number(closing.total_profit || 0);
  closing.note = cleanId(closing.note || "");
  if (!closing.closed_at) closing.closed_at = new Date().toISOString();
  closing.updated_at = new Date().toISOString();
  dedupeObjectsById(SHEETS.dailyClosings, closing.id);
  const saved = saveObject(SHEETS.dailyClosings, closing);
  return { ok: true, closing: saved.item || closing };
}

function archiveSalesMonth(monthKey) {
  monthKey = cleanId(monthKey);
  if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error("รูปแบบเดือนไม่ถูกต้อง");
  if (monthKey >= currentMonthKey()) throw new Error("จัดเก็บได้เฉพาะเดือนที่จบแล้ว");

  const archives = readObjects(SHEETS.monthlyArchives);
  const existing = archives.find((archive) => cleanId(archive.month_key) === monthKey);
  const allSales = readObjects(SHEETS.sales);
  const monthSales = allSales.filter((sale) => cleanId(sale.sale_date).slice(0, 7) === monthKey);
  const saleIds = monthSales.map((sale) => cleanId(sale.id)).filter(Boolean).sort();
  const sourceHash = hashSecret(saleIds.join("|"));

  if (existing && cleanId(existing.status) === "complete") {
    if (monthSales.length) throw new Error("เดือนนี้จัดเก็บแล้ว แต่พบยอดขายที่เพิ่มภายหลัง กรุณาตรวจข้อมูลในชีตก่อน");
    return { ok: true, archive: existing, mode: "already_archived" };
  }
  if (existing && cleanId(existing.status) === "pending_cleanup") {
    const originalCount = Number(existing.source_count || 0);
    if (monthSales.length > originalCount || (monthSales.length === originalCount && cleanId(existing.source_hash) !== sourceHash)) {
      throw new Error("ข้อมูลเดือนนี้เปลี่ยนระหว่างจัดเก็บ กรุณาตรวจชีต MonthlyArchives ก่อน");
    }
    removeArchivedSales(monthSales);
    existing.status = "complete";
    existing.updated_at = new Date().toISOString();
    const resumed = saveObject(SHEETS.monthlyArchives, existing);
    return { ok: true, archive: resumed.item || existing, mode: "cleanup_resumed" };
  }
  if (!monthSales.length) throw new Error("ไม่พบยอดขายของเดือนนี้");

  const monthSaleIds = {};
  saleIds.forEach((id) => (monthSaleIds[id] = true));
  const monthItems = readObjects(SHEETS.saleItems).filter((item) => monthSaleIds[cleanId(item.sale_id)]);
  const itemsBySale = {};
  monthItems.forEach((item) => {
    const saleId = cleanId(item.sale_id);
    if (!itemsBySale[saleId]) itemsBySale[saleId] = [];
    itemsBySale[saleId].push(item);
  });

  const daily = {};
  monthSales.forEach((sale) => {
    const date = cleanId(sale.sale_date);
    if (!daily[date]) daily[date] = newArchiveDay(date);
    const day = daily[date];
    const saleItems = itemsBySale[cleanId(sale.id)] || [];
    day.orderCount += 1;
    day.revenue += Number(sale.total_revenue || 0);
    day.cost += Number(sale.total_cost || 0);
    day.profit += Number(sale.total_profit || 0);
    const payment = normalizePaymentMethod(sale.payment_method);
    if (payment === "เงินสด") day.cashRevenue += Number(sale.total_revenue || 0);
    else if (payment) day.transferRevenue += Number(sale.total_revenue || 0);
    else day.unassignedRevenue += Number(sale.total_revenue || 0);

    saleItems.filter((item) => cleanId(item.kind) !== "topping" && !cleanId(item.parent_id)).forEach((item) => {
      const qty = Math.max(0, Number(item.qty || 0));
      day.itemCount += qty;
      const key = cleanId(item.item_id) || cleanId(item.name);
      if (!day._menus[key]) day._menus[key] = { itemId: key, name: cleanId(item.name), quantity: 0, revenue: 0 };
      day._menus[key].quantity += qty;
      day._menus[key].revenue += Number(item.line_revenue || 0);
      if (cleanId(item.kind) !== "recipe") return;
      const unit = normalizeCountUnit(item.count_unit);
      if (unit) day._units[unit] = Number(day._units[unit] || 0) + qty;
    });
  });

  const dailySummaries = Object.keys(daily).sort().map((date) => finalizeArchiveDay(daily[date]));
  const archive = {
    id: "archive_" + monthKey,
    month_key: monthKey,
    order_count: dailySummaries.reduce((sum, day) => sum + day.orderCount, 0),
    item_count: dailySummaries.reduce((sum, day) => sum + day.itemCount, 0),
    total_revenue: roundCurrency(dailySummaries.reduce((sum, day) => sum + day.revenue, 0)),
    total_cost: roundCurrency(dailySummaries.reduce((sum, day) => sum + day.cost, 0)),
    total_profit: roundCurrency(dailySummaries.reduce((sum, day) => sum + day.profit, 0)),
    daily_json: JSON.stringify(dailySummaries),
    source_count: monthSales.length,
    source_hash: sourceHash,
    status: "pending_cleanup",
    archived_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  saveObject(SHEETS.monthlyArchives, archive);
  removeArchivedSales(monthSales);
  archive.status = "complete";
  archive.updated_at = new Date().toISOString();
  const saved = saveObject(SHEETS.monthlyArchives, archive);
  return { ok: true, archive: saved.item || archive, mode: "archived" };
}

function newArchiveDay(date) {
  return {
    date: date,
    orderCount: 0,
    itemCount: 0,
    revenue: 0,
    cost: 0,
    profit: 0,
    cashRevenue: 0,
    transferRevenue: 0,
    unassignedRevenue: 0,
    _units: {},
    _menus: {}
  };
}

function finalizeArchiveDay(day) {
  const topMenus = Object.keys(day._menus).map((key) => day._menus[key])
    .sort((left, right) => right.quantity - left.quantity || right.revenue - left.revenue)
    .slice(0, 5);
  return {
    date: day.date,
    orderCount: day.orderCount,
    itemCount: day.itemCount,
    revenue: roundCurrency(day.revenue),
    cost: roundCurrency(day.cost),
    profit: roundCurrency(day.profit),
    cashRevenue: roundCurrency(day.cashRevenue),
    transferRevenue: roundCurrency(day.transferRevenue),
    unassignedRevenue: roundCurrency(day.unassignedRevenue),
    unitCounts: Object.keys(day._units).map((unit) => ({ unit: unit, quantity: day._units[unit] })),
    topMenus: topMenus
  };
}

function removeArchivedSales(monthSales) {
  const saleIds = {};
  monthSales.forEach((sale) => (saleIds[cleanId(sale.id)] = true));
  removeSheetRows(SHEETS.saleItems, "sale_id", saleIds);
  removeSheetRows(SHEETS.sales, "id", saleIds);
  const monthKey = cleanId(monthSales[0] && monthSales[0].sale_date).slice(0, 7);
  const closingIds = {};
  readObjects(SHEETS.dailyClosings).forEach((closing) => {
    if (cleanId(closing.business_date).slice(0, 7) === monthKey) closingIds[cleanId(closing.id)] = true;
  });
  removeSheetRows(SHEETS.dailyClosings, "id", closingIds);
}

function removeSheetRows(sheetName, keyHeader, valuesToRemove) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;
  const headers = values[0];
  const keyIndex = headers.indexOf(keyHeader);
  if (keyIndex < 0) throw new Error("Missing header " + keyHeader + " in " + sheetName);
  const kept = values.slice(1).filter((row) => !valuesToRemove[cleanId(row[keyIndex])]);
  const removed = values.length - 1 - kept.length;
  if (!removed) return 0;
  sheet.getRange(2, 1, values.length - 1, headers.length).clearContent();
  if (kept.length) sheet.getRange(2, 1, kept.length, headers.length).setValues(kept);
  return removed;
}

function currentMonthKey() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM");
}

function bootstrapSalesStartDate() {
  const now = new Date();
  const sevenDayStart = new Date(now.getTime());
  sevenDayStart.setDate(sevenDayStart.getDate() - 6);
  const sevenDayKey = Utilities.formatDate(sevenDayStart, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const monthStart = currentMonthKey() + "-01";
  return sevenDayKey < monthStart ? sevenDayKey : monthStart;
}

function backfillCategoryCountUnits() {
  const defaults = { tea: "แก้ว", milk: "แก้ว", coffee: "แก้ว", smoothie: "แก้ว", soda: "แก้ว", toast: "แผ่น", pangyen: "แก้ว" };
  const sheet = getSheet(SHEETS.categories);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  const unitIndex = headers.indexOf("count_unit");
  if (idIndex < 0 || unitIndex < 0) return 0;
  let changed = 0;
  for (let row = 1; row < values.length; row++) {
    const id = cleanId(values[row][idIndex]);
    const currentUnit = cleanId(values[row][unitIndex]);
    if (!defaults[id] || (currentUnit && !(id === "pangyen" && currentUnit === "ถ้วย"))) continue;
    values[row][unitIndex] = defaults[id];
    changed += 1;
  }
  if (changed) sheet.getRange(2, unitIndex + 1, values.length - 1, 1).setValues(values.slice(1).map((row) => [row[unitIndex]]));
  return changed;
}

function backfillSaleItemCountUnits() {
  const sheet = getSheet(SHEETS.saleItems);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;
  const headers = values[0];
  const itemIndex = headers.indexOf("item_id");
  const kindIndex = headers.indexOf("kind");
  const categoryIndex = headers.indexOf("category_id");
  const unitIndex = headers.indexOf("count_unit");
  if ([itemIndex, kindIndex, categoryIndex, unitIndex].some((index) => index < 0)) return 0;
  const recipeById = {};
  readObjects(SHEETS.recipes).forEach((recipe) => (recipeById[cleanId(recipe.id)] = recipe));
  const categoryById = {};
  readObjects(SHEETS.categories).forEach((category) => (categoryById[cleanId(category.id)] = category));
  let changed = 0;
  for (let row = 1; row < values.length; row++) {
    if (cleanId(values[row][kindIndex]) !== "recipe") continue;
    const recipe = recipeById[cleanId(values[row][itemIndex])];
    if (!recipe) continue;
    const categoryId = cleanId(values[row][categoryIndex] || recipe.category_id);
    const countUnit = normalizeCountUnit(values[row][unitIndex] || (categoryById[categoryId] && categoryById[categoryId].count_unit));
    if (cleanId(values[row][categoryIndex]) === categoryId && cleanId(values[row][unitIndex]) === countUnit) continue;
    values[row][categoryIndex] = categoryId;
    values[row][unitIndex] = countUnit;
    changed += 1;
  }
  if (changed) {
    sheet.getRange(2, categoryIndex + 1, values.length - 1, 1).setValues(values.slice(1).map((row) => [row[categoryIndex]]));
    sheet.getRange(2, unitIndex + 1, values.length - 1, 1).setValues(values.slice(1).map((row) => [row[unitIndex]]));
  }
  return changed;
}

function calculateCost(recipeId) {
  const ingredients = readObjects(SHEETS.ingredients);
  const ingredientById = {};
  ingredients.forEach((item) => (ingredientById[item.id] = item));
  const recipe = readObjects(SHEETS.recipes).find((item) => item.id === recipeId);
  const items = readObjects(SHEETS.recipeItems).filter((item) => item.recipe_id === recipeId);
  let ingredientCost = 0;
  let toppingCost = 0;
  let packagingCost = 0;
  items.forEach((item) => {
    const ingredient = ingredientById[item.ingredient_id];
    if (!ingredient) return;
    const lineCost = Number(ingredient.cost_per_unit || 0) * Number(item.amount || 0);
    if (ingredient.category === "ท็อปปิ้ง") toppingCost += lineCost;
    else if (ingredient.category === "บรรจุภัณฑ์") packagingCost += lineCost;
    else ingredientCost += lineCost;
  });
  const totalCost = ingredientCost + toppingCost + packagingCost;
  const sellingPrice = Number((recipe && recipe.selling_price) || 0);
  const profit = sellingPrice - totalCost;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  return { ok: true, ingredientCost, toppingCost, packagingCost, totalCost, profit, margin };
}

function uploadRecipeImage(payload) {
  const folderId = getImageFolderId();
  const folder = DriveApp.getFolderById(folderId);
  const mutationId = cleanId(payload.mutation_id).replace(/[^a-zA-Z0-9_-]/g, "");
  const extension = payload.mimeType === "image/png" ? "png" : payload.mimeType === "image/webp" ? "webp" : "jpg";
  const fileName = mutationId ? "sync-" + mutationId + "." + extension : payload.fileName || "recipe.jpg";
  if (mutationId) {
    const existingFiles = folder.getFilesByName(fileName);
    if (existingFiles.hasNext()) {
      const existingFile = existingFiles.next();
      return {
        ok: true,
        file_id: existingFile.getId(),
        image_url: "https://drive.google.com/thumbnail?id=" + existingFile.getId() + "&sz=w1200"
      };
    }
  }
  const bytes = Utilities.base64Decode(payload.base64);
  const blob = Utilities.newBlob(bytes, payload.mimeType || "image/jpeg", fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    ok: true,
    file_id: file.getId(),
    image_url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1200"
  };
}

function getImageFolderId() {
  const props = PropertiesService.getScriptProperties();
  const current = props.getProperty("IMAGE_FOLDER_ID");
  if (current) return current;
  const folder = DriveApp.createFolder("Drink Cost Studio Images");
  props.setProperty("IMAGE_FOLDER_ID", folder.getId());
  return folder.getId();
}

function readObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter((row) => row.some((cell) => cell !== "")).map((row) => {
    const object = {};
    headers.forEach((header, index) => (object[header] = row[index]));
    return object;
  });
}

function saveObject(sheetName, object) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  if (!object.id) object.id = "id_" + Date.now();
  object.id = cleanId(object.id);
  for (let row = 1; row < values.length; row++) {
    if (cleanId(values[row][idIndex]) === object.id) {
      headers.forEach((header, index) => sheet.getRange(row + 1, index + 1).setValue(cellValue(object, header)));
      return { ok: true, item: object, mode: "updated" };
    }
  }
  appendObject(sheet, headers, object);
  return { ok: true, item: object, mode: "created" };
}

function appendObject(sheet, headers, object) {
  sheet.appendRow(headers.map((header) => cellValue(object, header)));
}

function deleteObject(sheetName, id) {
  id = cleanId(id);
  if (!id) throw new Error("Missing id.");
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  for (let row = 1; row < values.length; row++) {
    if (cleanId(values[row][idIndex]) === id) {
      sheet.deleteRow(row + 1);
      return { ok: true, id: id, mode: "deleted" };
    }
  }
  return { ok: true, id: id, mode: "not_found" };
}

function cellValue(object, header) {
  return object[header] === undefined || object[header] === null ? "" : object[header];
}

function cleanId(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function dedupeObjectsById(sheetName, id) {
  id = cleanId(id);
  if (!id) return;
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  let found = false;
  for (let row = values.length - 1; row >= 1; row--) {
    if (cleanId(values[row][idIndex]) !== id) continue;
    if (!found) {
      found = true;
      continue;
    }
    sheet.deleteRow(row + 1);
  }
}

function getSheet(name) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sheet) throw new Error("Missing sheet: " + name);
  return sheet;
}

function getOrCreateSheet(name) {
  const spreadsheet = SpreadsheetApp.getActive();
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function testGetBootstrapData() {
  Logger.log(JSON.stringify(getBootstrapData()));
}

function testCalculateCost() {
  Logger.log(JSON.stringify(calculateCost("rec_thai_boba")));
}
