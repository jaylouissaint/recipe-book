import { type NextRequest, NextResponse } from "next/server";
import { BOOKS, fromPath } from "@/lib/books";

// The two books share one set of pages (src/app/b/[book]/), built once per book so every page stays
// cached. Visitors see Ramiya's book at the site's own addresses and Jay's under /jay; this maps
// those addresses onto the pages. Opening the site's front page on a device set to Jay's book in
// Settings ("Who's using this", the rb_book cookie) goes to Jay's.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/" && request.cookies.get("rb_book")?.value === "jay") {
    return NextResponse.redirect(new URL(BOOKS.jay.base, request.url));
  }
  const { book, path } = fromPath(pathname);
  const url = request.nextUrl.clone();
  url.pathname = `/b/${book}${path === "/" ? "" : path}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Pages only: not the site's files, icons, manifests or the service worker (anything with a dot),
  // nor the pages' own internal addresses.
  matcher: ["/((?!_next/|b/|.*\\.[a-z0-9]+$).*)"],
};
