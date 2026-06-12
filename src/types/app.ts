export type CategoryId = "all" | "tea" | "milk" | "coffee" | "soda" | "smoothie";

export type Unit = "ml" | "g" | "piece";

export type Category = {
  id: CategoryId;
  label: string;
  icon: string;
  color: string;
};

export type Ingredient = {
  id: string;
  name: string;
  category: string;
  buyQty: number;
  buyUnit: Unit;
  buyPrice: number;
  baseUnit: Unit;
  costPerUnit: number;
  note?: string;
};

export type RecipeItem = {
  ingredientId: string;
  amount: number;
  unit: Unit;
  note?: string;
};

export type Recipe = {
  id: string;
  name: string;
  categoryId: CategoryId;
  imageKey: string;
  status?: "ขายดี" | "ใหม่";
  prepTime: number;
  sweetness: number;
  sizeOz: number;
  sellingPrice: number;
  favorite: boolean;
  rating: number;
  items: RecipeItem[];
  steps: string[];
};

export type CostBreakdown = {
  ingredientCost: number;
  toppingCost: number;
  packagingCost: number;
  totalCost: number;
  profit: number;
  margin: number;
};
