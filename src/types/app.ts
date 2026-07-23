export type CategoryId = "all" | "tea" | "milk" | "coffee" | "soda" | "smoothie" | "toast" | "pangyen";

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
  addonPrice?: number;
  addonAmount?: number;
  addonUnit?: Unit;
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
  imageUrl?: string;
  status?: string;
  prepTime: number;
  sweetness: number;
  sizeOz: number;
  sellingPrice: number;
  deliveryPrice?: number;
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

export type SaleItemKind = "recipe" | "topping" | "custom";

export type SaleItem = {
  id: string;
  saleId: string;
  parentId?: string;
  itemId: string;
  kind: SaleItemKind;
  name: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  lineRevenue: number;
  lineCost: number;
  lineProfit: number;
  note?: string;
};

export type Sale = {
  id: string;
  saleDate: string;
  channel: string;
  grossRevenue: number;
  promotionName?: string;
  promotionAmount: number;
  gpRate: number;
  gpAmount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  note?: string;
  createdAt: string;
  items: SaleItem[];
};

export type DailyClosing = {
  id: string;
  businessDate: string;
  orderCount: number;
  itemCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  note?: string;
  closedAt: string;
};
