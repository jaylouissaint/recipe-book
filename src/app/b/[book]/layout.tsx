import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppNav from "@/components/AppNav";
import { BookProvider } from "@/components/BookContext";
import { BOOKS, BOOK_IDS, isBook } from "@/lib/books";

// Every page, once per book (docs/HANDOFF.md "Who's using this"). src/middleware.ts maps Ramiya's
// addresses (/library) and Jay's (/jay/library) onto these pages.
type Props = { params: Promise<{ book: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return BOOK_IDS.map((book) => ({ book }));
}

// The book's name in titles and on the Home Screen, opening full screen like an app, with its own
// manifest and icon, so each book can have its own shortcut.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { book } = await params;
  if (!isBook(book)) return {};
  const { name } = BOOKS[book];
  const jay = book === "jay";
  return {
    title: { default: name, template: `%s · ${name}` },
    appleWebApp: { title: name, capable: true, statusBarStyle: "default" },
    manifest: jay ? "/jay/manifest.webmanifest" : "/manifest.webmanifest",
    icons: {
      icon: jay ? "/jay-icon.svg" : "/icon.svg",
      apple: jay ? "/jay-apple-icon.png" : "/apple-icon.png",
    },
  };
}

export default async function BookLayout({ children, params }: Props & { children: React.ReactNode }) {
  const { book } = await params;
  if (!isBook(book)) notFound();
  return (
    <BookProvider book={book}>
      {/* Each book's handwriting: Ramiya's own in her book (globals.css), Patrick Hand in Jay's */}
      <div className={`navside:md:flex ${book === "ramiya" ? "hand-ramiya" : ""}`}>
        <AppNav />
        {/* Room for the bottom tab bar on phones, and for the top capsule from iPad up */}
        <div className="min-w-0 flex-1 pb-28 md:pt-14 md:pb-0 navside:md:pt-0">{children}</div>
      </div>
    </BookProvider>
  );
}
