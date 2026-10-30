"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, CartIcon, GearIcon, HomeIcon } from "./Icons";

const ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
  { href: "/library", label: "Library", Icon: BookIcon, match: (p: string) => p.startsWith("/library") || p === "/book" || p.startsWith("/category/") || p.startsWith("/recipe/") || p === "/new" },
  { href: "/groceries", label: "Groceries", Icon: CartIcon, match: (p: string) => p.startsWith("/groceries") },
  { href: "/settings", label: "Settings", Icon: GearIcon, match: (p: string) => p.startsWith("/settings") },
];

// Left sidebar on wide screens (iPad landscape, desktop); bottom tab bar below that.
// Recipe pages hide the tab bar on small screens: their own buttons sit at the bottom instead.
export default function AppNav() {
  const pathname = usePathname();
  // Recipe and writing pages have their own bottom buttons on phones.
  const onRecipe = pathname.startsWith("/recipe/") || pathname === "/new";

  return (
    <nav aria-label="Main" className="no-print">
      <div className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-divider bg-surface px-4 py-8 lg:flex">
        <Link href="/" className="mb-8 px-3 font-serif text-3xl">
          {"Ramiya’s Recipes"}
        </Link>
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] ${
                active ? "bg-field font-semibold text-accent" : "text-muted hover:bg-field hover:text-fg"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden ${
          onRecipe ? "hidden" : ""
        }`}
      >
        <ul className="mx-auto flex max-w-xl justify-around">
          {ITEMS.map(({ href, label, Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 px-4 pt-2 pb-1.5 text-[11px] ${
                    active ? "font-semibold text-accent" : "text-muted"
                  }`}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
