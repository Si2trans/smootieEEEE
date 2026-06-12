import type { CostBreakdown, Ingredient, Recipe } from "../types/app";

export function money(value: number) {
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function roundPrice(value: number) {
  return Math.ceil(value / 5) * 5;
}

export function calculateCost(recipe: Recipe, ingredients: Ingredient[]): CostBreakdown {
  const byId = new Map(ingredients.map((item) => [item.id, item]));
  let ingredientCost = 0;
  let toppingCost = 0;
  let packagingCost = 0;

  recipe.items.forEach((item) => {
    const ingredient = byId.get(item.ingredientId);
    if (!ingredient) return;
    const lineCost = ingredient.costPerUnit * item.amount;
    if (ingredient.category === "ท็อปปิ้ง") toppingCost += lineCost;
    else if (ingredient.category === "บรรจุภัณฑ์") packagingCost += lineCost;
    else ingredientCost += lineCost;
  });

  const totalCost = ingredientCost + toppingCost + packagingCost;
  const profit = recipe.sellingPrice - totalCost;
  const margin = recipe.sellingPrice > 0 ? (profit / recipe.sellingPrice) * 100 : 0;

  return { ingredientCost, toppingCost, packagingCost, totalCost, profit, margin };
}
