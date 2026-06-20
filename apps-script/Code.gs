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
    ensureSheetHeaders(sheet, config.headers);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, sheet.getLastColumn());
  });

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
    if (action === "saveIngredient") return jsonResponse(saveObject(SHEETS.ingredients, payload));
    if (action === "saveRecipe") return jsonResponse(saveRecipe(payload));
    if (action === "deleteIngredient") return jsonResponse(deleteIngredient(payload.id));
    if (action === "deleteRecipe") return jsonResponse(deleteRecipe(payload.id));
    if (action === "toggleFavorite") return jsonResponse(toggleFavorite(payload.recipe_id, payload.favorite));
    if (action === "calculateCost") return jsonResponse(calculateCost(payload.recipe_id));
    if (action === "uploadRecipeImage") return jsonResponse(uploadRecipeImage(payload));
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
  recipe.id = cleanId(recipe.id);
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
