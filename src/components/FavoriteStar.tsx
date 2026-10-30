"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { saveRecipe } from "@/app/actions";
import { FAVORITE, isFavorite } from "@/lib/book";
import type { Recipe } from "@/lib/types";
import { recipePayload } from "@/lib/uploadPhoto";
import { useUnlocked } from "./EditOnly";
import { useBook } from "./BookContext";

// The favorite star in the corner of a Library card. Tapping it on an unlocked device adds the
// recipe to Favorites on Home (or takes it off); locked devices just see the favorites' stars.
export default function FavoriteStar({ recipe }: { recipe: Recipe }) {
  const unlocked = useUnlocked();
  const { id: book } = useBook();
  const router = useRouter();
  const [on, setOn] = useState(isFavorite(recipe));
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();

  // A failed save's message goes away by itself, so it never stays over the cards.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error]);

  if (!unlocked) {
    return on ? (
      <span className="flex size-11 items-center justify-center">
        <Star filled label="Favorite" />
      </span>
    ) : null;
  }

  function toggle() {
    const next = !on;
    setOn(next);
    setError("");
    startSaving(async () => {
      const others = recipe.tags.filter((t) => t !== FAVORITE);
      const result = await saveRecipe(book, { ...recipePayload(recipe), tags: next ? [...others, FAVORITE] : others });
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
        aria-label={on ? `${recipe.title} is a favorite. Tap to take it off Favorites` : `Add ${recipe.title} to Favorites`}
        className="flex size-11 items-center justify-center rounded-full hover:bg-field disabled:opacity-60"
      >
        <Star filled={on} />
      </button>
      {error && (
        <p role="alert" className="pointer-events-none absolute top-11 right-0 z-10 w-60 rounded-2xl bg-surface px-3 py-2 text-[13px] text-cover shadow-card">
          {error}
        </p>
      )}
    </>
  );
}

function Star({ filled, label }: { filled: boolean; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
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
