import type { Metadata } from "next";
import UnlockForm from "@/components/UnlockForm";

export const metadata: Metadata = { title: "Settings" };

export default function Settings() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-6 font-serif text-[2.6rem] leading-none md:text-5xl">Settings</h1>
      <section className="rounded-[20px] bg-surface p-6 shadow-card">
        <h2 className="mb-2 text-lg font-semibold">Editing</h2>
        <UnlockForm />
      </section>
    </main>
  );
}
