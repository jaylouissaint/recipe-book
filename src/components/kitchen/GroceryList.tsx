"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addGroceries, checkGrocery, clearGroceries } from "@/app/actions";
import type { GroceryItem } from "@/lib/groceries";
import { publicFileUrl } from "@/lib/storage";
import { useUnlocked } from "../EditOnly";
import { CartIcon } from "../Icons";

// Groceries (docs/DESIGN.md): one list, not sorted by aisle or date. Check things off at the
// store; "Group by recipe" is optional. Changes show at once and save in the background.
export default function GroceryList({ initial }: { initial: GroceryItem[] }) {
  const router = useRouter();
  const unlocked = useUnlocked();
  const [items, setItems] = useState(initial);
  const [grouped, setGrouped] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, startBusy] = useTransition();

  useEffect(() => setItems(initial), [initial]);
  useEffect(() => {
    try {
      setGrouped(localStorage.getItem("rb-groceries-grouped") === "1");
    } catch {}
  }, []);

  function setGroupedSaved(on: boolean) {
    setGrouped(on);
    try {
      localStorage.setItem("rb-groceries-grouped", on ? "1" : "0");
    } catch {}
  }

  function toggle(item: GroceryItem) {
    if (!unlocked) return;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    checkGrocery(item.id, !item.checked).then((r) => {
      if (r.ok) return;
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i)));
      setError(r.error);
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const lines = [text.trim()].filter(Boolean);
    if (!lines.length) return;
    setError("");
    startBusy(async () => {
      const r = await addGroceries(lines);
      if (!r.ok) return setError(r.error);
      setItems((list) => [...list, ...r.items.map((i) => ({ ...i, recipe: null }))]);
      setText("");
    });
  }

  function clear(onlyChecked: boolean) {
    if (!onlyChecked && !confirm("Clear the whole list?")) return;
    setError("");
    startBusy(async () => {
      const r = await clearGroceries(onlyChecked);
      if (!r.ok) return setError(r.error);
      setItems((list) => (onlyChecked ? list.filter((i) => !i.checked) : []));
      router.refresh();
    });
  }

  // Checked items move to the bottom, so what's left to buy stays at the top.
  const ordered = [...items.filter((i) => !i.checked), ...items.filter((i) => i.checked)];
  const sections = grouped ? groupByRecipe(ordered) : [{ key: "all", title: "", slug: "", items: ordered }];
  const anyChecked = items.some((i) => i.checked);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-[2.6rem] leading-none md:text-5xl">Groceries</h1>
        {unlocked && items.length > 0 && (
          <div className="flex gap-5 text-[15px] font-semibold text-accent">
            <button type="button" onClick={() => clear(true)} disabled={busy || !anyChecked} className="disabled:opacity-40">
              Clear checked
            </button>
            <button type="button" onClick={() => clear(false)} disabled={busy}>
              Clear all
            </button>
          </div>
        )}
      </div>

      {!unlocked && (
        <p className="mb-4 rounded-2xl bg-field px-4 py-3 text-[15px]">
          This is the list read-only.{" "}
          <Link href="/settings" className="font-semibold text-accent underline underline-offset-4">
            Unlock in Settings
          </Link>{" "}
          to check things off and add to it.
        </p>
      )}

      {unlocked && (
        <form onSubmit={add} className="mb-4 flex items-center gap-2 rounded-full bg-surface pr-2 pl-5 shadow-card focus-within:ring-2 focus-within:ring-accent">
          <label className="sr-only" htmlFor="grocery-add">
            Add an item
          </label>
          <input
            id="grocery-add"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add an item, e.g. 1 dozen eggs"
            autoComplete="off"
            className="h-14 min-w-0 flex-1 bg-transparent font-hand text-xl text-ink outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Add to the list"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-2xl leading-none text-white disabled:opacity-40"
          >
            +
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-2xl bg-field px-4 py-3 text-[15px] text-cover">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-[20px] bg-surface px-6 py-12 text-center shadow-card">
          <CartIcon className="size-10 text-muted" />
          <p className="mt-4 font-hand text-2xl text-ink">your list is empty</p>
          <p className="mt-2 max-w-sm text-[15px] text-muted">
            “Add to Groceries” on any recipe puts its ingredients here, ready to check off at the store.
          </p>
        </div>
      ) : (
        <>
          <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-[14px] text-muted">
            <input type="checkbox" checked={grouped} onChange={(e) => setGroupedSaved(e.target.checked)} className="size-4 accent-accent" />
            Group by recipe
          </label>
          {sections.map((s) => (
            <section key={s.key} className="mb-6" aria-label={s.title || "Grocery list"}>
              {grouped && (
                <h2 className="mb-2 text-[12px] font-semibold tracking-widest text-muted uppercase">
                  {s.slug ? <Link href={`/recipe/${s.slug}`} className="hover:underline">{s.title}</Link> : s.title}
                </h2>
              )}
              <ul className="space-y-2">
                {s.items.map((item) => (
                  <li key={item.id}>
                    <Row item={item} onToggle={() => toggle(item)} canCheck={unlocked} showRecipe={!grouped} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </>
  );
}

function Row({ item, onToggle, canCheck, showRecipe }: { item: GroceryItem; onToggle: () => void; canCheck: boolean; showRecipe: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-[20px] bg-surface py-2 pr-2 pl-4 shadow-card ${item.checked ? "opacity-60" : ""}`}>
      <label className={`flex min-h-12 flex-1 items-center gap-3 ${canCheck ? "cursor-pointer" : ""}`}>
        <input type="checkbox" checked={item.checked} onChange={onToggle} disabled={!canCheck} className="size-5 shrink-0 accent-accent" />
        <span className={`font-hand text-xl text-ink ${item.checked ? "line-through decoration-ink/50" : ""}`}>{item.text}</span>
      </label>
      {showRecipe && item.recipe && (
        <Link href={`/recipe/${item.recipe.slug}`} title={item.recipe.title} aria-label={`From ${item.recipe.title}`} className="shrink-0">
          {item.recipe.photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase public URLs, shown as is
            <img src={publicFileUrl("photos", item.recipe.photoPath)} alt="" className="size-10 rounded-xl object-cover" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-xl bg-field font-hand text-xl text-ink">
              {item.recipe.title.trim().charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
      )}
    </div>
  );
}

function groupByRecipe(items: GroceryItem[]) {
  const sections: { key: string; title: string; slug: string; items: GroceryItem[] }[] = [];
  for (const item of items) {
    const key = item.recipe?.id ?? "own";
    let s = sections.find((x) => x.key === key);
    if (!s) {
      s = { key, title: item.recipe?.title ?? "Added by hand", slug: item.recipe?.slug ?? "", items: [] };
      sections.push(s);
    }
    s.items.push(item);
  }
  return sections;
}
