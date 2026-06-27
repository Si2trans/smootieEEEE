import type { Category, CategoryId, Ingredient, Recipe, RecipeItem, Unit } from "../types/app";

const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxyh2P5FyC4j7GTPMm5KtG1rA3xMESX3HCYCIOlh5ZkEAQvSLpNzMGBykonkFMrv5fCBQ/exec";

export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
const APP_DATA_CACHE_KEY = "drink-cost-studio:app-data:v3";
const ACCESS_KEY_STORAGE_KEY = "drink-cost-studio:access-key:v1";
const ALL_CATEGORY: Category = { id: "all", label: "ทั้งหมด", icon: "Store", color: "#3f8f18" };

type BootstrapResponse = {
  ok?: boolean;
  categories?: Array<Record<string, unknown>>;
  ingredients?: Array<Record<string, unknown>>;
  recipes?: Array<Record<string, unknown>>;
  recipeItems?: Array<Record<string, unknown>>;
  favorites?: Array<Record<string, unknown>>;
};

export type AppData = {
  categories: Category[];
  ingredients: Ingredient[];
  recipes: Recipe[];
};

export type SaveIngredientInput = Omit<Ingredient, "costPerUnit"> & { costPerUnit?: number };

export type SaveRecipeInput = {
  id?: string;
  name: string;
  categoryId: CategoryId;
  imageUrl?: string;
  imageFileId?: string;
  status?: string;
  prepTime: number;
  sweetness: number;
  sizeOz: number;
  sellingPrice: number;
  favorite?: boolean;
  rating?: number;
  steps?: string[];
  items?: RecipeItem[];
};

export type UploadImageInput = {
  fileName: string;
  mimeType: string;
  base64: string;
  mutationId?: string;
};

export async function fetchAppData(options: { cache?: boolean } = {}): Promise<AppData> {
  const data = (await postAction("getBootstrapData", {})) as BootstrapResponse;
  const normalized = normalizeBootstrapData(data);
  if (options.cache !== false) cacheAppData(normalized);
  return normalized;
}

export class AccessDeniedError extends Error {
  constructor(message = "รหัสลับไม่ถูกต้อง") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export function getStoredAccessKey() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY) || "";
}

export function storeAccessKey(accessKey: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY_STORAGE_KEY, accessKey);
}

export function clearStoredAccessKey() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
}

export async function authenticateAccessKey(accessKey: string) {
  await postAction("authenticate", { access_key: accessKey }, false);
}

export function isAccessDeniedError(error: unknown): error is AccessDeniedError {
  return error instanceof AccessDeniedError;
}

export function getCachedAppData(): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APP_DATA_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AppData;
    if (!Array.isArray(data.categories) || !Array.isArray(data.ingredients) || !Array.isArray(data.recipes)) return null;
    return data;
  } catch {
    return null;
  }
}

export function cacheAppData(data: AppData) {
  if (typeof window === "undefined") return;
  try {
    const cacheable = {
      ...data,
      recipes: data.recipes.map((recipe) => ({
        ...recipe,
        imageUrl: recipe.imageUrl?.startsWith("data:") || recipe.imageUrl?.startsWith("blob:") ? undefined : recipe.imageUrl
      }))
    };
    window.localStorage.setItem(APP_DATA_CACHE_KEY, JSON.stringify(cacheable));
  } catch {
    // Storage can be unavailable in private mode or when quota is full.
  }
}

export function clearCachedAppData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(APP_DATA_CACHE_KEY);
}

export async function saveIngredient(input: SaveIngredientInput) {
  const buyQty = Number(input.buyQty || 0);
  const buyPrice = Number(input.buyPrice || 0);
  const costPerUnit = input.costPerUnit ?? (buyQty > 0 ? buyPrice / buyQty : 0);

  return postAction("saveIngredient", {
    id: input.id || `ing_${Date.now()}`,
    name: input.name,
    category: input.category,
    buy_qty: buyQty,
    buy_unit: input.buyUnit,
    buy_price: buyPrice,
    base_unit: input.baseUnit,
    cost_per_unit: costPerUnit,
    note: input.note || ""
  });
}

