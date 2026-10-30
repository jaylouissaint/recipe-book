"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveRecipe } from "@/app/actions";
import type { Recipe } from "@/lib/types";
import { recipePayload, uploadPhoto } from "@/lib/uploadPhoto";
import { useUnlocked } from "./EditOnly";
import { CameraIcon } from "./Icons";
import Thumb, { pictureUrl } from "./Thumb";
import { useBook } from "./BookContext";

// The recipe's cover at the top of the recipe view, shown whole (never cropped). On unlocked
// devices a button adds or changes the cover photo in place, without opening the writing page.
// `className` sizes the placeholder shown when there's no picture.
export default function CoverPhoto({
  recipe,
  className = "",
  handwriting = true,
}: {
  recipe: Recipe;
  className?: string;
  handwriting?: boolean; // false when the handwritten page is already the recipe's body
}) {
  const unlocked = useUnlocked();
  const { id: book } = useBook();
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();

  function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // choosing the same file again still triggers a change
    if (!file) return;
    setError("");
    setPreview(URL.createObjectURL(file));
    startSaving(async () => {
      try {
        const photoPath = await uploadPhoto(book, recipe.id, file);
        const result = await saveRecipe(book, { ...recipePayload(recipe), photoPath });
        if (!result.ok) throw new Error(result.error);
        router.refresh();
      } catch (err) {
        setPreview(null);
        setError(err instanceof Error ? err.message : "The photo didn't save");
      }
    });
  }

  const picture = preview ?? pictureUrl(recipe, { handwriting });
  return (
    <div className={`relative ${picture ? "mx-auto mt-2 w-fit max-w-full" : className}`}>
      {picture ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs and local previews, shown as is
        <img src={picture} alt="" className="block h-auto max-h-[min(65vh,34rem)] w-auto max-w-full rounded-2xl bg-field" />
      ) : (
        <Thumb recipe={recipe} className="size-full" />
      )}
      {unlocked && (
        <label
          className={`no-print absolute right-3 bottom-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface/95 px-4 py-2 text-[14px] font-semibold text-accent shadow-card has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
            saving ? "pointer-events-none opacity-70" : ""
          }`}
        >
          <CameraIcon className="size-5" />
          {saving ? "Saving photo…" : recipe.photoPath ? "Change cover" : "Add a cover photo"}
          <input type="file" accept="image/*" onChange={choose} disabled={saving} className="sr-only" />
        </label>
      )}
      {error && (
        <p role="alert" className="absolute inset-x-3 top-3 rounded-2xl bg-surface/95 px-4 py-2 text-[14px] text-cover shadow-card">
          {error}
        </p>
      )}
    </div>
  );
}
