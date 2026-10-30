"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addMeal, removeMeal } from "@/app/actions";
import type { Meal } from "@/lib/plan";
import type { Recipe } from "@/lib/types";
import { useUnlocked } from "../EditOnly";
import GrocerySheet, { type GrocerySection } from "../kitchen/GrocerySheet";
import Thumb from "../Thumb";

// This week's meals (docs/DESIGN.md "Home"): today and the next 6 days, each with recipes or a
// plain note ("leftovers"). "Add the week to Groceries" opens the grocery sheet with every planned
// recipe at its planned servings. Days are the browser's own calendar days.

const DAYS = 7;

function localDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(day: string, i: number) {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

// A recipe's ingredients at the planned servings.
function factorFor(meal: Meal, recipe: Recipe) {
  return meal.servings && recipe.servings ? meal.servings / recipe.servings : 1;
}

export default function WeekPlan({ meals: initial, recipes }: { meals: Meal[] | null; recipes: Recipe[] }) {
  const unlocked = useUnlocked();
  const [meals, setMeals] = useState(initial ?? []);
  const [days, setDays] = useState<string[]>([]);
  const [adding, setAdding] = useState<string | null>(null); // the day being added to
  const [sheet, setSheet] = useState(0);
  const [error, setError] = useState("");
  const addDialog = useRef<HTMLDialogElement>(null);
  const groceryDialog = useRef<HTMLDialogElement>(null);
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  useEffect(() => setMeals(initial ?? []), [initial]);
  // Today in this browser's time zone (the server doesn't know it).
  useEffect(() => {
    const now = new Date();
    setDays(Array.from({ length: DAYS }, (_, i) => localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i))));
  }, []);

  if (initial === null) {
    return (
      <section aria-labelledby="week" className="rounded-[20px] bg-surface p-5 shadow-card">
        <h2 id="week" className="text-2xl font-medium">
          This week
        </h2>
        <p className="mt-2 text-[15px] text-muted">Planning the week needs a one-time database update (migration 002). See docs/HANDOFF.md.</p>
      </section>
    );
  }

  const week = meals.filter((m) => days.includes(m.day));
  const sections: GrocerySection[] = week.flatMap((m) => {
    const r = m.recipeId ? byId.get(m.recipeId) : undefined;
    return r && r.ingredientGroups.length
      ? [{ title: `${dayLabel(m.day, days.indexOf(m.day))}: ${r.title}`, recipe: r, factor: factorFor(m, r) }]
      : [];
  });

  function openAdd(day: string) {
    setError("");
    setAdding(day);
    addDialog.current?.showModal();
  }

  async function remove(meal: Meal) {
    setError("");
    setMeals((list) => list.filter((m) => m.id !== meal.id));
    const r = await removeMeal(meal.id);
    if (!r.ok) {
      setMeals((list) => [...list, meal]);
      setError(r.error);
    }
  }

  return (
    <section aria-labelledby="week">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 id="week" className="text-2xl font-medium">
          This week
        </h2>
        {sections.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSheet((n) => n + 1);
              groceryDialog.current?.showModal();
            }}
            className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-semibold text-white"
          >
            Add the week to Groceries
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mb-3 rounded-2xl bg-field px-4 py-2 text-[14px] text-cover">
          {error}
        </p>
      )}
      <ol className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 md:-mx-8 md:scroll-px-8 md:px-8">
        {days.map((day, i) => {
          const today = meals.filter((m) => m.day === day);
          return (
            <li key={day} className="flex w-56 shrink-0 snap-start flex-col rounded-[20px] bg-surface p-4 shadow-card">
              <h3 className={`text-[13px] font-semibold tracking-widest uppercase ${i === 0 ? "text-accent" : "text-muted"}`}>{dayLabel(day, i)}</h3>
              <ul className="mt-2 flex-1 space-y-2">
                {today.map((m) => {
                  const r = m.recipeId ? byId.get(m.recipeId) : undefined;
                  return (
                    <li key={m.id} className="flex items-center gap-2">
                      {r ? (
                        <Link href={`/recipe/${r.slug}`} className="flex min-w-0 flex-1 items-center gap-2">
                          <Thumb recipe={r} className="size-10 shrink-0" />
                          <span className="min-w-0">
                            <span className="block truncate font-hand text-lg leading-6 text-ink">{r.title}</span>
                            {m.servings && <span className="block text-[12px] text-muted">serves {m.servings}</span>}
                          </span>
                        </Link>
                      ) : (
                        <span className="min-w-0 flex-1 truncate font-hand text-lg text-ink/80">{m.note || "a recipe that was deleted"}</span>
                      )}
                      {unlocked && (
                        <button
                          type="button"
                          onClick={() => remove(m)}
                          aria-label={`Remove ${r?.title ?? m.note} from ${dayLabel(day, i)}`}
                          className="shrink-0 rounded-full p-1.5 text-lg leading-none text-muted hover:bg-field"
                        >
                          ×
                        </button>
                      )}
                    </li>
                  );
                })}
                {today.length === 0 && <li className="font-hand text-lg text-muted/70">nothing yet</li>}
              </ul>
              {unlocked && (
                <button type="button" onClick={() => openAdd(day)} className="mt-3 self-start text-[14px] font-semibold text-accent">
                  + Add
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <dialog
        ref={addDialog}
        onClick={(e) => e.target === addDialog.current && addDialog.current.close()}
        onClose={() => setAdding(null)}
        aria-label="Add a meal"
        className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-lg rounded-t-[28px] bg-surface p-0 text-fg backdrop:bg-black/30 md:mb-auto md:rounded-[28px]"
      >
        {adding && (
          <AddMeal
            key={adding}
            day={adding}
            label={dayLabel(adding, days.indexOf(adding))}
            recipes={recipes}
            onAdded={(meal) => {
              setMeals((list) => [...list, meal]);
              addDialog.current?.close();
            }}
          />
        )}
      </dialog>

      <dialog
        ref={groceryDialog}
        onClick={(e) => e.target === groceryDialog.current && groceryDialog.current.close()}
        aria-label="Add the week to Groceries"
        className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-lg rounded-t-[28px] bg-surface p-0 text-fg backdrop:bg-black/30 md:mb-auto md:rounded-[28px]"
      >
        {sheet > 0 && <GrocerySheet key={sheet} heading="The week’s groceries" sections={sections} close={() => groceryDialog.current?.close()} />}
      </dialog>
    </section>
  );
}

// Pick a recipe (and how many it should serve) or write a note, for one day.
function AddMeal({ day, label, recipes, onAdded }: { day: string; label: string; recipes: Recipe[]; onAdded: (meal: Meal) => void }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Recipe | null>(null);
  const [servings, setServings] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = recipes.filter((r) => words.every((w) => r.title.toLowerCase().includes(w)));

  function save(meal: { recipeId?: string; note?: string; servings?: number }) {
    setError("");
    startSaving(async () => {
      const r = await addMeal({ day, ...meal });
      if (r.ok) onAdded(r.meal);
      else setError(r.error);
    });
  }

  return (
    <div className="flex max-h-[85dvh] flex-col">
      <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-divider" />
      <h2 className="px-6 pt-4 font-serif text-3xl">Add to {label}</h2>

      {picked ? (
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Thumb recipe={picked} className="size-14 shrink-0" />
            <p className="min-w-0 flex-1 font-hand text-2xl text-ink">{picked.title}</p>
            <button type="button" onClick={() => setPicked(null)} className="text-[14px] text-muted underline underline-offset-4">
              Change
            </button>
          </div>
          {picked.servings != null && (
            <div className="mt-5 flex items-center gap-4">
              <span className="text-[15px]">Serves</span>
              <button
                type="button"
                onClick={() => setServings((s) => Math.max(1, (s ?? picked.servings!) - 1))}
                aria-label="Fewer servings"
                className="flex size-10 items-center justify-center rounded-full bg-field text-xl"
              >
                −
              </button>
              <span className="w-8 text-center font-hand text-2xl text-ink">{servings ?? picked.servings}</span>
              <button
                type="button"
                onClick={() => setServings((s) => Math.min(100, (s ?? picked.servings!) + 1))}
                aria-label="More servings"
                className="flex size-10 items-center justify-center rounded-full bg-field text-xl"
              >
                +
              </button>
            </div>
          )}
          {!picked.ingredientGroups.length && (
            <p className="mt-4 text-[14px] text-muted">This recipe has no typed ingredients yet, so it won’t add anything to Groceries.</p>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a recipe"
            aria-label="Find a recipe"
            className="h-12 w-full rounded-full bg-field px-4 text-[16px] outline-none focus:ring-2 focus:ring-accent/30"
          />
          <ul className="mt-2 divide-y divide-divider">
            {shown.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(r);
                    setServings(null);
                  }}
                  className="flex w-full items-center gap-3 py-2.5 text-left"
                >
                  <Thumb recipe={r} className="size-10 shrink-0" />
                  <span className="font-hand text-xl text-ink">{r.title}</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="py-4 text-center font-hand text-xl text-muted">nothing matches that</li>}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (note.trim()) save({ note: note.trim() });
            }}
            className="mt-4 mb-4 flex items-center gap-2"
          >
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Or a note: leftovers, eating out…"
              aria-label="A note for the day"
              className="h-12 min-w-0 flex-1 rounded-full bg-field px-4 font-hand text-xl text-ink outline-none placeholder:font-sans placeholder:text-[15px] focus:ring-2 focus:ring-accent/30"
            />
            <button type="submit" disabled={saving || !note.trim()} className="h-12 rounded-full border border-fg/30 px-4 text-[15px] font-semibold disabled:opacity-40">
              Add note
            </button>
          </form>
        </div>
      )}

      <div className="shrink-0 border-t border-divider px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {error && (
          <p role="alert" className="mb-3 text-[14px] text-cover">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={!picked || saving}
          onClick={() => picked && save({ recipeId: picked.id, servings: servings ?? undefined })}
          className="h-[52px] w-full rounded-full bg-accent text-[16px] font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Adding…" : picked ? `Add to ${label}` : "Pick a recipe"}
        </button>
      </div>
    </div>
  );
}
