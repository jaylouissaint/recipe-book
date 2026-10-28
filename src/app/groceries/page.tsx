import type { Metadata } from "next";
import { CartIcon } from "@/components/Icons";

export const metadata: Metadata = { title: "Groceries" };

// The grocery list arrives in website step R4 (docs/PLAN.md).
export default function Groceries() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-6 font-serif text-[2.6rem] leading-none md:text-5xl">Groceries</h1>
      <div className="flex flex-col items-center rounded-[20px] bg-surface px-6 py-12 text-center shadow-card">
        <CartIcon className="size-10 text-muted" />
        <p className="mt-4 font-hand text-2xl text-ink">your list is empty</p>
        <p className="mt-2 max-w-sm text-[15px] text-muted">
          Soon “Add to Groceries” on any recipe will put its ingredients here, ready to check off at the store.
        </p>
      </div>
    </main>
  );
}
