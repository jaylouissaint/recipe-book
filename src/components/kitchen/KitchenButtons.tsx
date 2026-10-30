"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { recordCooked } from "@/app/actions";
import type { Recipe } from "@/lib/types";
import GrocerySheet from "./GrocerySheet";
import { useScale } from "./Scale";
import { useBook } from "../BookContext";

// The recipe's sticky bottom buttons: "Add to Groceries" (pick the lines you need, at the current
// serving size) and "Start Cooking".
export default function KitchenButtons({ recipe }: { recipe: Recipe }) {
  const { factor } = useScale();
  const { path } = useBook();
  const cookHref = path(`/recipe/${recipe.slug}/cook${factor !== 1 ? `?scale=${factor}` : ""}`);
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(0); // remounts the sheet with fresh choices each time

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-surface/95 px-4 navside:md:left-60 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
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
        {open > 0 && <GrocerySheet key={open} sections={[{ recipe, factor }]} close={() => dialog.current?.close()} />}
      </dialog>
    </div>
  );
}

// "Mark as cooked" in the recipe menu (Start Cooking also counts when it reaches the end).
export function MarkCooked({ id }: { id: string }) {
  const { id: book } = useBook();
  const router = useRouter();
  const [state, setState] = useState("");
  const [saving, startSaving] = useTransition();
  return (
    <button
      type="button"
      disabled={saving}
      onClick={() =>
        startSaving(async () => {
          const r = await recordCooked(book, id);
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
