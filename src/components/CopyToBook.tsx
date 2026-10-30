"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { copyRecipe } from "@/app/actions";
import { BOOKS, BOOK_IDS, type BookId, bookPath } from "@/lib/books";
import { useBook } from "./BookContext";
import { useUnlocked } from "./EditOnly";

// "Copy to Jay's Recipes" (or Ramiya's) in the recipe menu: only when the other book is unlocked on
// this device, since the copy is saved with that book's key.
export default function CopyToBook({ recipeId }: { recipeId: string }) {
  const current = useBook().id;
  return (
    <>
      {BOOK_IDS.filter((b) => b !== current).map((to) => (
        <CopyTo key={to} from={current} to={to} recipeId={recipeId} />
      ))}
    </>
  );
}

function CopyTo({ from, to, recipeId }: { from: BookId; to: BookId; recipeId: string }) {
  const unlocked = useUnlocked(to);
  const [result, setResult] = useState<{ slug: string } | { error: string } | null>(null);
  const [copying, startCopying] = useTransition();
  const name = BOOKS[to].name;
  if (!unlocked) return null;

  if (result && "slug" in result) {
    return (
      <Link href={bookPath(to, `/recipe/${result.slug}`)} className="block px-4 py-3 text-[15px] font-semibold text-accent hover:bg-field">
        Copied: open it in {name}
      </Link>
    );
  }
  return (
    <>
      <button
        type="button"
        disabled={copying}
        onClick={() =>
          startCopying(async () => {
            const r = await copyRecipe(from, to, recipeId);
            setResult(r.ok ? { slug: r.slug } : { error: r.error });
          })
        }
        className="block w-full px-4 py-3 text-left text-[15px] hover:bg-field disabled:opacity-60"
      >
        {copying ? "Copying…" : `Copy to ${name}`}
      </button>
      {result && "error" in result && (
        <p role="alert" className="px-4 pb-3 text-[13px] text-cover">
          {result.error}
        </p>
      )}
    </>
  );
}
