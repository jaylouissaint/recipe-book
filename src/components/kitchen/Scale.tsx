"use client";

import { createContext, useContext, useState } from "react";
import { ingredientText } from "@/lib/format";
import { scaleIngredient } from "@/lib/scale";
import type { IngredientGroup } from "@/lib/types";

// The serving scaler (docs/DESIGN.md "Recipe view"): the Servings box sets how many to cook for,
// and the ingredients, "Add to Groceries" and "Start Cooking" all use the scaled amounts.

// Without a serving count, the recipe scales by these multiples instead.
const MULTIPLES = [0.5, 1, 1.5, 2, 3, 4];

type Scale = {
  base: number | null; // the recipe's own servings
  servings: number | null; // what's being cooked for (when base is known)
  factor: number;
  step: (by: 1 | -1) => void;
  reset: () => void;
};

const ScaleContext = createContext<Scale>({ base: null, servings: null, factor: 1, step: () => {}, reset: () => {} });

export function useScale() {
  return useContext(ScaleContext);
}

export function ScaleProvider({ base, children }: { base: number | null; children: React.ReactNode }) {
  const [servings, setServings] = useState(base);
  const [multiple, setMultiple] = useState(1);
  const known = base != null && base > 0;
  const value: Scale = {
    base: known ? base : null,
    servings: known ? servings : null,
    factor: known ? (servings ?? base) / base : multiple,
    step: (by) => {
      if (known) setServings((s) => Math.max(1, Math.min(99, (s ?? base) + by)));
      else setMultiple((m) => MULTIPLES[Math.max(0, Math.min(MULTIPLES.length - 1, MULTIPLES.indexOf(m) + by))]);
    },
    reset: () => (known ? setServings(base) : setMultiple(1)),
  };
  return <ScaleContext.Provider value={value}>{children}</ScaleContext.Provider>;
}

function Round({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-full bg-field text-lg leading-none text-fg disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// The Servings box, with − and +.
export function ServingsStat() {
  const { base, servings, factor, step } = useScale();
  const value = base != null ? String(servings) : `×${factor}`;
  return (
    <div className="flex-1 rounded-2xl bg-surface px-3 py-2.5 text-center shadow-card">
      <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{base != null ? "Servings" : "Scale"}</p>
      <div className="flex items-center justify-center gap-3">
        <Round label="Fewer servings" onClick={() => step(-1)} disabled={base != null ? servings === 1 : factor === MULTIPLES[0]}>
          −
        </Round>
        <p className="min-w-8 font-hand text-xl text-ink" aria-live="polite">
          {value}
        </p>
        <Round label="More servings" onClick={() => step(1)} disabled={base == null && factor === MULTIPLES.at(-1)}>
          +
        </Round>
      </div>
    </div>
  );
}

// The ingredient list at the current scale.
export function ScaledIngredients({ groups }: { groups: IngredientGroup[] }) {
  const { base, servings, factor, reset } = useScale();
  return (
    <>
      {factor !== 1 && (
        <p className="mt-2 text-[14px] text-muted">
          {base != null ? `Scaled for ${servings} (the recipe makes ${base}).` : `Scaled ×${factor}.`}{" "}
          <button type="button" onClick={reset} className="font-semibold text-accent underline underline-offset-4">
            Reset
          </button>
        </p>
      )}
      {groups.map((g, i) => (
        <div key={i} className="mt-4">
          {g.name && <h3 className="mb-1 text-[12px] font-semibold tracking-widest text-muted uppercase">{g.name}</h3>}
          <ul className="divide-y divide-divider">
            {g.items.map((item, j) => (
              <li key={j} className="py-2 font-hand text-xl text-ink">
                {ingredientText(scaleIngredient(item, factor))}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
