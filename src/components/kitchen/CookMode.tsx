"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { recordCooked } from "@/app/actions";
import { ingredientsForStep } from "@/lib/cook";
import { ingredientText } from "@/lib/format";
import { scaleIngredient } from "@/lib/scale";
import type { Ingredient, Recipe } from "@/lib/types";
import { setCooking } from "@/lib/remember";
import { useUnlocked } from "../EditOnly";

// Start Cooking (docs/DESIGN.md): full screen, one step at a time in large handwriting, with the
// ingredients the step uses above it. Tap, swipe or use the arrow keys; sub-steps can be checked
// off; the screen stays awake. Reaching the end adds one to "times cooked".
type Page = { kind: "gather" } | { kind: "step"; index: number } | { kind: "done" };

// `start` is the page to open on (Home's "Continue cooking").
export default function CookMode({ recipe, factor, start = 0 }: { recipe: Recipe; factor: number; start?: number }) {
  const router = useRouter();
  const unlocked = useUnlocked();
  const pages: Page[] = [{ kind: "gather" }, ...recipe.stepGroups.map((_, index) => ({ kind: "step" as const, index })), { kind: "done" }];
  const [at, setAt] = useState(() => Math.max(0, Math.min(start, recipe.stepGroups.length)));
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [cooked, setCooked] = useState("");
  const recorded = useRef(false);
  const awake = useWakeLock();
  const recipeHref = `/recipe/${recipe.slug}`;
  const page = pages[at];
  const steps = recipe.stepGroups.length;

  const go = useCallback((by: number) => setAt((a) => Math.max(0, Math.min(pages.length - 1, a + by))), [pages.length]);

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") router.push(recipeHref);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [go, router, recipeHref]);

  // Home offers to continue from here; finishing clears it.
  useEffect(() => {
    if (at === pages.length - 1) return setCooking(null);
    setCooking({ slug: recipe.slug, title: recipe.title, page: at, steps: pages.length - 2, scale: factor, at: Date.now() });
  }, [at, pages.length, recipe.slug, recipe.title, factor]);

  // Reaching the end counts as cooking it once.
  useEffect(() => {
    if (page.kind !== "done" || recorded.current || !unlocked) return;
    recorded.current = true;
    recordCooked(recipe.id).then((r) =>
      setCooked(r.ok ? `That’s ${r.timesCooked} time${r.timesCooked === 1 ? "" : "s"} you’ve made this.` : ""),
    );
  }, [page.kind, unlocked, recipe.id]);

  const toggle = (key: string) =>
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const swipe = useRef<number | null>(null);
  const scaled = (i: Ingredient) => ingredientText(scaleIngredient(i, factor));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-page"
      onPointerDown={(e) => (swipe.current = e.pointerType === "mouse" ? null : e.clientX)}
      onPointerUp={(e) => {
        if (swipe.current == null) return;
        const dx = e.clientX - swipe.current;
        swipe.current = null;
        if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1);
      }}
    >
      <header className="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 md:px-8">
        <Link href={recipeHref} aria-label="Stop cooking" className="rounded-full p-2 text-2xl leading-none hover:bg-field">
          ×
        </Link>
        <p className="min-w-0 flex-1 truncate text-center font-hand text-xl text-ink">{recipe.title}</p>
        <p className="w-16 text-right text-[14px] text-muted">
          {page.kind === "step" ? `${page.index + 1} of ${steps}` : ""}
        </p>
      </header>
      <div className="mx-4 h-1 overflow-hidden rounded-full bg-field md:mx-8" aria-hidden>
        <div className="h-full bg-accent transition-[width]" style={{ width: `${(at / (pages.length - 1)) * 100}%` }} />
      </div>

      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12" aria-live="polite">
        <div className="mx-auto max-w-3xl">
          {page.kind === "gather" && (
            <>
              <p className="text-[13px] font-semibold tracking-widest text-muted uppercase">Before you start</p>
              <h1 className="mt-2 font-serif text-4xl md:text-5xl">Gather your ingredients</h1>
              {factor !== 1 && <p className="mt-2 text-[15px] text-muted">Scaled ×{Number(factor.toFixed(2))}.</p>}
              {recipe.ingredientGroups.map((g, gi) => (
                <div key={gi} className="mt-6">
                  {g.name && <h2 className="mb-1 text-[12px] font-semibold tracking-widest text-muted uppercase">{g.name}</h2>}
                  <ul className="divide-y divide-divider">
                    {g.items.map((item, ii) => {
                      const key = `g:${gi}:${ii}`;
                      return (
                        <li key={key}>
                          <CheckLine on={checked.has(key)} onClick={() => toggle(key)} size="text-2xl md:text-3xl">
                            {scaled(item)}
                          </CheckLine>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </>
          )}

          {page.kind === "step" && (() => {
            const step = recipe.stepGroups[page.index];
            const needs = ingredientsForStep(recipe.ingredientGroups, step);
            return (
              <>
                <p className="text-[13px] font-semibold tracking-widest text-muted uppercase">Step {page.index + 1}</p>
                {needs.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label="You’ll need">
                    {needs.map((i, n) => (
                      <li key={n} className="rounded-full bg-surface px-4 py-1.5 font-hand text-lg text-ink shadow-card">
                        {scaled(i)}
                      </li>
                    ))}
                  </ul>
                )}
                <h1 className="mt-6 font-hand text-4xl leading-tight text-ink md:text-6xl md:leading-tight">{step.title}</h1>
                {step.steps.length > 0 && (
                  <ul className="mt-6 space-y-1">
                    {step.steps.map((s, si) => {
                      const key = `s:${page.index}:${si}`;
                      return (
                        <li key={key}>
                          <CheckLine on={checked.has(key)} onClick={() => toggle(key)} size="text-2xl md:text-4xl">
                            {s}
                          </CheckLine>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            );
          })()}

          {page.kind === "done" && (
            <div className="flex min-h-[50dvh] flex-col items-center justify-center text-center">
              <p className="font-hand text-6xl text-ink">enjoy!</p>
              <p className="mt-4 text-[16px] text-muted">{cooked || "That’s every step."}</p>
              <Link href={recipeHref} className="mt-8 rounded-full bg-accent px-8 py-3.5 text-[16px] font-semibold text-white">
                Back to the recipe
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-divider bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={at === 0}
            className="h-[56px] flex-1 rounded-full border border-fg/30 text-[17px] font-semibold disabled:opacity-40"
          >
            Back
          </button>
          {page.kind !== "done" && (
            <button type="button" onClick={() => go(1)} className="h-[56px] flex-[2] rounded-full bg-accent text-[17px] font-semibold text-white">
              {at === pages.length - 2 ? "Finish" : page.kind === "gather" ? "Start" : "Next step"}
            </button>
          )}
        </div>
        {awake && <p className="mt-2 text-center text-[12px] text-muted">The screen stays on while you cook.</p>}
      </footer>
    </div>
  );
}

function CheckLine({ on, onClick, size, children }: { on: boolean; onClick: () => void; size: string; children: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="flex w-full items-start gap-4 py-2.5 text-left">
      <span
        aria-hidden
        className={`mt-2 flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-accent bg-accent text-white" : "border-label"}`}
      >
        {on && "✓"}
      </span>
      <span className={`font-hand ${size} leading-snug ${on ? "text-muted line-through" : "text-ink"}`}>{children}</span>
    </button>
  );
}

// Keeps the screen on while cooking (asked for again when the page comes back to the front).
function useWakeLock(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (stopped) lock.release();
        else setHeld(true);
      } catch {
        setHeld(false); // not allowed right now (battery saver, or the page is in the background)
      }
    };
    const onVisible = () => document.visibilityState === "visible" && request();
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release();
    };
  }, []);
  return held;
}
