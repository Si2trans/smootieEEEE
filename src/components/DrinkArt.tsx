import { imageStyle } from "../lib/imageStyles";

type DrinkArtProps = {
  imageKey: string;
  label?: string;
  compact?: boolean;
};

export function DrinkArt({ imageKey, label, compact = false }: DrinkArtProps) {
  return (
    <div className={`drink-art ${compact ? "drink-art--compact" : ""}`} style={imageStyle(imageKey)}>
      <div className="drink-art__glow" />
      <div className="cup">
        <div className="cup__lid" />
        <div className="cup__ice cup__ice--one" />
        <div className="cup__ice cup__ice--two" />
        <div className="cup__boba cup__boba--one" />
        <div className="cup__boba cup__boba--two" />
        <div className="cup__boba cup__boba--three" />
      </div>
      {label ? <span className="drink-art__label">{label}</span> : null}
    </div>
  );
}
