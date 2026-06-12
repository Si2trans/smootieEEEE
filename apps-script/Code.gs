const SHEETS = {
  settings: "Settings",
  categories: "Categories",
  ingredients: "Ingredients",
  recipes: "Recipes",
  recipeItems: "RecipeItems",
  favorites: "Favorites"
};

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
      headers: ["id", "label", "icon", "color", "sort_order", "active"],
      rows: [
        ["tea", "ชา", "CupSoda", "#f2b634", 1, true],
        ["milk", "นม", "Milk", "#77bfd3", 2, true],
        ["coffee", "กาแฟ", "Coffee", "#8a4f1e", 3, true],
        ["smoothie", "สมูทตี้", "Cherry", "#f04646", 4, true],
        ["soda", "โซดา", "GlassWater", "#6ea4e8", 5, true]
      ]
    },
    {
      name: SHEETS.ingredients,
      headers: ["id", "name", "category", "buy_qty", "buy_unit", "buy_price", "base_unit", "cost_per_unit", "note", "updated_at"],
      rows: [
        ["ing_tea", "ผงชาไทย", "วัตถุดิบน้ำ", 500, "g", 120, "g", 0.24, "", new Date().toISOString()],
        ["ing_milk", "นมสด", "วัตถุดิบน้ำ", 2000, "ml", 95, "ml", 0.0475, "", new Date().toISOString()],
        ["ing_condensed", "นมข้นหวาน", "วัตถุดิบน้ำ", 388, "g", 28, "g", 0.072, "", new Date().toISOString()],
        ["ing_creamer", "ครีมเทียมข้นจืด", "วัตถุดิบน้ำ", 1000, "ml", 52, "ml", 0.052, "", new Date().toISOString()],
        ["ing_syrup", "น้ำเชื่อม", "วัตถุดิบน้ำ", 750, "ml", 42, "ml", 0.056, "", new Date().toISOString()],
        ["ing_boba", "ไข่มุก", "ท็อปปิ้ง", 1000, "g", 80, "g", 0.08, "", new Date().toISOString()],
        ["ing_cocoa", "ผงโกโก้", "วัตถุดิบน้ำ", 500, "g", 135, "g", 0.27, "", new Date().toISOString()],
        ["ing_matcha", "มัทฉะ", "วัตถุดิบน้ำ", 100, "g", 230, "g", 2.3, "", new Date().toISOString()],
        ["ing_cup16", "แก้ว 16 oz + ฝา", "บรรจุภัณฑ์", 100, "piece", 250, "piece", 2.5, "", new Date().toISOString()]
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
    }
  ];

  setup.forEach((config) => {
    const sheet = getOrCreateSheet(config.name);
    sheet.clear();
    sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
    if (config.rows.length) {
      sheet.getRange(2, 1, config.rows.length, config.headers.length).setValues(config.rows);
    }
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, config.headers.length);
  });

  SpreadsheetApp.getActive().toast("สร้างฐานข้อมูล Drink Cost Studio เรียบร้อยแล้ว", "Setup complete", 5);
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || "getBootstrapData";
  try {
    if (action === "getBootstrapData") return jsonResponse(getBootstrapData());
    if (action === "getRecipe") return jsonResponse(getRecipe(params.id));
    if (action === "getIngredients") return jsonResponse(readObjects(SHEETS.ingredients));
    return jsonResponse({ ok: false, error: "Unknown action: " + action }, 404);
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  }
}

function doPost(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || "";
  const payload = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (action === "saveIngredient") return jsonResponse(saveObject(SHEETS.ingredients, payload));
    if (action === "saveRecipe") return jsonResponse(saveRecipe(payload));
    if (action === "deleteIngredient") return jsonResponse(deleteObject(SHEETS.ingredients, payload.id));
    if (action === "deleteRecipe") return jsonResponse(deleteRecipe(payload.id));
    if (action === "toggleFavorite") return jsonResponse(toggleFavorite(payload.recipe_id));
    if (action === "calculateCost") return jsonResponse(calculateCost(payload.recipe_id));
    if (action === "uploadRecipeImage") return jsonResponse(uploadRecipeImage(payload));
    return jsonResponse({ ok: false, error: "Unknown action: " + action }, 404);
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) }, 500);
  } finally {
    lock.releaseLock();
  }
}

