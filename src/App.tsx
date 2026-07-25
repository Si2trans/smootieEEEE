import {
  Banknote,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coffee,
  CupSoda,
  GlassWater,
  Grid2X2,
  Home,
  KeyRound,
  Landmark,
  Milk,
  Package,
  Pencil,
  Plus,
  Copy,
  RefreshCw,
  QrCode,
  Search,
  Settings2,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Store,
  Trash2,
  WalletCards,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType, FormEvent, ReactNode, RefObject } from "react";
import cardCostBg from "./assets/UI/card-cost-bg.png";
import cardRecipesBg from "./assets/UI/card-recipes-bg.png";
import { DrinkArt } from "./components/DrinkArt";
import { RecipeCard } from "./components/RecipeCard";
import {
  authenticateAccessKey,
  clearStoredAccessKey,
  fetchAppData,
  fileToImagePayload,
  cacheAppData,
  getCachedAppData,
  getStoredAccessKey,
  isAccessDeniedError,
  safeRecipeImageUrl,
  storeAccessKey
} from "./lib/appsScriptApi";
import {
  applyQueuedMutations,
  enqueueMutation,
  flushSyncQueue,
  getPendingMutationCount,
  getSyncState,
  subscribeSyncState
} from "./lib/syncQueue";
import type { SyncState } from "./lib/syncQueue";
import { calculateCost, money, roundPrice } from "./lib/cost";
import { calculateSaleRevenue } from "./lib/sales";
import type { Category, CategoryId, DailyClosing, Ingredient, Recipe, RecipeItem, Sale, SaleItem, SaleItemKind, Unit } from "./types/app";

type Tab = "home" | "recipes" | "cost" | "ingredients" | "orders" | "sales";
type Screen = "main" | "detail" | "ingredientForm" | "recipeForm";
type IngredientFilter = "all" | "base" | "topping";
type SortMode = "latest" | "name" | "cost";
type CostMode = "formula" | "price" | "profit";
type DeliveryPricingMode = "offsetGp" | "markup";
type OrderAddon = {
  id: string;
  ingredientId?: string;
  name: string;
  price: number;
};
type OrderItem = {
  id: string;
  recipeId: string;
  name: string;
  qty: number;
  unitPrice: number;
  note: string;
  addons: OrderAddon[];
};
type PaymentMethod = "" | "เงินสด" | "E-Payment" | "ธนาคาร" | "พร้อมเพย์";
const paymentMethodOptions: Array<{
  icon: ElementType;
  value: Exclude<PaymentMethod, "">;
}> = [
  { icon: Banknote, value: "เงินสด" },
  { icon: Smartphone, value: "E-Payment" },
  { icon: Landmark, value: "ธนาคาร" },
  { icon: QrCode, value: "พร้อมเพย์" }
];
type SaleDraftItem = {
  id: string;
  parentId?: string;
  itemId: string;
  kind: SaleItemKind;
  name: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  note: string;
};
type SalesSummary = {
  date: string;
  orderCount: number;
  itemCount: number;
  revenue: number;
  cost: number;
  profit: number;
};
type ClosingReportMode = "week" | "month" | "custom";
type ReportDateRange = { start: string; end: string };
type TopSellingMenuMode = "week" | "month";
type TopSellingMenu = { itemId: string; name: string; quantity: number; revenue: number };
type ReceiptPaperPresetId = "a9max77" | "a956" | "receipt57" | "custom";
type ReceiptPaperSettings = {
  presetId: ReceiptPaperPresetId;
  paperWidthMm: number;
  paddingXMm: number;
  paddingLeftMm: number;
  paddingRightMm: number;
  paddingTopMm: number;
  paddingBottomMm: number;
  xOffsetMm: number;
  pixelRatio: number;
};

const iconMap = { Store, CupSoda, Milk, Coffee, GlassWater, Cherry: Sparkles };
const ingredientCategories = ["วัตถุดิบน้ำ", "ท็อปปิ้ง", "บรรจุภัณฑ์"];
const units: Unit[] = ["ml", "g", "piece"];
const receiptPaperStorageKey = "drink-cost-receipt-paper";
const defaultReceiptPaperSettings: ReceiptPaperSettings = {
  presetId: "a9max77",
  paperWidthMm: 77,
  paddingXMm: 0,
  paddingLeftMm: 0,
  paddingRightMm: 0,
  paddingTopMm: 5,
  paddingBottomMm: 7,
  xOffsetMm: 0,
  pixelRatio: 4
};
const receiptPaperPresets: Array<{ id: ReceiptPaperPresetId; label: string; paperWidthMm: number }> = [
  { id: "a9max77", label: "A9 Max 77mm", paperWidthMm: 77 },
  { id: "a956", label: "A9 56mm", paperWidthMm: 56 },
  { id: "receipt57", label: "57mm", paperWidthMm: 57 },
  { id: "custom", label: "กำหนดเอง", paperWidthMm: 77 }
];
const deliveryPlatforms = [
  { id: "lineman", name: "LINE MAN", fee: 30, icon: "/LINEMAN.png" },
  { id: "grab", name: "Grab", fee: 32, icon: "/GRAB.png" },
  { id: "shopeefood", name: "ShopeeFood", fee: 30, icon: "/SHOPEE_FOOD.png" }
];

