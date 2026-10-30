"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fromPath } from "@/lib/books";
import { useBook } from "./BookContext";
import { BookIcon, CartIcon, GearIcon, HomeIcon, SidebarIcon } from "./Icons";

const ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/library", label: "Library", Icon: BookIcon, match: (p: string) => p.startsWith("/library") || p === "/book" || p.startsWith("/category/") || p.startsWith("/recipe/") || p === "/new" },
  { href: "/groceries", label: "Groceries", Icon: CartIcon, match: (p: string) => p.startsWith("/groceries") },
  { href: "/settings", label: "Settings", Icon: GearIcon, match: (p: string) => p.startsWith("/settings") },
];

// The menu's place on iPad and wider, like iPadOS's own tab bar: a floating capsule at the top
// centre, or a sidebar (the sidebar button switches; remembered in this browser, applied before
// the page is drawn by the script in layout.tsx). Phones: a bottom tab bar, hidden on recipe and
// writing pages, which have their own buttons at the bottom.
function setSide(side: boolean) {
  document.documentElement.dataset.nav = side ? "side" : "top";
  try {
    localStorage.setItem("rb-nav", side ? "side" : "top");
  } catch {}
}

export default function AppNav() {
  const book = useBook();
  // The address within the book ("/jay/library" -> "/library"), to know which tab is current.
  const pathname = fromPath(usePathname()).path;
  const onRecipe = pathname.startsWith("/recipe/") || pathname === "/new";
  // The tapped tab lights up at once, before its page has loaded.
  const [tapped, setTapped] = useState<string | null>(null);
  useEffect(() => setTapped(null), [pathname]);
  const isActive = (item: (typeof ITEMS)[number]) => (tapped ? item.href === tapped : item.match(pathname));
  const tap = (href: string) => () => setTapped(href);
  const link = (href: string) => book.path(href);

  return (
    <nav aria-label="Main" className="no-print">
      {/* Top capsule */}
      <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-30 hidden justify-center md:flex navside:md:hidden">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-field/85 p-1 shadow-card ring-1 ring-black/5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setSide(true)}
            aria-label="Move the menu to the side"
            title="Move the menu to the side"
            className="flex size-9 items-center justify-center rounded-full text-muted hover:text-accent"
          >
            <SidebarIcon className="size-5" />
          </button>
          <ul className="flex items-center gap-1">
            {ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <li key={item.href}>
                  <Link
                    href={link(item.href)}
                    onClick={tap(item.href)}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-full px-5 py-2 text-[15px] ${
                      active ? "bg-surface font-semibold text-accent shadow-sm" : "text-fg hover:text-accent"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Sidebar */}
      <div className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-divider bg-surface px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-8 navside:md:flex">
        <div className="mb-8 flex items-center justify-between gap-2 px-3">
          <Link href={link("/")} onClick={tap("/")} className="font-serif text-3xl leading-none">
            {book.name}
          </Link>
          <button
            type="button"
            onClick={() => setSide(false)}
            aria-label="Move the menu to the top"
            title="Move the menu to the top"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-field hover:text-accent"
          >
            <SidebarIcon className="size-5" />
          </button>
        </div>
        {ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={link(item.href)}
              onClick={tap(item.href)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] ${
                active ? "bg-field font-semibold text-accent" : "text-muted hover:bg-field hover:text-fg"
              }`}
            >
              <item.Icon />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Phones: bottom tab bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden ${
          onRecipe ? "hidden" : ""
        }`}
      >
        <ul className="mx-auto flex max-w-xl justify-around">
          {ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={link(item.href)}
                  onClick={tap(item.href)}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 px-4 pt-2 pb-1.5 text-[11px] ${
                    active ? "font-semibold text-accent" : "text-muted"
                  }`}
                >
                  <item.Icon />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
