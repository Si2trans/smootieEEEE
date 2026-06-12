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
import { useEffect, useMemo, useState } from "react";
import cardCostBg from "./assets/UI/card-cost-bg.png";
import cardRecipesBg from "./assets/UI/card-recipes-bg.png";
import { DrinkArt } from "./components/DrinkArt";
import { RecipeCard } from "./components/RecipeCard";
import { categories as mockCategories, ingredients, recipes as initialRecipes } from "./data/mockData";
import { fetchAppData } from "./lib/appsScriptApi";
import { calculateCost, money, roundPrice } from "./lib/cost";
import type { Category, CategoryId, Ingredient, Recipe } from "./types/app";

type Tab = "home" | "recipes" | "cost" | "ingredients" | "favorites";
type Screen = "main" | "detail" | "ingredientForm" | "recipeForm";

const iconMap = { Store, CupSoda, Milk, Coffee, GlassWater, Cherry: Sparkles };

function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [screen, setScreen] = useState<Screen>("main");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("all");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(initialRecipes[0]);
  const [categoryList, setCategoryList] = useState<Category[]>(mockCategories);
  const [recipes, setRecipes] = useState(initialRecipes);
  const [ingredientList, setIngredientList] = useState(ingredients);
  const [dataSource, setDataSource] = useState<"loading" | "live" | "fallback">("loading");

  useEffect(() => {
    let ignore = false;

    fetchAppData()
      .then((data) => {
        if (ignore) return;
        setCategoryList(data.categories);
        setIngredientList(data.ingredients);
        setRecipes(data.recipes);
        setSelectedRecipe(data.recipes[0] || initialRecipes[0]);
        setDataSource("live");
      })
      .catch((error) => {
        console.warn(error);
        if (!ignore) setDataSource("fallback");
      });

    return () => {
      ignore = true;
    };
  }, []);

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
      name: String(form.get("name") || "à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸šà¹ƒà¸«à¸¡à¹ˆ"),
      category: String(form.get("category") || "à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸šà¸™à¹‰à¸³"),
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
      name: String(form.get("name") || "à¸ªà¸¹à¸•à¸£à¹ƒà¸«à¸¡à¹ˆ"),
      categoryId: String(form.get("categoryId") || "tea") as CategoryId,
      imageKey: "thai",
      prepTime: Number(form.get("prepTime") || 5),
      sweetness: Number(form.get("sweetness") || 75),
      sizeOz: 16,
      sellingPrice: Number(form.get("sellingPrice") || 35),
      favorite: false,
      rating: 4.5,
      items: [],
      steps: ["à¹€à¸žà¸´à¹ˆà¸¡à¸ªà¹ˆà¸§à¸™à¸œà¸ªà¸¡à¹à¸¥à¸°à¸§à¸´à¸˜à¸µà¸—à¸³à¹ƒà¸™à¹€à¸§à¸­à¸£à¹Œà¸Šà¸±à¸™à¹€à¸Šà¸·à¹ˆà¸­à¸¡ Google Sheet"]
    };
    setRecipes((items) => [recipe, ...items]);
    setSelectedRecipe(recipe);
    setScreen("detail");
  }

  return (
    <div className="app-shell">
      <div className="phone">
        {screen === "detail" ? (
          <RecipeDetail recipe={selectedRecipe} ingredients={ingredientList} onBack={() => setScreen("main")} onFavorite={toggleFavorite} />
        ) : screen === "ingredientForm" ? (
          <IngredientForm onBack={() => setScreen("main")} onSubmit={addIngredient} />
        ) : screen === "recipeForm" ? (
          <RecipeForm categories={categoryList} onBack={() => setScreen("main")} onSubmit={addRecipe} />
        ) : (
          <>
            <main className="content">
              {tab === "home" ? (
                <HomeScreen categories={categoryList} favoriteRecipes={favoriteRecipes} onOpen={openRecipe} dataSource={dataSource} />
              ) : tab === "recipes" ? (
                <RecipesScreen
                  categories={categoryList}
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
                <FavoritesScreen recipes={favoriteRecipes} ingredients={ingredientList} onOpen={openRecipe} />
              )}
            </main>
            <BottomNav active={tab} onChange={setTab} onAdd={() => setScreen("recipeForm")} />
          </>
        )}
      </div>
    </div>
  );
}

