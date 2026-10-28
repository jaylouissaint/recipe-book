import { publicFileUrl } from "@/lib/storage";
import type { Recipe } from "@/lib/types";

// Recipe picture: the photo, else a cream card with faint ruled lines and the title's first
// letter in handwriting.
export default function Thumb({ recipe, className = "" }: { recipe: Recipe; className?: string }) {
  if (recipe.photoPath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs, shown as is
      <img
        src={publicFileUrl("photos", recipe.photoPath)}
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
