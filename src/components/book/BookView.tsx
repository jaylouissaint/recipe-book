"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/book";
import { type Block, type Page, bookOrder, contentsBlocks, continuedBlock, pack, recipeBlocks } from "@/lib/bookLayout";
import { ingredientText } from "@/lib/format";
import type { Recipe } from "@/lib/types";
import { BackIcon } from "../Icons";
import Spiral from "../Spiral";
import BookBlock, { OpenRecipeLink } from "./BookBlocks";

// The book view: fixed-size pages you flip through like the spiral book. One page at a time on
// phones and portrait iPads; an open two-page spread (spiral down the middle) when there's room.

const ASPECT = 0.78; // page width / height, close to the spiral book
const TOP_LINES = 2; // margin above the first line
const BOTTOM_LINES = 1.5;
const FLIP_MS = 650;

type Geometry = {
  pageW: number;
  pageH: number;
  line: number;
  lines: number; // ruled lines per page
  capacity: number; // lines available for content
  spread: boolean;
  narrow: boolean; // one ingredient column
  padLeft: number;
  padRight: number;
  contentW: number;
};

function geometry(availW: number, availH: number): Geometry {
  const tab = 34; // the category tabs stick out on the right
  const single = Math.min(availH, (availW - tab) / ASPECT);
  const twoUp = Math.min(availH, (availW - tab) / (2 * ASPECT));
  // An open book on landscape screens with room for two readable pages.
  const spread = availW >= 1.15 * availH && twoUp >= 420;
  const pageH = Math.floor(spread ? twoUp : single);
  const pageW = Math.floor(pageH * ASPECT);
  // Fewer, bigger lines on small pages so the writing stays readable.
  const lines = Math.max(18, Math.min(30, Math.round(pageH / 24)));
  const line = pageH / lines;
  const padLeft = line * 2.2;
  const padRight = line * 1.1;
  return {
    pageW,
    pageH,
    line,
    lines,
    capacity: Math.floor(lines - TOP_LINES - BOTTOM_LINES),
    spread,
    narrow: pageW - padLeft - padRight < 300, // two ingredient columns need about 300px
    padLeft,
    padRight,
    contentW: pageW - padLeft - padRight,
  };
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function BookView({ recipes: unordered }: { recipes: Recipe[] }) {
  const recipes = useMemo(() => bookOrder(unordered), [unordered]);
  const areaRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);
  const [heights, setHeights] = useState<Map<string, number> | null>(null);

  // ---- size of the space the book sits in
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setArea((a) => (a && Math.abs(a.w - width) < 2 && Math.abs(a.h - height) < 2 ? a : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const geo = useMemo(() => (area ? geometry(area.w, area.h) : null), [area]);

  // ---- every block, measured once per page size (after the fonts load, so wrapping is right)
  const narrow = geo?.narrow ?? false;
  const allBlocks = useMemo(() => {
    const list: Block[] = [...contentsBlocks(recipes)];
    for (const r of recipes) list.push(...recipeBlocks(r, narrow, ingredientText), continuedBlock(r));
    return list;
  }, [recipes, narrow]);
  // Measured again whenever the hidden copy changes size, which includes a late-loading font.
  useEffect(() => {
    const el = measureRef.current;
    if (!geo || !el) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const map = new Map<string, number>();
        el.querySelectorAll<HTMLElement>("[data-block]").forEach((b) => map.set(b.dataset.block!, b.getBoundingClientRect().height));
        setHeights((old) => {
          if (old && old.size === map.size && [...map].every(([k, h]) => Math.abs((old.get(k) ?? 0) - h) < 0.5)) return old;
          return map;
        });
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts.ready.then(measure);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [geo, allBlocks]);

  // ---- pages. Every block takes a whole number of lines, so text always sits on the rules.
  const lineCount = useCallback(
    (b: Block) =>
      !geo || !heights || b.kind === "gap"
        ? 1
        : // 2px of slack: glyphs can make a one-line block a pixel or two taller than the line
          Math.max(1, Math.ceil(((heights.get(b.key) ?? geo.line) - 2) / geo.line)),
    [geo, heights],
  );
  const { pages, firstPage } = useMemo(() => {
    const firstPage = new Map<string, number>();
    if (!geo || !heights) return { pages: [] as Page[], firstPage };
    const lines = lineCount;
    const contents = pack(contentsBlocks(recipes), lines, geo.capacity);
    const out: Page[] = [{ kind: "cover" }];
    contents.forEach((blocks) => out.push({ kind: "contents", blocks, number: out.length }));
    for (const r of recipes) {
      firstPage.set(r.id, out.length);
      pack(recipeBlocks(r, geo.narrow, ingredientText), lines, geo.capacity, continuedBlock(r)).forEach((blocks, i) =>
        out.push({ kind: "recipe", recipe: r, blocks, number: out.length, first: i === 0 }),
      );
    }
    // An open book ends on a full spread.
    if (geo.spread && out.length % 2 === 0) out.push({ kind: "blank", number: out.length });
    return { pages: out, firstPage };
  }, [geo, heights, recipes, lineCount]);

  // ---- views: one page, or two-page spreads with the cover alone on the right
  const spread = geo?.spread ?? false;
  const viewCount = spread ? Math.ceil((pages.length - 1) / 2) + 1 : pages.length;
  const pagesOf = useCallback(
    (v: number): (number | null)[] => (spread ? (v === 0 ? [null, 0] : [2 * v - 1, 2 * v < pages.length ? 2 * v : null]) : [v]),
    [spread, pages.length],
  );
  const viewOf = useCallback((p: number) => (spread ? (p === 0 ? 0 : Math.ceil(p / 2)) : p), [spread]);

  const [view, setView] = useState(0);
  const [flip, setFlip] = useState<"next" | "prev" | null>(null);
  const flipperRef = useRef<HTMLDivElement>(null);
  const currentPage = useRef(0); // keeps your place when the page size changes

  // Open at #recipe-slug if given, and keep your place across resizes.
  const opened = useRef(false);
  useEffect(() => {
    if (!pages.length) return;
    if (!opened.current) {
      opened.current = true;
      const slug = decodeURIComponent(window.location.hash.slice(1));
      const r = recipes.find((x) => x.slug === slug);
      if (r) currentPage.current = firstPage.get(r.id) ?? 0;
    }
    setView(Math.min(viewOf(currentPage.current), viewCount - 1));
  }, [pages, firstPage, recipes, viewOf, viewCount]);

  // The address follows the recipe on show, so Back returns to it.
  useEffect(() => {
    if (!pages.length) return;
    const shown = pagesOf(view).filter((p): p is number => p !== null);
    currentPage.current = shown[shown.length - 1] ?? 0;
    const page = pages[currentPage.current];
    const hash = page?.kind === "recipe" ? `#${page.recipe.slug}` : "";
    if (window.location.hash !== hash) history.replaceState(null, "", window.location.pathname + hash);
  }, [view, pages, pagesOf]);

  const turn = useCallback(
    (dir: "next" | "prev") => {
      if (flip) return;
      const target = dir === "next" ? view + 1 : view - 1;
      if (target < 0 || target >= viewCount) return;
      if (prefersReducedMotion()) setView(target);
      else setFlip(dir);
    },
    [flip, view, viewCount],
  );
  const jumpTo = useCallback(
    (p: number) => {
      if (!flip) setView(Math.min(viewOf(p), viewCount - 1));
    },
    [flip, viewOf, viewCount],
  );

  // Run the page-turn animation, then settle on the new view.
  useLayoutEffect(() => {
    if (!flip || !flipperRef.current) return;
    const angle = flip === "next" ? -180 : 180;
    const from = !spread && flip === "prev" ? -180 : 0;
    const to = !spread && flip === "prev" ? 0 : angle;
    const anim = flipperRef.current.animate(
      [{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${to}deg)` }],
      { duration: FLIP_MS, easing: "cubic-bezier(.4,.1,.3,1)", fill: "forwards" },
    );
    anim.onfinish = () => {
      setView((v) => v + (flip === "next" ? 1 : -1));
      setFlip(null);
    };
    return () => anim.cancel();
  }, [flip, spread]);

  // Arrow keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") turn("next");
      if (e.key === "ArrowLeft") turn("prev");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  // Swipes
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => (swipe.current = { x: e.clientX, y: e.clientY });
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) turn(dx < 0 ? "next" : "prev");
  };

  // "Open in the book" links to /book#slug; also follow the address if only the # part changes.
  useEffect(() => {
    const onHash = () => {
      const r = recipes.find((x) => x.slug === decodeURIComponent(window.location.hash.slice(1)));
      const p = r && firstPage.get(r.id);
      if (p !== undefined) jumpTo(p);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [recipes, firstPage, jumpTo]);

  const pageOf = useCallback((r: Recipe) => firstPage.get(r.id), [firstPage]);
  const jumpToRecipe = useCallback((r: Recipe) => jumpTo(firstPage.get(r.id) ?? 0), [jumpTo, firstPage]);

  // ---- rendering
  const renderPage = (p: number | null, side: "left" | "right" | "single") => {
    if (p === null || !geo) return <div className="size-full" />;
    const page = pages[p];
    if (!page) return <div className="size-full" />;
    return (
      <PageFace page={page} geo={geo} side={side} lineCount={lineCount} pageOf={pageOf} onJump={jumpToRecipe} />
    );
  };

  const [left, right] = pagesOf(view);
  const nextPages = view + 1 < viewCount ? pagesOf(view + 1) : [];
  const prevPages = view > 0 ? pagesOf(view - 1) : [];
  const shownRight = spread ? right : left;
  const rightPage = shownRight != null ? pages[shownRight] : undefined;
  const activeCategory = rightPage?.kind === "recipe" ? rightPage.recipe.category : undefined;
  const firstOfCategory = (slug: string) => {
    const r = recipes.find((x) => x.category === slug);
    return r ? firstPage.get(r.id) : undefined;
  };
  const shown = pagesOf(view).filter((x): x is number => x !== null && x > 0);
  const label = shown.length === 0 ? "cover" : `page ${shown.join("–")} of ${pages.length - 1}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={areaRef} className="relative min-h-0 flex-1">
        {geo && heights && pages.length > 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative touch-pan-y select-none"
              style={{ width: geo.pageW * (spread ? 2 : 1), height: geo.pageH, perspective: geo.pageH * 3 }}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
            >
              {/* Pages underneath (what's revealed as the page turns) */}
              {spread ? (
                <>
                  <div className="absolute inset-y-0 left-0" style={{ width: geo.pageW }}>
                    {renderPage(flip === "prev" ? prevPages[0] : left, "left")}
                  </div>
                  <div className="absolute inset-y-0 right-0" style={{ width: geo.pageW }}>
                    {renderPage(flip === "next" ? nextPages[1] ?? null : right, "right")}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0">{renderPage(flip === "next" ? nextPages[0] : left, "single")}</div>
              )}

              {/* The turning page: front and back faces */}
              {flip && (
                <div
                  ref={flipperRef}
                  className="absolute inset-y-0"
                  style={{
                    width: geo.pageW,
                    left: spread ? (flip === "next" ? geo.pageW : 0) : 0,
                    transformOrigin: spread && flip === "prev" ? "right center" : "left center",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div className="absolute inset-0 [backface-visibility:hidden]">
                    {spread
                      ? renderPage(flip === "next" ? right : left, flip === "next" ? "right" : "left")
                      : renderPage(flip === "next" ? left : prevPages[0], "single")}
                  </div>
                  {spread && (
                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      {renderPage(flip === "next" ? nextPages[0] : prevPages[1] ?? null, flip === "next" ? "left" : "right")}
                    </div>
                  )}
                </div>
              )}

              {/* Spiral: down the middle of an open book, or the left edge of a single page */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 z-10"
                style={{ left: spread ? geo.pageW - geo.line * 0.9 : -geo.line * 0.55, width: geo.line * 1.8 }}
              >
                <Spiral className="inset-y-[1.5%] left-0" ringHeight={geo.line * 0.8} />
              </div>

              {/* Category tabs on the outer edge */}
              <nav aria-label="Book sections" className="absolute top-[12%] z-20 flex flex-col gap-2" style={{ left: "100%" }}>
                {CATEGORIES.map((c) => {
                  const p = firstOfCategory(c.slug);
                  const on = c.slug === activeCategory;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      disabled={p === undefined}
                      onClick={() => p !== undefined && jumpTo(p)}
                      aria-current={on ? "true" : undefined}
                      className={`${c.tabClass} label-caps tab-vertical rounded-r-md px-1.5 py-4 !text-[0.6rem] !text-white shadow-sm transition-transform disabled:opacity-40 ${
                        on ? "translate-x-1" : "hover:translate-x-0.5"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        ) : (
          <p className="absolute inset-0 flex items-center justify-center font-hand text-2xl text-muted">opening the book…</p>
        )}

        {/* Hidden copy of every block at the real page width, to measure line counts. The zero-size
            box keeps it from adding scroll space. */}
        {geo && (
          <div aria-hidden className="pointer-events-none invisible absolute top-0 left-0 size-0 overflow-hidden">
            {/* Same text styles as a page (paper-lines sets the line height), so sizes match */}
            <div
              ref={measureRef}
              className="paper-lines"
              style={{ width: geo.contentW, fontSize: geo.line * 0.58, ["--line" as string]: `${geo.line}px` }}
            >
              {allBlocks.map((b) => (
                <div key={b.key} data-block={b.key} className="flow-root">
                  <BookBlock block={b} narrow={geo.narrow} pageOf={() => 99} onJump={() => {}} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="no-print flex items-center justify-center gap-6 py-3">
        <button
          type="button"
          onClick={() => turn("prev")}
          disabled={view === 0 || !!flip}
          aria-label="Previous page"
          className="rounded-full bg-surface p-3 shadow-card disabled:opacity-40"
        >
          <BackIcon className="size-5" />
        </button>
        <span className="min-w-28 text-center text-[14px] text-muted" aria-live="polite">
          {pages.length ? label : ""}
        </span>
        <button
          type="button"
          onClick={() => turn("next")}
          disabled={view >= viewCount - 1 || !!flip}
          aria-label="Next page"
          className="rounded-full bg-surface p-3 shadow-card disabled:opacity-40"
        >
          <BackIcon className="size-5 rotate-180" />
        </button>
      </div>
    </div>
  );
}

function PageFace({
  page,
  geo,
  side,
  lineCount,
  pageOf,
  onJump,
}: {
  page: Page;
  geo: Geometry;
  side: "left" | "right" | "single";
  lineCount: (b: Block) => number;
  pageOf: (r: Recipe) => number | undefined;
  onJump: (r: Recipe) => void;
}) {
  const rounded = side === "left" ? "rounded-l-md" : side === "right" ? "rounded-r-md" : "rounded-md";
  const shadow = "shadow-[0_2px_14px_rgba(0,0,0,0.14)]";
  if (page.kind === "cover") {
    return (
      <div className={`flex size-full items-center justify-center bg-cover p-[5%] ${rounded} ${shadow}`}>
        <div className="flex size-full flex-col items-center justify-center border border-white/80 text-center text-white">
          <p className="font-serif leading-tight" style={{ fontSize: geo.line * 1.7 }}>
            {"Ramiya’s Recipes"}
          </p>
          <p className="label-caps mt-3 !text-white/80" style={{ fontSize: geo.line * 0.42 }}>
            recipe book
          </p>
        </div>
      </div>
    );
  }
  const number = page.number;
  const outer = side === "left" ? "left" : "right";
  // Inner margin (by the spiral) is wider than the outer one.
  const padLeft = side === "left" ? geo.padRight : geo.padLeft;
  const padRight = side === "left" ? geo.padLeft : geo.padRight;
  return (
    <div
      className={`paper-lines relative size-full overflow-hidden bg-paper ${rounded} ${shadow}`}
      style={{
        fontSize: geo.line * 0.58,
        ["--line" as string]: `${geo.line}px`,
        paddingTop: geo.line * TOP_LINES,
        paddingBottom: geo.line * BOTTOM_LINES,
        paddingLeft: padLeft,
        paddingRight: padRight,
        backgroundPosition: `0 ${geo.line * TOP_LINES}px`,
        backgroundSize: `100% ${geo.line}px`,
        backgroundOrigin: "border-box",
        backgroundClip: "content-box",
      }}
    >
      {page.kind !== "blank" &&
        page.blocks.map((b) => (
          <div
            key={b.key}
            className="flow-root overflow-hidden"
            style={{ height: lineCount(b) * geo.line }}
          >
            <BookBlock block={b} narrow={geo.narrow} pageOf={pageOf} onJump={onJump} />
          </div>
        ))}
      {page.kind === "recipe" && page.first && (
        <div className="absolute" style={{ bottom: geo.line * 0.45, [outer === "left" ? "right" : "left"]: outer === "left" ? padRight : padLeft }}>
          <OpenRecipeLink recipe={page.recipe} />
        </div>
      )}
      <span
        className="label-caps absolute"
        style={{ bottom: geo.line * 0.45, [outer]: geo.line * 0.9, fontSize: geo.line * 0.36 }}
      >
        {number}
      </span>
    </div>
  );
}
