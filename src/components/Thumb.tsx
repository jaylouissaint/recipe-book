import { publicFileUrl } from "@/lib/storage";
import type { Recipe } from "@/lib/types";

// Recipe picture: the photo, else the handwritten page (Pencil page mode), else the original
// card's photo, else a cream card with faint ruled lines and the title's first letter in handwriting.
export function pictureUrl(recipe: Recipe, { handwriting = true } = {}): string {
  const original = recipe.originalFilePath && /\.(jpe?g|png)$/i.test(recipe.originalFilePath) ? recipe.originalFilePath : "";
  const page = handwriting && recipe.handwritingPath?.endsWith(".png") ? recipe.handwritingPath : "";
  if (recipe.photoPath) return publicFileUrl("photos", recipe.photoPath);
  if (page) return publicFileUrl("handwriting", page);
  return original && publicFileUrl("originals", original);
}

export default function Thumb({ recipe, className = "" }: { recipe: Recipe; className?: string }) {
  const src = pictureUrl(recipe);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs, shown as is
      <img
        src={src}
        alt=""
        loading="lazy"
        className={`rounded-2xl bg-field object-cover ${className}`}
      />
    );
  }
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
