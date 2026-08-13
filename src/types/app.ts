export type CategoryId = string;

export type Unit = "ml" | "g" | "piece";

export type Category = {
  id: CategoryId;
  label: string;
  icon: string;
  color: string;
  sortOrder: number;
  countUnit: string;
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
export type PaymentMethod = "เงินสด" | "E-Payment" | "ธนาคาร" | "พร้อมเพย์";

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
  categoryId?: CategoryId;
  countUnit?: string;
  note?: string;
};

export type Sale = {
  id: string;
  saleDate: string;
  channel: string;
  paymentMethod?: PaymentMethod;
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

export type MonthlyArchiveUnitCount = {
  unit: string;
  quantity: number;
};

export type MonthlyArchiveMenu = {
  itemId: string;
  name: string;
  quantity: number;
  revenue: number;
};

export type MonthlyArchiveDay = {
  date: string;
  orderCount: number;
  itemCount: number;
  revenue: number;
  cost: number;
  profit: number;
  cashRevenue: number;
  transferRevenue: number;
  unassignedRevenue: number;
  unitCounts: MonthlyArchiveUnitCount[];
  topMenus: MonthlyArchiveMenu[];
};

export type MonthlyArchive = {
  id: string;
  monthKey: string;
  orderCount: number;
  itemCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  dailySummaries: MonthlyArchiveDay[];
  archivedAt: string;
};

export type QueueStatus = "waiting" | "preparing" | "served" | "cancelled";

export type QueueAddon = {
  id: string;
  ingredientId?: string;
  name: string;
  unitPrice?: number;
};

export type QueueItem = {
  id: string;
  queueId: string;
  recipeId: string;
  name: string;
  qty: number;
  unitPrice?: number;
  note?: string;
  addons: QueueAddon[];
};

export type QueueOrder = {
  id: string;
  queueNumber: string;
  customerName?: string;
  status: QueueStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
  servedAt?: string;
  items: QueueItem[];
};
