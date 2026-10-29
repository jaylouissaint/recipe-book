"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { addGroceries, recordCooked } from "@/app/actions";
import { ingredientText } from "@/lib/format";
import { scaleIngredient } from "@/lib/scale";
import type { Recipe } from "@/lib/types";
import { useUnlocked } from "../EditOnly";
import { useScale } from "./Scale";

// The recipe's sticky bottom buttons: "Add to Groceries" (pick the lines you need, at the current
// serving size) and "Start Cooking".
export default function KitchenButtons({ recipe }: { recipe: Recipe }) {
  const { factor } = useScale();
  const cookHref = `/recipe/${recipe.slug}/cook${factor !== 1 ? `?scale=${factor}` : ""}`;
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(0); // remounts the sheet with fresh choices each time

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:left-60">
      <div className="mx-auto flex max-w-xl gap-3">
        <button
          type="button"
          onClick={() => {
            setOpen((n) => n + 1);
            dialog.current?.showModal();
          }}
          className="h-[52px] flex-1 rounded-full border border-fg/30 text-[16px] font-semibold text-accent"
        >
          Add to Groceries
        </button>
        <Link
          href={cookHref}
          className="flex h-[52px] flex-1 items-center justify-center rounded-full bg-accent text-[16px] font-semibold text-white"
        >
          Start Cooking
        </Link>
      </div>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        aria-label="Add to Groceries"
        className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-lg rounded-t-[28px] bg-surface p-0 text-fg backdrop:bg-black/30 md:mb-auto md:rounded-[28px]"
      >
        {open > 0 && <AddSheet key={open} recipe={recipe} factor={factor} close={() => dialog.current?.close()} />}
      </dialog>
    </div>
  );
}

function AddSheet({ recipe, factor, close }: { recipe: Recipe; factor: number; close: () => void }) {
  const unlocked = useUnlocked();
  const groups = recipe.ingredientGroups.map((g) => ({
    name: g.name,
    lines: g.items.map((i) => ingredientText(scaleIngredient(i, factor))),
  }));
  const all = groups.flatMap((g, gi) => g.lines.map((_, li) => `${gi}:${li}`));
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
    const lines = groups.flatMap((g, gi) => g.lines.filter((_, li) => chosen.has(`${gi}:${li}`)));
    startAdding(async () => {
      const r = await addGroceries(lines, recipe.id);
      setResult(r.ok ? { ok: true, text: `Added ${lines.length} item${lines.length === 1 ? "" : "s"} to Groceries.` } : { ok: false, text: r.error });
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
          <Link href="/groceries" className="flex h-[52px] flex-1 items-center justify-center rounded-full bg-accent font-semibold text-white">
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
        <h2 className="font-serif text-3xl">Add to Groceries</h2>
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
        {groups.map((g, gi) => (
          <div key={gi} className="mt-3">
            {g.name && <h3 className="mb-1 text-[12px] font-semibold tracking-widest text-muted uppercase">{g.name}</h3>}
            <ul className="divide-y divide-divider">
              {g.lines.map((line, li) => {
                const key = `${gi}:${li}`;
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
            <Link href="/settings" className="font-semibold text-accent underline underline-offset-4">
              Unlock in Settings
            </Link>{" "}
            to add to the list.
          </p>
        )}
      </div>
    </div>
  );
}

// "Mark as cooked" in the recipe menu (Start Cooking also counts when it reaches the end).
export function MarkCooked({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState("");
  const [saving, startSaving] = useTransition();
  return (
    <button
      type="button"
      disabled={saving}
      onClick={() =>
        startSaving(async () => {
          const r = await recordCooked(id);
          setState(r.ok ? `Cooked ${r.timesCooked} time${r.timesCooked === 1 ? "" : "s"}` : r.error);
          if (r.ok) router.refresh();
        })
      }
      className="block w-full px-4 py-3 text-left text-[15px] hover:bg-field disabled:opacity-60"
    >
      {state || (saving ? "Saving…" : "Mark as cooked")}
    </button>
  );
}