function getBootstrapData() {
  return {
    ok: true,
    settings: readObjects(SHEETS.settings),
    categories: readObjects(SHEETS.categories),
    ingredients: readObjects(SHEETS.ingredients),
    recipes: readObjects(SHEETS.recipes),
    recipeItems: readObjects(SHEETS.recipeItems),
    favorites: readObjects(SHEETS.favorites)
  };
}

function getRecipe(id) {
  const recipe = readObjects(SHEETS.recipes).find((item) => item.id === id);
  const items = readObjects(SHEETS.recipeItems).filter((item) => item.recipe_id === id);
  return { ok: true, recipe: recipe || null, items: items };
}

function saveRecipe(payload) {
  const recipe = payload.recipe || payload;
  if (!recipe.id) recipe.id = "rec_" + Date.now();
  if (!recipe.created_at) recipe.created_at = new Date().toISOString();
  recipe.updated_at = new Date().toISOString();
  const saved = saveObject(SHEETS.recipes, recipe);
  if (payload.items && payload.items.length) {
    payload.items.forEach((item, index) => {
      item.id = item.id || "ritem_" + Date.now() + "_" + index;
      item.recipe_id = recipe.id;
      item.sort_order = index + 1;
      saveObject(SHEETS.recipeItems, item);
    });
  }
  return { ok: true, recipe: saved };
}

function deleteRecipe(recipeId) {
  const sheet = getSheet(SHEETS.recipes);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  const activeIndex = headers.indexOf("active");
  const updatedIndex = headers.indexOf("updated_at");
  if (!recipeId) throw new Error("Missing recipe id.");

  for (let row = 1; row < values.length; row++) {
    if (values[row][idIndex] === recipeId) {
      if (activeIndex >= 0) {
        sheet.getRange(row + 1, activeIndex + 1).setValue(false);
        if (updatedIndex >= 0) sheet.getRange(row + 1, updatedIndex + 1).setValue(new Date().toISOString());
      } else {
        sheet.deleteRow(row + 1);
      }
      deleteRecipeItems(recipeId);
      removeFavorite(recipeId);
      return { ok: true, id: recipeId, mode: "deleted" };
    }
  }
  return { ok: true, id: recipeId, mode: "not_found" };
}

function deleteRecipeItems(recipeId) {
  const sheet = getSheet(SHEETS.recipeItems);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const recipeIndex = headers.indexOf("recipe_id");
  for (let row = values.length - 1; row >= 1; row--) {
    if (values[row][recipeIndex] === recipeId) sheet.deleteRow(row + 1);
  }
}

function removeFavorite(recipeId) {
  const sheet = getSheet(SHEETS.favorites);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const recipeIndex = headers.indexOf("recipe_id");
  for (let row = values.length - 1; row >= 1; row--) {
    if (values[row][recipeIndex] === recipeId) sheet.deleteRow(row + 1);
  }
}

function toggleFavorite(recipeId) {
  const sheet = getSheet(SHEETS.favorites);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const recipeIndex = headers.indexOf("recipe_id");
  for (let row = 1; row < rows.length; row++) {
    if (rows[row][recipeIndex] === recipeId) {
      sheet.deleteRow(row + 1);
      return { ok: true, favorite: false };
    }
  }
  appendObject(sheet, headers, { id: "fav_" + Date.now(), recipe_id: recipeId, sort_order: rows.length });
  return { ok: true, favorite: true };
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
  const bytes = Utilities.base64Decode(payload.base64);
  const blob = Utilities.newBlob(bytes, payload.mimeType || "image/jpeg", payload.fileName || "recipe.jpg");
  const file = DriveApp.getFolderById(folderId).createFile(blob);
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
  for (let row = 1; row < values.length; row++) {
    if (values[row][idIndex] === object.id) {
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
  if (!id) throw new Error("Missing id.");
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf("id");
  for (let row = 1; row < values.length; row++) {
    if (values[row][idIndex] === id) {
      sheet.deleteRow(row + 1);
      return { ok: true, id: id, mode: "deleted" };
    }
  }
  return { ok: true, id: id, mode: "not_found" };
}

function cellValue(object, header) {
  return object[header] === undefined || object[header] === null ? "" : object[header];
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
  const response = doGet({ parameter: { action: "getBootstrapData" } });
  Logger.log(response.getContent());
}

function testCalculateCost() {
  const response = doPost({
    parameter: { action: "calculateCost" },
    postData: { contents: JSON.stringify({ recipe_id: "rec_thai_boba" }) }
  });
  Logger.log(response.getContent());
}