export async function saveRecipe(input: SaveRecipeInput) {
  return postAction("saveRecipe", {
    recipe: {
      id: input.id || `rec_${Date.now()}`,
      name: input.name,
      category_id: input.categoryId,
      image_url: input.imageUrl || "",
      image_file_id: input.imageFileId || "",
      status: input.status || "",
      prep_time: Number(input.prepTime ?? 0),
      sweetness: Number(input.sweetness ?? 0),
      size_oz: Number(input.sizeOz ?? 0),
      selling_price: Number(input.sellingPrice ?? 0),
      favorite: Boolean(input.favorite),
      rating: Number(input.rating || 4.5),
      steps: (input.steps || []).filter(Boolean).join("|"),
      active: true
    },
    items: (input.items || []).map((item) => ({
      ingredient_id: item.ingredientId,
      amount: Number(item.amount || 0),
      unit: item.unit,
      note: item.note || ""
    }))
  });
}

export async function deleteRecipe(recipeId: string) {
  return postAction("deleteRecipe", { id: recipeId });
}

export async function deleteIngredient(ingredientId: string) {
  return postAction("deleteIngredient", { id: ingredientId });
}

export async function toggleFavoriteRemote(recipeId: string, favorite?: boolean) {
  return postAction("toggleFavorite", { recipe_id: recipeId, favorite });
}

export async function uploadRecipeImage(input: UploadImageInput): Promise<{ image_url: string; file_id: string }> {
  const data = await postAction("uploadRecipeImage", {
    fileName: input.fileName,
    mimeType: input.mimeType,
    base64: input.base64,
    mutation_id: input.mutationId || ""
  });
  return {
    image_url: text(data.image_url),
    file_id: text(data.file_id)
  };
}

export async function fileToImagePayload(file: File): Promise<UploadImageInput> {
  const dataUrl = await resizeImage(file, 1200, 0.86);
  const [meta, base64] = dataUrl.split(",");
  const mimeType = /data:(.*);base64/.exec(meta)?.[1] || file.type || "image/jpeg";
  return {
    fileName: file.name || `recipe-${Date.now()}.jpg`,
    mimeType,
    base64
  };
}

