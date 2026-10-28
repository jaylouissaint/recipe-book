import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

// Unlock editing (the write key) arrives in website step R2 (docs/PLAN.md).
export default function Settings() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-6 font-serif text-[2.6rem] leading-none md:text-5xl">Settings</h1>
      <section className="rounded-[20px] bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold">Editing</h2>
        <p className="mt-1 text-[15px] text-muted">
          Adding and editing recipes on this website is coming soon. You will unlock it once on each device with your
          write key.
        </p>
      </section>
    </main>
  );
}
