import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coffee,
  CupSoda,
  GlassWater,
  Grid2X2,
  Home,
  KeyRound,
  Milk,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  WalletCards
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType, FormEvent, ReactNode } from "react";
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
import type { Category, CategoryId, Ingredient, Recipe, RecipeItem, Unit } from "./types/app";

type Tab = "home" | "recipes" | "cost" | "ingredients";
type Screen = "main" | "detail" | "ingredientForm" | "recipeForm";
type IngredientFilter = "all" | "base" | "topping";
type SortMode = "latest" | "name" | "cost";
type CostMode = "formula" | "price" | "profit";

const iconMap = { Store, CupSoda, Milk, Coffee, GlassWater, Cherry: Sparkles };
const ingredientCategories = ["วัตถุดิบน้ำ", "ท็อปปิ้ง", "บรรจุภัณฑ์"];
const units: Unit[] = ["ml", "g", "piece"];
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
  const [pickingCostRecipe, setPickingCostRecipe] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(cachedData?.recipes[0] || null);
  const [categoryList, setCategoryList] = useState<Category[]>(cachedData?.categories || []);
  const [recipes, setRecipes] = useState<Recipe[]>(cachedData?.recipes || []);
  const [ingredientList, setIngredientList] = useState<Ingredient[]>(cachedData?.ingredients || []);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(accessKey && !cachedData));
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [syncState, setSyncState] = useState<SyncState>(() => getSyncState());
  const backgroundSyncRef = useRef<Promise<void> | null>(null);

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

  function applyData(data: { categories: Category[]; ingredients: Ingredient[]; recipes: Recipe[] }, selectedId?: string) {
    setCategoryList(data.categories);
    setIngredientList(data.ingredients);
    setRecipes(data.recipes);
    setSelectedRecipe((current) => data.recipes.find((recipe) => recipe.id === (selectedId || current?.id)) || data.recipes[0] || null);
  }

  function syncPendingInBackground() {
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
        cacheAppData(remoteData);
        applyData(remoteData, selectedRecipe?.id);
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
      cacheAppData({ categories: categoryList, ingredients: ingredientList, recipes: next });
      return next;
    });
    setSelectedRecipe(recipe);
  }

  function applyIngredientLocally(ingredient: Ingredient) {
    const nextIngredients = ingredientList.some((item) => item.id === ingredient.id)
      ? ingredientList.map((item) => (item.id === ingredient.id ? ingredient : item))
      : [ingredient, ...ingredientList];
    setIngredientList(nextIngredients);
    cacheAppData({ categories: categoryList, ingredients: nextIngredients, recipes });
  }

  function removeRecipeLocally(recipeId: string) {
    const nextRecipes = recipes.filter((recipe) => recipe.id !== recipeId);
    setRecipes(nextRecipes);
    setSelectedRecipe((current) => (current?.id === recipeId ? nextRecipes[0] || null : current));
    cacheAppData({ categories: categoryList, ingredients: ingredientList, recipes: nextRecipes });
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
    cacheAppData({ categories: categoryList, ingredients: nextIngredients, recipes: nextRecipes });
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
    let imageUrl = editingRecipe?.imageUrl;
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
        categoryId: String(form.get("categoryId") || "tea") as CategoryId,
        imageKey: editingRecipe?.imageKey || "thai",
        imageUrl,
        status: String(form.get("status") || ""),
        prepTime: editingRecipe?.prepTime || 0,
        sweetness: editingRecipe?.sweetness || 0,
        sizeOz: editingRecipe?.sizeOz || 0,
        sellingPrice: Number(form.get("sellingPrice") || 35),
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
              payload: { recipe: savedRecipe, image: imagePayload }
            }
          : { action: "saveRecipe", entityId: recipeId, payload: savedRecipe }
      );
      applyRecipeLocally(savedRecipe);
      setEditingRecipe(null);
      setScreen("detail");
      void syncPendingInBackground();
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
    setMessage("");
    setScreen("recipeForm");
  }

  function startEditRecipe(recipe: Recipe) {
    setEditingRecipe(recipe);
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
            onDelete={removeRecipe}
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
            categories={categoryList}
            ingredients={ingredientList}
            message={message}
            recipe={editingRecipe}
            saving={saving}
            onBack={() => setScreen("main")}
            onSubmit={submitRecipe}
          />
        ) : (
          <>
            <main className="content">
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
              ) : tab === "cost" && selectedRecipe && selectedCost ? (
                <CostScreen
                  cost={selectedCost}
                  costMode={costMode}
                  deliveryFee={deliveryFee}
                  ingredients={ingredientList}
                  recipe={selectedRecipe}
                  targetMargin={targetMargin}
                  onChangeMode={setCostMode}
                  onChangeRecipe={() => {
                    setPickingCostRecipe(true);
                    setTab("recipes");
                  }}
                  onDeliveryFee={setDeliveryFee}
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

function RecipeDetail({
  recipe,
  ingredients,
  saving,
  onBack,
  onDelete,
  onEdit
}: {
  recipe: Recipe;
  ingredients: Ingredient[];
  saving: boolean;
  onBack: () => void;
  onDelete: (id: string) => void;
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
        <Metric label="กำไร" value={`${money(cost.profit)} บาท`} />
      </section>
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
  targetMargin,
  onChangeMode,
  onChangeRecipe,
  onDeliveryFee,
  onMargin
}: {
  recipe: Recipe;
  ingredients: Ingredient[];
  cost: ReturnType<typeof calculateCost>;
  costMode: CostMode;
  deliveryFee: number;
  targetMargin: number;
  onChangeMode: (mode: CostMode) => void;
  onChangeRecipe: () => void;
  onDeliveryFee: (fee: number) => void;
  onMargin: (margin: number) => void;
}) {
  const suggested = roundPrice(cost.totalCost / (1 - targetMargin / 100));
  const deliveryPrice = deliveryFee >= 100 ? 0 : roundPrice(recipe.sellingPrice / (1 - deliveryFee / 100));
  const platformFeeAmount = (deliveryPrice * deliveryFee) / 100;
  const deliveryNetRevenue = deliveryPrice - platformFeeAmount;
  const deliveryProfit = deliveryNetRevenue - cost.totalCost;
  const deliveryMargin = deliveryPrice > 0 ? (deliveryProfit / deliveryPrice) * 100 : 0;
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
  message,
  recipe,
  saving,
  onBack,
  onSubmit
}: {
  categories: Category[];
  ingredients: Ingredient[];
  message: string;
  recipe: Recipe | null;
  saving: boolean;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [items, setItems] = useState<RecipeItem[]>(
    recipe?.items.length ? recipe.items : [{ ingredientId: ingredients[0]?.id || "", amount: 0, unit: ingredients[0]?.baseUnit || "ml", note: "" }]
  );
  const [imagePreview, setImagePreview] = useState(recipe?.imageUrl || "");
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
      <TopTitle left={<button className="bare-button" onClick={onBack} type="button"><ChevronLeft size={24} /></button>} title={recipe ? "แก้สูตร" : "เพิ่มสูตร"} />
      <form className="form-card" onSubmit={onSubmit}>
        {message ? <div className="status-banner">{message}</div> : null}
        <FormField defaultValue={recipe?.name} label="ชื่อเมนู" name="name" placeholder="เช่น ชาไทยไข่มุก" required />
        <label>
          หมวดหมู่
          <select defaultValue={recipe?.categoryId || "tea"} name="categoryId">
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
        <section className="recipe-items-editor">
          <div className="form-section-title">
            <h3>ส่วนผสมในสูตร</h3>
            <button onClick={addItem} type="button"><Plus size={15} /> เพิ่ม</button>
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
            />
          ))}
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
  onRemove
}: {
  editorRef?: (node: HTMLDivElement | null) => void;
  ingredientList: Ingredient[];
  item: RecipeItem;
  onChange: (item: RecipeItem) => void;
  onRemove: () => void;
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
      <button className="remove-line-button" onClick={onRemove} type="button">
        <Trash2 size={14} /> ลบส่วนผสมนี้
      </button>
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
    { id: "cost", label: "ต้นทุน", icon: ShoppingBag },
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

export default App;
