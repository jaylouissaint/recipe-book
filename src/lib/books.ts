// The two books (docs/HANDOFF.md "Who's using this"): Ramiya's at the site's own addresses, Jay's
// under /jay. Each has its own recipes, groceries, week and write key. src/middleware.ts maps the
// addresses onto the pages in src/app/b/[book]/.

export const BOOKS = {
  ramiya: { id: "ramiya", name: "Ramiya’s Recipes", owner: "Ramiya", base: "" },
  jay: { id: "jay", name: "Jay’s Recipes", owner: "Jay", base: "/jay" },
} as const;

export type BookId = keyof typeof BOOKS;
export const BOOK_IDS = Object.keys(BOOKS) as BookId[];

export function isBook(value: unknown): value is BookId {
  return typeof value === "string" && value in BOOKS;
}

// "/library" in Jay's book is "/jay/library"; Ramiya's addresses are unchanged.
export function bookPath(book: BookId, path: string) {
  const base = BOOKS[book].base;
  if (!base) return path;
  return path === "/" ? base : `${base}${path}`;
}

// The book an address is in, and the address within it ("/jay/library" -> jay, "/library"). Pages
// themselves see their internal address ("/b/jay/library"), which is read the same way.
export function fromPath(pathname: string): { book: BookId; path: string } {
  const internal = /^\/b\/([a-z]+)(\/.*)?$/.exec(pathname);
  if (internal && isBook(internal[1])) return { book: internal[1], path: internal[2] || "/" };
  if (pathname === "/jay" || pathname.startsWith("/jay/")) return { book: "jay", path: pathname.slice(4) || "/" };
  return { book: "ramiya", path: pathname };
}
