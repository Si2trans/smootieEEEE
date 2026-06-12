import {
  Bell,
  Calculator,
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
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  WalletCards
} from "lucide-react";
import { useMemo, useState } from "react";
import assetPack from "./assets/beverage-asset-pack.png";
import { DrinkArt } from "./components/DrinkArt";
import { RecipeCard } from "./components/RecipeCard";
import { categories, ingredients, recipes as initialRecipes } from "./data/mockData";
import { calculateCost, money, roundPrice } from "./lib/cost";
import type { CategoryId, Ingredient, Recipe } from "./types/app";

type Tab = "home" | "recipes" | "cost" | "ingredients" | "favorites";
type Screen = "main" | "detail" | "ingredientForm" | "recipeForm";

const iconMap = { Store, CupSoda, Milk, Coffee, GlassWater, Cherry: Sparkles };

function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen>("main");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(initialRecipes[0]);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [ingredientList, setIngredientList] = useState(ingredients);

  const filteredRecipes = useMemo(() => {
    const base = selectedCategory === "all" ? recipes : recipes.filter((recipe) => recipe.categoryId === selectedCategory);
    return tab === "favorites" ? base.filter((recipe) => recipe.favorite) : base;
  }, [recipes, selectedCategory, tab]);

  const selectedCost = calculateCost(selectedRecipe, ingredientList);
  const favoriteRecipes = recipes.filter((recipe) => recipe.favorite);

  function openRecipe(recipe: Recipe) {
    setSelectedRecipe(recipe);
    setScreen("detail");
  }

  function toggleFavorite(recipeId: string) {
    setRecipes((items) => items.map((item) => (item.id === recipeId ? { ...item, favorite: !item.favorite } : item)));
    if (selectedRecipe.id === recipeId) setSelectedRecipe((recipe) => ({ ...recipe, favorite: !recipe.favorite }));
  }

  function addIngredient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const buyQty = Number(form.get("buyQty") || 1);
    const buyPrice = Number(form.get("buyPrice") || 0);
    const costPerUnit = buyQty > 0 ? buyPrice / buyQty : 0;
    const ingredient: Ingredient = {
      id: `ing_${Date.now()}`,
      name: String(form.get("name") || "วัตถุดิบใหม่"),
      category: String(form.get("category") || "วัตถุดิบน้ำ"),
      buyQty,
      buyUnit: "ml",
      buyPrice,
      baseUnit: "ml",
      costPerUnit,
      note: String(form.get("note") || "")
    };
    setIngredientList((items) => [ingredient, ...items]);
    setScreen("main");
    setTab("ingredients");
  }

  function addRecipe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const recipe: Recipe = {
      id: `rec_${Date.now()}`,
      name: String(form.get("name") || "สูตรใหม่"),
      categoryId: String(form.get("categoryId") || "tea") as CategoryId,
      imageKey: "thai",
      prepTime: Number(form.get("prepTime") || 5),
      sweetness: Number(form.get("sweetness") || 75),
      sizeOz: 16,
      sellingPrice: Number(form.get("sellingPrice") || 35),
      favorite: false,
      rating: 4.5,
      items: [],
      steps: ["เพิ่มส่วนผสมและวิธีทำในเวอร์ชันเชื่อม Google Sheet"]
    };
    setRecipes((items) => [recipe, ...items]);
    setSelectedRecipe(recipe);
    setScreen("detail");
  }

  return (
    <div className="app-shell">
      <div className="phone">
        <StatusBar />
        {screen === "detail" ? (
          <RecipeDetail recipe={selectedRecipe} ingredients={ingredientList} onBack={() => setScreen("main")} onFavorite={toggleFavorite} />
        ) : screen === "ingredientForm" ? (
          <IngredientForm onBack={() => setScreen("main")} onSubmit={addIngredient} />
        ) : screen === "recipeForm" ? (
          <RecipeForm onBack={() => setScreen("main")} onSubmit={addRecipe} />
        ) : (
          <>
            <main className="content">
              {tab === "home" ? (
                <HomeScreen favoriteRecipes={favoriteRecipes} onOpen={openRecipe} />
              ) : tab === "recipes" ? (
                <RecipesScreen
                  selectedCategory={selectedCategory}
                  onCategory={setSelectedCategory}
                  recipes={filteredRecipes}
                  onOpen={openRecipe}
                />
              ) : tab === "cost" ? (
                <CostScreen recipe={selectedRecipe} ingredients={ingredientList} cost={selectedCost} />
              ) : tab === "ingredients" ? (
                <IngredientsScreen ingredients={ingredientList} onAdd={() => setScreen("ingredientForm")} />
              ) : (
                <FavoritesScreen recipes={favoriteRecipes} onOpen={openRecipe} />
              )}
            </main>
            <BottomNav active={tab} onChange={setTab} onAdd={() => setScreen("recipeForm")} />
          </>
        )}
      </div>
      <aside className="build-note">
        <img src={assetPack} alt="" />
        <h2>Drink Cost Studio</h2>
        <p>PWA mock พร้อมต่อ Google Apps Script และ Google Sheet สำหรับร้านเดียว</p>
      </aside>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="status-bar">
      <strong>9:41</strong>
      <span>▮▮▮ Wi-Fi ▰</span>
    </div>
  );
}

