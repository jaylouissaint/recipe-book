"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addGroceries } from "@/app/actions";
import { ingredientText } from "@/lib/format";
import { scaleIngredient } from "@/lib/scale";
import type { Recipe } from "@/lib/types";
import { useUnlocked } from "../EditOnly";
import { useBook } from "../BookContext";

// The "Add to Groceries" sheet: a recipe's ingredients (or a whole week's recipes, one section
// each) at their serving sizes, all ticked, to untick what you already have.
export type GrocerySection = { title?: string; recipe: Recipe; factor: number };

export default function GrocerySheet({ sections, heading = "Add to Groceries", close }: { sections: GrocerySection[]; heading?: string; close: () => void }) {
  const unlocked = useUnlocked();
  const { id: book, path } = useBook();
  const lists = sections.map((s) => ({
    ...s,
    groups: s.recipe.ingredientGroups.map((g) => ({
      name: g.name,
      lines: g.items.map((i) => ingredientText(scaleIngredient(i, s.factor))),
    })),
  }));
  const all = lists.flatMap((s, si) => s.groups.flatMap((g, gi) => g.lines.map((_, li) => `${si}:${gi}:${li}`)));
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(all));
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, startAdding] = useTransition();

  const toggle = (key: string) =>
    setChosen((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  function add() {
    startAdding(async () => {
      let added = 0;
      // One call per recipe, so each line remembers the recipe it came from.
      for (const [si, s] of lists.entries()) {
        const lines = s.groups.flatMap((g, gi) => g.lines.filter((_, li) => chosen.has(`${si}:${gi}:${li}`)));
        if (!lines.length) continue;
        const r = await addGroceries(book, lines, s.recipe.id);
        if (!r.ok) {
          setResult({ ok: false, text: added ? `Added ${added} items, then: ${r.error}` : r.error });
          return;
        }
        added += lines.length;
      }
      setResult({ ok: true, text: `Added ${added} item${added === 1 ? "" : "s"} to Groceries.` });
    });
  }

  if (result?.ok) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="font-hand text-2xl text-ink">{result.text}</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={close} className="h-[52px] flex-1 rounded-full border border-fg/30 font-semibold">
            Done
          </button>
          <Link href={path("/groceries")} className="flex h-[52px] flex-1 items-center justify-center rounded-full bg-accent font-semibold text-white">
            View list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-[85dvh] flex-col">
      <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-divider" />
      <div className="flex items-baseline justify-between px-6 pt-4 pb-2">
        <h2 className="font-serif text-3xl">{heading}</h2>
        <button
          type="button"
          onClick={() => setChosen(chosen.size === all.length ? new Set() : new Set(all))}
          className="text-[14px] font-semibold text-accent"
        >
          {chosen.size === all.length ? "Select none" : "Select all"}
        </button>
      </div>
      <p className="px-6 text-[14px] text-muted">Untick what you already have.</p>
      <div className="mt-2 overflow-y-auto px-6 pb-4">
        {lists.map((s, si) => (
          <section key={si} className={si > 0 ? "mt-5" : ""} aria-label={s.title ?? s.recipe.title}>
            {s.title && <h3 className="mt-3 font-hand text-2xl text-ink">{s.title}</h3>}
            {s.groups.map((g, gi) => (
              <div key={gi} className="mt-3">
                {g.name && <h4 className="mb-1 text-[12px] font-semibold tracking-widest text-muted uppercase">{g.name}</h4>}
                <ul className="divide-y divide-divider">
                  {g.lines.map((line, li) => {
                    const key = `${si}:${gi}:${li}`;
                    return (
                      <li key={key}>
                        <label className="flex cursor-pointer items-center gap-3 py-2.5">
                          <input type="checkbox" checked={chosen.has(key)} onChange={() => toggle(key)} className="size-5 accent-accent" />
                          <span className={`font-hand text-xl ${chosen.has(key) ? "text-ink" : "text-muted line-through"}`}>{line}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
      <div className="shrink-0 border-t border-divider px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {result && !result.ok && (
          <p role="alert" className="mb-3 text-[14px] text-cover">
            {result.text}
          </p>
        )}
        {unlocked ? (
          <button
            type="button"
            onClick={add}
            disabled={adding || chosen.size === 0}
            className="h-[52px] w-full rounded-full bg-accent text-[16px] font-semibold text-white disabled:opacity-50"
          >
            {adding ? "Adding…" : `Add ${chosen.size} item${chosen.size === 1 ? "" : "s"}`}
          </button>
        ) : (
          <p className="text-[15px]">
            Editing is locked on this device.{" "}
            <Link href={path("/settings")} className="font-semibold text-accent underline underline-offset-4">
              Unlock in Settings
            </Link>{" "}
            to add to the list.
          </p>
        )}
      </div>
    </div>
  );
}