async function postAction(action: string, payload: Record<string, unknown>, requiresAccess = true) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set("action", action);
  const accessKey = requiresAccess ? getStoredAccessKey() : "";
  if (requiresAccess && !accessKey) throw new AccessDeniedError("กรุณาใส่รหัสลับของร้าน");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(requiresAccess ? { ...payload, access_key: accessKey } : payload)
  });

  if (!response.ok) {
    throw new Error(`Apps Script ${action} failed: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  if (data.ok === false) {
    if (text(data.code) === "UNAUTHORIZED") throw new AccessDeniedError(text(data.error) || "รหัสลับไม่ถูกต้อง");
    throw new Error(text(data.error) || `Apps Script ${action} returned ok=false`);
  }
  return data;
}

function resizeImage(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Cannot read image file"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Cannot load image file"));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Cannot resize image"));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function normalizeBootstrapData(data: BootstrapResponse): AppData {
  const categories = normalizeCategories(data.categories || []);
  const ingredients = normalizeIngredients(data.ingredients || []);
  const itemsByRecipe = groupRecipeItems(data.recipeItems || []);
  const favorites = new Set((data.favorites || []).map((item) => text(item.recipe_id)));
  const recipes = dedupeRecipes(normalizeRecipes(data.recipes || [], itemsByRecipe, favorites));

  return {
    categories: [ALL_CATEGORY, ...categories],
    ingredients,
    recipes
  };
}

function normalizeCategories(rows: Array<Record<string, unknown>>): Category[] {
  return rows
    .filter((row) => bool(row.active, true))
    .map((row) => ({
      id: categoryId(row.id),
      label: text(row.label || row.name),
      icon: text(row.icon) || "CupSoda",
      color: text(row.color) || "#3f8f18"
    }))
    .filter((category) => category.id !== "all" && category.label);
}

function normalizeIngredients(rows: Array<Record<string, unknown>>): Ingredient[] {
  return rows.map((row) => ({
    id: text(row.id),
    name: text(row.name),
    category: text(row.category),
    buyQty: number(row.buy_qty || row.buyQty),
    buyUnit: unit(row.buy_unit || row.buyUnit),
    buyPrice: number(row.buy_price || row.buyPrice),
    baseUnit: unit(row.base_unit || row.baseUnit),
    costPerUnit: number(row.cost_per_unit || row.costPerUnit),
    note: text(row.note)
  }));
}

function normalizeRecipes(
  rows: Array<Record<string, unknown>>,
  itemsByRecipe: Map<string, RecipeItem[]>,
  favorites: Set<string>
): Recipe[] {
  return rows
    .filter((row) => bool(row.active, true))
    .map((row) => {
      const id = text(row.id);
      const name = text(row.name);
      const category = categoryId(row.category_id || row.categoryId);
      const imageUrl = normalizeDriveImageUrl(text(row.image_url || row.imageUrl));
      return {
        id,
        name,
        categoryId: category,
        imageKey: inferImageKey(name, category),
        imageUrl: imageUrl || undefined,
        status: text(row.status) || undefined,
        prepTime: number(row.prep_time || row.prepTime, 5),
        sweetness: number(row.sweetness, 75),
        sizeOz: number(row.size_oz || row.sizeOz, 16),
        sellingPrice: number(row.selling_price || row.sellingPrice, 0),
        favorite: row.favorite === undefined || row.favorite === null || row.favorite === "" ? favorites.has(id) : bool(row.favorite, false),
        rating: number(row.rating, 4.5),
        items: itemsByRecipe.get(id) || [],
        steps: splitSteps(row.steps)
      };
    });
}

function dedupeRecipes(recipes: Recipe[]) {
  const byId = new Map<string, Recipe>();
  recipes.forEach((recipe) => {
    if (!recipe.id) return;
    byId.set(recipe.id, recipe);
  });
  return Array.from(byId.values());
}

function groupRecipeItems(rows: Array<Record<string, unknown>>) {
  const grouped = new Map<string, RecipeItem[]>();
  const seen = new Map<string, Set<string>>();
  rows
    .slice()
    .sort((a, b) => number(a.sort_order) - number(b.sort_order))
    .forEach((row) => {
      const recipeId = text(row.recipe_id || row.recipeId);
      const item: RecipeItem = {
        ingredientId: text(row.ingredient_id || row.ingredientId),
        amount: number(row.amount),
        unit: unit(row.unit),
        note: text(row.note)
      };
      const itemKey = `${item.ingredientId}|${item.amount}|${item.unit}|${item.note || ""}`;
      const recipeSeen = seen.get(recipeId) || new Set<string>();
      if (recipeSeen.has(itemKey)) return;
      recipeSeen.add(itemKey);
      seen.set(recipeId, recipeSeen);
      grouped.set(recipeId, [...(grouped.get(recipeId) || []), item]);
    });
  return grouped;
}

function splitSteps(value: unknown) {
  const steps = text(value)
    .split("|")
    .map((step) => step.trim())
    .filter(Boolean);
  return steps.length ? steps : ["เพิ่มวิธีทำใน Google Sheet"];
}

function normalizeDriveImageUrl(value: string) {
  if (!value) return "";
  const fileId =
    /[?&]id=([^&]+)/.exec(value)?.[1] ||
    /\/file\/d\/([^/]+)/.exec(value)?.[1] ||
    /\/d\/([^/]+)/.exec(value)?.[1];
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` : value;
}

function inferImageKey(name: string, category: CategoryId) {
  const lower = name.toLowerCase();
  if (lower.includes("matcha") || name.includes("เขียว") || name.includes("มัทฉะ")) return "matcha";
  if (lower.includes("cocoa") || name.includes("โกโก้")) return "cocoa";
  if (name.includes("ชมพู")) return "pink";
  if (lower.includes("caramel") || name.includes("คาราเมล")) return "caramel";
  if (name.includes("ดำ")) return "blacktea";
  if (category === "coffee") return "caramel";
  if (category === "milk") return "pink";
  return "thai";
}

function categoryId(value: unknown): CategoryId {
  const id = text(value) as CategoryId;
  return ["all", "tea", "milk", "coffee", "soda", "smoothie", "toast", "pangyen"].includes(id) ? id : "tea";
}

function unit(value: unknown): Unit {
  const normalized = text(value) as Unit;
  return ["ml", "g", "piece"].includes(normalized) ? normalized : "ml";
}

function text(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "y"].includes(String(value).toLowerCase());
}
