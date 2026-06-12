import { categories as mockCategories, ingredients as mockIngredients, recipes as mockRecipes } from "../data/mockData";
import type { Category, CategoryId, Ingredient, Recipe, RecipeItem, Unit } from "../types/app";

const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxyh2P5FyC4j7GTPMm5KtG1rA3xMESX3HCYCIOlh5ZkEAQvSLpNzMGBykonkFMrv5fCBQ/exec";

export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;

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

export async function fetchAppData(): Promise<AppData> {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set("action", "getBootstrapData");
  url.searchParams.set("_", String(Date.now()));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Apps Script request failed: ${response.status}`);
  }

  const data = (await response.json()) as BootstrapResponse;
  if (data.ok === false) {
    throw new Error("Apps Script returned ok=false");
  }

  return normalizeBootstrapData(data);
}

function normalizeBootstrapData(data: BootstrapResponse): AppData {
  const categories = normalizeCategories(data.categories || []);
  const ingredients = normalizeIngredients(data.ingredients || []);
  const itemsByRecipe = groupRecipeItems(data.recipeItems || []);
  const favorites = new Set((data.favorites || []).map((item) => text(item.recipe_id)));
  const recipes = normalizeRecipes(data.recipes || [], itemsByRecipe, favorites);

  return {
    categories: categories.length ? [mockCategories[0], ...categories] : mockCategories,
    ingredients: ingredients.length ? ingredients : mockIngredients,
    recipes: recipes.length ? recipes : mockRecipes
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
      const imageUrl = text(row.image_url || row.imageUrl);
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
        favorite: bool(row.favorite, false) || favorites.has(id),
        rating: number(row.rating, 4.5),
        items: itemsByRecipe.get(id) || [],
        steps: splitSteps(row.steps)
      };
    });
}

function groupRecipeItems(rows: Array<Record<string, unknown>>) {
  const grouped = new Map<string, RecipeItem[]>();
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
  return ["all", "tea", "milk", "coffee", "soda", "smoothie"].includes(id) ? id : "tea";
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