function HomeScreen({
  categories,
  favoriteRecipes,
  onOpen,
  dataSource
}: {
  categories: Category[];
  favoriteRecipes: Recipe[];
  onOpen: (recipe: Recipe) => void;
  dataSource: "loading" | "live" | "fallback";
}) {
  return (
    <>
      <header className="home-header">
        <div>
          <h1>à¸ªà¸§à¸±à¸ªà¸”à¸µ! ðŸ‘‹</h1>
          <p>à¸§à¸±à¸™à¸™à¸µà¹‰à¸‚à¸²à¸¢à¸”à¸µà¹† à¸›à¸±à¸‡à¹† à¸™à¸°!</p>
        </div>
        <Bell size={22} />
      </header>
      <div className="search-row">
        <label className="search-box">
          <Search size={18} />
          <input placeholder="à¸„à¹‰à¸™à¸«à¸²à¹€à¸¡à¸™à¸¹ à¹€à¸Šà¹ˆà¸™ à¸Šà¸²à¹„à¸—à¸¢, à¹‚à¸à¹‚à¸à¹‰, à¸™à¸¡à¸ªà¸”..." />
        </label>
        <button className="icon-button">
          <SlidersHorizontal size={19} />
        </button>
      </div>
      <div className={`data-source data-source--${dataSource}`}>
        {dataSource === "live" ? "Google Sheet connected" : dataSource === "loading" ? "Loading Google Sheet..." : "Using offline sample data"}
      </div>
      <section className="quick-grid">
        <button className="quick-card quick-card--green" style={{ backgroundImage: `url(${cardRecipesBg})` }}>
          <div>
            <h3>à¸ªà¸¹à¸•à¸£à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸”à¸·à¹ˆà¸¡</h3>
            <p>à¸„à¹‰à¸™à¸«à¸²à¸ªà¸¹à¸•à¸£à¹„à¸§ à¹ƒà¸Šà¹‰à¸•à¸­à¸™à¸‚à¸²à¸¢à¸ˆà¸£à¸´à¸‡</p>
            <span>à¸”à¸¹à¸ªà¸¹à¸•à¸£à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</span>
          </div>
        </button>
        <button className="quick-card quick-card--orange" style={{ backgroundImage: `url(${cardCostBg})` }}>
          <div>
            <h3>à¸„à¸³à¸™à¸§à¸“à¸•à¹‰à¸™à¸—à¸¸à¸™</h3>
            <p>à¹€à¸Šà¹‡à¸à¸à¸³à¹„à¸£à¸à¹ˆà¸­à¸™à¸‚à¸²à¸¢</p>
            <span>à¹€à¸£à¸´à¹ˆà¸¡à¸„à¸³à¸™à¸§à¸“</span>
          </div>
        </button>
      </section>
      <SectionTitle title="à¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆà¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸”à¸·à¹ˆà¸¡" action="à¸”à¸¹à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”" />
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
      <SectionTitle title="à¹€à¸¡à¸™à¸¹à¸‚à¸²à¸¢à¸”à¸µà¸›à¸£à¸°à¸ˆà¸³à¸§à¸±à¸™" action="à¸”à¸¹à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”" />
      <div className="horizontal-cards">
        {favoriteRecipes.map((recipe) => (
          <button className="mini-card" key={recipe.id} onClick={() => onOpen(recipe)}>
            <DrinkArt imageKey={recipe.imageKey} imageUrl={recipe.imageUrl} compact />
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
  categories,
  selectedCategory,
  onCategory,
  recipes,
  onOpen
}: {
  categories: Category[];
  selectedCategory: CategoryId;
  onCategory: (category: CategoryId) => void;
  recipes: Recipe[];
  onOpen: (recipe: Recipe) => void;
}) {
  return (
    <>
      <TopTitle title="à¸ªà¸¹à¸•à¸£" right={<Search size={22} />} />
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
        <span>à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸” {recipes.length} à¹€à¸¡à¸™à¸¹</span>
        <span>
          à¸¥à¹ˆà¸²à¸ªà¸¸à¸” <ChevronDown size={14} />
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
        <DrinkArt imageKey={recipe.imageKey} imageUrl={recipe.imageUrl} />
        {recipe.status ? <span className="badge badge--hot">{recipe.status}</span> : null}
        <span className="time-pill">{recipe.prepTime} à¸™à¸²à¸—à¸µ</span>
      </div>
      <section className="metric-row">
        <Metric label="à¸£à¸°à¸”à¸±à¸šà¸«à¸§à¸²à¸™" value={`${recipe.sweetness}%`} />
        <Metric label="à¸‚à¸™à¸²à¸”à¹à¸™à¸°à¸™à¸³" value={`${recipe.sizeOz} oz`} />
        <Metric label="à¸•à¹‰à¸™à¸—à¸¸à¸™/à¹à¸à¹‰à¸§" value={`${money(cost.totalCost)} à¸šà¸²à¸—`} />
      </section>
      <div className="segmented">
        <button className="is-active">16 oz</button>
        <button>22 oz</button>
        <button>à¹à¸à¹‰à¸§à¸£à¹‰à¸­à¸™</button>
      </div>
      <section className="detail-section">
        <div className="detail-section__title">
          <h3>à¸ªà¹ˆà¸§à¸™à¸œà¸ªà¸¡</h3>
          <button>à¸›à¸£à¸±à¸šà¸ªà¸¹à¸•à¸£</button>
        </div>
        {recipe.items.map((item) => {
          const ingredient = byId.get(item.ingredientId);
          return (
            <div className="ingredient-line" key={`${item.ingredientId}-${item.amount}`}>
              <span>{ingredient?.name ?? "à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸š"}</span>
              <strong>
                {item.note ? `${item.note} Â· ` : ""}
                {item.amount} {item.unit}
              </strong>
            </div>
          );
        })}
      </section>
      <section className="detail-section">
        <h3>à¸§à¸´à¸˜à¸µà¸—à¸³</h3>
        <ol className="steps">
          {recipe.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <div className="detail-actions">
        <button>à¸„à¸³à¸™à¸§à¸“à¸•à¹‰à¸™à¸—à¸¸à¸™à¹€à¸¡à¸™à¸¹à¸™à¸µà¹‰</button>
        <button className="primary">à¸šà¸±à¸™à¸—à¸¶à¸à¹€à¸›à¹‡à¸™à¹€à¸¡à¸™à¸¹à¹‚à¸›à¸£à¸”</button>
      </div>
    </main>
  );
}

function CostScreen({ recipe, ingredients, cost }: { recipe: Recipe; ingredients: Ingredient[]; cost: ReturnType<typeof calculateCost> }) {
  const suggested = roundPrice(cost.totalCost / (1 - 0.6));
  return (
    <>
      <TopTitle title="à¸„à¸³à¸™à¸§à¸“à¸•à¹‰à¸™à¸—à¸¸à¸™" />
      <div className="tabs">
        <button className="is-active">à¸„à¸³à¸™à¸§à¸“à¸ˆà¸²à¸à¸ªà¸¹à¸•à¸£</button>
        <button>à¸•à¸±à¹‰à¸‡à¸£à¸²à¸„à¸²à¸‚à¸²à¸¢</button>
        <button>à¸ªà¸£à¸¸à¸›à¸à¸³à¹„à¸£</button>
      </div>
      <section className="selected-recipe">
        <DrinkArt imageKey={recipe.imageKey} imageUrl={recipe.imageUrl} compact />
        <div>
          <strong>{recipe.name} (16 oz)</strong>
          <span>à¸•à¹‰à¸™à¸—à¸¸à¸™à¸¥à¹ˆà¸²à¸ªà¸¸à¸”à¸ˆà¸²à¸à¸ªà¸¹à¸•à¸£</span>
        </div>
        <button>à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¹€à¸¡à¸™à¸¹</button>
      </section>
      <section className="cost-card">
        <h3>à¸•à¹‰à¸™à¸—à¸¸à¸™à¸•à¹ˆà¸­à¹à¸à¹‰à¸§</h3>
        <CostLine label="à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸šà¸™à¹‰à¸³" value={cost.ingredientCost} />
        <CostLine label="à¸—à¹‡à¸­à¸›à¸›à¸´à¹‰à¸‡" value={cost.toppingCost} />
        <CostLine label="à¸šà¸£à¸£à¸ˆà¸¸à¸ à¸±à¸“à¸‘à¹Œ" value={cost.packagingCost} />
        <div className="total-line">
          <span>à¸£à¸§à¸¡à¸•à¹‰à¸™à¸—à¸¸à¸™</span>
          <strong>{money(cost.totalCost)} à¸šà¸²à¸—</strong>
        </div>
        <div className="price-line">
          <span>à¸£à¸²à¸„à¸²à¸‚à¸²à¸¢à¸›à¸±à¸ˆà¸ˆà¸¸à¸šà¸±à¸™</span>
          <strong>{recipe.sellingPrice} à¸šà¸²à¸—</strong>
        </div>
      </section>
      <section className="profit-panel">
        <div>
          <span>à¸à¸³à¹„à¸£à¸•à¹ˆà¸­à¹à¸à¹‰à¸§</span>
          <strong>{money(cost.profit)} à¸šà¸²à¸—</strong>
        </div>
        <div>
          <span>à¸à¸³à¹„à¸£</span>
          <strong>{money(cost.margin)}%</strong>
        </div>
      </section>
      <section className="pricing-card">
        <h3>à¸£à¸²à¸„à¸²à¸‚à¸²à¸¢à¸—à¸µà¹ˆà¹à¸™à¸°à¸™à¸³</h3>
        <div className="margin-row">
          {[40, 50, 60, 70].map((margin) => (
            <button className={margin === 60 ? "is-active" : ""} key={margin}>
              {margin}%
            </button>
          ))}
        </div>
        <strong>{suggested} à¸šà¸²à¸—</strong>
        <span>à¸„à¸³à¸™à¸§à¸“à¸ˆà¸²à¸ margin 60%</span>
      </section>
    </>
  );
}

function IngredientsScreen({ ingredients, onAdd }: { ingredients: Ingredient[]; onAdd: () => void }) {
  return (
    <>
      <TopTitle title="à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸š" right={<Settings2 size={20} />} />
      <div className="ingredient-tabs">
        <button className="is-active">à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”</button>
        <button>à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸š</button>
        <button>à¸—à¹‡à¸­à¸›à¸›à¸´à¹‰à¸‡</button>
        <button onClick={onAdd}>
          <Plus size={16} /> à¹€à¸žà¸´à¹ˆà¸¡à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸š
        </button>
      </div>
      <div className="table-card">
        <div className="table-head">
          <span>à¸Šà¸·à¹ˆà¸­à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸š</span>
          <span>à¸›à¸£à¸´à¸¡à¸²à¸“à¸—à¸µà¹ˆà¸‹à¸·à¹‰à¸­</span>
          <span>à¸£à¸²à¸„à¸²à¸‹à¸·à¹‰à¸­</span>
          <span>à¸•à¹‰à¸™à¸—à¸¸à¸™/à¸«à¸™à¹ˆà¸§à¸¢</span>
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

function FavoritesScreen({
  recipes,
  ingredients,
  onOpen
}: {
  recipes: Recipe[];
  ingredients: Ingredient[];
  onOpen: (recipe: Recipe) => void;
}) {
  return (
    <>
      <TopTitle title="à¹€à¸¡à¸™à¸¹à¹‚à¸›à¸£à¸”" right={<button className="text-button">à¹à¸à¹‰à¹„à¸‚</button>} />
      <div className="favorite-list">
        {recipes.map((recipe) => {
          const cost = calculateCost(recipe, ingredients);
          return (
            <button className="favorite-row" key={recipe.id} onClick={() => onOpen(recipe)}>
              <DrinkArt imageKey={recipe.imageKey} imageUrl={recipe.imageUrl} compact />
              <div>
                <strong>{recipe.name}</strong>
                <span>16 oz Â· à¸•à¹‰à¸™à¸—à¸¸à¸™ {money(cost.totalCost)} à¸šà¸²à¸—</span>
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
      <TopTitle title="à¹€à¸žà¸´à¹ˆà¸¡à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸š" left={<ChevronLeft size={24} onClick={onBack} />} />
      <form className="form-card" onSubmit={onSubmit}>
        <FormField name="name" label="à¸Šà¸·à¹ˆà¸­à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸š" placeholder="à¹€à¸Šà¹ˆà¸™ à¸™à¸¡à¸ªà¸”" />
        <label>
          à¸›à¸£à¸°à¹€à¸ à¸—
          <select name="category" defaultValue="à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸šà¸™à¹‰à¸³">
            <option>à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸šà¸™à¹‰à¸³</option>
            <option>à¸—à¹‡à¸­à¸›à¸›à¸´à¹‰à¸‡</option>
            <option>à¸šà¸£à¸£à¸ˆà¸¸à¸ à¸±à¸“à¸‘à¹Œ</option>
          </select>
        </label>
        <FormField name="buyQty" label="à¸›à¸£à¸´à¸¡à¸²à¸“à¸—à¸µà¹ˆà¸‹à¸·à¹‰à¸­" placeholder="0" type="number" />
        <FormField name="buyPrice" label="à¸£à¸²à¸„à¸²à¸‹à¸·à¹‰à¸­ (à¸šà¸²à¸—)" placeholder="0.00" type="number" />
        <label>
          à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸
          <textarea name="note" placeholder="à¸–à¹‰à¸²à¸¡à¸µ" />
        </label>
        <button className="submit-button">à¸šà¸±à¸™à¸—à¸¶à¸</button>
      </form>
    </main>
  );
}

function RecipeForm({
  categories,
  onBack,
  onSubmit
}: {
  categories: Category[];
  onBack: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="form-screen">
      <TopTitle title="à¹€à¸žà¸´à¹ˆà¸¡à¸ªà¸¹à¸•à¸£" left={<ChevronLeft size={24} onClick={onBack} />} />
      <form className="form-card" onSubmit={onSubmit}>
        <FormField name="name" label="à¸Šà¸·à¹ˆà¸­à¹€à¸¡à¸™à¸¹" placeholder="à¹€à¸Šà¹ˆà¸™ à¸Šà¸²à¹„à¸—à¸¢à¹„à¸‚à¹ˆà¸¡à¸¸à¸" />
        <label>
          à¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆ
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
          <span>à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸£à¸¹à¸›à¹€à¸¡à¸™à¸¹</span>
          <small>à¹€à¸§à¸­à¸£à¹Œà¸Šà¸±à¸™ Apps Script à¸ˆà¸°à¸ªà¹ˆà¸‡à¸£à¸¹à¸›à¹€à¸‚à¹‰à¸² Google Drive</small>
        </div>
        <FormField name="prepTime" label="à¹€à¸§à¸¥à¸²à¹€à¸•à¸£à¸µà¸¢à¸¡ (à¸™à¸²à¸—à¸µ)" placeholder="5" type="number" />
        <FormField name="sweetness" label="à¸£à¸°à¸”à¸±à¸šà¸«à¸§à¸²à¸™ (%)" placeholder="75" type="number" />
        <FormField name="sellingPrice" label="à¸£à¸²à¸„à¸²à¸‚à¸²à¸¢ (à¸šà¸²à¸—)" placeholder="35" type="number" />
        <button className="submit-button">à¸šà¸±à¸™à¸—à¸¶à¸à¸ªà¸¹à¸•à¸£</button>
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
    { id: "home", label: "à¸«à¸™à¹‰à¸²à¹à¸£à¸", icon: Home },
    { id: "recipes", label: "à¸ªà¸¹à¸•à¸£", icon: Grid2X2 },
    { id: "cost", label: "à¸•à¹‰à¸™à¸—à¸¸à¸™", icon: ShoppingBag },
    { id: "ingredients", label: "à¸§à¸±à¸•à¸–à¸¸à¸”à¸´à¸š", icon: WalletCards },
    { id: "favorites", label: "à¹‚à¸›à¸£à¸”", icon: Heart }
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
      <strong>{money(value)} à¸šà¸²à¸—</strong>
    </div>
  );
}

export default App;
