"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { importFromWeb } from "@/app/actions";
import { siteName } from "@/lib/format";
import type { WebRecipe } from "@/lib/schemaRecipe";
import { useUnlocked } from "./EditOnly";
import { LinkIcon } from "./Icons";
import RecipeEditor, { type EditorStart } from "./RecipeEditor";

// Save from the web: paste a link, then review the recipe on the writing page.
export default function WebImport({ initialUrl }: { initialUrl: string }) {
  const unlocked = useUnlocked();
  const [link, setLink] = useState(initialUrl);
  const [error, setError] = useState<{ message: string; url?: string } | null>(null);
  const [start, setStart] = useState<Extract<EditorStart, { kind: "web" }> | null>(null);
  const [reading, startReading] = useTransition();

  function read(url: string) {
    setError(null);
    startReading(async () => {
      const result = await importFromWeb(url);
      if (result.ok) setStart({ kind: "web", url: result.url, recipe: result.recipe });
      else setError({ message: result.error, url: result.url });
    });
  }

  // When the page can't be read: the writing page with just the link, and the Paste text box.
  function pasteInstead(url: string) {
    const recipe: WebRecipe = {
      found: false,
      title: "",
      description: "",
      author: "",
      sourceName: siteName(url),
      imageUrl: "",
      servings: null,
      prepMin: null,
      cookMin: null,
      category: "mains",
      tags: [],
      ingredientGroups: [],
      stepGroups: [],
    };
    setStart({ kind: "web", url, recipe });
  }

  const auto = useRef(false);
  useEffect(() => {
    if (auto.current || !initialUrl || !unlocked) return;
    auto.current = true;
    read(initialUrl);
  }, [initialUrl, unlocked]);

  if (start) return <RecipeEditor key={start.url} recipe={null} start={start} />;

  return (
    <div className="mx-auto max-w-xl px-4 pt-10 pb-32">
      <h1 className="font-serif text-4xl">Save from the web</h1>
      <p className="mt-2 text-[15px] text-muted">
        Paste a link to a recipe. Most recipe sites publish the recipe for search engines, and that&apos;s what gets read:
        the title, photo, ingredients and steps. You check it on the writing page before it&apos;s saved.
      </p>
      {!unlocked && (
        <p role="status" className="mt-6 rounded-2xl bg-field px-4 py-3 text-[15px]">
          Editing is locked on this device.{" "}
          <Link href="/settings" className="font-semibold text-accent underline underline-offset-4">
            Unlock in Settings
          </Link>
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (link.trim()) read(link);
        }}
        className="mt-6"
      >
        <label className="flex items-center gap-3 rounded-full bg-surface px-5 shadow-card focus-within:ring-2 focus-within:ring-accent">
          <LinkIcon className="size-5 shrink-0 text-muted" />
          <span className="sr-only">Recipe link</span>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            type="url"
            inputMode="url"
            autoFocus
            placeholder="https://"
            className="h-14 w-full bg-transparent text-[16px] outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={reading || !unlocked || !link.trim()}
          className="mt-4 h-[52px] w-full rounded-full bg-accent text-[16px] font-semibold text-white disabled:opacity-50"
        >
          {reading ? "Reading the recipe…" : "Get the recipe"}
        </button>
      </form>
      {error && (
        <div role="alert" className="mt-4 rounded-2xl bg-field px-4 py-3 text-[15px]">
          <p className="text-cover">{error.message}</p>
          {error.url && (
            <button
              type="button"
              onClick={() => pasteInstead(error.url!)}
              className="mt-2 font-semibold text-accent underline underline-offset-4"
            >
              Copy the recipe from the page and paste it in instead
            </button>
          )}
        </div>
      )}
    </div>
  );
}
