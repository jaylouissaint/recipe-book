import type { Metadata } from "next";
import GroceryList from "@/components/kitchen/GroceryList";
import { listGroceries } from "@/lib/groceries";

export const metadata: Metadata = { title: "Groceries" };

// A cached page like the rest, so switching to it is instant: every change to the list refreshes
// it (refreshGroceries in actions.ts), and open pages hear about changes through live updates.
export const revalidate = 60;

export default async function Groceries() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-32 md:px-8 md:py-12">
      <GroceryList initial={await listGroceries()} />
    </main>
  );
}