function HomeScreen({ favoriteRecipes, onOpen }: { favoriteRecipes: Recipe[]; onOpen: (recipe: Recipe) => void }) {
  return (
    <>
      <header className="home-header">
        <div>
          <h1>สวัสดี! 👋</h1>
          <p>วันนี้ขายดีๆ ปังๆ นะ!</p>
        </div>
        <Bell size={22} />
      </header>
      <div className="search-row">
        <label className="search-box">
          <Search size={18} />
          <input placeholder="ค้นหาเมนู เช่น ชาไทย, โกโก้, นมสด..." />
        </label>
        <button className="icon-button">
          <SlidersHorizontal size={19} />
        </button>
      </div>
      <section className="quick-grid">
        <button className="quick-card quick-card--green">
          <div>
            <h3>สูตรเครื่องดื่ม</h3>
            <p>ค้นหาสูตรไว ใช้ตอนขายจริง</p>
            <span>ดูสูตรทั้งหมด</span>
          </div>
          <DrinkArt imageKey="matcha" compact />
        </button>
        <button className="quick-card quick-card--orange">
          <div>
            <h3>คำนวณต้นทุน</h3>
            <p>เช็กกำไรก่อนขาย</p>
            <span>เริ่มคำนวณ</span>
          </div>
          <Calculator size={62} />
        </button>
      </section>
      <SectionTitle title="หมวดหมู่เครื่องดื่ม" action="ดูทั้งหมด" />
      <div className="category-strip">
        {categories.slice(1).map((category) => {
          const Icon = iconMap[category.icon as keyof typeof iconMap] ?? Store;
          return (
            <button className="category-chip" key={category.id}>
              <span style={{ background: category.color }}>
                <Icon size={18} />
              </span>
              {category.label}
            </button>
          );
        })}
      </div>
      <SectionTitle title="เมนูขายดีประจำวัน" action="ดูทั้งหมด" />
      <div className="horizontal-cards">
        {favoriteRecipes.map((recipe) => (
          <button className="mini-card" key={recipe.id} onClick={() => onOpen(recipe)}>
            <DrinkArt imageKey={recipe.imageKey} compact />
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

function RecipesScreen({
  selectedCategory,
  onCategory,
  recipes,
  onOpen
}: {
  selectedCategory: CategoryId;
  onCategory: (category: CategoryId) => void;
  recipes: Recipe[];
  onOpen: (recipe: Recipe) => void;
}) {
  return (
    <>
      <TopTitle title="สูตร" right={<Search size={22} />} />
      <div className="category-filter">
        {categories.map((category) => {
          const Icon = iconMap[category.icon as keyof typeof iconMap] ?? Store;
          return (
            <button
              className={selectedCategory === category.id ? "is-active" : ""}
              key={category.id}
              onClick={() => onCategory(category.id)}
            >
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
        <span>
          ล่าสุด <ChevronDown size={14} />
        </span>
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
  onBack,
  onFavorite
}: {
  recipe: Recipe;
  ingredients: Ingredient[];
  onBack: () => void;
  onFavorite: (id: string) => void;
}) {
  const cost = calculateCost(recipe, ingredients);
  const byId = new Map(ingredients.map((item) => [item.id, item]));
  return (
    <main className="detail">
      <div className="detail-topbar">
        <button onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <strong>{recipe.name}</strong>
        <button onClick={() => onFavorite(recipe.id)}>
          <Heart size={22} className={recipe.favorite ? "is-favorite" : ""} fill={recipe.favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="detail-hero">
        <DrinkArt imageKey={recipe.imageKey} />
        {recipe.status ? <span className="badge badge--hot">{recipe.status}</span> : null}
        <span className="time-pill">{recipe.prepTime} นาที</span>
      </div>
      <section className="metric-row">
        <Metric label="ระดับหวาน" value={`${recipe.sweetness}%`} />
        <Metric label="ขนาดแนะนำ" value={`${recipe.sizeOz} oz`} />
        <Metric label="ต้นทุน/แก้ว" value={`${money(cost.totalCost)} บาท`} />
      </section>
      <div className="segmented">
        <button className="is-active">16 oz</button>
        <button>22 oz</button>
        <button>แก้วร้อน</button>
      </div>
      <section className="detail-section">
        <div className="detail-section__title">
          <h3>ส่วนผสม</h3>
          <button>ปรับสูตร</button>
        </div>
        {recipe.items.map((item) => {
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
        })}
      </section>
      <section className="detail-section">
        <h3>วิธีทำ</h3>
        <ol className="steps">
          {recipe.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <div className="detail-actions">
        <button>คำนวณต้นทุนเมนูนี้</button>
        <button className="primary">บันทึกเป็นเมนูโปรด</button>
      </div>
    </main>
  );
}

function CostScreen({ recipe, ingredients, cost }: { recipe: Recipe; ingredients: Ingredient[]; cost: ReturnType<typeof calculateCost> }) {
  const suggested = roundPrice(cost.totalCost / (1 - 0.6));
  return (
    <>
      <TopTitle title="คำนวณต้นทุน" />
      <div className="tabs">
        <button className="is-active">คำนวณจากสูตร</button>
        <button>ตั้งราคาขาย</button>
        <button>สรุปกำไร</button>
      </div>
      <section className="selected-recipe">
        <DrinkArt imageKey={recipe.imageKey} compact />
        <div>
          <strong>{recipe.name} (16 oz)</strong>
          <span>ต้นทุนล่าสุดจากสูตร</span>
        </div>
        <button>เปลี่ยนเมนู</button>
      </section>
      <section className="cost-card">
        <h3>ต้นทุนต่อแก้ว</h3>
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
      <section className="profit-panel">
        <div>
          <span>กำไรต่อแก้ว</span>
          <strong>{money(cost.profit)} บาท</strong>
        </div>
        <div>
          <span>กำไร</span>
          <strong>{money(cost.margin)}%</strong>
        </div>
      </section>
      <section className="pricing-card">
        <h3>ราคาขายที่แนะนำ</h3>
        <div className="margin-row">
          {[40, 50, 60, 70].map((margin) => (
            <button className={margin === 60 ? "is-active" : ""} key={margin}>
              {margin}%
            </button>
          ))}
        </div>
        <strong>{suggested} บาท</strong>
        <span>คำนวณจาก margin 60%</span>
      </section>
    </>
  );
}

function IngredientsScreen({ ingredients, onAdd }: { ingredients: Ingredient[]; onAdd: () => void }) {
  return (
    <>
      <TopTitle title="วัตถุดิบ" right={<Settings2 size={20} />} />
      <div className="ingredient-tabs">
        <button className="is-active">ทั้งหมด</button>
        <button>วัตถุดิบ</button>
        <button>ท็อปปิ้ง</button>
        <button onClick={onAdd}>
          <Plus size={16} /> เพิ่มวัตถุดิบ
        </button>
      </div>
      <div className="table-card">
        <div className="table-head">
          <span>ชื่อวัตถุดิบ</span>
          <span>ปริมาณที่ซื้อ</span>
          <span>ราคาซื้อ</span>
          <span>ต้นทุน/หน่วย</span>
        </div>
        {ingredients.map((ingredient) => (
          <div className="table-row" key={ingredient.id}>
            <strong>{ingredient.name}</strong>
            <span>
              {ingredient.buyQty.toLocaleString("th-TH")} {ingredient.buyUnit}
            </span>
            <span>{ingredient.buyPrice.toLocaleString("th-TH")}</span>
            <span>{ingredient.costPerUnit.toFixed(4)} / {ingredient.baseUnit}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function FavoritesScreen({ recipes, onOpen }: { recipes: Recipe[]; onOpen: (recipe: Recipe) => void }) {
  return (
    <>
      <TopTitle title="เมนูโปรด" right={<button className="text-button">แก้ไข</button>} />
      <div className="favorite-list">
        {recipes.map((recipe) => {
          const cost = calculateCost(recipe, ingredients);
          return (
            <button className="favorite-row" key={recipe.id} onClick={() => onOpen(recipe)}>
              <DrinkArt imageKey={recipe.imageKey} compact />
              <div>
                <strong>{recipe.name}</strong>
                <span>16 oz · ต้นทุน {money(cost.totalCost)} บาท</span>
              </div>
              <Heart size={20} className="is-favorite" fill="currentColor" />
            </button>
          );
        })}
      </div>
    </>
  );
}

function IngredientForm({ onBack, onSubmit }: { onBack: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <main className="form-screen">
      <TopTitle title="เพิ่มวัตถุดิบ" left={<ChevronLeft size={24} onClick={onBack} />} />
      <form className="form-card" onSubmit={onSubmit}>
        <FormField name="name" label="ชื่อวัตถุดิบ" placeholder="เช่น นมสด" />
        <label>
          ประเภท
          <select name="category" defaultValue="วัตถุดิบน้ำ">
            <option>วัตถุดิบน้ำ</option>
            <option>ท็อปปิ้ง</option>
            <option>บรรจุภัณฑ์</option>
          </select>
        </label>
        <FormField name="buyQty" label="ปริมาณที่ซื้อ" placeholder="0" type="number" />
        <FormField name="buyPrice" label="ราคาซื้อ (บาท)" placeholder="0.00" type="number" />
        <label>
          หมายเหตุ
          <textarea name="note" placeholder="ถ้ามี" />
        </label>
        <button className="submit-button">บันทึก</button>
      </form>
    </main>
  );
}

function RecipeForm({ onBack, onSubmit }: { onBack: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <main className="form-screen">
      <TopTitle title="เพิ่มสูตร" left={<ChevronLeft size={24} onClick={onBack} />} />
      <form className="form-card" onSubmit={onSubmit}>
        <FormField name="name" label="ชื่อเมนู" placeholder="เช่น ชาไทยไข่มุก" />
        <label>
          หมวดหมู่
          <select name="categoryId" defaultValue="tea">
            {categories.slice(1).map((category) => (
              <option value={category.id} key={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <div className="upload-box">
          <Package size={22} />
          <span>อัปโหลดรูปเมนู</span>
          <small>เวอร์ชัน Apps Script จะส่งรูปเข้า Google Drive</small>
        </div>
        <FormField name="prepTime" label="เวลาเตรียม (นาที)" placeholder="5" type="number" />
        <FormField name="sweetness" label="ระดับหวาน (%)" placeholder="75" type="number" />
        <FormField name="sellingPrice" label="ราคาขาย (บาท)" placeholder="35" type="number" />
        <button className="submit-button">บันทึกสูตร</button>
      </form>
    </main>
  );
}

function FormField({ name, label, placeholder, type = "text" }: { name: string; label: string; placeholder: string; type?: string }) {
  return (
    <label>
      {label}
      <input name={name} placeholder={placeholder} type={type} />
    </label>
  );
}

function BottomNav({ active, onChange, onAdd }: { active: Tab; onChange: (tab: Tab) => void; onAdd: () => void }) {
  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: "home", label: "หน้าแรก", icon: Home },
    { id: "recipes", label: "สูตร", icon: Grid2X2 },
    { id: "cost", label: "ต้นทุน", icon: ShoppingBag },
    { id: "ingredients", label: "วัตถุดิบ", icon: WalletCards },
    { id: "favorites", label: "โปรด", icon: Heart }
  ];
  return (
    <nav className="bottom-nav">
      {tabs.slice(0, 2).map((item) => (
        <NavButton key={item.id} item={item} active={active} onChange={onChange} />
      ))}
      <button className="add-button" onClick={onAdd}>
        <Plus size={28} />
      </button>
      {tabs.slice(2).map((item) => (
        <NavButton key={item.id} item={item} active={active} onChange={onChange} />
      ))}
    </nav>
  );
}

function NavButton({
  item,
  active,
  onChange
}: {
  item: { id: Tab; label: string; icon: React.ElementType };
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  const Icon = item.icon;
  return (
    <button className={active === item.id ? "is-active" : ""} onClick={() => onChange(item.id)}>
      <Icon size={20} />
      <span>{item.label}</span>
    </button>
  );
}

function TopTitle({ title, right, left }: { title: string; right?: React.ReactNode; left?: React.ReactNode }) {
  return (
    <header className="top-title">
      <div>{left}</div>
      <h1>{title}</h1>
      <div>{right}</div>
    </header>
  );
}

function SectionTitle({ title, action }: { title: string; action: string }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      <button>
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
