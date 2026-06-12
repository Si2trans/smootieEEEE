import { Clock3 } from "lucide-react";
import type { Recipe } from "../types/app";
import { DrinkArt } from "./DrinkArt";

type RecipeCardProps = {
  recipe: Recipe;
  onOpen: (recipe: Recipe) => void;
};

export function RecipeCard({ recipe, onOpen }: RecipeCardProps) {
  return (
    <button className="recipe-card" onClick={() => onOpen(recipe)} type="button">
      <div className="recipe-card__image">
        <DrinkArt imageKey={recipe.imageKey} imageUrl={recipe.imageUrl} />
        {recipe.status ? <span className="badge badge--hot">{recipe.status}</span> : null}
      </div>
      <div className="recipe-card__body recipe-card__body--plain">
        <div>
          <strong>{recipe.name}</strong>
          {recipe.prepTime > 0 ? (
            <span>
              <Clock3 size={13} /> {recipe.prepTime} นาที
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
