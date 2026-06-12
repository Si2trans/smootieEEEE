import { imageStyle } from "../lib/imageStyles";

type DrinkArtProps = {
  imageKey: string;
  imageUrl?: string;
  label?: string;
  compact?: boolean;
};

export function DrinkArt({ imageKey, imageUrl, label, compact = false }: DrinkArtProps) {
  return (
    <div className={`drink-art ${compact ? "drink-art--compact" : ""}`} style={imageStyle(imageKey)}>
      {imageUrl ? <img className="drink-art__image" src={imageUrl} alt="" /> : null}
      {!imageUrl ? (
        <>
          <div className="drink-art__glow" />
          <div className="cup">
            <div className="cup__lid" />
            <div className="cup__ice cup__ice--one" />
            <div className="cup__ice cup__ice--two" />
            <div className="cup__boba cup__boba--one" />
            <div className="cup__boba cup__boba--two" />
            <div className="cup__boba cup__boba--three" />
          </div>
        </>
      ) : null}
      {label ? <span className="drink-art__label">{label}</span> : null}
    </div>
  );
}
