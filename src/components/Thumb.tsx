import type { Recipe } from "@/lib/types";

// Recipe picture. Until recipes have photos (migration 001), a cream card with faint ruled
// lines and the title's first letter in handwriting.
export default function Thumb({ recipe, className = "" }: { recipe: Recipe; className?: string }) {
  const initial = recipe.title.trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden
      className={`paper-lines flex items-center justify-center overflow-hidden rounded-2xl bg-field [--line:1.1rem] [container-type:inline-size] ${className}`}
    >
      <span className="font-hand text-ink" style={{ fontSize: "min(42cqw, 7rem)", lineHeight: 1 }}>
        {initial}
      </span>
    </div>
  );
}
