import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coffee,
  CupSoda,
  GlassWater,
  Grid2X2,
  Heart,
  Home,
  Milk,
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Trash2,
  WalletCards
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ElementType, FormEvent, ReactNode } from "react";
import cardCostBg from "./assets/UI/card-cost-bg.png";
import cardRecipesBg from "./assets/UI/card-recipes-bg.png";
import { DrinkArt } from "./components/DrinkArt";
import { RecipeCard } from "./components/RecipeCard";
import { categories as mockCategories, ingredients as mockIngredients, recipes as mockRecipes } from "./data/mockData";
import {
  deleteIngredient,
  deleteRecipe,
  fetchAppData,
  fileToImagePayload,
  getCachedAppData,
  saveIngredient,
  saveRecipe,
  toggleFavoriteRemote,
  uploadRecipeImage
} from "./lib/appsScriptApi";
import { calculateCost, money, roundPrice } from "./lib/cost";
import type { Category, CategoryId, Ingredient, Recipe, Unit } from "./types/app";

type Tab = "home" | "recipes" | "cost" | "ingredients" | "favorites";
type Screen = "main" | "detail" | "ingredientForm" | "recipeForm";
type IngredientFilter = "all" | "base" | "topping";
type SortMode = "latest" | "name" | "cost";
type CostMode = "formula" | "price" | "profit";

const iconMap = { Store, CupSoda, Milk, Coffee, GlassWater, Cherry: Sparkles };
const ingredientCategories = ["วัตถุดิบน้ำ", "ท็อปปิ้ง", "บรรจุภัณฑ์"];
const units: Unit[] = ["ml", "g", "piece"];
const deliveryPlatforms = [
  { id: "lineman", name: "LINE MAN", fee: 30, icon: "/platform-lineman.svg" },
  { id: "grab", name: "Grab", fee: 32, icon: "/platform-grab.svg" },
  { id: "shopeefood", name: "ShopeeFood", fee: 30, icon: "/platform-shopeefood.svg" }
];

