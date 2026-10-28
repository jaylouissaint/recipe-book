"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, TAGS } from "@/lib/book";
import type { Recipe } from "@/lib/types";
import { FilterIcon, SearchIcon } from "./Icons";
import LibraryCard from "./LibraryCard";

// Searches what's already on the page (title, ingredients, steps, tags). The database search
// index takes over when the library gets large (website step R4).
function haystack(r: Recipe) {
  return [
    r.title,
    ...r.ingredientGroups.flatMap((g) => [g.name, ...g.items.map((i) => i.item)]),
    ...r.stepGroups.flatMap((g) => [g.title, ...g.steps]),
    ...r.tags.map((t) => t.replace(/-/g, " ")),
  ]
    .join(" ")
    .toLowerCase();
}

export default function LibraryList({ recipes, showCategories = true }: { recipes: Recipe[]; showCategories?: boolean }) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const indexed = useMemo(() => recipes.map((r) => ({ r, text: haystack(r) })), [recipes]);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = indexed
    .filter(({ text }) => words.every((w) => text.includes(w)))
    .filter(({ r }) => !category || r.category === category)
    .filter(({ r }) => tags.every((t) => r.tags.includes(t)))
    .map(({ r }) => r);
  const filtering = category !== null || tags.length > 0;

  const toggleTag = (id: string) => setTags((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  const chip = (on: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm ${on ? "bg-accent text-white" : "bg-surface text-fg shadow-card"}`;

  return (
    <>
      <div className="flex items-center gap-3">
        <label className="flex h-12 flex-1 items-center gap-2 rounded-full bg-field px-4 text-muted focus-within:ring-2 focus-within:ring-accent/30">
          <SearchIcon className="size-5 shrink-0" />
          <span className="sr-only">Search your library</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library"
            className="w-full bg-transparent text-[16px] text-fg outline-none placeholder:text-muted"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
          aria-label="Filters"
          className={`relative rounded-full p-2.5 ${filtering ? "text-accent" : "text-fg"}`}
        >
          <FilterIcon />
          {filtering && <span className="absolute top-2 right-2 size-2 rounded-full bg-accent" />}
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 space-y-3">
          {showCategories && (
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={category === c.slug}
                  onClick={() => setCategory((cur) => (cur === c.slug ? null : c.slug))}
                  className={chip(category === c.slug)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tags.includes(t.id)}
                onClick={() => toggleTag(t.id)}
                className={chip(tags.includes(t.id))}
              >
                {t.label}
              </button>
            ))}
          </div>
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setCategory(null);
                setTags([]);
              }}
              className="text-sm font-semibold text-accent"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-16 text-center font-hand text-2xl text-muted">
          {recipes.length === 0 ? "no recipes here yet" : "nothing matches that"}
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => (
            <li key={r.id}>
              <LibraryCard recipe={r} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
