"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteRecipe, photoUploadUrl, saveRecipe } from "@/app/actions";
import { CATEGORIES, TAGS } from "@/lib/book";
import {
  type DirectionLine,
  ingredientLine,
  linesToStepGroups,
  parseIngredientLine,
  readDirectionLine,
  stepGroupsToLines,
} from "@/lib/parse";
import { publicFileUrl } from "@/lib/storage";
import type { Recipe } from "@/lib/types";
import { useUnlocked } from "./EditOnly";
import { CameraIcon } from "./Icons";
import Spiral from "./Spiral";
import { PlateSetting, RollingPin, WhiskAndSpoon } from "./Stickers";

// The writing page (docs/DESIGN.md): the book page from the sweet chili chicken photo as a form.
// Every ruled line is its own text field, so Scribble on an iPad fills one line at a time.

type Group = { name: string; lines: string[] };
type Draft = {
  title: string;
  servings: string;
  prepMin: string;
  cookMin: string;
  category: string;
  tags: string[];
  groups: Group[];
  directions: DirectionLine[];
  notes: string;
  author: string;
  sourceName: string;
  sourceUrl: string;
  description: string;
  photoPath: string;
};

function fromRecipe(r: Recipe | null): Draft {
  return {
    title: r?.title ?? "",
    servings: r?.servings?.toString() ?? "",
    prepMin: r?.prepMin?.toString() ?? "",
    cookMin: r?.cookMin?.toString() ?? "",
    category: r?.category ?? "mains",
    tags: r?.tags ?? [],
    groups: r?.ingredientGroups.length
      ? r.ingredientGroups.map((g) => ({ name: g.name, lines: g.items.map(ingredientLine) }))
      : [{ name: "", lines: [] }],
    directions: r ? stepGroupsToLines(r.stepGroups) : [],
    notes: r?.notes ?? "",
    author: r?.author ?? "",
    sourceName: r?.sourceName ?? "",
    sourceUrl: r?.sourceUrl ?? "",
    description: r?.description ?? "",
    photoPath: r?.photoPath ?? "",
  };
}

// crypto.randomUUID only exists on https and localhost; the iPad on the home network uses http.
function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// A whole number or empty; anything else is refused with a message (FR-WRITE-005).
function readNumber(label: string, value: string): number | null {
  const v = value.trim().replace(/\s*min(ute)?s?$/i, "");
  if (!v) return null;
  if (!/^\d+$/.test(v)) throw new Error(`${label} should be a number`);
  return Number(v);
}

const LINE = "h-12 w-full border-b border-rule bg-transparent font-hand text-xl text-ink outline-none placeholder:text-ink/30 focus:border-ink/40";

// Focus a line by its data-line id once React has rendered it.
function focusLine(form: HTMLFormElement | null, id: string) {
  requestAnimationFrame(() => form?.querySelector<HTMLInputElement>(`[data-line="${id}"]`)?.focus());
}