function App() {
  const [cachedData] = useState(() => getCachedAppData());
  const [tab, setTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen>("main");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [ingredientFilter, setIngredientFilter] = useState<IngredientFilter>("all");
  const [costMode, setCostMode] = useState<CostMode>("formula");
  const [targetMargin, setTargetMargin] = useState(60);
  const [deliveryFee, setDeliveryFee] = useState(30);
  const [pickingCostRecipe, setPickingCostRecipe] = useState(false);
  const [favoriteEditMode, setFavoriteEditMode] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(cachedData?.recipes[0] || mockRecipes[0]);
  const [categoryList, setCategoryList] = useState<Category[]>(cachedData?.categories || mockCategories);
  const [recipes, setRecipes] = useState<Recipe[]>(cachedData?.recipes || mockRecipes);
  const [ingredientList, setIngredientList] = useState<Ingredient[]>(cachedData?.ingredients || mockIngredients);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!cachedData);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (cachedData) {
      setLoading(false);
      return;
    }

    let ignore = false;
    fetchAppData()
      .then((data) => {
        if (ignore) return;
        applyData(data, selectedRecipe.id);
        setLoading(false);
      })
      .catch((error) => {
        if (ignore) return;
        console.warn(error);
        setMessage("ยังต่อ Google Sheet ไม่ได้ เลยแสดงข้อมูลตัวอย่างก่อน");
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [cachedData]);

  const filteredRecipes = useMemo(() => {
    const base = selectedCategory === "all" ? recipes : recipes.filter((recipe) => recipe.categoryId === selectedCategory);
    const visible = tab === "favorites" ? base.filter((recipe) => recipe.favorite) : base;
    return visible.slice().sort((a, b) => {
      if (sortMode === "name") return a.name.localeCompare(b.name, "th");
      if (sortMode === "cost") return calculateCost(b, ingredientList).totalCost - calculateCost(a, ingredientList).totalCost;
      return 0;
    });
  }, [ingredientList, recipes, selectedCategory, sortMode, tab]);

  const selectedCost = calculateCost(selectedRecipe, ingredientList);
  const favoriteRecipes = recipes.filter((recipe) => recipe.favorite);

  function applyData(data: { categories: Category[]; ingredients: Ingredient[]; recipes: Recipe[] }, selectedId?: string) {
    setCategoryList(data.categories);
    setIngredientList(data.ingredients);
    setRecipes(data.recipes);
    setSelectedRecipe((current) => data.recipes.find((recipe) => recipe.id === (selectedId || current.id)) || data.recipes[0] || mockRecipes[0]);
  }

  async function refreshData(selectedId?: string) {
    const data = await fetchAppData();
    applyData(data, selectedId);
    return data;
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

  async function toggleFavorite(recipeId: string) {
    setRecipes((items) => items.map((item) => (item.id === recipeId ? { ...item, favorite: !item.favorite } : item)));
    if (selectedRecipe.id === recipeId) setSelectedRecipe((recipe) => ({ ...recipe, favorite: !recipe.favorite }));
    try {
      await toggleFavoriteRemote(recipeId);
      await refreshData(recipeId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกเมนูโปรดไม่สำเร็จ");
      await refreshData(recipeId).catch(() => undefined);
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
      await saveIngredient({
        id: editingIngredient?.id || `ing_${Date.now()}`,
        name: String(form.get("name") || "วัตถุดิบใหม่"),
        category: String(form.get("category") || "วัตถุดิบน้ำ"),
        buyQty,
        buyUnit,
        buyPrice,
        baseUnit,
        costPerUnit: buyQty > 0 ? buyPrice / buyQty : 0,
        note: String(form.get("note") || "")
      });
      await refreshData();
      setEditingIngredient(null);
      setTab("ingredients");
      setScreen("main");
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
    let imageFileId = "";
    try {
      if (file instanceof File && file.size > 0) {
        const uploaded = await uploadRecipeImage(await fileToImagePayload(file));
        imageUrl = uploaded.image_url;
        imageFileId = uploaded.file_id;
      }
      const recipeId = editingRecipe?.id || `rec_${Date.now()}`;
      await saveRecipe({
        id: recipeId,
        name: String(form.get("name") || "สูตรใหม่"),
        categoryId: String(form.get("categoryId") || "tea") as CategoryId,
        imageUrl,
        imageFileId,
        status: String(form.get("status") || ""),
        prepTime: editingRecipe?.prepTime || 0,
        sweetness: editingRecipe?.sweetness || 0,
        sizeOz: editingRecipe?.sizeOz || 0,
        sellingPrice: Number(form.get("sellingPrice") || 35),
        favorite: editingRecipe?.favorite || false,
        rating: editingRecipe?.rating || 4.5,
        steps: String(form.get("steps") || "")
          .split("\n")
          .map((step) => step.trim())
          .filter(Boolean)
      });
      await refreshData(recipeId);
      setEditingRecipe(null);
      setScreen("detail");
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
      await deleteRecipe(recipeId);
      await refreshData();
      setTab("recipes");
      setScreen("main");
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
      await deleteIngredient(ingredientId);
      await refreshData();
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

  return (
    <div className="app-shell">
      <div className="phone">
        {screen === "detail" ? (
          <RecipeDetail
            recipe={selectedRecipe}
            ingredients={ingredientList}
            saving={saving}
            onBack={() => setScreen("main")}
            onDelete={removeRecipe}
            onEdit={startEditRecipe}
            onFavorite={toggleFavorite}
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
            message={message}
            recipe={editingRecipe}
            saving={saving}
            onBack={() => setScreen("main")}
            onSubmit={submitRecipe}
          />
        ) : (
          <>
            <main className="content">
              {message ? <div className="status-banner">{message}</div> : null}
              {loading ? (
                <LoadingScreen />
              ) : tab === "home" ? (
                <HomeScreen
                  categories={categoryList}
                  favoriteRecipes={favoriteRecipes}
                  onCategory={(category) => {
                    setSelectedCategory(category);
                    setTab("recipes");
                  }}
                  onNavigate={setTab}
                  onOpen={openRecipe}
                />
              ) : tab === "recipes" ? (
                <RecipesScreen
                  categories={categoryList}
                  pickingCostRecipe={pickingCostRecipe}
                  recipes={filteredRecipes}
                  sortMode={sortMode}
                  selectedCategory={selectedCategory}
                  onCategory={setSelectedCategory}
                  onOpen={openRecipe}
                  onSort={() => setSortMode((mode) => (mode === "latest" ? "name" : mode === "name" ? "cost" : "latest"))}
                />
              ) : tab === "cost" ? (
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
              ) : tab === "ingredients" ? (
                <IngredientsScreen
                  filter={ingredientFilter}
                  ingredients={ingredientList}
                  saving={saving}
                  onAdd={startAddIngredient}
                  onDelete={removeIngredient}
                  onEdit={startEditIngredient}
                  onFilter={setIngredientFilter}
                />
              ) : (
                <FavoritesScreen
                  editMode={favoriteEditMode}
                  ingredients={ingredientList}
                  recipes={favoriteRecipes}
                  onFavorite={toggleFavorite}
                  onOpen={openRecipe}
                  onToggleEdit={() => setFavoriteEditMode((value) => !value)}
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

function HomeScreen({
  categories,
  favoriteRecipes,
  onCategory,
  onOpen,
  onNavigate
}: {
  categories: Category[];
  favoriteRecipes: Recipe[];
  onCategory: (category: CategoryId) => void;
  onOpen: (recipe: Recipe) => void;
  onNavigate: (tab: Tab) => void;
}) {
  return (
    <>
      <header className="home-header">
        <div>
          <h1>สวัสดี</h1>
          <p>วันนี้ขายดี ๆ ปัง ๆ นะ</p>
        </div>
        <Bell size={22} />
      </header>
      <div className="search-row">
        <label className="search-box">
          <Search size={18} />
          <input placeholder="ค้นหาเมนู เช่น ชาไทย, โกโก้, นมสด..." />
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
      <SectionTitle action="ดูทั้งหมด" title="เมนูขายดีประจำวัน" onAction={() => onNavigate("favorites")} />
      <div className="horizontal-cards">
        {favoriteRecipes.map((recipe) => (
          <button className="mini-card" key={recipe.id} onClick={() => onOpen(recipe)} type="button">
            <DrinkArt compact imageKey={recipe.imageKey} imageUrl={recipe.imageUrl} />
            <strong>{recipe.name}</strong>
            <span>
              <Star size={12} fill="currentColor" /> {recipe.rating}
            </span>
          </button>
        ))}
      </div>
    </>
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
  sortMode,
  onOpen,
  onSort
}: {
  categories: Category[];
  pickingCostRecipe: boolean;
  selectedCategory: CategoryId;
  onCategory: (category: CategoryId) => void;
  recipes: Recipe[];
  sortMode: SortMode;
  onOpen: (recipe: Recipe) => void;
  onSort: () => void;
}) {
  const sortLabel = sortMode === "latest" ? "ล่าสุด" : sortMode === "name" ? "ชื่อเมนู" : "ต้นทุนสูง";
  return (
    <>
      <TopTitle right={<Search size={22} />} title={pickingCostRecipe ? "เลือกเมนูคำนวณ" : "สูตร"} />
      {pickingCostRecipe ? <div className="status-banner">แตะสูตรที่ต้องการ แล้วแอปจะกลับไปหน้าคำนวณต้นทุน</div> : null}
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
  onEdit,
  onFavorite
}: {
  recipe: Recipe;
  ingredients: Ingredient[];
  saving: boolean;
  onBack: () => void;
  onDelete: (id: string) => void;
  onEdit: (recipe: Recipe) => void;
  onFavorite: (id: string) => void;
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
        <button onClick={() => onFavorite(recipe.id)} type="button">
          <Heart className={recipe.favorite ? "is-favorite" : ""} fill={recipe.favorite ? "currentColor" : "none"} size={22} />
        </button>
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
  const platformFeeAmount = (recipe.sellingPrice * deliveryFee) / 100;
  const deliveryProfit = recipe.sellingPrice - platformFeeAmount - cost.totalCost;
  const deliveryMargin = recipe.sellingPrice > 0 ? (deliveryProfit / recipe.sellingPrice) * 100 : 0;
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
            <div className="total-line">
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

function FavoritesScreen({
  editMode,
  recipes,
  ingredients,
  onFavorite,
  onOpen,
  onToggleEdit
}: {
  editMode: boolean;
  recipes: Recipe[];
  ingredients: Ingredient[];
  onFavorite: (id: string) => void;
  onOpen: (recipe: Recipe) => void;
  onToggleEdit: () => void;
}) {
  return (
    <>
      <TopTitle right={<button className="text-button" onClick={onToggleEdit} type="button">{editMode ? "เสร็จ" : "แก้ไข"}</button>} title="เมนูโปรด" />
      <div className="favorite-list">
        {recipes.map((recipe) => {
          const cost = calculateCost(recipe, ingredients);
          return (
            <button className="favorite-row" key={recipe.id} onClick={() => (editMode ? onFavorite(recipe.id) : onOpen(recipe))} type="button">
              <DrinkArt compact imageKey={recipe.imageKey} imageUrl={recipe.imageUrl} />
              <div>
                <strong>{recipe.name}</strong>
                <span>ต้นทุน {money(cost.totalCost)} บาท · กำไร {money(cost.profit)} บาท</span>
              </div>
              <Heart className={editMode ? "favorite-remove" : "is-favorite"} fill="currentColor" size={20} />
            </button>
          );
        })}
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
  message,
  recipe,
  saving,
  onBack,
  onSubmit
}: {
  categories: Category[];
  message: string;
  recipe: Recipe | null;
  saving: boolean;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
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
          <Package size={22} />
          <span>{recipe?.imageUrl ? "เปลี่ยนรูปเมนู" : "อัปโหลดรูปเมนู"}</span>
          <small>รูปจะถูกส่งเข้า Google Drive ผ่าน Apps Script</small>
          <input accept="image/*" name="image" type="file" />
        </label>
        <FormField defaultValue={recipe?.status || ""} label="ป้ายสถานะ" name="status" placeholder="เช่น ขายดี" />
        <FormField defaultValue={recipe?.sellingPrice || 35} label="ราคาขาย (บาท)" name="sellingPrice" placeholder="35" type="number" />
        <label>
          วิธีทำ
          <textarea defaultValue={recipe?.steps.join("\n") || ""} name="steps" placeholder="หนึ่งบรรทัดต่อหนึ่งขั้นตอน" />
        </label>
        <button className="submit-button" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกสูตร"}</button>
      </form>
    </main>
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
    { id: "ingredients", label: "วัตถุดิบ", icon: WalletCards },
    { id: "favorites", label: "โปรด", icon: Heart }
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

export default App;
