"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveRecipe } from "@/app/actions";
import type { Recipe } from "@/lib/types";
import { recipePayload, uploadPhoto } from "@/lib/uploadPhoto";
import { useUnlocked } from "./EditOnly";
import { CameraIcon } from "./Icons";
import Thumb from "./Thumb";

// The recipe's cover at the top of the recipe view. On unlocked devices a button adds or
// changes the cover photo in place, without opening the writing page.
export default function CoverPhoto({ recipe, className = "" }: { recipe: Recipe; className?: string }) {
  const unlocked = useUnlocked();
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
        const photoPath = await uploadPhoto(recipe.id, file);
        const result = await saveRecipe({ ...recipePayload(recipe), photoPath });
        if (!result.ok) throw new Error(result.error);
        router.refresh();
      } catch (err) {
        setPreview(null);
        setError(err instanceof Error ? err.message : "The photo didn't save");
      }
    });
  }

  return (
    <div className={`relative ${className}`}>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- local preview while uploading
        <img src={preview} alt="" className="size-full rounded-2xl object-cover" />
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
