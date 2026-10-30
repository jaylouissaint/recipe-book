"use client";

import Link from "next/link";
import { CATEGORIES, TAGS, isFavorite, categoryBySlug } from "@/lib/book";
import { type Block, splitColumns } from "@/lib/bookLayout";
import { ingredientText } from "@/lib/format";
import { publicFileUrl } from "@/lib/storage";
import type { Recipe } from "@/lib/types";
import { PlateSetting, RollingPin, WhiskAndSpoon } from "../Stickers";
import { useBook } from "../BookContext";

// One block of a book page. Sizes are in em (the page sets font-size from its line height) and
// var(--line), so a page looks the same at any size. Blocks that hide the page's rules are opaque.

const LABEL = "font-label font-semibold uppercase tracking-[0.12em] text-label";

function Header({ recipe }: { recipe: Recipe }) {
  const favorite = isFavorite(recipe);
  const cells = [
    ["Servings", recipe.servings ?? ""],
    ["Prep time", recipe.prepMin != null ? `${recipe.prepMin} min` : ""],
    ["Cook time", recipe.cookMin != null ? `${recipe.cookMin} min` : ""],
  ];
  return (
    <div className="bg-paper pb-[0.3em]">
      <div className="flex flex-wrap items-start justify-between gap-x-[1em] gap-y-[0.4em]">
        <h2 className="flex min-w-[55%] flex-1 items-start gap-[0.4em]" style={{ lineHeight: "var(--line)" }}>
          <span className="font-slab text-[1.05em] font-light text-label">recipe:</span>
          <span className="font-hand text-[1.4em] text-ink">{recipe.title}</span>
          {favorite && <span className="font-sans text-[1.8em] leading-none font-bold text-teal">*</span>}
        </h2>
        <dl className="grid w-[15em] max-w-full shrink-0 grid-cols-3 border border-mauve">
          {cells.map(([label, value], i) => (
            <div key={label} className={i > 0 ? "border-l border-mauve" : ""}>
              <dt className={`bg-mauve px-[0.2em] py-[0.15em] text-center text-[0.42em] !text-white ${LABEL}`}>{label}</dt>
              <dd className="text-center font-hand text-[1.05em] leading-[1.6] text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ul className="mt-[0.5em] flex flex-wrap gap-x-[0.9em] gap-y-[0.15em] border-b border-rule pb-[0.4em]" aria-label="Tags">
        {TAGS.map((t) => {
          const on = recipe.tags.includes(t.id);
          return (
            <li key={t.id} className="flex items-center gap-[0.3em]">
              <svg aria-hidden viewBox="0 0 12 12" className="size-[0.7em] shrink-0">
                <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--label)" strokeWidth="1" />
                {on && (
                  <path d="M2.2 2.6 C4.5 5, 7 7.6, 10 10.2 M9.6 2 C7.4 4.6, 4.8 7.4, 2.4 9.8" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                )}
              </svg>
              <span className={`text-[0.42em] ${LABEL} ${on ? "!text-ink" : ""}`}>
                {t.label}
                {on && <span className="sr-only"> (checked)</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Ingredients({ recipe, narrow }: { recipe: Recipe; narrow: boolean }) {
  const [left, right] = splitColumns(recipe.ingredientGroups, ingredientText);
  const columns = narrow ? [[...left.filter((l) => l.kind !== "pad"), ...right.filter((l) => l.kind !== "pad")]] : [left, right];
  const row = { height: "var(--line)", lineHeight: "var(--line)" };
  return (
    <section className="bg-paper">
      <IngredientsLabel />
      <div className={`grid gap-x-[1.5em] ${columns.length > 1 ? "grid-cols-2" : ""}`}>
        {columns.map((col, c) => (
          <ul key={c}>
            {col.map((l, i) => (
              <li
                key={i}
                title={l.text || undefined}
                style={row}
                className={`overflow-hidden border-b border-rule font-hand text-ink ${l.kind === "name" ? "text-right text-[0.9em] opacity-80" : "text-[1em]"} truncate`}
              >
                {l.text || " "}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

function IngredientsLabel() {
  return (
    <div className="flex items-end gap-[1em]" style={{ height: "var(--line)", lineHeight: "var(--line)" }}>
      <h3 className={`text-[0.5em] ${LABEL}`}>Ingredients</h3>
      <RollingPin className="mb-[0.3em] h-[0.9em] w-[5em]" />
    </div>
  );
}

function SectionLabel({ children, stickers }: { children: string; stickers?: boolean }) {
  return (
    <div className="relative flex items-end" style={{ height: "var(--line)" }}>
      <h3 className={`text-[0.5em] ${LABEL}`}>{children}</h3>
      {stickers && (
        <>
          <WhiskAndSpoon className="absolute bottom-[0.2em] left-[6.5em] h-[3.2em] w-[3.8em]" />
          <PlateSetting className="absolute right-0 bottom-[0.15em] h-[2.2em] w-[4.4em]" />
        </>
      )}
    </div>
  );
}

function ContentsEntry({ recipe, page, onJump }: { recipe: Recipe; page?: number; onJump: (r: Recipe) => void }) {
  return (
    <button
      type="button"
      onClick={() => onJump(recipe)}
      className="flex w-full items-baseline gap-[0.5em] text-left font-hand text-ink hover:underline"
      style={{ lineHeight: "var(--line)" }}
    >
      <span className="text-[1em]">{recipe.title}</span>
      <span aria-hidden className="mb-[0.3em] min-w-[1em] flex-1 border-b border-dotted border-label/60" />
      <span className="text-[0.95em]">{page}</span>
    </button>
  );
}

export default function BookBlock({
  block,
  narrow,
  pageOf,
  onJump,
}: {
  block: Block;
  narrow: boolean;
  pageOf: (r: Recipe) => number | undefined;
  onJump: (r: Recipe) => void;
}) {
  switch (block.kind) {
    case "header":
      return <Header recipe={block.recipe} />;
    case "continued":
      return (
        <p className="flex items-baseline gap-[0.4em] truncate bg-paper" style={{ lineHeight: "var(--line)" }}>
          <span className="font-slab text-[0.9em] font-light text-label">recipe:</span>
          <span className="truncate font-hand text-[1em] text-ink">{block.recipe.title}</span>
          <span className="font-hand text-[0.85em] text-label">(continued)</span>
        </p>
      );
    case "ingredients":
      return <Ingredients recipe={block.recipe} narrow={narrow} />;
    case "ingLabel":
      return <IngredientsLabel />;
    case "ingRow":
      return (
        <p
          className={`truncate font-hand text-ink ${block.line.kind === "name" ? "text-right text-[0.9em] opacity-80" : "text-[1em]"}`}
          title={block.line.text || undefined}
          style={{ lineHeight: "var(--line)" }}
        >
          {block.line.text || "\u00a0"}
        </p>
      );
    case "dirLabel":
      return <SectionLabel stickers>Directions</SectionLabel>;
    case "dirLine":
      return block.sub ? (
        <p className="pl-[2.6em] -indent-[0.8em] font-hand text-[1em] text-ink" style={{ lineHeight: "var(--line)" }}>
          <span aria-hidden>– </span>
          {block.text}
        </p>
      ) : (
        <p className="pl-[1.1em] -indent-[1.1em] font-hand text-[1em] text-ink" style={{ lineHeight: "var(--line)" }}>
          <span aria-hidden className="text-[0.75em] leading-none">▷ </span>
          {block.text}
        </p>
      );
    case "notesLabel":
      return <SectionLabel>Notes</SectionLabel>;
    case "notes":
      return (
        <p className="font-hand text-[1em] text-ink" style={{ lineHeight: "var(--line)" }}>
          {block.text}
        </p>
      );
    case "handwriting":
      return (
        // At most a page tall (--cap is the page's lines), so it always fits on a page.
        // eslint-disable-next-line @next/next/no-img-element -- a Supabase public URL, shown as is
        <img
          src={publicFileUrl("handwriting", block.recipe.handwritingPath!)}
          alt={`${block.recipe.title}, written by hand`}
          className="block w-full object-contain object-left-top"
          style={{ maxHeight: "calc(var(--line) * (var(--cap) - 1) - 4px)" }}
        />
      );
    case "gap":
      return null;
    case "contentsTitle":
      return (
        <h2 className="font-slab text-[1.3em] font-light text-label" style={{ lineHeight: "calc(var(--line) * 2)" }}>
          contents
        </h2>
      );
    case "contentsCategory": {
      const c = categoryBySlug(block.slug) ?? CATEGORIES[0];
      return (
        <p className="flex items-end gap-[0.5em]" style={{ height: "var(--line)" }}>
          <span aria-hidden className={`${c.tabClass} mb-[0.45em] inline-block size-[0.6em] rounded-full`} />
          <span className={`mb-[0.35em] text-[0.5em] ${LABEL}`}>{c.name}</span>
        </p>
      );
    }
    case "contentsEntry":
      return <ContentsEntry recipe={block.recipe} page={pageOf(block.recipe)} onJump={onJump} />;
  }
}

// "open the recipe" link at the foot of a recipe's first page.
export function OpenRecipeLink({ recipe }: { recipe: Recipe }) {
  const { path } = useBook();
  return (
    <Link href={path(`/recipe/${recipe.slug}`)} className={`text-[0.45em] ${LABEL} !text-accent hover:underline`}>
      open recipe →
    </Link>
  );
}