export default function RecipeEditor({ recipe }: { recipe: Recipe | null }) {
  const router = useRouter();
  const unlocked = useUnlocked();
  const formRef = useRef<HTMLFormElement>(null);
  const [id] = useState(() => recipe?.id ?? newId());
  const draftKey = `rb-draft:${recipe?.id ?? "new"}`;
  const [draft, setDraft] = useState<Draft>(() => fromRecipe(recipe));
  const [restored, setRestored] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();

  // Restore an unsaved draft once, then keep the draft after every change (FR-WRITE-006).
  // Only a draft that differs from the saved recipe is kept.
  const [original] = useState(() => JSON.stringify(fromRecipe(recipe)));
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved && saved !== original) {
        setDraft({ ...fromRecipe(recipe), ...JSON.parse(saved) });
        setRestored(true);
      }
    } catch {
      // storage unavailable or an unreadable draft: start from the recipe
    }
  }, [draftKey, original, recipe]);
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      try {
        const json = JSON.stringify(draft);
        if (json === original) localStorage.removeItem(draftKey);
        else localStorage.setItem(draftKey, json);
      } catch {
        // storage unavailable: nothing to do
      }
    }, 300);
    return () => clearTimeout(t);
  }, [draft, draftKey, original]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setDraft(fromRecipe(recipe));
    setRestored(false);
  }

  // ---- ingredients
  function setIngredient(gi: number, li: number, text: string) {
    setDraft((d) => {
      const groups = d.groups.map((g, i) => {
        if (i !== gi) return g;
        const lines = [...g.lines];
        lines[li] = text;
        return { ...g, lines };
      });
      return { ...d, groups };
    });
  }
  function ingredientKey(e: React.KeyboardEvent<HTMLInputElement>, gi: number, li: number) {
    const lines = draft.groups[gi].lines;
    if (e.key === "Enter") {
      e.preventDefault();
      focusLine(formRef.current, `ing-${gi}-${li + 1}`);
    } else if (e.key === "Backspace" && e.currentTarget.value === "" && li < lines.length) {
      e.preventDefault();
      setDraft((d) => ({
        ...d,
        groups: d.groups.map((g, i) => (i === gi ? { ...g, lines: g.lines.filter((_, j) => j !== li) } : g)),
      }));
      focusLine(formRef.current, `ing-${gi}-${Math.max(0, li - 1)}`);
    }
  }

  // ---- directions
  function setDirection(li: number, text: string) {
    setDraft((d) => {
      const lines = [...d.directions];
      // New lines are ▷ steps; a leading "-" makes a sub-step, as in the book.
      const kind = lines[li]?.kind ?? "step";
      lines[li] = readDirectionLine(text, kind);
      return { ...d, directions: lines };
    });
  }
  function toggleKind(li: number) {
    setDraft((d) => ({
      ...d,
      directions: d.directions.map((l, i) => (i === li ? { ...l, kind: l.kind === "step" ? "sub" : "step" } : l)),
    }));
  }
  function directionKey(e: React.KeyboardEvent<HTMLInputElement>, li: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      focusLine(formRef.current, `dir-${li + 1}`);
    } else if (e.key === "Tab" && li < draft.directions.length) {
      // Tab makes a sub-step, Shift+Tab a step, like indenting in the book
      const kind = e.shiftKey ? "step" : "sub";
      if (draft.directions[li].kind !== kind) {
        e.preventDefault();
        toggleKind(li);
      }
    } else if (e.key === "Backspace" && e.currentTarget.value === "" && li < draft.directions.length) {
      e.preventDefault();
      setDraft((d) => ({ ...d, directions: d.directions.filter((_, i) => i !== li) }));
      focusLine(formRef.current, `dir-${Math.max(0, li - 1)}`);
    }
  }

  // ---- photo
  function choosePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto({ file, preview: URL.createObjectURL(file) });
  }
  async function uploadPhoto(file: File): Promise<string> {
    const ext = (file.name.split(".").pop() || file.type.split("/").pop() || "jpg").toLowerCase();
    const link = await photoUploadUrl(id, ext === "jpeg" ? "jpg" : ext);
    if (!link.ok) throw new Error(link.error);
    const { supabase } = await import("@/lib/supabase"); // only needed for uploads
    const { error } = await supabase.storage.from("photos").uploadToSignedUrl(link.path, link.token, file, {
      contentType: file.type || undefined,
    });
    if (error) throw new Error(`The photo didn't upload: ${error.message}`);
    return link.path;
  }

  // ---- save / delete
  function save() {
    setError("");
    startSaving(async () => {
      try {
        if (!draft.title.trim()) throw new Error("Give the recipe a title");
        const servings = readNumber("Servings", draft.servings);
        const prepMin = readNumber("Prep time", draft.prepMin);
        const cookMin = readNumber("Cook time", draft.cookMin);
        const photoPath = photo ? await uploadPhoto(photo.file) : draft.photoPath;
        const result = await saveRecipe({
          id,
          title: draft.title.trim(),
          servings: servings === 0 ? null : servings,
          prepMin,
          cookMin,
          category: draft.category,
          tags: draft.tags,
          notes: draft.notes.trim(),
          source: recipe?.source ?? "typed",
          originalFilePath: recipe?.originalFilePath,
          handwritingPath: recipe?.handwritingPath,
          author: draft.author,
          sourceName: draft.sourceName,
          sourceUrl: draft.sourceUrl,
          description: draft.description.trim(),
          photoPath: photoPath || null,
          imported: false,
          ingredientGroups: draft.groups
            .map((g) => ({
              name: g.name.trim(),
              items: g.lines.map((l) => l.trim()).filter(Boolean).map(parseIngredientLine),
            }))
            .filter((g) => g.items.length > 0),
          stepGroups: linesToStepGroups(draft.directions),
        });
        if (!result.ok) throw new Error(result.error);
        try {
          localStorage.removeItem(draftKey);
        } catch {}
        router.push(`/recipe/${result.slug}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Saving failed");
      }
    });
  }

  function remove() {
    if (!recipe || !confirm(`Delete “${recipe.title}”? It disappears everywhere.`)) return;
    startSaving(async () => {
      const result = await deleteRecipe(recipe.id);
      if (!result.ok) return setError(result.error);
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      router.push("/library");
      router.refresh();
    });
  }

  const photoUrl = photo?.preview ?? (draft.photoPath ? publicFileUrl("photos", draft.photoPath) : null);
  const directionRows: DirectionLine[] = [...draft.directions, { kind: "step", text: "" }];

  return (
    <div className="mx-auto max-w-4xl px-3 pt-4 pb-32 md:px-10">
      {!unlocked && (
        <p role="status" className="mb-4 rounded-2xl bg-field px-4 py-3 text-[15px]">
          Editing is locked on this device, so this recipe can&apos;t be saved yet.{" "}
          <Link href="/settings" className="font-semibold text-accent underline underline-offset-4">
            Unlock in Settings
          </Link>
        </p>
      )}
      {restored && (
        <p role="status" className="mb-4 flex flex-wrap items-center gap-x-3 rounded-2xl bg-field px-4 py-3 text-[15px]">
          Restored your unsaved draft.
          <button type="button" onClick={discardDraft} className="font-semibold text-accent">
            Discard it
          </button>
        </p>
      )}

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="relative rounded-sm bg-paper px-4 py-6 text-ink shadow-[0_2px_12px_rgba(0,0,0,0.12)] md:pr-12 md:pl-14 md:py-8"
      >
        <Spiral />

        {/* Category: the book's colored side tabs */}
        <fieldset className="mb-4 md:absolute md:top-24 md:-right-9 md:mb-0">
          <legend className="sr-only">Category</legend>
          <div className="flex gap-1 overflow-x-auto md:flex-col md:gap-2 md:overflow-visible">
            {CATEGORIES.map((c) => {
              const on = draft.category === c.slug;
              return (
                <label
                  key={c.slug}
                  className={`${c.tabClass} label-caps shrink-0 cursor-pointer rounded-md px-3 py-1.5 whitespace-nowrap !text-white transition-transform has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink md:tab-vertical md:rounded-l-none md:px-2 md:py-5 ${
                    on ? "ring-2 ring-ink/40 md:translate-x-1.5 md:ring-0" : "opacity-70 md:hover:translate-x-1"
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.slug}
                    checked={on}
                    onChange={() => update({ category: c.slug })}
                    className="sr-only"
                  />
                  {c.name}
                </label>
              );
            })}
          </div>
        </fieldset>

        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <label className="flex flex-1 items-end gap-2">
            <span className="pb-2 font-slab text-xl font-light text-label">recipe:</span>
            {/* Wraps like the title in the book; Enter moves on instead of adding a line break. */}
            <textarea
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              value={draft.title}
              onChange={(e) => update({ title: e.target.value.replace(/\n/g, " ") })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  focusLine(formRef.current, "ing-0-0");
                }
              }}
              rows={1}
              placeholder="title"
              aria-label="Title"
              className="paper-lines block w-full resize-none overflow-hidden bg-transparent pb-0 font-hand text-2xl text-ink outline-none placeholder:text-ink/30 [--line:3rem] md:text-3xl"
            />
          </label>
          <fieldset className="grid w-full max-w-72 shrink-0 grid-cols-3 border border-mauve">
            <legend className="sr-only">Servings and times</legend>
            {(
              [
                ["servings", "Servings", ""],
                ["prepMin", "Prep time", "min"],
                ["cookMin", "Cook time", "min"],
              ] as const
            ).map(([field, label, suffix], i) => (
              <label key={field} className={i > 0 ? "border-l border-mauve" : ""}>
                <span className="label-caps block bg-mauve px-1 py-0.5 text-center !text-[0.55rem] !text-white">{label}</span>
                <span className="flex items-baseline justify-center px-2">
                  <input
                    value={draft[field]}
                    onChange={(e) => update({ [field]: e.target.value } as Partial<Draft>)}
                    inputMode="numeric"
                    aria-label={label}
                    className="h-12 w-12 bg-transparent text-center font-hand text-xl text-ink outline-none"
                  />
                  {suffix && <span className="font-hand text-lg text-ink/70">{suffix}</span>}
                </span>
              </label>
            ))}
          </fieldset>
        </header>

        {/* Tags: tap the circles */}
        <fieldset className="mt-4 border-b border-rule pb-3">
          <legend className="sr-only">Tags</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {TAGS.map((t) => {
              const on = draft.tags.includes(t.id);
              return (
                <label key={t.id} className="flex cursor-pointer items-center gap-1.5 py-1.5">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => update({ tags: on ? draft.tags.filter((x) => x !== t.id) : [...draft.tags, t.id] })}
                    className="peer sr-only"
                  />
                  <svg aria-hidden width="14" height="14" viewBox="0 0 12 12" className="shrink-0 rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
                    <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--label)" strokeWidth="1" />
                    {on && (
                      <path
                        d="M2.2 2.6 C4.5 5, 7 7.6, 10 10.2 M9.6 2 C7.4 4.6, 4.8 7.4, 2.4 9.8"
                        stroke="var(--ink)"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        fill="none"
                      />
                    )}
                  </svg>
                  <span className={`label-caps !text-[0.6rem] ${on ? "!text-ink" : ""}`}>{t.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Photo */}
        <div className="mt-4 flex items-center gap-4">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local previews and Supabase URLs, shown as is
            <img src={photoUrl} alt="" className="size-20 rounded-2xl object-cover shadow-card" />
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface px-4 py-2 font-sans text-[14px] font-semibold text-accent shadow-card has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
            <CameraIcon className="size-5" />
            {photoUrl ? "Change photo" : "Add a photo"}
            <input type="file" accept="image/*" onChange={choosePhoto} className="sr-only" />
          </label>
          {photoUrl && (
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                update({ photoPath: "" });
              }}
              className="font-sans text-[14px] text-muted underline underline-offset-4"
            >
              Remove
            </button>
          )}
        </div>

        {/* Ingredients */}
        <section className="relative mt-6" aria-labelledby="ed-ingredients">
          <div className="flex items-center gap-4">
            <h2 id="ed-ingredients" className="label-caps">
              Ingredients
            </h2>
            <RollingPin className="hidden h-5 w-28 md:block" />
          </div>
          <div className="gap-x-8 md:columns-2">
            {draft.groups.map((g, gi) => {
              const rows = [...g.lines, ""];
              return (
                <div key={gi} className="mb-4 break-inside-avoid">
                  <input
                    value={g.name}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        groups: d.groups.map((x, i) => (i === gi ? { ...x, name: e.target.value } : x)),
                      }))
                    }
                    placeholder={gi === 0 ? "section name (optional), e.g. marinade" : "section name, e.g. drizzle"}
                    aria-label={`Section ${gi + 1} name`}
                    className={`${LINE} text-right !text-lg opacity-90`}
                  />
                  {rows.map((line, li) => (
                    <input
                      key={li}
                      data-line={`ing-${gi}-${li}`}
                      value={line}
                      onChange={(e) => setIngredient(gi, li, e.target.value)}
                      onKeyDown={(e) => ingredientKey(e, gi, li)}
                      placeholder={li === 0 && gi === 0 ? "1/3 c sweet chili sauce" : ""}
                      aria-label={`Ingredient ${li + 1}${g.name ? ` in ${g.name}` : ""}`}
                      autoComplete="off"
                      className={LINE}
                    />
                  ))}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              update({ groups: [...draft.groups, { name: "", lines: [] }] });
              focusLine(formRef.current, `ing-${draft.groups.length}-0`);
            }}
            className="font-hand text-lg text-ink/80 underline decoration-rule underline-offset-4"
          >
            + add a section
          </button>
        </section>

        {/* Directions */}
        <section className="relative mt-8" aria-labelledby="ed-directions">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-6">
              <h2 id="ed-directions" className="label-caps">
                Directions
              </h2>
              <WhiskAndSpoon className="hidden h-16 w-20 -translate-y-1 md:block" />
            </div>
            <PlateSetting className="hidden h-12 w-24 md:block" />
          </div>
          <p className="mt-1 font-sans text-[13px] text-label">
            Start a line with “-” (or tap ▷) for a sub-step. Tab and Shift+Tab work on a keyboard.
          </p>
          <ol className="mt-1">
            {directionRows.map((line, li) => (
              <li key={li} className={`flex items-center ${line.kind === "sub" ? "pl-8 md:pl-14" : ""}`}>
                <button
                  type="button"
                  onClick={() => li < draft.directions.length && toggleKind(li)}
                  aria-label={line.kind === "step" ? "Make this a sub-step" : "Make this a step"}
                  className="w-7 shrink-0 text-left font-hand text-lg text-ink/70"
                >
                  {line.kind === "step" ? "▷" : "–"}
                </button>
                <input
                  data-line={`dir-${li}`}
                  value={line.text}
                  onChange={(e) => setDirection(li, e.target.value)}
                  onKeyDown={(e) => directionKey(e, li)}
                  placeholder={li === 0 ? "marinate chicken at least 30 min" : ""}
                  aria-label={`${line.kind === "step" ? "Step" : "Sub-step"} ${li + 1}`}
                  autoComplete="off"
                  className={LINE}
                />
              </li>
            ))}
          </ol>
        </section>

        {/* Notes and details */}
        <section className="mt-8" aria-labelledby="ed-notes">
          <h2 id="ed-notes" className="label-caps">
            Notes
          </h2>
          <textarea
            value={draft.notes}
            onChange={(e) => update({ notes: e.target.value })}
            rows={3}
            aria-label="Notes"
            className="paper-lines block w-full resize-y bg-transparent font-hand text-xl text-ink outline-none [--line:3rem]"
          />
        </section>

        <details className="mt-6 font-sans" open={Boolean(draft.author || draft.sourceName || draft.description)}>
          <summary className="cursor-pointer text-[14px] font-semibold text-label">More details: by, from, description</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(
              [
                ["author", "By (author)"],
                ["sourceName", "From (cookbook or website)"],
                ["sourceUrl", "Link to the original"],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="block text-[13px] text-label">
                {label}
                <input
                  value={draft[field]}
                  onChange={(e) => update({ [field]: e.target.value } as Partial<Draft>)}
                  inputMode={field === "sourceUrl" ? "url" : undefined}
                  className={LINE}
                />
              </label>
            ))}
            <label className="block text-[13px] text-label md:col-span-2">
              Description
              <textarea
                value={draft.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={2}
                className="paper-lines block w-full resize-y bg-transparent font-hand text-xl text-ink outline-none [--line:3rem]"
              />
            </label>
          </div>
        </details>

        {error && (
          <p role="alert" className="mt-6 rounded-2xl bg-field px-4 py-3 font-sans text-[15px] text-cover">
            {error}
          </p>
        )}

        <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] font-sans backdrop-blur lg:left-60">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            {recipe && (
              <button type="button" onClick={remove} disabled={saving} className="px-2 text-[15px] text-cover disabled:opacity-50">
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => router.back()}
              className="h-[52px] flex-1 rounded-full border border-fg/30 text-[16px] font-semibold text-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !unlocked}
              className="h-[52px] flex-1 rounded-full bg-accent text-[16px] font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
