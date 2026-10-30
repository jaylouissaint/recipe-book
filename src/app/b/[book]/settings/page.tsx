import type { Metadata } from "next";
import BookSwitch from "@/components/BookSwitch";
import UnlockForm from "@/components/UnlockForm";
import { BOOK_IDS } from "@/lib/books";

export const metadata: Metadata = { title: "Settings" };

export default function Settings() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-8 md:py-12">
      <h1 className="font-serif text-[2.6rem] leading-none md:text-5xl">Settings</h1>
      <section aria-labelledby="who" className="rounded-[20px] bg-surface p-6 shadow-card">
        <h2 id="who" className="mb-1 text-lg font-semibold">
          Who’s using this
        </h2>
        <p className="mb-4 text-[15px] text-muted">
          Each book has its own recipes, groceries and week. This device remembers which one to open.
        </p>
        <BookSwitch />
      </section>
      <section aria-labelledby="editing" className="rounded-[20px] bg-surface p-6 shadow-card">
        <h2 id="editing" className="mb-1 text-lg font-semibold">
          Editing
        </h2>
        <p className="mb-4 text-[15px] text-muted">
          Each book has its own write key, and a key only changes its own book. Keys stay on this device for a year.
        </p>
        <div className="divide-y divide-divider">
          {BOOK_IDS.map((book) => (
            <div key={book} className="py-4 first:pt-0 last:pb-0">
              <UnlockForm book={book} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