function App() {
  const [cachedData] = useState(() => getCachedAppData());
  const [accessKey, setAccessKey] = useState(() => getStoredAccessKey());
  const [tab, setTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen>("main");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [ingredientFilter, setIngredientFilter] = useState<IngredientFilter>("all");
  const [costMode, setCostMode] = useState<CostMode>("formula");
  const [targetMargin, setTargetMargin] = useState(60);
  const [deliveryFee, setDeliveryFee] = useState(30);
  const [deliveryPricingMode, setDeliveryPricingMode] = useState<DeliveryPricingMode>("offsetGp");
  const [deliveryMarkup, setDeliveryMarkup] = useState(50);
  const [orderChannel, setOrderChannel] = useState("หน้าร้าน");
  const [orderCustomerName, setOrderCustomerName] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNote, setOrderNote] = useState("");
  const [orderPromotionName, setOrderPromotionName] = useState("");
  const [orderPromotionAmount, setOrderPromotionAmount] = useState(0);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<PaymentMethod>("");
  const [orderNumber, setOrderNumber] = useState(() => makeOrderNumber());
  const [orderPrintedAt, setOrderPrintedAt] = useState(() => new Date());
  const [orderSearch, setOrderSearch] = useState("");
  const [sales, setSales] = useState<Sale[]>(cachedData?.sales || []);
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>(cachedData?.dailyClosings || []);
  const [saleChannel, setSaleChannel] = useState("หน้าร้าน");
  const [saleDate, setSaleDate] = useState(() => todayKey());
  const [saleSearch, setSaleSearch] = useState("");
  const [saleItems, setSaleItems] = useState<SaleDraftItem[]>([]);
  const [saleNote, setSaleNote] = useState("");
  const [salePromotionName, setSalePromotionName] = useState("");
  const [salePromotionAmount, setSalePromotionAmount] = useState(0);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingSaleCreatedAt, setEditingSaleCreatedAt] = useState("");
  const [editingSaleOriginalDate, setEditingSaleOriginalDate] = useState("");
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [generatingReceiptPdf, setGeneratingReceiptPdf] = useState(false);
  const [generatingReceiptImage, setGeneratingReceiptImage] = useState(false);
  const [receiptPaperSettings, setReceiptPaperSettings] = useState<ReceiptPaperSettings>(() => getStoredReceiptPaperSettings());
  const [pickingCostRecipe, setPickingCostRecipe] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(cachedData?.recipes[0] || null);
  const [categoryList, setCategoryList] = useState<Category[]>(cachedData?.categories || []);
  const [recipes, setRecipes] = useState<Recipe[]>(cachedData?.recipes || []);
  const [ingredientList, setIngredientList] = useState<Ingredient[]>(cachedData?.ingredients || []);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [draftRecipe, setDraftRecipe] = useState<Recipe | null>(null);
  const [draftSourceName, setDraftSourceName] = useState("");
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(accessKey && !cachedData));
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [syncState, setSyncState] = useState<SyncState>(() => getSyncState());
  const backgroundSyncRef = useRef<Promise<void> | null>(null);
  const preferredSelectedRecipeIdRef = useRef<string | null>(null);
  const receiptPaperRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!accessKey) {
      setLoading(false);
      return;
    }
    let ignore = false;
    const unsubscribe = subscribeSyncState(setSyncState);
    const handleOnline = () => syncPendingInBackground();
    window.addEventListener("online", handleOnline);

    async function initialize() {
      try {
        if (cachedData) {
          const localData = await applyQueuedMutations(cachedData);
          if (ignore) return;
          applyData(localData, selectedRecipe?.id);
          setLoading(false);
        }

        const result = await flushSyncQueue();
        if (ignore) return;
        if (result.unauthorized) {
          lockApp();
          return;
        }
        if (!cachedData || (result.completed > 0 && result.pending === 0)) {
          const remoteData = await fetchAppData({ cache: false });
          const mergedData = await applyQueuedMutations(remoteData);
          if (ignore) return;
          cacheAppData(mergedData);
          applyData(mergedData, selectedRecipe?.id);
        }
      } catch (error) {
        if (ignore) return;
        if (handleAccessDenied(error)) return;
        console.warn(error);
        if (!cachedData) setMessage("ยังเชื่อมต่อ Google Sheet ไม่ได้ กรุณาลองใหม่อีกครั้ง");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void initialize();

    return () => {
      ignore = true;
      unsubscribe();
      window.removeEventListener("online", handleOnline);
    };
  }, [accessKey, cachedData]);

  useEffect(() => {
    localStorage.setItem(receiptPaperStorageKey, JSON.stringify(receiptPaperSettings));
  }, [receiptPaperSettings]);

  const filteredRecipes = useMemo(() => {
    const base = selectedCategory === "all" ? recipes : recipes.filter((recipe) => recipe.categoryId === selectedCategory);
    const searched = filterRecipes(base, searchQuery, categoryList);
    return searched.slice().sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name, "th");
      if (sortMode === "cost") return calculateCost(b, ingredientList).totalCost - calculateCost(a, ingredientList).totalCost;
      return 0;
    });
  }, [categoryList, ingredientList, recipes, searchQuery, selectedCategory, sortMode]);

  const selectedCost = selectedRecipe ? calculateCost(selectedRecipe, ingredientList) : null;
  const orderGrossTotal = orderItems.reduce((sum, item) => sum + orderItemTotal(item), 0);
  const orderDiscount = clampPromotionAmount(orderPromotionAmount, orderGrossTotal);
  const orderTotal = Math.max(0, orderGrossTotal - orderDiscount);
  const saleDraftTotals = calculateSaleDraftTotals(saleItems);
  const saleDiscount = clampPromotionAmount(salePromotionAmount, saleDraftTotals.revenue);
  const saleRevenue = calculateSaleRevenue(saleDraftTotals.revenue, saleDiscount, saleChannel);
  const saleTotals = {
    ...saleDraftTotals,
    ...saleRevenue,
    revenue: saleRevenue.netRevenue,
    profit: saleRevenue.netRevenue - saleDraftTotals.cost
  };

  function applyData(data: { categories: Category[]; ingredients: Ingredient[]; recipes: Recipe[]; sales?: Sale[]; dailyClosings?: DailyClosing[] }, selectedId?: string) {
    setCategoryList(data.categories);
    setIngredientList(data.ingredients);
    setRecipes(data.recipes);
    setSales(data.sales || []);
    setDailyClosings(data.dailyClosings || []);
    setSelectedRecipe((current) => data.recipes.find((recipe) => recipe.id === (selectedId || current?.id)) || data.recipes[0] || null);
  }

  function syncPendingInBackground(preferredSelectedId?: string) {
    if (preferredSelectedId) preferredSelectedRecipeIdRef.current = preferredSelectedId;
    if (backgroundSyncRef.current) return backgroundSyncRef.current;
    const run = (async () => {
      let completed = 0;
      while (true) {
        const result = await flushSyncQueue();
        completed += result.completed;
        if (result.unauthorized) {
          lockApp();
          return;
        }
        if (result.error) return;
        if (result.pending > 0) continue;
        if (completed === 0) return;
        const remoteData = await fetchAppData({ cache: false });
        if ((await getPendingMutationCount()) > 0) continue;
        const selectedId = preferredSelectedRecipeIdRef.current || selectedRecipe?.id;
        cacheAppData(remoteData);
        applyData(remoteData, selectedId);
        preferredSelectedRecipeIdRef.current = null;
        return;
      }
    })()
      .catch((error) => {
        if (!handleAccessDenied(error)) console.warn("Background sync failed", error);
      })
      .finally(() => {
        backgroundSyncRef.current = null;
      });
    backgroundSyncRef.current = run;
    return run;
  }

  async function refreshFromSheet() {
    if (refreshing) return;
    setRefreshing(true);
    setMessage("");
    try {
      const result = await flushSyncQueue();
      if (result.unauthorized) {
        lockApp();
        return;
      }
      if (result.pending > 0) throw new Error(result.error || "ยังมีรายการที่ส่งขึ้น Google Sheet ไม่สำเร็จ");
      const remoteData = await fetchAppData({ cache: false });
      if ((await getPendingMutationCount()) > 0) throw new Error("มีรายการใหม่กำลังรอซิงก์ กรุณากดรีเฟรชอีกครั้ง");
      cacheAppData(remoteData);
      applyData(remoteData, selectedRecipe?.id);
      setMessage("อัปเดตข้อมูลจาก Google Sheet แล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "อัปเดตข้อมูลไม่สำเร็จ");
    } finally {
      setRefreshing(false);
    }
  }

  function lockApp() {
    clearStoredAccessKey();
    setAccessKey("");
    setAuthMessage("กรุณาใส่รหัสลับอีกครั้ง");
    setRefreshing(false);
  }

  function handleAccessDenied(error: unknown) {
    if (!isAccessDeniedError(error)) return false;
    lockApp();
    return true;
  }

  async function submitAccessKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextAccessKey = String(form.get("accessKey") || "").trim();
    if (!nextAccessKey) return;
    setAuthenticating(true);
    setAuthMessage("");
    try {
      await authenticateAccessKey(nextAccessKey);
      storeAccessKey(nextAccessKey);
      setAccessKey(nextAccessKey);
      setLoading(!cachedData);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "ตรวจสอบรหัสลับไม่สำเร็จ");
    } finally {
      setAuthenticating(false);
    }
  }

  function applyRecipeLocally(recipe: Recipe) {
    setRecipes((current) => {
      const next = current.some((item) => item.id === recipe.id)
        ? current.map((item) => (item.id === recipe.id ? recipe : item))
        : [recipe, ...current];
      cacheAppData({ categories: categoryList, ingredients: ingredientList, recipes: next, sales, dailyClosings });
      return next;
    });
    setSelectedRecipe(recipe);
  }

  function applyIngredientLocally(ingredient: Ingredient) {
    const nextIngredients = ingredientList.some((item) => item.id === ingredient.id)
      ? ingredientList.map((item) => (item.id === ingredient.id ? ingredient : item))
      : [ingredient, ...ingredientList];
    setIngredientList(nextIngredients);
    cacheAppData({ categories: categoryList, ingredients: nextIngredients, recipes, sales, dailyClosings });
  }

  function removeRecipeLocally(recipeId: string) {
    const nextRecipes = recipes.filter((recipe) => recipe.id !== recipeId);
    setRecipes(nextRecipes);
    setSelectedRecipe((current) => (current?.id === recipeId ? nextRecipes[0] || null : current));
    cacheAppData({ categories: categoryList, ingredients: ingredientList, recipes: nextRecipes, sales, dailyClosings });
  }

  function removeIngredientLocally(ingredientId: string) {
    const nextIngredients = ingredientList.filter((ingredient) => ingredient.id !== ingredientId);
    const nextRecipes = recipes.map((recipe) => ({
      ...recipe,
      items: recipe.items.filter((item) => item.ingredientId !== ingredientId)
    }));
    setIngredientList(nextIngredients);
    setRecipes(nextRecipes);
    setSelectedRecipe((current) =>
      current
        ? {
            ...current,
            items: current.items.filter((item) => item.ingredientId !== ingredientId)
          }
        : null
    );
    cacheAppData({ categories: categoryList, ingredients: nextIngredients, recipes: nextRecipes, sales, dailyClosings });
  }

  function openRecipe(recipe: Recipe) {
    setSelectedRecipe(recipe);
    if (pickingCostRecipe) {
      setPickingCostRecipe(false);
      setTab("cost");
      setScreen("main");
      return;
    }
    setScreen("detail");
  }

  function openCostCalculator(recipe: Recipe) {
    setSelectedRecipe(recipe);
    setCostMode("price");
    setTab("cost");
    setScreen("main");
  }

  function addOrderItem(recipe: Recipe) {
    const unitPrice = orderUnitPrice(recipe, orderChannel);
    setOrderItems((current) => [
      ...current,
      {
        id: `order_${Date.now()}_${recipe.id}`,
        recipeId: recipe.id,
        name: recipe.name,
        qty: 1,
        unitPrice,
        note: "",
        addons: []
      }
    ]);
  }

  function updateOrderItem(itemId: string, patch: Partial<OrderItem>) {
    setOrderItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
              qty: Math.max(1, patch.qty ?? item.qty),
              unitPrice: Math.max(0, patch.unitPrice ?? item.unitPrice)
            }
          : item
      )
    );
  }

  function removeOrderItem(itemId: string) {
    setOrderItems((current) => current.filter((item) => item.id !== itemId));
  }

  function addOrderAddon(itemId: string) {
    setOrderItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              addons: [...item.addons, { id: `addon_${Date.now()}`, name: "", price: 0 }]
            }
          : item
      )
    );
  }

  function updateOrderAddon(itemId: string, addonId: string, patch: Partial<OrderAddon>) {
    setOrderItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              addons: item.addons.map((addon) =>
                addon.id === addonId ? { ...addon, ...patch, price: Math.max(0, patch.price ?? addon.price) } : addon
              )
            }
          : item
      )
    );
  }

  function removeOrderAddon(itemId: string, addonId: string) {
    setOrderItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, addons: item.addons.filter((addon) => addon.id !== addonId) } : item
      )
    );
  }

  function addSaleRecipe(recipe: Recipe) {
    const cost = calculateCost(recipe, ingredientList).totalCost;
    const unitPrice = orderUnitPrice(recipe, saleChannel);
    setSaleItems((current) => [
      ...current,
      {
        id: `sale_draft_${Date.now()}_${recipe.id}`,
        itemId: recipe.id,
        kind: "recipe",
        name: recipe.name,
        qty: 1,
        unitPrice,
        unitCost: cost,
        note: ""
      }
    ]);
  }

  function addSaleTopping(parentId: string, ingredient: Ingredient) {
    const unitPrice = Number(ingredient.addonPrice || 0);
    const unitCost = Number(ingredient.costPerUnit || 0) * Number(ingredient.addonAmount || 0);
    setSaleItems((current) => [
      ...current,
      {
        id: `sale_draft_${Date.now()}_${ingredient.id}`,
        parentId,
        itemId: ingredient.id,
        kind: "topping",
        name: ingredient.name,
        qty: 1,
        unitPrice,
        unitCost,
        note: ""
      }
    ]);
  }

  function updateSaleItem(itemId: string, patch: Partial<SaleDraftItem>) {
    setSaleItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
              qty: Math.max(1, patch.qty ?? item.qty),
              unitPrice: Math.max(0, patch.unitPrice ?? item.unitPrice),
              unitCost: Math.max(0, patch.unitCost ?? item.unitCost)
            }
          : item
      )
    );
  }

  function removeSaleItem(itemId: string) {
    setSaleItems((current) => current.filter((item) => item.id !== itemId && item.parentId !== itemId));
  }

  function storeSalesLocally(nextSales: Sale[], nextClosings = dailyClosings) {
    setSales(nextSales);
    setDailyClosings(nextClosings);
    cacheAppData({ categories: categoryList, ingredients: ingredientList, recipes, sales: nextSales, dailyClosings: nextClosings });
  }

  async function refreshExistingClosings(dates: string[], nextSales: Sale[]) {
    let nextClosings = dailyClosings;
    for (const date of Array.from(new Set(dates.filter(Boolean)))) {
      const existing = nextClosings.find((closing) => closing.businessDate === date);
      if (!existing) continue;
      const summary = summarizeSales(nextSales, date);
      const closing: DailyClosing = {
        ...existing,
        orderCount: summary.orderCount,
        itemCount: summary.itemCount,
        totalRevenue: summary.revenue,
        totalCost: summary.cost,
        totalProfit: summary.profit,
        closedAt: new Date().toISOString()
      };
      await enqueueMutation({ action: "saveDailyClosing", entityId: closing.id, payload: closing });
      nextClosings = nextClosings.map((item) => (item.id === closing.id ? closing : item));
    }
    storeSalesLocally(nextSales, nextClosings);
  }

  function resetSaleEditor() {
    setSaleItems([]);
    setSaleNote("");
    setSalePromotionName("");
    setSalePromotionAmount(0);
    setEditingSaleId(null);
    setEditingSaleCreatedAt("");
    setEditingSaleOriginalDate("");
  }

  function editSale(sale: Sale) {
    setSaleItems(
      sale.items.map((item) => ({
        id: item.id,
        parentId: item.parentId,
        itemId: item.itemId,
        kind: item.kind,
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        note: item.note || ""
      }))
    );
    setSaleDate(sale.saleDate);
    setSaleChannel(sale.channel);
    setSaleNote(sale.note || "");
    setSalePromotionName(sale.promotionName || "");
    setSalePromotionAmount(sale.promotionAmount || 0);
    setEditingSaleId(sale.id);
    setEditingSaleCreatedAt(sale.createdAt);
    setEditingSaleOriginalDate(sale.saleDate);
    window.requestAnimationFrame(() => contentRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  }

  async function removeSale(sale: Sale) {
    if (!window.confirm(`ลบยอดขาย ${money(sale.totalRevenue)} บาท รายการนี้ใช่ไหม?`)) return;
    setSaving(true);
    setMessage("");
    try {
      await enqueueMutation({ action: "deleteSale", entityId: sale.id, payload: { id: sale.id } });
      const nextSales = sales.filter((item) => item.id !== sale.id);
      if (editingSaleId === sale.id) resetSaleEditor();
      await refreshExistingClosings([sale.saleDate], nextSales);
      setMessage("ลบรายการขายแล้ว");
      void syncPendingInBackground();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ลบรายการขายไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function applyDailyClosingLocally(closing: DailyClosing) {
    const nextClosings = dailyClosings.some((item) => item.id === closing.id)
      ? dailyClosings.map((item) => (item.id === closing.id ? closing : item))
      : [closing, ...dailyClosings];
    setDailyClosings(nextClosings);
    cacheAppData({ categories: categoryList, ingredients: ingredientList, recipes, sales, dailyClosings: nextClosings });
  }

  async function submitSale() {
    if (!saleItems.length) {
      setMessage("เพิ่มรายการขายก่อนบันทึก");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const now = Date.now();
      const saleId = editingSaleId || `sale_${now}`;
      const itemIdMap = new Map(
        saleItems.map((item, index) => [item.id, item.id.startsWith("sale_draft_") ? `sitem_${now}_${index}` : item.id])
      );
      const items: SaleItem[] = saleItems.map((item, index) => {
        const multiplier = saleItemMultiplier(item, saleItems);
        const lineRevenue = multiplier * item.unitPrice;
        const lineCost = multiplier * item.unitCost;
        return {
          id: itemIdMap.get(item.id) || `sitem_${now}_${index}`,
          saleId,
          parentId: item.parentId ? itemIdMap.get(item.parentId) || item.parentId : undefined,
          itemId: item.itemId,
          kind: item.kind,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost,
          lineRevenue,
          lineCost,
          lineProfit: lineRevenue - lineCost,
          note: item.note
        };
      });
      const sale: Sale = {
        id: saleId,
        saleDate: saleDate || todayKey(),
        channel: saleChannel,
        grossRevenue: saleTotals.grossRevenue,
        promotionName: saleTotals.promotionAmount > 0 ? salePromotionName.trim() : "",
        promotionAmount: saleTotals.promotionAmount,
        gpRate: saleTotals.gpRate,
        gpAmount: saleTotals.gpAmount,
        totalRevenue: saleTotals.revenue,
        totalCost: saleTotals.cost,
        totalProfit: saleTotals.profit,
        note: saleNote,
        createdAt: editingSaleCreatedAt || new Date().toISOString(),
        items
      };
      await enqueueMutation({ action: "saveSale", entityId: sale.id, payload: sale });
      const nextSales = sales.some((item) => item.id === sale.id)
        ? sales.map((item) => (item.id === sale.id ? sale : item))
        : [sale, ...sales];
      await refreshExistingClosings([editingSaleOriginalDate, sale.saleDate], nextSales);
      const wasEditing = Boolean(editingSaleId);
      resetSaleEditor();
      setMessage(wasEditing ? "บันทึกการแก้ไขแล้ว" : "บันทึกรายการขายแล้ว");
      void syncPendingInBackground();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกยอดขายไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function closeSalesDay(summary: SalesSummary) {
    setSaving(true);
    setMessage("");
    try {
      const existingClosing = dailyClosings.find((closing) => closing.businessDate === summary.date);
      const closing: DailyClosing = {
        id: existingClosing?.id || `close_${summary.date}_${Date.now()}`,
        businessDate: summary.date,
        orderCount: summary.orderCount,
        itemCount: summary.itemCount,
        totalRevenue: summary.revenue,
        totalCost: summary.cost,
        totalProfit: summary.profit,
        note: "",
        closedAt: new Date().toISOString()
      };
      await enqueueMutation({ action: "saveDailyClosing", entityId: closing.id, payload: closing });
      applyDailyClosingLocally(closing);
      setMessage("บันทึกปิดร้านแล้ว");
      void syncPendingInBackground();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกปิดร้านไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function printOrderReceipt() {
    if (!orderItems.length) {
      setMessage("เพิ่มเมนูในออเดอร์ก่อนสร้างบิล");
      return;
    }
    if (!orderPaymentMethod) {
      setMessage("เลือกวิธีชำระเงินก่อนสร้างบิล");
      return;
    }
    setMessage("");
    if (!orderNumber.trim()) setOrderNumber(makeOrderNumber());
    setOrderPrintedAt(new Date());
    setReceiptPreviewOpen(true);
  }

  async function renderReceiptImage() {
    const paper = receiptPaperRef.current;
    if (!paper) throw new Error("Receipt preview is not ready.");

    const { toPng } = await import("html-to-image");
    const bounds = paper.getBoundingClientRect();
    const rawDataUrl = await toPng(paper, {
      backgroundColor: "#ffffff",
      cacheBust: true,
      pixelRatio: receiptPaperSettings.pixelRatio
    });
    const dataUrl = await shiftImageDataUrl(rawDataUrl, receiptPaperSettings.xOffsetMm, bounds.width, receiptPaperSettings.paperWidthMm);

    return { dataUrl, heightPx: bounds.height, widthPx: bounds.width };
  }

  async function exportReceiptImage() {
    if (!receiptPaperRef.current || generatingReceiptImage) return;

    setGeneratingReceiptImage(true);
    setMessage("");
    try {
      const { dataUrl } = await renderReceiptImage();
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `receipt-${sanitizeFileName(orderNumber.trim() || makeOrderNumber())}.png`;
      link.click();
    } catch (error) {
      console.error(error);
      setMessage("บันทึกรูปไม่สำเร็จ ลองเปิดบิลใหม่อีกครั้ง");
    } finally {
      setGeneratingReceiptImage(false);
    }
  }

  async function exportReceiptPdf() {
    if (!receiptPaperRef.current || generatingReceiptPdf) return;

    setGeneratingReceiptPdf(true);
    setMessage("");
    try {
      const [{ dataUrl, heightPx, widthPx }, { jsPDF }] = await Promise.all([renderReceiptImage(), import("jspdf")]);
      const paperWidthMm = receiptPaperSettings.paperWidthMm;
      const paperHeightMm = Math.max(30, (heightPx / widthPx) * paperWidthMm);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [paperWidthMm, paperHeightMm]
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, paperWidthMm, paperHeightMm);
      pdf.save(`receipt-${sanitizeFileName(orderNumber.trim() || makeOrderNumber())}.pdf`);
    } catch (error) {
      console.error(error);
      setMessage("สร้าง PDF ไม่สำเร็จ ลองเปิดบิลใหม่อีกครั้ง");
    } finally {
      setGeneratingReceiptPdf(false);
    }
  }

  async function submitIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const buyQty = Number(form.get("buyQty") || 1);
    const buyPrice = Number(form.get("buyPrice") || 0);
    const buyUnit = String(form.get("buyUnit") || "ml") as Unit;
    const baseUnit = String(form.get("baseUnit") || buyUnit) as Unit;
    try {
      const ingredient: Ingredient = {
        id: editingIngredient?.id || `ing_${Date.now()}`,
        name: String(form.get("name") || "วัตถุดิบใหม่"),
        category: String(form.get("category") || "วัตถุดิบน้ำ"),
        buyQty,
        buyUnit,
        buyPrice,
        baseUnit,
        costPerUnit: buyQty > 0 ? buyPrice / buyQty : 0,
        addonPrice: Number(form.get("addonPrice") || 0),
        addonAmount: Number(form.get("addonAmount") || 0),
        addonUnit: String(form.get("addonUnit") || baseUnit) as Unit,
        note: String(form.get("note") || "")
      };
      await enqueueMutation({ action: "saveIngredient", entityId: ingredient.id, payload: ingredient });
      applyIngredientLocally(ingredient);
      setEditingIngredient(null);
      setTab("ingredients");
      setScreen("main");
      void syncPendingInBackground();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกวัตถุดิบไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function submitRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const file = form.get("image");
    const recipeSource = editingRecipe ?? draftRecipe;
    let imageUrl = safeRecipeImageUrl(editingRecipe?.imageUrl);
    try {
      const imagePayload = file instanceof File && file.size > 0 ? await fileToImagePayload(file) : null;
      if (file instanceof File && file.size > 0) {
        imageUrl = imagePayload ? `data:${imagePayload.mimeType};base64,${imagePayload.base64}` : imageUrl;
      }
      const recipeId = editingRecipe?.id || `rec_${Date.now()}`;
      const itemIngredientIds = form.getAll("itemIngredientId").map(String);
      const itemIngredientNames = form.getAll("itemIngredientName").map(String);
      const itemAmounts = form.getAll("itemAmount").map((value) => Number(value || 0));
      const itemUnits = form.getAll("itemUnit").map(String);
      const itemNotes = form.getAll("itemNote").map(String);
      const submittedCategoryId = String(form.get("categoryId") || "");
      const categoryId = categoryList.some((category) => category.id === submittedCategoryId)
        ? (submittedCategoryId as CategoryId)
        : recipeSource?.categoryId || "tea";
      const items: RecipeItem[] = itemIngredientIds
        .map((ingredientId, index) => {
          const typedName = itemIngredientNames[index]?.trim().toLowerCase() || "";
          const ingredient =
            ingredientList.find((row) => row.id === ingredientId) ||
            ingredientList.find((row) => row.name.trim().toLowerCase() === typedName) ||
            ingredientList.find((row) => typedName && row.name.toLowerCase().includes(typedName));
          return {
            ingredientId: ingredient?.id || ingredientId,
            amount: itemAmounts[index] || 0,
            unit: (itemUnits[index] || ingredient?.baseUnit || "ml") as Unit,
            note: itemNotes[index] || ""
          };
        })
        .filter((item) => item.ingredientId && item.amount > 0);
      const savedRecipe: Recipe = {
        id: recipeId,
        name: String(form.get("name") || "สูตรใหม่"),
        categoryId,
        imageKey: recipeSource?.imageKey || "thai",
        imageUrl,
        status: String(form.get("status") || ""),
        prepTime: recipeSource?.prepTime || 0,
        sweetness: recipeSource?.sweetness || 0,
        sizeOz: recipeSource?.sizeOz || 0,
        sellingPrice: Number(form.get("sellingPrice") || 35),
        deliveryPrice: Number(form.get("deliveryPrice") || form.get("sellingPrice") || 35),
        favorite: editingRecipe?.favorite || false,
        rating: editingRecipe?.rating || 4.5,
        items,
        steps: String(form.get("steps") || "")
          .split("\n")
          .map((step) => step.trim())
          .filter(Boolean)
      };
      await enqueueMutation(
        imagePayload
          ? {
              action: "saveRecipeWithImage",
              entityId: recipeId,
              payload: { recipe: { ...savedRecipe, imageUrl: safeRecipeImageUrl(editingRecipe?.imageUrl) }, image: imagePayload }
            }
          : { action: "saveRecipe", entityId: recipeId, payload: savedRecipe }
      );
      applyRecipeLocally(savedRecipe);
      setEditingRecipe(null);
      setDraftRecipe(null);
      setDraftSourceName("");
      setScreen("detail");
      void syncPendingInBackground(savedRecipe.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกสูตรไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function removeRecipe(recipeId: string) {
    if (!window.confirm("ลบสูตรนี้ออกจากแอปใช่ไหม?")) return;
    setSaving(true);
    setMessage("");
    try {
      await enqueueMutation({ action: "deleteRecipe", entityId: recipeId, payload: { id: recipeId } });
      removeRecipeLocally(recipeId);
      setTab("recipes");
      setScreen("main");
      void syncPendingInBackground();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ลบสูตรไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function removeIngredient(ingredientId: string) {
    if (!window.confirm("ลบวัตถุดิบนี้ใช่ไหม?")) return;
    setSaving(true);
    setMessage("");
    try {
      await enqueueMutation({ action: "deleteIngredient", entityId: ingredientId, payload: { id: ingredientId } });
      removeIngredientLocally(ingredientId);
      void syncPendingInBackground();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ลบวัตถุดิบไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function startAddRecipe() {
    setEditingRecipe(null);
    setDraftRecipe(null);
    setDraftSourceName("");
    setMessage("");
    setScreen("recipeForm");
  }

  function startEditRecipe(recipe: Recipe) {
    setEditingRecipe(recipe);
    setDraftRecipe(null);
    setDraftSourceName("");
    setMessage("");
    setScreen("recipeForm");
  }

  function startDuplicateRecipe(recipe: Recipe) {
    setEditingRecipe(null);
    setDraftRecipe({
      ...recipe,
      id: "",
      name: "",
      imageUrl: "",
      favorite: false,
      rating: 4.5,
      items: recipe.items.map((item) => ({ ...item })),
      steps: [...recipe.steps]
    });
    setDraftSourceName(recipe.name);
    setMessage("");
    setScreen("recipeForm");
  }

  function startAddIngredient() {
    setEditingIngredient(null);
    setMessage("");
    setScreen("ingredientForm");
  }

  function startEditIngredient(ingredient: Ingredient) {
    setEditingIngredient(ingredient);
    setMessage("");
    setScreen("ingredientForm");
  }

  if (!accessKey) {
    return <AccessGate authenticating={authenticating} message={authMessage} onSubmit={submitAccessKey} />;
  }

  return (
    <div className="app-shell">
      <div className="phone">
        {screen === "detail" && selectedRecipe ? (
          <RecipeDetail
            recipe={selectedRecipe}
            ingredients={ingredientList}
            saving={saving}
            onBack={() => setScreen("main")}
            onCalculate={openCostCalculator}
            onDelete={removeRecipe}
            onDuplicate={startDuplicateRecipe}
            onEdit={startEditRecipe}
          />
        ) : screen === "ingredientForm" ? (
          <IngredientForm
            ingredient={editingIngredient}
            message={message}
            saving={saving}
            onBack={() => setScreen("main")}
            onSubmit={submitIngredient}
          />
        ) : screen === "recipeForm" ? (
          <RecipeForm
            key={editingRecipe?.id || (draftSourceName ? `duplicate-${draftSourceName}` : "new-recipe")}
            categories={categoryList}
            ingredients={ingredientList}
            isDuplicate={Boolean(draftRecipe && !editingRecipe)}
            message={message}
            recipe={editingRecipe ?? draftRecipe}
            saving={saving}
            sourceName={draftSourceName}
            onBack={() => setScreen("main")}
            onSubmit={submitRecipe}
          />
        ) : (
          <>
            <main className="content" ref={contentRef}>
              <SyncStatusBar onRefresh={refreshFromSheet} refreshing={refreshing} state={syncState} />
              {message ? <div className="status-banner">{message}</div> : null}
              {loading ? (
                <LoadingScreen />
              ) : tab === "home" ? (
                <HomeScreen
                  categories={categoryList}
                  recipes={recipes}
                  searchQuery={searchQuery}
                  onCategory={(category) => {
                    setSelectedCategory(category);
                    setTab("recipes");
                  }}
                  onNavigate={setTab}
                  onOpen={openRecipe}
                  onSearch={setSearchQuery}
                />
              ) : tab === "recipes" ? (
                <RecipesScreen
                  categories={categoryList}
                  pickingCostRecipe={pickingCostRecipe}
                  recipes={filteredRecipes}
                  searchQuery={searchQuery}
                  sortMode={sortMode}
                  selectedCategory={selectedCategory}
                  onCategory={setSelectedCategory}
                  onOpen={openRecipe}
                  onSearch={setSearchQuery}
                  onSort={() => setSortMode((mode) => (mode === "latest" ? "name" : mode === "name" ? "cost" : "latest"))}
                />
              ) : tab === "orders" ? (
                <OrderScreen
                  channel={orderChannel}
                  customerName={orderCustomerName}
                  ingredients={ingredientList}
                  items={orderItems}
                  note={orderNote}
                  orderNumber={orderNumber}
                  paymentMethod={orderPaymentMethod}
                  promotionAmount={orderPromotionAmount}
                  promotionName={orderPromotionName}
                  recipes={recipes}
                  searchQuery={orderSearch}
                  grossTotal={orderGrossTotal}
                  total={orderTotal}
                  onAddItem={addOrderItem}
                  onAddAddon={addOrderAddon}
                  onChannel={setOrderChannel}
                  onClear={() => {
                    setOrderItems([]);
                    setOrderPaymentMethod("");
                    setOrderPromotionName("");
                    setOrderPromotionAmount(0);
                  }}
                  onCustomerName={setOrderCustomerName}
                  onNote={setOrderNote}
                  onOrderNumber={setOrderNumber}
                  onPaymentMethod={setOrderPaymentMethod}
                  onPromotionAmount={setOrderPromotionAmount}
                  onPromotionName={setOrderPromotionName}
                  onPrint={printOrderReceipt}
                  onRemoveItem={removeOrderItem}
                  onRemoveAddon={removeOrderAddon}
                  onSearch={setOrderSearch}
                  onUpdateAddon={updateOrderAddon}
                  onUpdateItem={updateOrderItem}
                />
              ) : tab === "sales" ? (
                <SalesScreen
                  channels={["หน้าร้าน", "LINE MAN", "Grab", "ShopeeFood", "อื่นๆ"]}
                  channel={saleChannel}
                  closings={dailyClosings}
                  date={saleDate}
                  ingredients={ingredientList}
                  items={saleItems}
                  note={saleNote}
                  promotionAmount={salePromotionAmount}
                  promotionName={salePromotionName}
                  recipes={recipes}
                  sales={sales}
                  saving={saving}
                  searchQuery={saleSearch}
                  totals={saleTotals}
                  editingSaleId={editingSaleId}
                  onAddRecipe={addSaleRecipe}
                  onAddTopping={addSaleTopping}
                  onChannel={setSaleChannel}
                  onCancelEdit={resetSaleEditor}
                  onClear={resetSaleEditor}
                  onCloseDay={closeSalesDay}
                  onDeleteSale={removeSale}
                  onDate={setSaleDate}
                  onNote={setSaleNote}
                  onEditSale={editSale}
                  onPromotionAmount={setSalePromotionAmount}
                  onPromotionName={setSalePromotionName}
                  onRemoveItem={removeSaleItem}
                  onSearch={setSaleSearch}
                  onSubmit={submitSale}
                  onUpdateItem={updateSaleItem}
                />
              ) : tab === "cost" && selectedRecipe && selectedCost ? (
                <CostScreen
                  cost={selectedCost}
                  costMode={costMode}
                  deliveryFee={deliveryFee}
                  deliveryMarkup={deliveryMarkup}
                  deliveryPricingMode={deliveryPricingMode}
                  ingredients={ingredientList}
                  recipe={selectedRecipe}
                  targetMargin={targetMargin}
                  onChangeMode={setCostMode}
                  onDeliveryMarkup={setDeliveryMarkup}
                  onChangeRecipe={() => {
                    setPickingCostRecipe(true);
                    setTab("recipes");
                  }}
                  onDeliveryFee={setDeliveryFee}
                  onDeliveryPricingMode={setDeliveryPricingMode}
                  onMargin={setTargetMargin}
                />
              ) : tab === "cost" ? (
                <section className="loading-state">
                  <div className="loading-state__icon">
                    <WalletCards size={34} />
                  </div>
                  <h1>ยังไม่มีสูตรสำหรับคำนวณต้นทุน</h1>
                  <p>เพิ่มสูตรเครื่องดื่มก่อน แล้วจึงเลือกสูตรที่ต้องการคำนวณ</p>
                </section>
              ) : (
                <IngredientsScreen
                  filter={ingredientFilter}
                  ingredients={ingredientList}
                  saving={saving}
                  onAdd={startAddIngredient}
                  onDelete={removeIngredient}
                  onEdit={startEditIngredient}
                  onFilter={setIngredientFilter}
                />
              )}
            </main>
            <BottomNav active={tab} onAdd={startAddRecipe} onChange={setTab} />
            <OrderReceipt
              channel={orderChannel}
              customerName={orderCustomerName}
              isGeneratingImage={generatingReceiptImage}
              items={orderItems}
              isGeneratingPdf={generatingReceiptPdf}
              note={orderNote}
              paymentMethod={orderPaymentMethod}
              promotionAmount={orderDiscount}
              promotionName={orderPromotionName}
              onClose={() => setReceiptPreviewOpen(false)}
              onExportImage={exportReceiptImage}
              onExportPdf={exportReceiptPdf}
              orderNumber={orderNumber.trim() || makeOrderNumber()}
              previewOpen={receiptPreviewOpen}
              printedAt={orderPrintedAt}
              receiptRef={receiptPaperRef}
              settings={receiptPaperSettings}
              onSettingsChange={setReceiptPaperSettings}
              grossTotal={orderGrossTotal}
              total={orderTotal}
            />
          </>
        )}
      </div>
    </div>
  );
}

function AccessGate({
  authenticating,
  message,
  onSubmit
}: {
  authenticating: boolean;
  message: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="app-shell">
      <div className="phone">
        <main className="access-screen">
          <div className="access-screen__icon">
            <KeyRound size={30} />
          </div>
          <div>
            <h1>Drink Cost Studio</h1>
            <p>ใส่รหัสลับของร้านเพื่อเปิดใช้งานบนเครื่องนี้</p>
          </div>
          <form onSubmit={onSubmit}>
            {message ? <div className="status-banner" role="alert">{message}</div> : null}
            <label>
              รหัสลับ
              <input autoComplete="current-password" minLength={8} name="accessKey" placeholder="รหัสลับของร้าน" required type="password" />
            </label>
            <button disabled={authenticating} type="submit">
              {authenticating ? "กำลังตรวจสอบ..." : "เปิดใช้งาน"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}

function HomeScreen({
  categories,
  recipes,
  searchQuery,
  onCategory,
  onOpen,
  onNavigate,
  onSearch
}: {
  categories: Category[];
  recipes: Recipe[];
  searchQuery: string;
  onCategory: (category: CategoryId) => void;
  onOpen: (recipe: Recipe) => void;
  onNavigate: (tab: Tab) => void;
  onSearch: (query: string) => void;
}) {
  const homeRecipes = filterRecipes(recipes, searchQuery, categories);
  return (
    <>
      <header className="home-header">
        <div>
          <h1>สวัสดี</h1>
          <p>วันนี้ขายดี ๆ ปัง ๆ นะ</p>
        </div>
      </header>
      <div className="search-row">
        <label className="search-box">
          <Search size={18} />
          <input
            onChange={(event) => onSearch(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onNavigate("recipes");
            }}
            placeholder="ค้นหาเมนู เช่น ชาไทย, โกโก้, นมสด..."
            value={searchQuery}
          />
        </label>
        <button className="icon-button" onClick={() => onNavigate("ingredients")} type="button">
          <SlidersHorizontal size={19} />
        </button>
      </div>
      <section className="quick-grid">
        <button className="quick-card quick-card--green" style={{ backgroundImage: `url(${cardRecipesBg})` }} onClick={() => onNavigate("recipes")}>
          <div>
            <h3>สูตรเครื่องดื่ม</h3>
            <p>ค้นหาสูตรไว ใช้ตอนขายจริง</p>
            <span>ดูสูตรทั้งหมด</span>
          </div>
        </button>
        <button className="quick-card quick-card--orange" style={{ backgroundImage: `url(${cardCostBg})` }} onClick={() => onNavigate("cost")}>
          <div>
            <h3>คำนวณต้นทุน</h3>
            <p>เช็กกำไรก่อนขาย</p>
            <span>เริ่มคำนวณ</span>
          </div>
        </button>
      </section>
      <SectionTitle action="ดูทั้งหมด" title="หมวดหมู่เครื่องดื่ม" onAction={() => onNavigate("recipes")} />
      <div className="category-strip">
        {categories.slice(1).map((category) => {
          const Icon = iconMap[category.icon as keyof typeof iconMap] ?? Store;
          return (
            <button className="category-chip" key={category.id} onClick={() => onCategory(category.id)} type="button">
              <span style={{ background: category.color }}>
                <Icon size={18} />
              </span>
              {category.label}
            </button>
          );
        })}
      </div>
      <SectionTitle action="ดูทั้งหมด" title={searchQuery.trim() ? "ผลการค้นหา" : "เมนูทั้งหมด"} onAction={() => onNavigate("recipes")} />
      <div className="horizontal-cards">
        {homeRecipes.map((recipe) => (
          <button className="mini-card" key={recipe.id} onClick={() => onOpen(recipe)} type="button">
            <DrinkArt compact imageKey={recipe.imageKey} imageUrl={recipe.imageUrl} />
            <strong>{recipe.name}</strong>
          </button>
        ))}
      </div>
      {!homeRecipes.length ? (
        <p className="empty-text">{searchQuery.trim() ? "ไม่พบเมนูที่ค้นหา" : "ยังไม่มีสูตรเครื่องดื่ม"}</p>
      ) : null}
    </>
  );
}

function SyncStatusBar({
  onRefresh,
  refreshing,
  state
}: {
  onRefresh: () => void;
  refreshing: boolean;
  state: SyncState;
}) {
  const busy = refreshing || state.syncing;
  const label = refreshing
    ? "กำลังดึงข้อมูลจาก Google Sheet..."
    : state.syncing
      ? `กำลังซิงก์ ${state.pendingCount} รายการ...`
      : state.lastError
        ? `${state.pendingCount} รายการซิงก์ไม่สำเร็จ`
        : state.pendingCount > 0
          ? `${state.pendingCount} รายการรอซิงก์`
          : state.lastSyncedAt
            ? "ซิงก์แล้ว"
            : "ข้อมูลในเครื่องพร้อมใช้";
  const tone = state.lastError ? " sync-status--error" : state.pendingCount > 0 || busy ? " sync-status--pending" : "";

  return (
    <div aria-live="polite" className={`sync-status${tone}`} role="status">
      <span>
        <CheckCircle2 size={15} />
        {label}
      </span>
      <button aria-label="รีเฟรชข้อมูลจาก Google Sheet" disabled={busy} onClick={onRefresh} title="รีเฟรชข้อมูลจาก Google Sheet" type="button">
        <RefreshCw className={busy ? "is-spinning" : ""} size={16} />
      </button>
    </div>
  );
}

function LoadingScreen() {
  return (
    <section className="loading-state">
      <div className="loading-state__icon">
        <CupSoda size={34} />
      </div>
      <h1>กำลังโหลดข้อมูลร้าน</h1>
      <p>ดึงสูตร วัตถุดิบ และรูปเมนูจาก Google Sheet</p>
    </section>
  );
}

function RecipesScreen({
  categories,
  pickingCostRecipe,
  selectedCategory,
  onCategory,
  recipes,
  searchQuery,
  sortMode,
  onOpen,
  onSearch,
  onSort
}: {
  categories: Category[];
  pickingCostRecipe: boolean;
  selectedCategory: CategoryId;
  onCategory: (category: CategoryId) => void;
  recipes: Recipe[];
  searchQuery: string;
  sortMode: SortMode;
  onOpen: (recipe: Recipe) => void;
  onSearch: (query: string) => void;
  onSort: () => void;
}) {
  const sortLabel = sortMode === "latest" ? "ล่าสุด" : sortMode === "name" ? "ชื่อเมนู" : "ต้นทุนสูง";
  return (
    <>
      <TopTitle right={<Search size={22} />} title={pickingCostRecipe ? "เลือกเมนูคำนวณ" : "สูตร"} />
      {pickingCostRecipe ? <div className="status-banner">แตะสูตรที่ต้องการ แล้วแอปจะกลับไปหน้าคำนวณต้นทุน</div> : null}
      <label className="search-box search-box--screen">
        <Search size={18} />
        <input
          onChange={(event) => onSearch(event.currentTarget.value)}
          placeholder="ค้นหาเมนู..."
          value={searchQuery}
        />
      </label>
      <div className="category-filter">
        {categories.map((category) => {
          const Icon = iconMap[category.icon as keyof typeof iconMap] ?? Store;
          return (
            <button className={selectedCategory === category.id ? "is-active" : ""} key={category.id} onClick={() => onCategory(category.id)} type="button">
              <span style={{ background: category.color }}>
                <Icon size={18} />
              </span>
              {category.label}
            </button>
          );
        })}
      </div>
      <div className="list-meta">
        <span>ทั้งหมด {recipes.length} เมนู</span>
        <button className="sort-button" onClick={onSort} type="button">
          {sortLabel} <ChevronDown size={14} />
        </button>
      </div>
      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} onOpen={onOpen} />
        ))}
      </div>
    </>
  );
}

function OrderScreen({
  channel,
  customerName,
  ingredients,
  items,
  note,
  orderNumber,
  paymentMethod,
  promotionAmount,
  promotionName,
  recipes,
  searchQuery,
  grossTotal,
  total,
  onAddAddon,
  onAddItem,
  onChannel,
  onClear,
  onCustomerName,
  onNote,
  onOrderNumber,
  onPaymentMethod,
  onPromotionAmount,
  onPromotionName,
  onPrint,
  onRemoveAddon,
  onRemoveItem,
  onSearch,
  onUpdateAddon,
  onUpdateItem
}: {
  channel: string;
  customerName: string;
  ingredients: Ingredient[];
  items: OrderItem[];
  note: string;
  orderNumber: string;
  paymentMethod: PaymentMethod;
  promotionAmount: number;
  promotionName: string;
  recipes: Recipe[];
  searchQuery: string;
  grossTotal: number;
  total: number;
  onAddAddon: (itemId: string) => void;
  onAddItem: (recipe: Recipe) => void;
  onChannel: (channel: string) => void;
  onClear: () => void;
  onCustomerName: (name: string) => void;
  onNote: (note: string) => void;
  onOrderNumber: (value: string) => void;
  onPaymentMethod: (value: PaymentMethod) => void;
  onPromotionAmount: (value: number) => void;
  onPromotionName: (value: string) => void;
  onPrint: () => void;
  onRemoveAddon: (itemId: string, addonId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onSearch: (query: string) => void;
  onUpdateAddon: (itemId: string, addonId: string, patch: Partial<OrderAddon>) => void;
  onUpdateItem: (itemId: string, patch: Partial<OrderItem>) => void;
}) {
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const normalizedOrderSearch = searchQuery.trim().toLowerCase();
  const visibleRecipes = recipes
    .filter((recipe) => recipe.name.toLowerCase().includes(normalizedOrderSearch))
    .slice(0, normalizedOrderSearch ? 12 : 3);
  const toppingIngredients = ingredients.filter((ingredient) => ingredient.category === "ท็อปปิ้ง");
  const channels = ["หน้าร้าน", "LINE MAN", "Grab", "ShopeeFood", "อื่นๆ"];

  function updateAddonName(itemId: string, addonId: string, value: string) {
    const normalized = value.trim().toLowerCase();
    const topping = toppingIngredients.find((ingredient) => ingredient.name.trim().toLowerCase() === normalized);
    onUpdateAddon(
      itemId,
      addonId,
      topping
        ? { ingredientId: topping.id, name: topping.name, price: Number(topping.addonPrice || 0) }
        : { ingredientId: undefined, name: value }
    );
  }

  return (
    <>
      <TopTitle title="ออเดอร์" />
      <section className="order-panel">
        <label>
          เลขออเดอร์
          <input onChange={(event) => onOrderNumber(event.currentTarget.value)} placeholder="#BH-143025" value={orderNumber} />
        </label>
        <label>
          ชื่อลูกค้า
          <input onChange={(event) => onCustomerName(event.currentTarget.value)} placeholder="เช่น พลอย" value={customerName} />
        </label>
        <div className="order-channel-row">
          {channels.map((item) => (
            <button className={channel === item ? "is-active" : ""} key={item} onClick={() => onChannel(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      </section>

      <label className="search-box search-box--screen">
        <Search size={18} />
        <input onChange={(event) => onSearch(event.currentTarget.value)} placeholder="ค้นหาเมนูเพื่อเพิ่มเข้าบิล..." value={searchQuery} />
      </label>

      <section className="order-menu-list">
        {visibleRecipes.map((recipe) => (
          <button key={recipe.id} onClick={() => onAddItem(recipe)} type="button">
            <span>
              <strong>{recipe.name}</strong>
              <small>{money(orderUnitPrice(recipe, channel))} บาท</small>
            </span>
            <Plus size={18} />
          </button>
        ))}
        {!visibleRecipes.length ? <p className="empty-text">ไม่พบเมนูที่ค้นหา</p> : null}
      </section>

      <section className="order-cart">
        <datalist id="order-topping-options">
          {toppingIngredients.map((ingredient) => (
            <option key={ingredient.id} value={ingredient.name}>{money(ingredient.addonPrice || 0)} บาท</option>
          ))}
        </datalist>
        <div className="order-cart__title">
          <h3>รายการบิล</h3>
          {items.length ? <button onClick={onClear} type="button">ล้าง</button> : null}
        </div>
        {items.map((item) => (
          <div className="order-item" key={item.id}>
            <div className="order-item__header">
              <strong>{item.name}</strong>
              <button onClick={() => onRemoveItem(item.id)} type="button">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="order-item__grid">
              <label>
                จำนวน
                <div className="qty-stepper">
                  <button
                    disabled={item.qty <= 1}
                    onClick={() => onUpdateItem(item.id, { qty: item.qty - 1 })}
                    type="button"
                  >
                    -
                  </button>
                  <strong>{item.qty}</strong>
                  <button onClick={() => onUpdateItem(item.id, { qty: item.qty + 1 })} type="button">
                    +
                  </button>
                </div>
              </label>
              <label>
                ราคา
                <input
                  min="0"
                  onChange={(event) => onUpdateItem(item.id, { unitPrice: Number(event.currentTarget.value || 0) })}
                  type="number"
                  value={item.unitPrice}
                />
              </label>
              <div>
                <span>รวม</span>
                <strong>{money(orderItemTotal(item))} บาท</strong>
              </div>
            </div>
            <div className="order-addon-section">
              {item.addons.map((addon) => (
                <div className="order-addon-row" key={addon.id}>
                  <input
                    list="order-topping-options"
                    onChange={(event) => updateAddonName(item.id, addon.id, event.currentTarget.value)}
                    placeholder="ท็อปปิ้ง"
                    value={addon.name}
                  />
                  <input
                    min="0"
                    onChange={(event) => onUpdateAddon(item.id, addon.id, { price: Number(event.currentTarget.value || 0) })}
                    placeholder="ราคา"
                    type="number"
                    value={addon.price}
                  />
                  <button onClick={() => onRemoveAddon(item.id, addon.id)} type="button">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button className="add-addon-button" onClick={() => onAddAddon(item.id)} type="button">
                <Plus size={14} /> ท็อปปิ้ง
              </button>
            </div>
            <label>
              หมายเหตุ
              <input
                onChange={(event) => onUpdateItem(item.id, { note: event.currentTarget.value })}
                placeholder="เช่น หวานน้อย แยกน้ำแข็ง"
                value={item.note}
              />
            </label>
          </div>
        ))}
        {!items.length ? <p className="empty-text">ยังไม่มีรายการในบิล แตะ + ที่เมนูเพื่อเพิ่ม</p> : null}
      </section>

      <PromotionEditor
        amount={promotionAmount}
        grossTotal={grossTotal}
        name={promotionName}
        onAmount={onPromotionAmount}
        onName={onPromotionName}
      />

      <label className="order-note">
        หมายเหตุออเดอร์
        <textarea onChange={(event) => onNote(event.currentTarget.value)} placeholder="เช่น ลูกค้าขอรับเร็ว แยกถุง" value={note} />
      </label>

      <div className="order-payment-field">
        <span className="order-payment-label">วิธีชำระเงิน</span>
        <button
          aria-expanded={paymentSheetOpen}
          aria-haspopup="dialog"
          className={`payment-selector${paymentMethod ? " is-selected" : ""}`}
          onClick={() => setPaymentSheetOpen(true)}
          type="button"
        >
          <span className="payment-selector__icon"><WalletCards size={20} /></span>
          <strong>{paymentMethod || "เลือกวิธีชำระเงิน"}</strong>
          <ChevronRight size={18} />
        </button>
      </div>

      <section className="order-summary order-summary--stacked">
        <div><span>รวมทั้งหมด</span><strong>{money(grossTotal)} บาท</strong></div>
        {promotionAmount > 0 ? (
          <div className="is-discount"><span>{promotionName.trim() || "ส่วนลดร้านค้า"}</span><strong>-{money(clampPromotionAmount(promotionAmount, grossTotal))} บาท</strong></div>
        ) : null}
        <div className="is-total"><span>ยอดรวมสุทธิ</span><strong>{money(total)} บาท</strong></div>
      </section>
      <button className="submit-button" onClick={onPrint} type="button">สร้างบิล</button>
      {paymentSheetOpen ? (
        <div className="top-menu-sheet-layer">
          <button aria-label="ปิดตัวเลือกวิธีชำระเงิน" className="top-menu-sheet-backdrop" onClick={() => setPaymentSheetOpen(false)} type="button" />
          <section aria-labelledby="payment-sheet-title" aria-modal="true" className="top-menu-sheet payment-method-sheet" role="dialog">
            <div className="top-menu-sheet__handle" />
            <div className="top-menu-sheet__header">
              <div>
                <h3 id="payment-sheet-title">วิธีชำระเงิน</h3>
                <span>เลือกสำหรับบิลนี้</span>
              </div>
              <button aria-label="ปิด" autoFocus onClick={() => setPaymentSheetOpen(false)} type="button"><X size={20} /></button>
            </div>
            <div className="payment-method-grid">
              {paymentMethodOptions.map(({ icon: Icon, value }) => {
                const selected = paymentMethod === value;
                return (
                  <button
                    aria-pressed={selected}
                    className={`payment-method-option${selected ? " is-selected" : ""}`}
                    key={value}
                    onClick={() => {
                      onPaymentMethod(value);
                      setPaymentSheetOpen(false);
                    }}
                    type="button"
                  >
                    <span className="payment-method-option__icon"><Icon size={20} /></span>
                    <strong>{value}</strong>
                    {selected ? <CheckCircle2 size={18} /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function PromotionEditor({
  amount,
  grossTotal,
  name,
  onAmount,
  onName
}: {
  amount: number;
  grossTotal: number;
  name: string;
  onAmount: (value: number) => void;
  onName: (value: string) => void;
}) {
  const active = Boolean(name || amount);
  if (!active) {
    return (
      <button className="promotion-add-button" onClick={() => onName("โปรโมชั่น")} type="button">
        <Plus size={15} /> เพิ่มโปรโมชั่น
      </button>
    );
  }

  return (
    <section className="promotion-panel">
      <div className="promotion-panel__title">
        <div><strong>โปรโมชั่น</strong><small>ใส่เฉพาะส่วนลดที่ร้านเป็นผู้รับผิดชอบ</small></div>
        <button
          aria-label="ลบโปรโมชั่น"
          onClick={() => {
            onName("");
            onAmount(0);
          }}
          type="button"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="promotion-fields">
        <label>
          ชื่อโปรโมชั่น
          <input maxLength={80} onChange={(event) => onName(event.currentTarget.value)} placeholder="เช่น ส่วนลดร้านค้า" value={name} />
        </label>
        <label>
          ส่วนลด (บาท)
          <input
            inputMode="decimal"
            max={grossTotal}
            min="0"
            onChange={(event) => onAmount(Math.max(0, Number(event.currentTarget.value || 0)))}
            type="number"
            value={amount}
          />
        </label>
      </div>
      {amount > grossTotal && grossTotal > 0 ? <small className="promotion-warning">ส่วนลดสูงกว่ายอดสินค้า ระบบจะใช้ไม่เกิน {money(grossTotal)} บาท</small> : null}
    </section>
  );
}

function SalesScreen({
  channels,
  channel,
  closings,
  date,
  ingredients,
  items,
  note,
  promotionAmount,
  promotionName,
  recipes,
  sales,
  saving,
  searchQuery,
  totals,
  editingSaleId,
  onAddRecipe,
  onAddTopping,
  onCancelEdit,
  onChannel,
  onClear,
  onCloseDay,
  onDeleteSale,
  onDate,
  onNote,
  onEditSale,
  onPromotionAmount,
  onPromotionName,
  onRemoveItem,
  onSearch,
  onSubmit,
  onUpdateItem
}: {
  channels: string[];
  channel: string;
  closings: DailyClosing[];
  date: string;
  ingredients: Ingredient[];
  items: SaleDraftItem[];
  note: string;
  promotionAmount: number;
  promotionName: string;
  recipes: Recipe[];
  sales: Sale[];
  saving: boolean;
  searchQuery: string;
  totals: ReturnType<typeof calculateSaleDraftTotals> & ReturnType<typeof calculateSaleRevenue> & { revenue: number };
  editingSaleId: string | null;
  onAddRecipe: (recipe: Recipe) => void;
  onAddTopping: (parentId: string, ingredient: Ingredient) => void;
  onCancelEdit: () => void;
  onChannel: (channel: string) => void;
  onClear: () => void;
  onCloseDay: (summary: SalesSummary) => void;
  onDeleteSale: (sale: Sale) => void;
  onDate: (date: string) => void;
  onNote: (note: string) => void;
  onEditSale: (sale: Sale) => void;
  onPromotionAmount: (value: number) => void;
  onPromotionName: (value: string) => void;
  onRemoveItem: (itemId: string) => void;
  onSearch: (query: string) => void;
  onSubmit: () => void;
  onUpdateItem: (itemId: string, patch: Partial<SaleDraftItem>) => void;
}) {
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const toppings = ingredients.filter((ingredient) => ingredient.category === "ท็อปปิ้ง" && Number(ingredient.addonPrice || 0) > 0);
  const visibleRecipes = recipes
    .filter((recipe) => recipe.name.toLowerCase().includes(normalizedSearch))
    .slice(0, normalizedSearch ? 10 : 3);
  const summary = summarizeSales(sales, date);
  const existingClosing = closings
    .filter((closing) => closing.businessDate === date)
    .sort((a, b) => b.closedAt.localeCompare(a.closedAt))[0];
  const daySales = sales
    .filter((sale) => sale.saleDate === date)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const parentItems = items.filter((item) => item.kind !== "topping");
  const childItems = items.filter((item) => item.kind === "topping");

  return (
    <>
      <TopTitle title="บันทึกขาย" />
      {editingSaleId ? (
        <section className="sale-edit-banner">
          <div><strong>กำลังแก้ไขรายการเดิม</strong><small>บันทึกแล้วจะอัปเดตรายการนี้ ไม่สร้างรายการซ้ำ</small></div>
          <button onClick={onCancelEdit} type="button">ยกเลิก</button>
        </section>
      ) : null}
      <section className="sales-panel">
        <label>
          วันที่ขาย
          <input onChange={(event) => onDate(event.currentTarget.value)} type="date" value={date} />
        </label>
        <div className="order-channel-row">
          {channels.map((item) => (
            <button className={channel === item ? "is-active" : ""} key={item} onClick={() => onChannel(item)} type="button">
              {item}
            </button>
          ))}
        </div>
      </section>

      <label className="search-box search-box--screen">
        <Search size={18} />
        <input onChange={(event) => onSearch(event.currentTarget.value)} placeholder="ค้นหาเมนูเพื่อบันทึกขาย..." value={searchQuery} />
      </label>

      <section className="sales-picker">
        <h3>เพิ่มเมนูขาย</h3>
        {visibleRecipes.map((recipe) => (
          <button key={`recipe-${recipe.id}`} onClick={() => onAddRecipe(recipe)} type="button">
            <span>
              <strong>{recipe.name}</strong>
              <small>{money(orderUnitPrice(recipe, channel))} บาท</small>
            </span>
            <Plus size={18} />
          </button>
        ))}
        {!visibleRecipes.length ? <p className="empty-text">ไม่พบเมนูที่ค้นหา</p> : null}
      </section>

      <section className="sales-cart">
        <div className="order-cart__title">
          <h3>รายการที่จะบันทึก</h3>
          {items.length ? <button onClick={onClear} type="button">ล้าง</button> : null}
        </div>
        {parentItems.map((item) => {
          const addons = childItems.filter((child) => child.parentId === item.id);
          const itemTotals = calculateSaleDraftTotals([item, ...addons]);
          return (
          <div className="sales-item" key={item.id}>
            <div className="order-item__header">
              <strong>{item.name}</strong>
              <button onClick={() => onRemoveItem(item.id)} type="button">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="order-item__grid">
              <label>
                จำนวน
                <div className="qty-stepper">
                  <button disabled={item.qty <= 1} onClick={() => onUpdateItem(item.id, { qty: item.qty - 1 })} type="button">-</button>
                  <strong>{item.qty}</strong>
                  <button onClick={() => onUpdateItem(item.id, { qty: item.qty + 1 })} type="button">+</button>
                </div>
              </label>
              <label>
                ราคาขาย
                <input min="0" onChange={(event) => onUpdateItem(item.id, { unitPrice: Number(event.currentTarget.value || 0) })} type="number" value={item.unitPrice} />
              </label>
              <div>
                <span>กำไร</span>
                <strong>{money(itemTotals.profit)} บาท</strong>
              </div>
            </div>
            <div className="order-addon-section">
              {addons.map((addon) => (
                <div className="order-addon-row" key={addon.id}>
                  <input readOnly value={addon.name} />
                  <input
                    min="0"
                    onChange={(event) => onUpdateItem(addon.id, { unitPrice: Number(event.currentTarget.value || 0) })}
                    placeholder="ราคา"
                    type="number"
                    value={addon.unitPrice}
                  />
                  <button onClick={() => onRemoveItem(addon.id)} type="button">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {toppings.length ? (
                <div className="sales-topping-picker">
                  <span>เพิ่มท็อปปิ้ง</span>
                  <div>
                    {toppings.map((ingredient) => (
                      <button key={ingredient.id} onClick={() => onAddTopping(item.id, ingredient)} type="button">
                        <Plus size={13} /> {ingredient.name} +{money(ingredient.addonPrice || 0)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="sales-item-breakdown">
              <span>น้ำ: {money(item.qty * item.unitCost)}</span>
              <span>ท็อปปิ้ง: {money(item.qty * addons.reduce((sum, addon) => sum + addon.unitCost, 0))}</span>
              <strong>รวมต้นทุน: {money(itemTotals.cost)}</strong>
            </div>
          </div>
          );
        })}
        {!parentItems.length ? <p className="empty-text">แตะ + เพื่อเพิ่มเมนูที่ขายได้</p> : null}
      </section>

      <PromotionEditor
        amount={promotionAmount}
        grossTotal={totals.grossRevenue}
        name={promotionName}
        onAmount={onPromotionAmount}
        onName={onPromotionName}
      />

      <label className="order-note">
        หมายเหตุยอดขาย
        <textarea onChange={(event) => onNote(event.currentTarget.value)} placeholder="เช่น ยอดจากสมุด หรือขายนอกรอบ" value={note} />
      </label>

      <section className="sales-summary-card">
        {totals.promotionAmount > 0 ? (
          <div>
            <span>ยอดก่อนลด</span>
            <strong>{money(totals.grossRevenue)} บาท</strong>
          </div>
        ) : null}
        {totals.promotionAmount > 0 ? (
          <div className="is-discount">
            <span>{promotionName.trim() || "โปรโมชั่น"}</span>
            <strong>-{money(totals.promotionAmount)} บาท</strong>
          </div>
        ) : null}
        {totals.gpAmount > 0 ? (
          <div>
            <span>{totals.promotionAmount > 0 ? "ยอดหลังโปรโมชั่น" : "ยอดก่อนหัก GP"}</span>
            <strong>{money(totals.subtotalAfterPromotion)} บาท</strong>
          </div>
        ) : null}
        {totals.gpAmount > 0 ? (
          <div className="is-discount">
            <span>ค่า GP {totals.gpRate.toFixed(2)}%</span>
            <strong>-{money(totals.gpAmount)} บาท</strong>
          </div>
        ) : null}
        <div>
          <span>รายรับสุทธิ</span>
          <strong>{money(totals.revenue)} บาท</strong>
        </div>
        <div>
          <span>ต้นทุนน้ำ</span>
          <strong>{money(totals.recipeCost)} บาท</strong>
        </div>
        <div>
          <span>ต้นทุนท็อปปิ้ง</span>
          <strong>{money(totals.toppingCost)} บาท</strong>
        </div>
        <div>
          <span>กำไรรวม</span>
          <strong>{money(totals.profit)} บาท</strong>
        </div>
      </section>
      <button className="submit-button" disabled={saving || !parentItems.length} onClick={onSubmit} type="button">
        {editingSaleId ? "บันทึกการแก้ไข" : parentItems.length > 1 ? `บันทึก ${parentItems.length} เมนู` : "บันทึกรายการนี้"}
      </button>

      <SalesDayHistory date={date} onDelete={onDeleteSale} onEdit={onEditSale} sales={daySales} />

      <section className="closing-panel">
        <div className="detail-section__title">
          <h3>สรุปปิดร้าน</h3>
          <span>{date}</span>
        </div>
        <div className="sales-summary-card sales-summary-card--closing">
          <div>
            <span>รายรับสุทธิรวม</span>
            <strong>{money(summary.revenue)} บาท</strong>
          </div>
          <div>
            <span>ต้นทุนรวม</span>
            <strong>{money(summary.cost)} บาท</strong>
          </div>
          <div>
            <span>กำไรรวม</span>
            <strong>{money(summary.profit)} บาท</strong>
          </div>
          <div>
            <span>บันทึกแล้ว</span>
            <strong>{summary.orderCount}</strong>
          </div>
        </div>
        <p className="closing-hint">รวมจากรายการที่บันทึกไว้ของวันที่เลือก ปิดร้านแล้วก็ยังเพิ่มยอดและอัปเดตปิดร้านใหม่ได้</p>
        {existingClosing ? <p className="status-banner">วันนี้เคยบันทึกปิดร้านแล้วเมื่อ {formatReceiptDate(new Date(existingClosing.closedAt))}</p> : null}
        <button className="submit-button submit-button--light" disabled={saving || summary.orderCount === 0} onClick={() => onCloseDay(summary)} type="button">
          {existingClosing ? "อัปเดตยอดปิดร้าน" : "บันทึกปิดร้าน"}
        </button>
      </section>
      <ClosingReport closings={closings} onDelete={onDeleteSale} onEdit={onEditSale} sales={sales} />
    </>
  );
}

function SalesDayHistory({ date, onDelete, onEdit, sales }: { date: string; onDelete: (sale: Sale) => void; onEdit: (sale: Sale) => void; sales: Sale[] }) {
  return (
    <section className="sales-history-panel">
      <div className="detail-section__title">
        <div>
          <h3>รายการที่บันทึกแล้ว</h3>
          <small>{formatThaiDate(date)}</small>
        </div>
        <strong>{sales.length} ครั้ง</strong>
      </div>
      <div className="sales-history-list">
        {sales.map((sale) => <SaleHistoryEntry key={sale.id} onDelete={onDelete} onEdit={onEdit} sale={sale} />)}
        {!sales.length ? <p className="empty-text">ยังไม่มีรายการที่บันทึกในวันนี้</p> : null}
      </div>
    </section>
  );
}

function SaleHistoryEntry({ onDelete, onEdit, sale }: { onDelete: (sale: Sale) => void; onEdit: (sale: Sale) => void; sale: Sale }) {
  const parentItems = sale.items.filter((item) => item.kind !== "topping" && !item.parentId);
  const toppings = sale.items.filter((item) => item.kind === "topping");
  const itemCount = parentItems.reduce((sum, item) => sum + item.qty, 0);

  return (
    <details className="sale-history-entry">
      <summary>
        <span>
          <strong>{formatSaleTime(sale.createdAt)}</strong>
          <small>{sale.channel} · {itemCount} เมนู</small>
        </span>
        <span>
          <strong>{money(sale.totalRevenue)} บาท</strong>
          <ChevronDown size={16} />
        </span>
      </summary>
      <div className="sale-history-entry__body">
        {parentItems.map((item) => {
          const itemToppings = toppings.filter((topping) => topping.parentId === item.id);
          return (
            <div className="sale-history-line" key={item.id}>
              <div>
                <strong>{item.qty} × {item.name}</strong>
                {itemToppings.map((topping) => <small key={topping.id}>+ {topping.name} × {topping.qty}</small>)}
              </div>
              <span>{money(item.lineRevenue + itemToppings.reduce((sum, topping) => sum + topping.lineRevenue, 0))}</span>
            </div>
          );
        })}
        {sale.promotionAmount > 0 ? (
          <div className="sale-history-promotion">
            <span>{sale.promotionName || "โปรโมชั่น"}</span>
            <strong>-{money(sale.promotionAmount)} บาท</strong>
          </div>
        ) : null}
        {sale.gpAmount > 0 ? (
          <div className="sale-history-promotion">
            <span>ค่า GP {sale.gpRate.toFixed(2)}%</span>
            <strong>-{money(sale.gpAmount)} บาท</strong>
          </div>
        ) : null}
        {sale.note ? <p className="sale-history-note">หมายเหตุ: {sale.note}</p> : null}
        <div className="sale-history-totals">
          <span>ต้นทุน {money(sale.totalCost)}</span>
          <strong>กำไร {money(sale.totalProfit)} บาท</strong>
        </div>
        <div className="sale-history-actions">
          <button onClick={() => onEdit(sale)} type="button"><Pencil size={14} /> แก้ไข</button>
          <button onClick={() => onDelete(sale)} type="button"><Trash2 size={14} /> ลบ</button>
        </div>
      </div>
    </details>
  );
}

function ClosingReport({
  closings,
  onDelete,
  onEdit,
  sales
}: {
  closings: DailyClosing[];
  onDelete: (sale: Sale) => void;
  onEdit: (sale: Sale) => void;
  sales: Sale[];
}) {
  const [mode, setMode] = useState<ClosingReportMode>("week");
  const [customStart, setCustomStart] = useState(() => offsetDateKey(todayKey(), -6));
  const [customEnd, setCustomEnd] = useState(() => todayKey());
  const [topMenuMode, setTopMenuMode] = useState<TopSellingMenuMode>("week");
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  useEffect(() => {
    if (!topMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTopMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [topMenuOpen]);
  const reportRange = getReportDateRange(todayKey(), mode, customStart, customEnd);
  const reportRows = getSalesReportRows(sales, reportRange.start, reportRange.end);
  const totals = reportRows.reduce(
    (sum, row) => ({
      revenue: sum.revenue + row.revenue,
      cost: sum.cost + row.cost,
      profit: sum.profit + row.profit
    }),
    { revenue: 0, cost: 0, profit: 0 }
  );
  const maxMetric = Math.max(1, totals.revenue, totals.cost, Math.max(0, totals.profit));
  const positiveCost = Math.max(0, totals.cost);
  const positiveProfit = Math.max(0, totals.profit);
  const donutTotal = positiveCost + positiveProfit;
  const costShare = donutTotal > 0 ? (positiveCost / donutTotal) * 100 : 0;
  const rangeHistory = reportRows
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((row) => ({
      summary: row,
      sales: sales.filter((sale) => sale.saleDate === row.date).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }));
  const closedDates = new Set(closings.map((closing) => closing.businessDate));
  const rangeLabel = mode === "week" ? "7 วันล่าสุด" : mode === "month" ? "เดือนนี้" : `${formatThaiDate(reportRange.start)} – ${formatThaiDate(reportRange.end)}`;
  const topMenuRange = getReportDateRange(todayKey(), topMenuMode, "", "");
  const topSellingMenus = getTopSellingMenus(sales, topMenuRange.start, topMenuRange.end);

  return (
    <section className="closing-panel closing-report">
      <div className="detail-section__title">
        <h3>ภาพรวมยอดขาย</h3>
        <div className="report-controls">
          <div className="report-toggle">
            <button className={mode === "week" ? "is-active" : ""} onClick={() => setMode("week")} type="button">7 วัน</button>
            <button className={mode === "month" ? "is-active" : ""} onClick={() => setMode("month")} type="button">เดือนนี้</button>
            <button className={mode === "custom" ? "is-active" : ""} onClick={() => setMode("custom")} type="button">กำหนดเอง</button>
          </div>
          <button className="report-stats-button" onClick={() => setTopMenuOpen(true)} type="button">
            <BarChart3 size={15} />
            สถิติ
          </button>
        </div>
      </div>
      {mode === "custom" ? (
        <div className="report-range-fields">
          <label>
            วันเริ่มต้น
            <input
              max={customEnd}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setCustomStart(value);
                if (customEnd < value) setCustomEnd(value);
              }}
              type="date"
              value={customStart}
            />
          </label>
          <label>
            วันสิ้นสุด
            <input
              min={customStart}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setCustomEnd(value);
                if (customStart > value) setCustomStart(value);
              }}
              type="date"
              value={customEnd}
            />
          </label>
        </div>
      ) : null}
      <div className="sales-summary-card sales-summary-card--report">
        <div>
          <span>รายรับสุทธิรวม</span>
          <strong>{money(totals.revenue)} บาท</strong>
        </div>
        <div>
          <span>ต้นทุนรวม</span>
          <strong>{money(totals.cost)} บาท</strong>
        </div>
        <div>
          <span>กำไรรวม</span>
          <strong>{money(totals.profit)} บาท</strong>
        </div>
      </div>
      <div className="sales-charts">
        <div className="metric-chart" aria-label="กราฟเปรียบเทียบรายรับสุทธิ ต้นทุน และกำไร">
          {[
            { key: "revenue", label: "รายรับ", value: totals.revenue },
            { key: "cost", label: "ต้นทุน", value: totals.cost },
            { key: "profit", label: "กำไร", value: totals.profit }
          ].map((metric) => (
            <div className={`metric-chart__row metric-chart__row--${metric.key}`} key={metric.key}>
              <span>{metric.label}</span>
              <div><i style={{ width: `${Math.max(metric.value > 0 ? 5 : 0, (Math.max(0, metric.value) / maxMetric) * 100)}%` }} /></div>
              <strong>{money(metric.value)}</strong>
            </div>
          ))}
        </div>
        <div className="profit-donut-card">
          <div
            aria-label={`ต้นทุน ${money(totals.cost)} บาท กำไร ${money(totals.profit)} บาท`}
            className="profit-donut"
            role="img"
            style={{ background: donutTotal > 0 ? `conic-gradient(#f0a62b 0 ${costShare}%, #2c8f65 ${costShare}% 100%)` : "#edf0ea" }}
          >
            <div><span>กำไร</span><strong>{money(totals.profit)}</strong></div>
          </div>
          <div className="profit-donut-legend">
            <span><i className="is-cost" /> ต้นทุน</span>
            <span><i className="is-profit" /> กำไร</span>
          </div>
        </div>
      </div>
      {!reportRows.length ? <p className="empty-text">ยังไม่มียอดขายในช่วงนี้</p> : null}
      <div className="seven-day-history">
        <div className="report-history-title">
          <h4>สรุปยอดขายรายวัน</h4>
          <span>{rangeLabel}</span>
        </div>
        {rangeHistory.map((row) => {
          const daySummary = row.summary;
          return (
            <details className="day-history-entry" key={daySummary.date}>
              <summary>
                <span>
                  <strong>{formatThaiDate(daySummary.date)}</strong>
                  <small>{daySummary.orderCount} ครั้ง · {daySummary.itemCount} เมนู{closedDates.has(daySummary.date) ? " · ปิดร้านแล้ว" : ""}</small>
                </span>
                <ChevronDown size={16} />
                <div className="day-history-metrics">
                  <span><small>รายรับ</small><strong>{money(daySummary.revenue)}</strong></span>
                  <span><small>ต้นทุน</small><strong>{money(daySummary.cost)}</strong></span>
                  <span><small>กำไร</small><strong>{money(daySummary.profit)}</strong></span>
                </div>
              </summary>
              <div className="day-history-entry__body">
                {row.sales.map((sale) => <SaleHistoryEntry key={sale.id} onDelete={onDelete} onEdit={onEdit} sale={sale} />)}
              </div>
            </details>
          );
        })}
        {!rangeHistory.length ? <p className="empty-text">ยังไม่มีประวัติการขายในช่วงนี้</p> : null}
      </div>
      {topMenuOpen ? (
        <div className="top-menu-sheet-layer">
          <button aria-label="ปิดสถิติเมนูขายดี" className="top-menu-sheet-backdrop" onClick={() => setTopMenuOpen(false)} type="button" />
          <section aria-labelledby="top-menu-sheet-title" aria-modal="true" className="top-menu-sheet" role="dialog">
            <div className="top-menu-sheet__handle" />
            <div className="top-menu-sheet__header">
              <div>
                <h3 id="top-menu-sheet-title">เมนูขายดี</h3>
                <span>{topMenuMode === "week" ? "7 วันล่าสุด" : "เดือนนี้"}</span>
              </div>
              <button aria-label="ปิด" autoFocus onClick={() => setTopMenuOpen(false)} type="button"><X size={20} /></button>
            </div>
            <div className="top-menu-sheet__toggle">
              <button className={topMenuMode === "week" ? "is-active" : ""} onClick={() => setTopMenuMode("week")} type="button">7 วันล่าสุด</button>
              <button className={topMenuMode === "month" ? "is-active" : ""} onClick={() => setTopMenuMode("month")} type="button">เดือนนี้</button>
            </div>
            <div className="top-menu-list">
              {topSellingMenus.map((menu, index) => (
                <div className="top-menu-row" key={menu.itemId}>
                  <strong className={`top-menu-rank top-menu-rank--${index + 1}`}>{index + 1}</strong>
                  <span>
                    <strong>{menu.name}</strong>
                    <small>ยอดขาย {money(menu.revenue)} บาท</small>
                  </span>
                  <strong>{menu.quantity} รายการ</strong>
                </div>
              ))}
              {!topSellingMenus.length ? <p className="empty-text">ยังไม่มียอดขายในช่วงนี้</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function OrderReceipt({
  channel,
  customerName,
  isGeneratingImage,
  isGeneratingPdf,
  items,
  note,
  paymentMethod,
  promotionAmount,
  promotionName,
  onClose,
  onExportImage,
  onExportPdf,
  orderNumber,
  previewOpen,
  printedAt,
  receiptRef,
  settings,
  onSettingsChange,
  grossTotal,
  total
}: {
  channel: string;
  customerName: string;
  isGeneratingImage: boolean;
  isGeneratingPdf: boolean;
  items: OrderItem[];
  note: string;
  paymentMethod: PaymentMethod;
  promotionAmount: number;
  promotionName: string;
  onClose: () => void;
  onExportImage: () => void;
  onExportPdf: () => void;
  orderNumber: string;
  previewOpen: boolean;
  printedAt: Date;
  receiptRef: RefObject<HTMLDivElement>;
  settings: ReceiptPaperSettings;
  onSettingsChange: (settings: ReceiptPaperSettings) => void;
  grossTotal: number;
  total: number;
}) {
  const splitSidePadding = settings.paddingLeftMm !== settings.paddingRightMm;
  const sidePaddingValue = splitSidePadding ? "" : settings.paddingLeftMm;

  function updateSettings(next: Partial<ReceiptPaperSettings>) {
    onSettingsChange(normalizeReceiptPaperSettings({ ...settings, ...next }));
  }

  function changePreset(value: ReceiptPaperPresetId) {
    const preset = receiptPaperPresets.find((item) => item.id === value) || receiptPaperPresets[0];
    updateSettings({
      presetId: value,
      paperWidthMm: value === "custom" ? settings.paperWidthMm : preset.paperWidthMm
    });
  }

  return (
    <div className={`print-receipt${previewOpen ? " print-receipt--preview" : ""}`} aria-hidden={!previewOpen}>
      {previewOpen ? (
        <div className="receipt-preview-toolbar">
          <div className="receipt-preview-actions">
            <button onClick={onClose} type="button">ปิด</button>
            <button disabled={isGeneratingImage} onClick={onExportImage} type="button">
              {isGeneratingImage ? "กำลังบันทึกรูป..." : "บันทึกรูป"}
            </button>
            <button disabled={isGeneratingPdf} onClick={onExportPdf} type="button">
              {isGeneratingPdf ? "กำลังสร้าง PDF..." : "บันทึก PDF"}
            </button>
          </div>
          <div className="receipt-paper-controls">
            <label>
              กระดาษ
              <select onChange={(event) => changePreset(event.currentTarget.value as ReceiptPaperPresetId)} value={settings.presetId}>
                {receiptPaperPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.label}</option>
                ))}
              </select>
            </label>
            <label>
              กว้าง
              <input
                inputMode="decimal"
                onChange={(event) => updateSettings({ paperWidthMm: Number(event.currentTarget.value), presetId: "custom" })}
                type="number"
                value={settings.paperWidthMm}
              />
            </label>
            <label>
              ขอบข้าง
              <input
                disabled={splitSidePadding}
                inputMode="decimal"
                onChange={(event) => {
                  const value = Number(event.currentTarget.value);
                  updateSettings({ paddingXMm: value, paddingLeftMm: value, paddingRightMm: value });
                }}
                placeholder={splitSidePadding ? "แยก" : undefined}
                type={splitSidePadding ? "text" : "number"}
                value={sidePaddingValue}
              />
            </label>
            <label>
              ขอบซ้าย
              <input
                inputMode="decimal"
                onChange={(event) => updateSettings({ paddingLeftMm: Number(event.currentTarget.value) })}
                type="number"
                value={settings.paddingLeftMm}
              />
            </label>
            <label>
              ขอบขวา
              <input
                inputMode="decimal"
                onChange={(event) => updateSettings({ paddingRightMm: Number(event.currentTarget.value) })}
                type="number"
                value={settings.paddingRightMm}
              />
            </label>
            <label>
              ขอบบน
              <input
                inputMode="decimal"
                onChange={(event) => updateSettings({ paddingTopMm: Number(event.currentTarget.value) })}
                type="number"
                value={settings.paddingTopMm}
              />
            </label>
            <label>
              ขอบล่าง
              <input
                inputMode="decimal"
                onChange={(event) => updateSettings({ paddingBottomMm: Number(event.currentTarget.value) })}
                type="number"
                value={settings.paddingBottomMm}
              />
            </label>
            <label>
              เลื่อน
              <input
                inputMode="decimal"
                onChange={(event) => updateSettings({ xOffsetMm: Number(event.currentTarget.value) })}
                step="0.5"
                type="number"
                value={settings.xOffsetMm}
              />
            </label>
            <label>
              คม
              <select onChange={(event) => updateSettings({ pixelRatio: Number(event.currentTarget.value) })} value={settings.pixelRatio}>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
                <option value={4}>4x</option>
                <option value={5}>5x</option>
              </select>
            </label>
          </div>
        </div>
      ) : null}
      <div
        className="receipt-paper"
        ref={receiptRef}
        style={{
          width: `${settings.paperWidthMm}mm`,
          padding: `${settings.paddingTopMm}mm ${settings.paddingRightMm}mm ${settings.paddingBottomMm}mm ${settings.paddingLeftMm}mm`
        }}
      >
        <img alt="" className="receipt-logo" src="/store-logo.png" />
        <div className="receipt-store-name">BLEND HOUSE</div>
        <div className="receipt-order-number">{orderNumber}</div>
        <div className="receipt-bar">ORDER RECEIPT</div>
        <div className="receipt-meta">
          <div>
            <span>ช่องทาง</span>
            <strong>{channel}</strong>
          </div>
          <div>
            <span>เวลา</span>
            <strong>{formatReceiptDate(printedAt)}</strong>
          </div>
          {customerName.trim() ? (
            <div>
              <span>ลูกค้า</span>
              <strong>คุณ {customerName.trim()}</strong>
            </div>
          ) : null}
        </div>
        <div className="receipt-divider" />
        <section>
          <h3>รายการสินค้า</h3>
          {items.map((item) => (
            <div className="receipt-item" key={item.id}>
              <div>
                <strong>{item.qty} x {item.name}</strong>
                <span>{money(orderItemTotal(item))}</span>
              </div>
              {item.addons.length || item.note ? (
                <p>
                  {[
                    ...item.addons
                      .filter((addon) => addon.name.trim() || addon.price > 0)
                      .map((addon) => `${addon.name.trim() || "ท็อปปิ้ง"} +${money(addon.price)}`),
                    ...item.note.split("\n").filter(Boolean)
                  ].map((line) => `- ${line}`).join("\n")}
                </p>
              ) : null}
            </div>
          ))}
        </section>
        <div className="receipt-payment-summary">
          <div><span>วิธีชำระเงิน</span><strong>{paymentMethod}</strong></div>
          <div><span>รวมทั้งหมด</span><strong>{money(grossTotal)}</strong></div>
          {promotionAmount > 0 ? (
            <div><span>{promotionName.trim() || "ส่วนลดร้านค้า"}</span><strong>-{money(promotionAmount)}</strong></div>
          ) : null}
          <div className="receipt-net-total"><span>ยอดรวมสุทธิ</span><strong>{money(total)}</strong></div>
        </div>
        {note ? (
          <>
            <div className="receipt-divider" />
            <section className="receipt-note">
              <strong>หมายเหตุ</strong>
              <p>{note}</p>
            </section>
          </>
        ) : null}
        <div className="receipt-thanks">ขอบคุณที่อุดหนุน</div>
      </div>
    </div>
  );
}

function RecipeDetail({
  recipe,
  ingredients,
  saving,
  onBack,
  onCalculate,
  onDelete,
  onDuplicate,
  onEdit
}: {
  recipe: Recipe;
  ingredients: Ingredient[];
  saving: boolean;
  onBack: () => void;
  onCalculate: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
  onDuplicate: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
}) {
  const cost = calculateCost(recipe, ingredients);
  const byId = new Map(ingredients.map((item) => [item.id, item]));
  return (
    <main className="detail">
      <div className="detail-topbar">
        <button onClick={onBack} type="button">
          <ChevronLeft size={24} />
        </button>
        <strong>{recipe.name}</strong>
        <span />
      </div>
      <div className="detail-tools">
        <button onClick={() => onEdit(recipe)} type="button">
          <Pencil size={16} /> แก้ไข
        </button>
        <button onClick={() => onDuplicate(recipe)} type="button">
          <Copy size={16} /> คัดลอกสูตร
        </button>
        <button disabled={saving} onClick={() => onDelete(recipe.id)} type="button">
          <Trash2 size={16} /> ลบ
        </button>
      </div>
      <div className="detail-hero">
        <DrinkArt imageKey={recipe.imageKey} imageUrl={recipe.imageUrl} />
        {recipe.status ? <span className="badge badge--hot">{recipe.status}</span> : null}
        {recipe.prepTime > 0 ? <span className="time-pill">{recipe.prepTime} นาที</span> : null}
      </div>
      <section className="metric-row">
        <Metric label="ต้นทุน" value={`${money(cost.totalCost)} บาท`} />
        <Metric label="ราคาขาย" value={`${money(recipe.sellingPrice)} บาท`} />
        <Metric label="ราคาเดลิ" value={`${money(recipe.deliveryPrice || recipe.sellingPrice)} บาท`} />
        <Metric label="กำไร" value={`${money(cost.profit)} บาท`} />
      </section>
      <button className="detail-calculate-button" onClick={() => onCalculate(recipe)} type="button">
        คำนวณราคาขาย
      </button>
      <section className="detail-section">
        <div className="detail-section__title">
          <h3>ส่วนผสม</h3>
          <button onClick={() => onEdit(recipe)} type="button">ปรับสูตร</button>
        </div>
        {recipe.items.length ? (
          recipe.items.map((item) => {
            const ingredient = byId.get(item.ingredientId);
            return (
              <div className="ingredient-line" key={`${item.ingredientId}-${item.amount}`}>
                <span>{ingredient?.name ?? "วัตถุดิบ"}</span>
                <strong>
                  {item.note ? `${item.note} · ` : ""}
                  {item.amount} {item.unit}
                </strong>
              </div>
            );
          })
        ) : (
          <p className="empty-text">ยังไม่มีส่วนผสม ใส่เพิ่มได้ในชีตหรือรอบถัดไปในฟอร์มสูตร</p>
        )}
      </section>
      <section className="detail-section">
        <h3>วิธีทำ</h3>
        <ol className="steps">
          {recipe.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function CostScreen({
  recipe,
  cost,
  costMode,
  deliveryFee,
  deliveryMarkup,
  deliveryPricingMode,
  targetMargin,
  onChangeMode,
  onDeliveryMarkup,
  onChangeRecipe,
  onDeliveryFee,
  onDeliveryPricingMode,
  onMargin
}: {
  recipe: Recipe;
  ingredients: Ingredient[];
  cost: ReturnType<typeof calculateCost>;
  costMode: CostMode;
  deliveryFee: number;
  deliveryMarkup: number;
  deliveryPricingMode: DeliveryPricingMode;
  targetMargin: number;
  onChangeMode: (mode: CostMode) => void;
  onDeliveryMarkup: (markup: number) => void;
  onChangeRecipe: () => void;
  onDeliveryFee: (fee: number) => void;
  onDeliveryPricingMode: (mode: DeliveryPricingMode) => void;
  onMargin: (margin: number) => void;
}) {
  const suggested = roundPrice(cost.totalCost / (1 - targetMargin / 100));
  const deliveryPrice =
    deliveryPricingMode === "markup"
      ? roundPrice(recipe.sellingPrice * (1 + Math.max(deliveryMarkup, 0) / 100))
      : deliveryFee >= 100
        ? 0
        : roundPrice(recipe.sellingPrice / (1 - deliveryFee / 100));
  const platformFeeAmount = (deliveryPrice * deliveryFee) / 100;
  const deliveryNetRevenue = deliveryPrice - platformFeeAmount;
  const deliveryProfit = deliveryNetRevenue - cost.totalCost;
  const deliveryMargin = deliveryPrice > 0 ? (deliveryProfit / deliveryPrice) * 100 : 0;
  const deliveryMarkupAmount = deliveryPrice - recipe.sellingPrice;
  return (
    <>
      <TopTitle title="คำนวณต้นทุน" />
      <div className="tabs">
        <button className={costMode === "formula" ? "is-active" : ""} onClick={() => onChangeMode("formula")} type="button">คำนวณจากสูตร</button>
        <button className={costMode === "price" ? "is-active" : ""} onClick={() => onChangeMode("price")} type="button">ตั้งราคาขาย</button>
        <button className={costMode === "profit" ? "is-active" : ""} onClick={() => onChangeMode("profit")} type="button">สรุปกำไร</button>
      </div>
      <section className="selected-recipe">
        <DrinkArt compact imageKey={recipe.imageKey} imageUrl={recipe.imageUrl} />
        <div>
          <strong>{recipe.name} (16 oz)</strong>
          <span>ต้นทุนล่าสุดจากสูตร</span>
        </div>
        <button onClick={onChangeRecipe} type="button">เปลี่ยนเมนู</button>
      </section>
      {costMode === "formula" ? (
        <section className="cost-card">
          <h3>ต้นทุนต่อสูตร</h3>
          <CostLine label="วัตถุดิบน้ำ" value={cost.ingredientCost} />
          <CostLine label="ท็อปปิ้ง" value={cost.toppingCost} />
          <CostLine label="บรรจุภัณฑ์" value={cost.packagingCost} />
          <div className="total-line">
            <span>รวมต้นทุน</span>
            <strong>{money(cost.totalCost)} บาท</strong>
          </div>
          <div className="price-line">
            <span>ราคาขายปัจจุบัน</span>
            <strong>{recipe.sellingPrice} บาท</strong>
          </div>
        </section>
      ) : null}
      {costMode === "profit" ? (
        <>
          <section className="profit-panel">
            <div>
              <span>กำไรหน้าร้าน</span>
              <strong>{money(cost.profit)} บาท</strong>
            </div>
            <div>
              <span>มาร์จินหน้าร้าน</span>
              <strong>{money(cost.margin)}%</strong>
            </div>
          </section>
          <section className="delivery-card">
            <h3>หักเปอร์เซ็นต์เดลิเวอรี่</h3>
            <div className="delivery-mode-row">
              <button
                className={deliveryPricingMode === "offsetGp" ? "is-active" : ""}
                onClick={() => onDeliveryPricingMode("offsetGp")}
                type="button"
              >
                ชดเชย GP
              </button>
              <button
                className={deliveryPricingMode === "markup" ? "is-active" : ""}
                onClick={() => onDeliveryPricingMode("markup")}
                type="button"
              >
                บวก % จากราคาขาย
              </button>
            </div>
            <div className="platform-row">
              {deliveryPlatforms.map((platform) => (
                <button
                  className={deliveryFee === platform.fee ? "is-active" : ""}
                  key={platform.id}
                  onClick={() => onDeliveryFee(platform.fee)}
                  type="button"
                >
                  <img alt="" src={platform.icon} />
                  <span>{platform.name}</span>
                  <strong>{platform.fee}%</strong>
                </button>
              ))}
            </div>
            <label className="fee-input">
              เปอร์เซ็นต์ที่โดนหัก
              <input
                min="0"
                max="80"
                onChange={(event) => onDeliveryFee(Number(event.currentTarget.value || 0))}
                type="number"
                value={deliveryFee}
              />
            </label>
            {deliveryPricingMode === "markup" ? (
              <label className="fee-input">
                บวกจากราคาขายหน้าร้าน
                <input
                  min="0"
                  max="300"
                  onChange={(event) => onDeliveryMarkup(Number(event.currentTarget.value || 0))}
                  type="number"
                  value={deliveryMarkup}
                />
              </label>
            ) : null}
            {deliveryPricingMode === "markup" ? <CostLine label="ส่วนที่บวกจากหน้าร้าน" value={deliveryMarkupAmount} /> : null}
            <CostLine label="ค่าธรรมเนียมแพลตฟอร์ม" value={platformFeeAmount} />
            <CostLine label="รายรับหลังหัก" value={deliveryNetRevenue} />
            <div className="total-line">
              <span>ราคาขายบนเดลิเวอรี่</span>
              <strong>{money(deliveryPrice)} บาท</strong>
            </div>
            <div className="total-line total-line--plain">
              <span>กำไรหลังหักเดลิเวอรี่</span>
              <strong>{money(deliveryProfit)} บาท</strong>
            </div>
            <div className="price-line">
              <span>มาร์จินหลังหัก</span>
              <strong>{money(deliveryMargin)}%</strong>
            </div>
          </section>
        </>
      ) : null}
      {costMode === "price" ? (
        <section className="pricing-card">
          <h3>ราคาขายที่แนะนำ</h3>
          <div className="margin-row">
            {[40, 50, 60, 70].map((margin) => (
              <button className={margin === targetMargin ? "is-active" : ""} key={margin} onClick={() => onMargin(margin)} type="button">
                {margin}%
              </button>
            ))}
          </div>
          <strong>{suggested} บาท</strong>
          <span>คำนวณจาก margin {targetMargin}%</span>
        </section>
      ) : null}
    </>
  );
}

function IngredientsScreen({
  filter,
  ingredients,
  saving,
  onAdd,
  onDelete,
  onEdit,
  onFilter
}: {
  filter: IngredientFilter;
  ingredients: Ingredient[];
  saving: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (ingredient: Ingredient) => void;
  onFilter: (filter: IngredientFilter) => void;
}) {
  const visibleIngredients = ingredients.filter((ingredient) => {
    if (filter === "topping") return ingredient.category === "ท็อปปิ้ง";
    if (filter === "base") return ingredient.category !== "ท็อปปิ้ง";
    return true;
  });
  return (
    <>
      <TopTitle right={<Settings2 size={20} />} title="วัตถุดิบ" />
      <div className="ingredient-tabs">
        <button className={filter === "all" ? "is-active" : ""} onClick={() => onFilter("all")} type="button">ทั้งหมด</button>
        <button className={filter === "base" ? "is-active" : ""} onClick={() => onFilter("base")} type="button">วัตถุดิบ</button>
        <button className={filter === "topping" ? "is-active" : ""} onClick={() => onFilter("topping")} type="button">ท็อปปิ้ง</button>
        <button onClick={onAdd} type="button">
          <Plus size={16} /> เพิ่มวัตถุดิบ
        </button>
      </div>
      <div className="table-card">
        <div className="table-head">
          <span>ชื่อวัตถุดิบ</span>
          <span>ปริมาณที่ซื้อ</span>
          <span>ราคาซื้อ</span>
          <span>จัดการ</span>
        </div>
        {visibleIngredients.map((ingredient) => (
          <div className="table-row" key={ingredient.id}>
            <strong>{ingredient.name}</strong>
            <span>
              {ingredient.buyQty.toLocaleString("th-TH")} {ingredient.buyUnit}
            </span>
            <span>{ingredient.buyPrice.toLocaleString("th-TH")}</span>
            <span className="row-actions">
              <button onClick={() => onEdit(ingredient)} type="button"><Pencil size={14} /></button>
              <button disabled={saving} onClick={() => onDelete(ingredient.id)} type="button"><Trash2 size={14} /></button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function IngredientForm({
  ingredient,
  message,
  saving,
  onBack,
  onSubmit
}: {
  ingredient: Ingredient | null;
  message: string;
  saving: boolean;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="form-screen">
      <TopTitle left={<button className="bare-button" onClick={onBack} type="button"><ChevronLeft size={24} /></button>} title={ingredient ? "แก้วัตถุดิบ" : "เพิ่มวัตถุดิบ"} />
      <form className="form-card" onSubmit={onSubmit}>
        {message ? <div className="status-banner">{message}</div> : null}
        <FormField defaultValue={ingredient?.name} label="ชื่อวัตถุดิบ" name="name" placeholder="เช่น นมสด" required />
        <label>
          ประเภท
          <select defaultValue={ingredient?.category || "วัตถุดิบน้ำ"} name="category">
            {ingredientCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <div className="form-split">
          <FormField defaultValue={ingredient?.buyQty} label="ปริมาณที่ซื้อ" name="buyQty" placeholder="0" type="number" />
          <UnitSelect defaultValue={ingredient?.buyUnit || "ml"} label="หน่วยซื้อ" name="buyUnit" />
        </div>
        <div className="form-split">
          <FormField defaultValue={ingredient?.buyPrice} label="ราคาซื้อ (บาท)" name="buyPrice" placeholder="0.00" type="number" />
          <UnitSelect defaultValue={ingredient?.baseUnit || ingredient?.buyUnit || "ml"} label="หน่วยคิดต้นทุน" name="baseUnit" />
        </div>
        <FormField
          defaultValue={ingredient?.addonPrice || 0}
          label="ราคาขายท็อปปิ้ง (บาท)"
          name="addonPrice"
          placeholder="เช่น 10"
          type="number"
        />
        <div className="form-split">
          <FormField
            defaultValue={ingredient?.addonAmount || 0}
            label="ใช้ต่อครั้ง"
            name="addonAmount"
            placeholder="เช่น 40"
            type="number"
          />
          <UnitSelect defaultValue={ingredient?.addonUnit || ingredient?.baseUnit || "g"} label="หน่วยท็อปปิ้ง" name="addonUnit" />
        </div>
        <label>
          หมายเหตุ
          <textarea defaultValue={ingredient?.note || ""} name="note" placeholder="ถ้ามี" />
        </label>
        <button className="submit-button" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</button>
      </form>
    </main>
  );
}

function RecipeForm({
  categories,
  ingredients,
  isDuplicate,
  message,
  recipe,
  saving,
  sourceName,
  onBack,
  onSubmit
}: {
  categories: Category[];
  ingredients: Ingredient[];
  isDuplicate: boolean;
  message: string;
  recipe: Recipe | null;
  saving: boolean;
  sourceName: string;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [items, setItems] = useState<RecipeItem[]>(
    recipe?.items.length ? recipe.items : [{ ingredientId: ingredients[0]?.id || "", amount: 0, unit: ingredients[0]?.baseUnit || "ml", note: "" }]
  );
  const [imagePreview, setImagePreview] = useState(recipe?.imageUrl || "");
  const [categoryId, setCategoryId] = useState<CategoryId>(recipe?.categoryId || "tea");
  const imageObjectUrl = useRef<string | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pendingAddedItemIndex = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (imageObjectUrl.current) URL.revokeObjectURL(imageObjectUrl.current);
    },
    []
  );

  function previewImage(file?: File) {
    if (imageObjectUrl.current) URL.revokeObjectURL(imageObjectUrl.current);
    imageObjectUrl.current = file && file.size > 0 ? URL.createObjectURL(file) : null;
    setImagePreview(imageObjectUrl.current || recipe?.imageUrl || "");
  }

  useEffect(() => {
    const nextIndex = pendingAddedItemIndex.current;
    if (nextIndex === null) return;
    pendingAddedItemIndex.current = null;

    window.requestAnimationFrame(() => {
      const editor = itemRefs.current[nextIndex];
      editor?.scrollIntoView({ behavior: "smooth", block: "center" });
      const ingredientInput = editor?.querySelector<HTMLInputElement>('input[name="itemIngredientName"]');
      ingredientInput?.focus();
      ingredientInput?.select();
    });
  }, [items.length]);

  function updateItem(index: number, item: RecipeItem) {
    setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? item : row)));
  }

  function addItem() {
    setItems((current) => {
      pendingAddedItemIndex.current = current.length;
      return [...current, { ingredientId: ingredients[0]?.id || "", amount: 0, unit: ingredients[0]?.baseUnit || "ml", note: "" }];
    });
  }

  function removeItem(index: number) {
    setItems((current) => (current.length <= 1 ? current : current.filter((_, rowIndex) => rowIndex !== index)));
  }

  return (
    <main className="form-screen">
      <TopTitle
        left={<button className="bare-button" onClick={onBack} type="button"><ChevronLeft size={24} /></button>}
        title={isDuplicate ? "เพิ่มสูตรจากสูตรเดิม" : recipe ? "แก้สูตร" : "เพิ่มสูตร"}
      />
      <form className="form-card" onSubmit={onSubmit}>
        {message ? <div className="status-banner">{message}</div> : null}
        {isDuplicate && sourceName ? <div className="draft-banner">คัดลอกจาก: {sourceName}</div> : null}
        <FormField defaultValue={recipe?.name} label="ชื่อเมนู" name="name" placeholder="เช่น ชาไทยไข่มุก" required />
        <label>
          หมวดหมู่
          <select name="categoryId" onChange={(event) => setCategoryId(event.currentTarget.value as CategoryId)} value={categoryId}>
            {categories.slice(1).map((category) => (
              <option value={category.id} key={category.id}>{category.label}</option>
            ))}
          </select>
        </label>
        <label className="upload-box">
          {imagePreview ? <img alt="ตัวอย่างรูปเมนู" className="upload-preview" src={imagePreview} /> : <Package size={22} />}
          <span>{recipe?.imageUrl ? "เปลี่ยนรูปเมนู" : "อัปโหลดรูปเมนู"}</span>
          <small>รูปจะถูกส่งเข้า Google Drive ผ่าน Apps Script</small>
          <input accept="image/*" name="image" onChange={(event) => previewImage(event.currentTarget.files?.[0])} type="file" />
        </label>
        <FormField defaultValue={recipe?.status || ""} label="ป้ายสถานะ" name="status" placeholder="เช่น ขายดี" />
        <FormField defaultValue={recipe?.sellingPrice || 35} label="ราคาขาย (บาท)" name="sellingPrice" placeholder="35" type="number" />
        <FormField
          defaultValue={recipe?.deliveryPrice || recipe?.sellingPrice || 35}
          label="ราคาเดลิเวอรี่ (บาท)"
          name="deliveryPrice"
          placeholder="เช่น 75"
          type="number"
        />
        <section className="recipe-items-editor">
          <div className="form-section-title">
            <h3>ส่วนผสมในสูตร</h3>
          </div>
          {items.map((item, index) => (
            <RecipeItemEditor
              ingredientList={ingredients}
              editorRef={(node) => {
                itemRefs.current[index] = node;
              }}
              item={item}
              key={`${item.ingredientId}-${index}`}
              onChange={(nextItem) => updateItem(index, nextItem)}
              onRemove={() => removeItem(index)}
              saving={saving}
            />
          ))}
          <button className="add-line-button" onClick={addItem} type="button">
            <Plus size={15} /> เพิ่ม
          </button>
        </section>
        <label>
          วิธีทำ
          <textarea defaultValue={recipe?.steps.join("\n") || ""} name="steps" placeholder="หนึ่งบรรทัดต่อหนึ่งขั้นตอน" />
        </label>
        <button className="submit-button" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกสูตร"}</button>
      </form>
    </main>
  );
}

function RecipeItemEditor({
  editorRef,
  ingredientList,
  item,
  onChange,
  onRemove,
  saving
}: {
  editorRef?: (node: HTMLDivElement | null) => void;
  ingredientList: Ingredient[];
  item: RecipeItem;
  onChange: (item: RecipeItem) => void;
  onRemove: () => void;
  saving: boolean;
}) {
  const selectedIngredient = ingredientList.find((ingredient) => ingredient.id === item.ingredientId);
  const [ingredientQuery, setIngredientQuery] = useState(selectedIngredient?.name || "");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isTypingIngredient, setIsTypingIngredient] = useState(false);
  const ingredientKeyword = isTypingIngredient ? ingredientQuery.trim().toLowerCase() : "";
  const filteredIngredients = ingredientList
    .filter((ingredient) => !ingredientKeyword || ingredient.name.toLowerCase().includes(ingredientKeyword))
    .slice(0, 8);

  function chooseIngredient(ingredient: Ingredient) {
    setIngredientQuery(ingredient.name);
    setIsTypingIngredient(false);
    setIsPickerOpen(false);
    onChange({ ...item, ingredientId: ingredient.id, unit: ingredient.baseUnit || item.unit });
  }

  return (
    <div className="recipe-item-editor" ref={editorRef}>
      <label>
        วัตถุดิบ
        <div className="ingredient-combobox">
          <input
            name="itemIngredientName"
            onBlur={() => window.setTimeout(() => setIsPickerOpen(false), 120)}
            onChange={(event) => {
              setIngredientQuery(event.currentTarget.value);
              setIsTypingIngredient(true);
              setIsPickerOpen(true);
            }}
            onFocus={() => {
              setIsTypingIngredient(false);
              setIsPickerOpen(true);
            }}
            placeholder="พิมพ์เพื่อค้นหาวัตถุดิบ"
            value={ingredientQuery}
          />
          <input name="itemIngredientId" type="hidden" value={item.ingredientId} />
          {isPickerOpen ? (
            <div className="ingredient-options">
              {filteredIngredients.length ? (
                filteredIngredients.map((ingredient) => (
                  <button key={ingredient.id} onMouseDown={() => chooseIngredient(ingredient)} type="button">
                    <span>{ingredient.name}</span>
                    <small>{ingredient.category}</small>
                  </button>
                ))
              ) : (
                <div className="ingredient-options__empty">ไม่พบวัตถุดิบ</div>
              )}
            </div>
          ) : null}
        </div>
      </label>
      <div className="recipe-item-editor__grid">
        <label>
          ปริมาณ
          <input
            min="0"
            name="itemAmount"
            onChange={(event) => onChange({ ...item, amount: Number(event.currentTarget.value || 0) })}
            step="0.01"
            type="number"
            value={item.amount || ""}
          />
        </label>
        <label>
          หน่วย
          <select name="itemUnit" onChange={(event) => onChange({ ...item, unit: event.currentTarget.value as Unit })} value={item.unit}>
            {units.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        หมายเหตุ
        <input
          name="itemNote"
          onChange={(event) => onChange({ ...item, note: event.currentTarget.value })}
          placeholder={selectedIngredient ? `เช่น ${selectedIngredient.buyQty} ${selectedIngredient.buyUnit}` : "ถ้ามี"}
          value={item.note || ""}
        />
      </label>
      <div className="recipe-item-actions">
        <button className="save-line-button" disabled={saving} type="submit">
          {saving ? "กำลังบันทึก..." : "บันทึกสูตร"}
        </button>
        <button className="remove-line-button" onClick={onRemove} type="button">
          <Trash2 size={14} /> ลบส่วนผสมนี้
        </button>
      </div>
    </div>
  );
}

function FormField({
  defaultValue,
  label,
  name,
  placeholder,
  required,
  type = "text"
}: {
  defaultValue?: number | string;
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input defaultValue={defaultValue} name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

function UnitSelect({ defaultValue, label, name }: { defaultValue: Unit; label: string; name: string }) {
  return (
    <label>
      {label}
      <select defaultValue={defaultValue} name={name}>
        {units.map((unit) => (
          <option key={unit} value={unit}>{unit}</option>
        ))}
      </select>
    </label>
  );
}

function BottomNav({ active, onChange, onAdd }: { active: Tab; onChange: (tab: Tab) => void; onAdd: () => void }) {
  const tabs: Array<{ id: Tab; label: string; icon: ElementType }> = [
    { id: "home", label: "หน้าแรก", icon: Home },
    { id: "recipes", label: "สูตร", icon: Grid2X2 },
    { id: "orders", label: "ออเดอร์", icon: ClipboardList },
    { id: "sales", label: "ขาย", icon: Store },
    { id: "ingredients", label: "วัตถุดิบ", icon: WalletCards }
  ];
  return (
    <nav className="bottom-nav">
      {tabs.slice(0, 2).map((item) => (
        <NavButton active={active} item={item} key={item.id} onChange={onChange} />
      ))}
      <button className="add-button" onClick={onAdd} type="button">
        <Plus size={28} />
      </button>
      {tabs.slice(2).map((item) => (
        <NavButton active={active} item={item} key={item.id} onChange={onChange} />
      ))}
    </nav>
  );
}

function NavButton({
  item,
  active,
  onChange
}: {
  item: { id: Tab; label: string; icon: ElementType };
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  const Icon = item.icon;
  return (
    <button className={active === item.id ? "is-active" : ""} onClick={() => onChange(item.id)} type="button">
      <Icon size={20} />
      <span>{item.label}</span>
    </button>
  );
}

function TopTitle({ title, right, left }: { title: string; right?: ReactNode; left?: ReactNode }) {
  return (
    <header className="top-title">
      <div>{left}</div>
      <h1>{title}</h1>
      <div>{right}</div>
    </header>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action: string; onAction?: () => void }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      <button onClick={onAction} type="button">
        {action} <ChevronRight size={14} />
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CostLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="cost-line">
      <span>{label}</span>
      <strong>{money(value)} บาท</strong>
    </div>
  );
}

function filterRecipes(recipes: Recipe[], query: string, categories: Category[]) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return recipes;
  const categoryById = new Map(categories.map((category) => [category.id, category.label]));
  return recipes.filter((recipe) => {
    const categoryLabel = categoryById.get(recipe.categoryId) || "";
    return [recipe.name, recipe.status || "", categoryLabel]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });
}

function makeOrderNumber() {
  const now = new Date();
  return `#BH-${padNumber(now.getHours())}${padNumber(now.getMinutes())}${padNumber(now.getSeconds())}`;
}

function formatReceiptDate(date: Date) {
  return `${padNumber(date.getDate())}/${padNumber(date.getMonth() + 1)}/${date.getFullYear()} ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function orderItemTotal(item: OrderItem) {
  const addonTotal = item.addons.reduce((sum, addon) => sum + addon.price, 0);
  return (item.unitPrice + addonTotal) * item.qty;
}

function clampPromotionAmount(amount: number, grossRevenue: number) {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const safeGross = Number.isFinite(grossRevenue) ? Math.max(0, grossRevenue) : 0;
  return Math.min(safeAmount, safeGross);
}

function orderUnitPrice(recipe: Recipe, channel: string) {
  if (channel === "หน้าร้าน") return Number(recipe.sellingPrice || 0);
  return Number(recipe.deliveryPrice || recipe.sellingPrice || 0);
}

function saleItemMultiplier(item: SaleDraftItem, allItems: SaleDraftItem[]) {
  if (!item.parentId) return item.qty;
  const parent = allItems.find((candidate) => candidate.id === item.parentId);
  return parent?.qty || 1;
}

function calculateSaleDraftTotals(items: SaleDraftItem[]) {
  return items.reduce(
    (totals, item) => {
      const multiplier = saleItemMultiplier(item, items);
      const revenue = multiplier * item.unitPrice;
      const cost = multiplier * item.unitCost;
      const recipeCost = item.kind === "topping" ? 0 : cost;
      const toppingCost = item.kind === "topping" ? cost : 0;
      return {
        revenue: totals.revenue + revenue,
        cost: totals.cost + cost,
        recipeCost: totals.recipeCost + recipeCost,
        toppingCost: totals.toppingCost + toppingCost,
        profit: totals.profit + revenue - cost,
        qty: totals.qty + (item.parentId ? 0 : item.qty)
      };
    },
    { revenue: 0, cost: 0, recipeCost: 0, toppingCost: 0, profit: 0, qty: 0 }
  );
}

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function getSalesReportRows(sales: Sale[], startDate: string, endDate: string) {
  const dates = Array.from(new Set(sales.filter((sale) => sale.saleDate >= startDate && sale.saleDate <= endDate).map((sale) => sale.saleDate)));
  return dates.sort().map((date) => summarizeSales(sales, date));
}

function getTopSellingMenus(sales: Sale[], startDate: string, endDate: string): TopSellingMenu[] {
  const menus = new Map<string, TopSellingMenu>();
  sales
    .filter((sale) => sale.saleDate >= startDate && sale.saleDate <= endDate)
    .forEach((sale) => {
      sale.items
        .filter((item) => item.kind !== "topping" && !item.parentId)
        .forEach((item) => {
          const key = item.itemId || item.name;
          const current = menus.get(key) || { itemId: key, name: item.name, quantity: 0, revenue: 0 };
          current.quantity += item.qty;
          current.revenue += item.lineRevenue;
          menus.set(key, current);
        });
    });
  return Array.from(menus.values())
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.name.localeCompare(b.name, "th"))
    .slice(0, 5);
}

function getReportDateRange(referenceDate: string, mode: ClosingReportMode, customStart: string, customEnd: string): ReportDateRange {
  const reference = parseDateKey(referenceDate) || new Date();
  if (mode === "custom") {
    const start = parseDateKey(customStart) ? customStart : dateToKey(reference);
    const end = parseDateKey(customEnd) ? customEnd : start;
    return start <= end ? { start, end } : { start: end, end: start };
  }
  if (mode === "month") {
    return {
      start: dateToKey(new Date(reference.getFullYear(), reference.getMonth(), 1)),
      end: dateToKey(new Date(reference.getFullYear(), reference.getMonth() + 1, 0))
    };
  }
  return { start: offsetDateKey(dateToKey(reference), -6), end: dateToKey(reference) };
}

function offsetDateKey(value: string, days: number) {
  const date = parseDateKey(value) || new Date();
  date.setDate(date.getDate() + days);
  return dateToKey(date);
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function dateToKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatThaiDate(value: string) {
  const date = parseDateKey(value);
  if (!date) return value;
  return date.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatSaleTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ไม่ระบุเวลา";
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function summarizeSales(sales: Sale[], date: string): SalesSummary {
  return sales
    .filter((sale) => sale.saleDate === date)
    .reduce(
      (summary, sale) => ({
        date,
        orderCount: summary.orderCount + 1,
        itemCount: summary.itemCount + sale.items.filter((item) => item.kind !== "topping" && !item.parentId).reduce((sum, item) => sum + item.qty, 0),
        revenue: summary.revenue + sale.totalRevenue,
        cost: summary.cost + sale.totalCost,
        profit: summary.profit + sale.totalProfit
      }),
      { date, orderCount: 0, itemCount: 0, revenue: 0, cost: 0, profit: 0 }
    );
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9ก-๙_-]+/g, "-").replace(/^-+|-+$/g, "") || "order";
}

function getStoredReceiptPaperSettings(): ReceiptPaperSettings {
  try {
    const raw = localStorage.getItem(receiptPaperStorageKey);
    if (!raw) return defaultReceiptPaperSettings;
    return normalizeReceiptPaperSettings({ ...defaultReceiptPaperSettings, ...JSON.parse(raw) });
  } catch {
    return defaultReceiptPaperSettings;
  }
}

function normalizeReceiptPaperSettings(settings: ReceiptPaperSettings): ReceiptPaperSettings {
  const presetId = receiptPaperPresets.some((preset) => preset.id === settings.presetId) ? settings.presetId : "a9max77";
  const sidePadding = clampNumber(settings.paddingXMm, 0, 20, defaultReceiptPaperSettings.paddingXMm);
  const leftPadding = clampNumber(settings.paddingLeftMm, 0, 20, sidePadding);
  const rightPadding = clampNumber(settings.paddingRightMm, 0, 20, sidePadding);
  return {
    presetId,
    paperWidthMm: clampNumber(settings.paperWidthMm, 40, 120, defaultReceiptPaperSettings.paperWidthMm),
    paddingXMm: leftPadding === rightPadding ? leftPadding : sidePadding,
    paddingLeftMm: leftPadding,
    paddingRightMm: rightPadding,
    paddingTopMm: clampNumber(settings.paddingTopMm, 0, 20, defaultReceiptPaperSettings.paddingTopMm),
    paddingBottomMm: clampNumber(settings.paddingBottomMm, 0, 30, defaultReceiptPaperSettings.paddingBottomMm),
    xOffsetMm: clampNumber(settings.xOffsetMm, -20, 20, defaultReceiptPaperSettings.xOffsetMm),
    pixelRatio: Math.round(clampNumber(settings.pixelRatio, 2, 5, defaultReceiptPaperSettings.pixelRatio))
  };
}

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

async function shiftImageDataUrl(dataUrl: string, xOffsetMm: number, widthPx: number, paperWidthMm: number) {
  if (!xOffsetMm || !paperWidthMm) return dataUrl;

  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;

  const cssPxOffset = (xOffsetMm / paperWidthMm) * widthPx;
  const rasterOffset = cssPxOffset * (image.naturalWidth / widthPx);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, rasterOffset, 0);
  return canvas.toDataURL("image/png");
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Receipt image could not be loaded."));
    image.src = src;
  });
}

function padNumber(value: number) {
  return String(value).padStart(2, "0");
}

export default App;
