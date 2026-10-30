"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { copyWebPhoto, deleteRecipe, saveRecipe } from "@/app/actions";
import { CATEGORIES, TAGS } from "@/lib/book";
import {
  type DirectionLine,
  ingredientLine,
  linesToStepGroups,
  parseIngredientLine,
  readDirectionLine,
  stepGroupsToLines,
} from "@/lib/parse";
import { parseRecipeText } from "@/lib/pasteText";
import type { WebRecipe } from "@/lib/schemaRecipe";
import { publicFileUrl } from "@/lib/storage";
import type { Recipe } from "@/lib/types";
import { uploadFile, uploadPhoto } from "@/lib/uploadPhoto";
import { useUnlocked } from "./EditOnly";
import { CameraIcon } from "./Icons";
import PencilPage, { type Stroke, loadImage, pageImage } from "./PencilPage";
import Spiral from "./Spiral";
import { PlateSetting, RollingPin, WhiskAndSpoon } from "./Stickers";

// The writing page (docs/DESIGN.md): the book page from the sweet chili chicken photo as a form.
// Every ruled line is its own text field, so Scribble on an iPad fills one line at a time.
// "Write on the page" instead takes Apple Pencil writing anywhere on a ruled page, kept as the
// recipe's handwritten page (a picture; it isn't read into text).
// A new recipe can start from a web import or a photo (`start`); either one is reviewed here.

export type EditorStart = { kind: "web"; url: string; recipe: WebRecipe } | { kind: "photo"; file: File };

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
  remotePhoto: string; // a web import's photo, copied into the photos bucket on save
  handwritingPath: string; // the saved handwritten page
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
    remotePhoto: "",
    handwritingPath: r?.handwritingPath ?? "",
  };
}

function fromStart(start: EditorStart | undefined, recipe: Recipe | null): Draft {
  if (start?.kind !== "web") return fromRecipe(recipe);
  const w = start.recipe;
  return {
    ...fromRecipe(null),
    title: w.title,
    servings: w.servings?.toString() ?? "",
    prepMin: w.prepMin?.toString() ?? "",
    cookMin: w.cookMin?.toString() ?? "",
    category: w.category,
    tags: w.tags,
    groups: w.ingredientGroups.length
      ? w.ingredientGroups.map((g) => ({ name: g.name, lines: g.items.map(ingredientLine) }))
      : [{ name: "", lines: [] }],
    directions: stepGroupsToLines(w.stepGroups),
    author: w.author,
    sourceName: w.sourceName,
    sourceUrl: start.url,
    description: w.description,
    remotePhoto: w.imageUrl,
  };
}

function draftKeyFor(recipe: Recipe | null, start: EditorStart | undefined) {
  if (recipe) return `rb-draft:${recipe.id}`;
  if (start?.kind === "web") return `rb-draft:web:${start.url}`;
  if (start?.kind === "photo") return `rb-draft:photo:${start.file.name}:${start.file.size}`;
  return "rb-draft:new";
}

const hasContent = (d: Draft) => d.groups.some((g) => g.lines.some((l) => l.trim())) || d.directions.some((l) => l.text.trim());

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

// Focus a line by its data-line id. Right away when it's there, because iPad Safari only keeps the
// keyboard up for focus moved during the key press; otherwise once React has rendered it.
function focusLine(form: HTMLFormElement | null, id: string) {
  const find = () => form?.querySelector<HTMLInputElement>(`[data-line="${id}"]`);
  const line = find();
  if (line) line.focus();
  else requestAnimationFrame(() => find()?.focus());
}

