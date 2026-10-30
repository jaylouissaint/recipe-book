"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveRecipe } from "@/app/actions";
import { FAVORITE, isFavorite } from "@/lib/book";
import type { Recipe } from "@/lib/types";
import { recipePayload } from "@/lib/uploadPhoto";
import { useUnlocked } from "./EditOnly";

// The star beside a recipe's title. Tapping it on an unlocked device adds the recipe to
// Favorites on Home (or takes it off); locked devices just see whether it's a favorite.
export default function FavoriteStar({ recipe }: { recipe: Recipe }) {
  const unlocked = useUnlocked();
  const router = useRouter();
  const [on, setOn] = useState(isFavorite(recipe));
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();

  if (!unlocked) {
    return on ? <Star filled className="ml-2 inline size-8 align-[-0.1em] md:size-9" label="Favorite" /> : null;
  }

  function toggle() {
    const next = !on;
    setOn(next);
    setError("");
    startSaving(async () => {
      const tags = next ? [...recipe.tags.filter((t) => t !== FAVORITE), FAVORITE] : recipe.tags.filter((t) => t !== FAVORITE);
      const result = await saveRecipe({ ...recipePayload(recipe), tags });
      if (!result.ok) {
        setOn(!next);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={on}
        aria-label={on ? "Favorite. Tap to take it off Favorites" : "Add to Favorites"}
        className="ml-2 inline-flex rounded-full p-1 align-[-0.1em] hover:bg-field disabled:opacity-60"
      >
        <Star filled={on} className="size-8 md:size-9" />
      </button>
      {error && (
        <span role="alert" className="ml-3 align-middle font-sans text-[14px] text-cover">
          {error}
        </span>
      )}
    </>
  );
}

function Star({ filled, className, label }: { filled: boolean; className: string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path
        d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z"
        fill={filled ? "var(--tab-mustard)" : "none"}
        stroke={filled ? "var(--tab-mustard)" : "var(--text-muted)"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
