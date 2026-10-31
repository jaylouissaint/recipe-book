"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type Cooking, type Opened, cooking as readCooking, lastOpened } from "@/lib/remember";
import { useBook } from "../BookContext";

// Home's first card: "Continue cooking" where Start Cooking was left (this browser), else the last
// recipe opened, and a "Surprise me" button that opens a random recipe.
export default function PickUp({ recipes }: { recipes: { slug: string; title: string }[] }) {
  const router = useRouter();
  const { id: book, path } = useBook();
  const [state, setState] = useState<{ cooking: Cooking | null; opened: Opened | null } | null>(null);

  // Read after the page loads: the server can't see this browser's storage.
  useEffect(() => {
    const cooking = readCooking(book);
    const opened = lastOpened(book);
    const exists = (slug?: string) => recipes.some((r) => r.slug === slug);
    setState({ cooking: exists(cooking?.slug) ? cooking : null, opened: exists(opened?.slug) ? opened : null });
  }, [recipes, book]);

  function surprise() {
    const choices = recipes.length > 1 ? recipes.filter((r) => r.slug !== state?.opened?.slug) : recipes;
    const pick = choices[Math.floor(Math.random() * choices.length)];
    if (pick) router.push(path(`/recipe/${pick.slug}`));
  }

  const c = state?.cooking;
  const o = state?.opened;
  return (
    <section aria-label="Pick up where you left off" className="flex items-center gap-3 rounded-[20px] bg-surface px-4 py-2.5 shadow-card md:gap-4 md:p-5">
      <div className="min-w-0 flex-1">
        {c ? (
          <>
            <p className="text-[12px] font-semibold tracking-widest text-muted uppercase">Continue cooking</p>
            <Link
              href={path(`/recipe/${c.slug}/cook?step=${c.page}${c.scale !== 1 ? `&scale=${c.scale}` : ""}`)}
              className="mt-0.5 block truncate font-hand text-xl text-ink hover:underline md:mt-1 md:text-2xl"
            >
              {c.title}
            </Link>
            <p className="text-[14px] text-muted">{c.page === 0 ? "gathering the ingredients" : `step ${c.page} of ${c.steps}`}</p>
          </>
        ) : o ? (
          <>
            <p className="text-[12px] font-semibold tracking-widest text-muted uppercase">Last opened</p>
            <Link href={path(`/recipe/${o.slug}`)} className="mt-0.5 block truncate font-hand text-xl text-ink hover:underline md:mt-1 md:text-2xl">
              {o.title}
            </Link>
          </>
        ) : (
          <>
            {/* Phones: one slim line until there's something to pick up */}
            <p className="text-[15px] text-muted md:hidden">Not sure what to cook?</p>
            <p className="hidden text-[12px] font-semibold tracking-widest text-muted uppercase md:block">Pick up where you left off</p>
            <p className="mt-1 hidden text-[15px] text-muted md:block">{state ? "Recipes you open or cook show up here." : " "}</p>
          </>
        )}
      </div>
      {recipes.length > 0 && (
        <button
          type="button"
          onClick={surprise}
          className="h-10 shrink-0 rounded-full border border-fg/30 px-4 text-[14px] font-semibold text-accent hover:bg-field md:h-12 md:px-5 md:text-[15px]"
        >
          Surprise me
        </button>
      )}
    </section>
  );
}