export default function RecipeEditor({ recipe, start }: { recipe: Recipe | null; start?: EditorStart }) {
  const router = useRouter();
  const unlocked = useUnlocked();
  const formRef = useRef<HTMLFormElement>(null);
  const [id] = useState(() => recipe?.id ?? newId());
  const draftKey = draftKeyFor(recipe, start);
  const [draft, setDraft] = useState<Draft>(() => fromStart(start, recipe));
  const [restored, setRestored] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const originalPath = useRef(""); // the photo's original, once uploaded (not again on a retry)
  // Pencil writing not saved yet, kept beside the draft. A recipe written only on the page opens on the page.
  const [ink, setInk] = useState<Stroke[]>([]);
  const [mode, setMode] = useState<"lines" | "page">(() =>
    recipe?.handwritingPath && !recipe.ingredientGroups.length && !recipe.stepGroups.length ? "page" : "lines",
  );
  const inkKey = `${draftKey}:ink`;

  // Restore an unsaved draft once, then keep the draft after every change (FR-WRITE-006).
  // Only a draft that differs from the saved recipe is kept.
  const [original] = useState(() => JSON.stringify(fromStart(start, recipe)));
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved && saved !== original) {
        setDraft({ ...fromStart(start, recipe), ...JSON.parse(saved) });
        setRestored(true);
      }
      const savedInk = localStorage.getItem(inkKey);
      if (savedInk) {
        setInk(JSON.parse(savedInk));
        setMode("page");
        setRestored(true);
      }
    } catch {
      // storage unavailable or an unreadable draft: start from the recipe
    }
  }, [draftKey, inkKey, original, recipe, start]);
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      try {
        if (ink.length) localStorage.setItem(inkKey, JSON.stringify(ink));
        else localStorage.removeItem(inkKey);
      } catch {
        // storage unavailable or full: the writing stays on the page until it's saved
      }
    }, 500);
    return () => clearTimeout(t);
  }, [ink, inkKey]);
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
      localStorage.removeItem(inkKey);
    } catch {}
    setInk([]);
    setDraft(fromStart(start, recipe));
    setRestored(false);
  }

  // ---- pasted text (Live Text from the photo, or copied from anywhere)
  function fillFromText(text: string): string {
    const p = parseRecipeText(text);
    const found = p.ingredientGroups.length + p.stepGroups.length;
    if (!found && !p.title) return "No recipe found in that text.";
    if (hasContent(draft) && !confirm("Replace the ingredients and directions on the page with the pasted text?")) return "";
    setDraft((d) => ({
      ...d,
      title: p.title || d.title,
      servings: p.servings?.toString() ?? d.servings,
      prepMin: p.prepMin?.toString() ?? d.prepMin,
      cookMin: p.cookMin?.toString() ?? d.cookMin,
      groups: p.ingredientGroups.length
        ? p.ingredientGroups.map((g) => ({ name: g.name, lines: g.items.map(ingredientLine) }))
        : d.groups,
      directions: p.stepGroups.length ? stepGroupsToLines(p.stepGroups) : d.directions,
      notes: [d.notes, p.notes].filter(Boolean).join("\n"),
    }));
    const items = p.ingredientGroups.reduce((n, g) => n + g.items.length, 0);
    return `Filled in ${items} ingredient${items === 1 ? "" : "s"} and ${p.stepGroups.length} step${p.stepGroups.length === 1 ? "" : "s"}. Check each line against the original.`;
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
  // ---- save / delete
  function save() {
    setError("");
    startSaving(async () => {
      try {
        if (!draft.title.trim()) throw new Error("Give the recipe a title");
        const servings = readNumber("Servings", draft.servings);
        const prepMin = readNumber("Prep time", draft.prepMin);
        const cookMin = readNumber("Cook time", draft.cookMin);
        let photoPath = photo ? await uploadPhoto(id, photo.file) : draft.photoPath;
        if (!photoPath && draft.remotePhoto) {
          const copied = await copyWebPhoto(id, draft.remotePhoto);
          if (!copied.ok) throw new Error(copied.error);
          photoPath = copied.path;
        }
        if (photoPath !== draft.photoPath) {
          // uploaded: don't upload it again if the save below fails and is tried again
          setPhoto(null);
          update({ photoPath, remotePhoto: "" });
        }
        // The Pencil page, drawn over the saved one when editing.
        let handwritingPath = draft.handwritingPath;
        if (ink.length) {
          const under = handwritingPath ? await loadImage(publicFileUrl("handwriting", handwritingPath)) : null;
          const png = await pageImage(ink, under);
          handwritingPath = await uploadFile("handwriting", id, new File([png], "page.png", { type: "image/png" }));
          // uploaded: the writing is in the saved page now, so not again if the save below fails
          setInk([]);
          update({ handwritingPath });
          try {
            localStorage.removeItem(inkKey);
          } catch {}
        }
        if (start?.kind === "photo" && !originalPath.current) {
          originalPath.current = await uploadFile("originals", id, start.file);
        }
        const result = await saveRecipe({
          id,
          title: draft.title.trim(),
          servings: servings === 0 ? null : servings,
          prepMin,
          cookMin,
          category: draft.category,
          tags: draft.tags,
          notes: draft.notes.trim(),
          source:
            handwritingPath && handwritingPath !== recipe?.handwritingPath
              ? "pencil"
              : (recipe?.source ?? (start?.kind === "photo" ? "upload" : "typed")),
          originalFilePath: originalPath.current || recipe?.originalFilePath,
          handwritingPath: handwritingPath || undefined,
          author: draft.author,
          sourceName: draft.sourceName,
          sourceUrl: draft.sourceUrl,
          description: draft.description.trim(),
          photoPath: photoPath || null,
          // Imports show "Check this import" until they're edited and saved again.
          imported: Boolean(start),
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
          localStorage.removeItem(inkKey);
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

  const photoUrl = photo?.preview ?? (draft.photoPath ? publicFileUrl("photos", draft.photoPath) : draft.remotePhoto || null);
  const directionRows: DirectionLine[] = [...draft.directions, { kind: "step", text: "" }];

  const page = (
    <div className={start?.kind === "photo" ? "min-w-0" : "mx-auto max-w-4xl overflow-x-clip px-3 pt-4 pb-32 md:px-10"}>
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
      {start?.kind === "web" && <WebNote start={start} onFill={fillFromText} />}
      {!recipe && !start && (
        <details className="mb-4 rounded-2xl bg-field px-4 py-3 font-sans">
          <summary className="cursor-pointer text-[15px] font-semibold text-accent">Paste a recipe&apos;s text</summary>
          <PasteText onFill={fillFromText} />
        </details>
      )}

      <div className="mb-4 flex w-fit rounded-full bg-field p-1 font-sans" role="radiogroup" aria-label="How to write">
        {(
          [
            ["lines", "Write on the lines"],
            ["page", "Write on the page"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-2 text-[14px] font-semibold ${mode === m ? "bg-surface text-fg shadow-card" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="relative rounded-sm bg-paper px-4 py-6 text-ink shadow-[0_2px_12px_rgba(0,0,0,0.12)] md:pr-12 md:pl-14 md:py-8"
      >
        <Spiral className="top-6 bottom-6 -left-5 hidden md:block" />

        {/* Category: the book's colored side tabs */}
        <fieldset className="mb-4 min-w-0 md:absolute md:top-24 md:-right-9 md:mb-0">
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

        {/* Photo: top right of the page */}
        <div className="mb-3 flex items-center justify-end gap-3">
          {photoUrl && (
            <button
              type="button"
              onClick={() => {
                setPhoto(null);
                update({ photoPath: "", remotePhoto: "" });
              }}
              className="font-sans text-[14px] text-muted underline underline-offset-4"
            >
              Remove
            </button>
          )}
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local previews and Supabase URLs, shown as is
            <img src={photoUrl} alt="" referrerPolicy="no-referrer" className="size-14 rounded-2xl object-cover shadow-card" />
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface px-4 py-2 font-sans text-[14px] font-semibold text-accent shadow-card has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
            <CameraIcon className="size-5" />
            {photoUrl ? "Change photo" : "Add a photo"}
            <input type="file" accept="image/*" onChange={choosePhoto} className="sr-only" />
          </label>
        </div>

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

        {mode === "page" ? (
          <section className="mt-6" aria-label="Handwritten page">
            <p className="mb-3 font-sans text-[14px] text-muted">
              Write the ingredients and steps anywhere with the Apple Pencil; fingers scroll. The page is saved as the
              recipe&apos;s handwritten page. Groceries, Start Cooking and search use the lines, so add them on the
              lines if you want those.
            </p>
            <PencilPage
              strokes={ink}
              onChange={setInk}
              background={draft.handwritingPath ? publicFileUrl("handwriting", draft.handwritingPath) : ""}
              onClearBackground={() => update({ handwritingPath: "" })}
            />
          </section>
        ) : (
          <>
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
          </>
        )}

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

  if (start?.kind !== "photo") return page;
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-3 pt-4 pb-32 md:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
      <OriginalPanel file={start.file} onFill={fillFromText} />
      {page}
    </div>
  );
}

// "Paste text": a recipe's text in, the page filled in by the paste rules (src/lib/pasteText.ts).
function PasteText({ onFill, hint }: { onFill: (text: string) => string; hint?: string }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  return (
    <div className="mt-3 font-sans">
      {hint && <p className="mb-2 text-[14px] text-muted">{hint}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        aria-label="Recipe text"
        placeholder={"recipe title\n\nIngredients\n2 lbs chicken thighs\n…\n\nDirections\n▷ marinate chicken\n- at least 30 min"}
        className="block w-full rounded-2xl border border-divider bg-surface px-4 py-3 text-[15px] outline-none focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => setStatus(onFill(text))}
          className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-semibold text-white disabled:opacity-50"
        >
          Fill in the page
        </button>
        {status && (
          <p role="status" className="text-[14px] text-muted">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}

function WebNote({ start, onFill }: { start: Extract<EditorStart, { kind: "web" }>; onFill: (text: string) => string }) {
  const site = start.recipe.sourceName || start.url;
  if (start.recipe.found) {
    return (
      <p role="status" className="mb-4 rounded-2xl bg-field px-4 py-3 font-sans text-[15px]">
        Read from {site}. Check each line against{" "}
        <a href={start.url} target="_blank" rel="noreferrer" className="font-semibold text-accent underline underline-offset-4">
          the original
        </a>{" "}
        before saving.
      </p>
    );
  }
  return (
    <div className="mb-4 rounded-2xl bg-field px-4 py-3 font-sans text-[15px]">
      <p>
        {start.recipe.title
          ? `${site} doesn't publish its recipe in a form the site can read, so only the title and photo are filled in.`
          : `${site} couldn't be read.`}{" "}
        Copy the recipe from{" "}
        <a href={start.url} target="_blank" rel="noreferrer" className="font-semibold text-accent underline underline-offset-4">
          the page
        </a>{" "}
        and paste it here, or write it in.
      </p>
      <PasteText onFill={onFill} />
    </div>
  );
}

// The photo or PDF beside the writing page, with the Paste text box under it.
function OriginalPanel({ file, onFill }: { file: File; onFill: (text: string) => string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  return (
    <aside className="font-sans lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto">
      <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
        {url &&
          (pdf ? (
            <iframe src={url} title="The original" className="h-[40vh] w-full lg:h-[60dvh]" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a local file, shown as is
            <img src={url} alt="The original recipe" className="max-h-[40vh] w-full object-contain lg:max-h-[60dvh]" />
          ))}
      </div>
      <p className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
        <span className="truncate">{file.name}, saved with the recipe as the original</span>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-accent underline underline-offset-4">
            Open full size
          </a>
        )}
      </p>
      <section aria-labelledby="paste-heading" className="mt-4 rounded-2xl bg-field px-4 py-3">
        <h2 id="paste-heading" className="text-[15px] font-semibold">
          Paste text
        </h2>
        <PasteText
          onFill={onFill}
          hint={
            pdf
              ? "Select the recipe's text in the PDF, copy it, and paste it here."
              : "On an iPad or iPhone: touch and hold the text in the photo, tap Select All, then Copy, and paste it here. Or write it in yourself."
          }
        />
      </section>
    </aside>
  );
}
