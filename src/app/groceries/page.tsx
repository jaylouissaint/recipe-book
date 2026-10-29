import type { Metadata } from "next";
import GroceryList from "@/components/kitchen/GroceryList";
import { listGroceries } from "@/lib/groceries";

export const metadata: Metadata = { title: "Groceries" };

// Always the current list: it changes at the store, from any device.
export const dynamic = "force-dynamic";

export default async function Groceries() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-32 md:px-8 md:py-12">
      <GroceryList initial={await listGroceries()} />
    </main>
  );
}
