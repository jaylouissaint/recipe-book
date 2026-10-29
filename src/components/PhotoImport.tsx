"use client";

import Link from "next/link";
import { useState } from "react";
import { useUnlocked } from "./EditOnly";
import { CameraIcon } from "./Icons";
import RecipeEditor from "./RecipeEditor";

// Add from photos: choose the photo or PDF, then write the recipe in beside it (or paste its text).
export default function PhotoImport() {
  const unlocked = useUnlocked();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) return setError("That file is over 20 MB. Choose a smaller photo or PDF.");
    setError("");
    setFile(f);
  }

  if (file) return <RecipeEditor key={`${file.name}:${file.size}`} recipe={null} start={{ kind: "photo", file }} />;

  return (
    <div className="mx-auto max-w-xl px-4 pt-10 pb-32">
      <h1 className="font-serif text-4xl">Add from photos</h1>
      <p className="mt-2 text-[15px] text-muted">
        Choose a photo of a recipe card or book page, or a PDF. It sits beside the writing page while you fill it in,
        and it&apos;s kept with the recipe as the original. On an iPad you can copy the photo&apos;s text with Live Text
        and paste it to fill in the page.
      </p>
      {!unlocked && (
        <p role="status" className="mt-6 rounded-2xl bg-field px-4 py-3 text-[15px]">
          Editing is locked on this device.{" "}
          <Link href="/settings" className="font-semibold text-accent underline underline-offset-4">
            Unlock in Settings
          </Link>
        </p>
      )}
      <label className="mt-6 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent text-[16px] font-semibold text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2">
        <CameraIcon className="size-5" />
        Choose a photo or PDF
        <input
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif,application/pdf"
          onChange={choose}
          className="sr-only"
        />
      </label>
      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-field px-4 py-3 text-[15px] text-cover">
          {error}
        </p>
      )}
    </div>
  );
}
