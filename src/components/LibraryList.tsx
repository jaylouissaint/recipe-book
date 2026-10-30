"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, TAGS, isFavorite } from "@/lib/book";
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

// The category tabs and Favorites sit above the list as filters (they were Home's shelves);
// /library?category=mains and ?favorites=1 open with one already on.
export default function LibraryList({ recipes }: { recipes: Recipe[] }) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [favorites, setFavorites] = useState(false);

  // Read after loading, so the page itself can stay cached.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("category");
    if (c && CATEGORIES.some((x) => x.slug === c)) setCategory(c);
    if (params.get("favorites")) setFavorites(true);
  }, []);

  const indexed = useMemo(() => recipes.map((r) => ({ r, text: haystack(r) })), [recipes]);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = indexed
    .filter(({ text }) => words.every((w) => text.includes(w)))
    .filter(({ r }) => !category || r.category === category)
    .filter(({ r }) => tags.every((t) => r.tags.includes(t)))
    .filter(({ r }) => !favorites || isFavorite(r))
    .map(({ r }) => r);
  const filtering = tags.length > 0;

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

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Show">
        {CATEGORIES.map((c) => {
          const on = category === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              aria-pressed={on}
              onClick={() => setCategory(on ? null : c.slug)}
              className={`label-caps rounded-lg px-3.5 py-2 !text-[0.68rem] ${on ? `${c.tabClass} !text-white shadow-card` : "bg-surface !text-fg shadow-card"}`}
            >
              <span aria-hidden className={`mr-2 inline-block size-2 rounded-full align-middle ${on ? "bg-white/80" : c.tabClass}`} />
              {c.name}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={favorites}
          onClick={() => setFavorites((f) => !f)}
          className={`label-caps rounded-lg px-3.5 py-2 !text-[0.68rem] shadow-card ${favorites ? "bg-tab-mustard !text-white" : "bg-surface !text-fg"}`}
        >
          <span aria-hidden className={favorites ? "" : "text-tab-mustard"}>★</span> Favorites
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 space-y-3">
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
              onClick={() => setTags([])}
              className="text-sm font-semibold text-accent"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="mt-16 text-center font-hand text-2xl text-muted">
          {recipes.length === 0 ? "no recipes here yet" : favorites && !category && !words.length ? "no favorites yet: tap a recipe’s star" : "nothing matches that"}
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
