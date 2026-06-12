import { Clock3, Heart } from "lucide-react";
import type { Recipe } from "../types/app";
import { DrinkArt } from "./DrinkArt";

type RecipeCardProps = {
  recipe: Recipe;
  onOpen: (recipe: Recipe) => void;
};

export function RecipeCard({ recipe, onOpen }: RecipeCardProps) {
  return (
    <button className="recipe-card" onClick={() => onOpen(recipe)}>
      <div className="recipe-card__image">
        <DrinkArt imageKey={recipe.imageKey} />
        {recipe.status ? <span className="badge badge--hot">{recipe.status}</span> : null}
      </div>
      <div className="recipe-card__body">
        <div>
          <strong>{recipe.name}</strong>
          <span>
            <Clock3 size={13} /> {recipe.prepTime} นาที
          </span>
        </div>
        <Heart size={18} className={recipe.favorite ? "is-favorite" : ""} />
      </div>
    </button>
  );
}
