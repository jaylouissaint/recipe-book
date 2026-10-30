# Recipe Site — End-to-End Build Plan

> **Status 2026-10-27:** the website is live at https://ramiyas-recipes.vercel.app, reading from Supabase. A native iPad app was planned, prototyped and dropped (2026-10-29); on the iPad the website is used from the Home Screen. **The look and screens are being redesigned after the Deglaze app: see `docs/DESIGN.md`, which wins over sections 1, 4 and 5 below.** The book-page design in section 1 now applies to the writing page. Current state and next steps: `docs/HANDOFF.md`.

## Context
You want a personal recipe website with two ways to add recipes: typing them in, or writing them by hand on an iPad. It should also work well for reading recipes on the iPad. The look follows your spiral recipe book (photo: "Sweet chili chicken with coconut lime drizzle"), so it feels like an extension of the physical book.

**Decisions so far**
- **Website only** (2026-10-29). A native iPad app (SideStore, planned 2026-10-24) was prototyped and dropped; the website, added to the iPad Home Screen, has Scribble and Apple Pencil page mode.
- **No AI service.** Handwriting becomes text using what the iPad already does on the device: **Scribble** (write with the Apple Pencil into any text box) and **Live Text** (select text in a photo or PDF). The site never sends your pages to an outside service.
- **PDF and photo upload** of handwritten pages (e.g. from GoodNotes, Notability, Apple Notes, or a scan of the spiral book). The upload is kept as the "original card".

---

## 1. Design language (taken from the photo)

| In the book | On the site |
|---|---|
| Cream paper with thin gray ruled lines | Recipe page background `#FBF8F2` with faint ruled lines (CSS `repeating-linear-gradient`) under ingredients and directions |
| Plum handwritten ink | All recipe *content* in a handwriting font, color `#7B3F61` |
| Small, letter-spaced gray caps ("INGREDIENTS", "DIRECTIONS") | Section labels in Montserrat 600, 11–12px, `letter-spacing: .12em`, `#8C8C8C` |
| "recipe:" in a soft gray serif before the title | Title row: muted serif "recipe:" + title in handwriting |
| Servings / Prep / Cook box with mauve header strip | Three-cell stat box, header `#9A8597` with white small caps, values in handwriting |
| Row of checkbox tags (Quick & Easy, Family Favorite ☒…) | The same checkbox row; checked tags get a hand-drawn ✗. Also used as filters when browsing |
| Two-column ingredients with sub-headings ("marinade", "coconut lime drizzle") | Ingredients in named **groups**, two columns on wide screens |
| ▷ step bullets with indented "–" sub-steps | Directions as step groups with sub-steps |
| Colored side tabs ("DESSERTS" dusty pink, "MORE RECIPES" slate blue) | Category navigation as vertical tabs on the right edge; a horizontal strip on phones |
| Stickers (rolling pin, whisk, spoon, plate) | A few SVG "stickers" placed in empty space |
| Raspberry cover, teal asterisk | Header color `#A3174B`; teal `#1E5E5E` for favorites and links |
| Spiral binding | Decorative ring strip on the left edge of the recipe page (wide screens) |

**Palette tokens**
```
--paper #FBF8F2   --rule #DDD8DC   --ink #7B3F61   --label #8C8C8C
--mauve #9A8597   --cover #A3174B  --teal #1E5E5E
--tab-pink #E6B8AE --tab-blue #9FB4BF --sticker-orange #EE9A78 --mustard #DDAA3A
```
Dark mode: paper `#2A2527`, ink `#E3B6CC`, lines `#3A3336`.

**Fonts (Google Fonts):** content in *Gochi Hand* or *Patrick Hand*; labels and navigation in *Montserrat*; "recipe:" in *Zilla Slab* Light.

---

## 2. Stack
- **Next.js** (App Router, TypeScript) + **Tailwind**, deployed on **Vercel**
- **Supabase:** Postgres, Storage for uploaded files, and the `save-recipe` Edge Function, the only way to save (it needs the write key; login queued, see Docket)
- **pdf.js** (`pdfjs-dist`) to show original cards that are PDFs in the browser
- **Web app manifest** (PWA) so "Add to Home Screen" on the iPad opens it full screen with its own icon
- No paid services; the free tiers cover a personal or family site

---

## 3. Data model (Postgres)
```
recipes            id, owner_id, title, servings, prep_min, cook_min,
                   category, tags text[], notes,
                   source ('typed'|'scribble'|'upload'), original_file_path,
                   created_at, updated_at
ingredient_groups  id, recipe_id, name ("marinade"), position
ingredients        id, group_id, quantity, unit, item, position
step_groups        id, recipe_id, title ("cook chicken"), position   -- the ▷ line
steps              id, group_id, text, position                      -- the "–" lines
```
The live schema is `supabase/migrations/000_initial_schema.sql`, which adds `slug` (web address), `handwriting_path`, `search`, `deleted_at` (soft delete) and uses uuid ids. Row Level Security lets everyone read and nobody write directly: saves go through `save_recipe()` / `delete_recipe()`, which only the Edge Function can call. Per-person privacy and a `shared` flag for family come with login (Docket).

---

## 4. Adding recipes

> **The website adds recipes** (decided 2026-10-27; see DESIGN.md: Save from the web, Add from photos, Enter your own). The rules below are the reference for the ingredient and paste parsers.

### A. The "write it" page (main way to add a recipe on the iPad)
The recipe form *is* the book page, designed so writing on it with the Apple Pencil feels like writing in the book, while Scribble turns it into text as you go.

**How it looks and behaves**
- A blank recipe page: "recipe:" title line, stat box, tag checkboxes, INGREDIENTS and DIRECTIONS sections on ruled lines
- **Each ruled line is its own text field** (`<input>`), at least 48px tall and the full width of the line. Scribble works best when you write directly over a field, so you just write on the line, the same as on paper
- Fields use the handwriting font and plum ink color, so recognized text looks like it belongs on the page
- When a line gets text, a new empty line appears below it, so there is always a next line to write on
- **Ingredient lines:** after you finish a line, "1/3 c sweet chili sauce" is split into quantity / unit / item by a simple rule-based parser (fractions, common units: c, cup, TB, tbsp, tsp, lb, oz, g, clove, pinch…). The line still shows as written; the split just powers scaling and the shopping list
- **Groups:** a "+ add a section" line (e.g. "marinade", "coconut lime drizzle")
- **Directions:** a line starting a new step shows ▷, and an "indent" button (or starting the line with "-") makes it a sub-step
- **Stat box:** number fields (`inputmode="numeric"`) for servings, prep and cook minutes; Scribble handles digits well
- **Tags:** tap the checkboxes; no writing needed
- **Draft autosave** to the browser after each line, so nothing is lost if Safari reloads

**Scribble tips shown on the page** (one-time hint card)
- Turn it on: Settings → Apple Pencil → Scribble
- Scratch out a word to delete it; circle words to select them; tap and hold between words to add a space
- Tap the field with a finger or the keyboard button to type instead

**Works without the iPad too:** on a laptop the same page is just a normal typing form, with Tab/Enter moving to the next line.

### B. Upload a PDF or photo ("transcribe" view)
For recipes written elsewhere: GoodNotes or Notability exports, Apple Notes, a scan of the spiral book, or a phone photo.

1. Upload a PDF (one or more pages) or an image. It is saved in Supabase Storage and kept as the recipe's **original card**
2. **Split screen:** the page on the left (pdf.js for PDFs; pinch to zoom, page arrows), and on the right the same "write it" page from A
3. You fill in the right side while looking at the left, by Scribble or typing. With the original right beside it, this takes a few minutes per recipe
4. On iPad, use **Slide Over / Split View** the same way with another app, or, quickest of all, use Live Text (C)

PDFs exported from GoodNotes or Notability can contain searchable text from the app's own handwriting recognition. If pdf.js finds that text layer, the site offers to prefill the page from it (see C for how the text is split up).

### C. "Paste a recipe" (fastest way to bring in existing pages, still no AI)
iPadOS **Live Text** can read handwriting in photos and PDFs on the device itself: open the photo or PDF in Photos, Files or Safari, press and hold the text, Select All → Copy.

The site has a **Paste text** box that splits pasted text into a recipe using simple rules:
- First line → title
- Lines after "ingredients" → ingredients; after "directions"/"instructions"/"method" → steps
- Lines that start with a quantity (`1/3`, `2`, `½`, `1 1/2`) → ingredients, split into quantity/unit/item
- Lines starting with ▷, `>`, a number or a bullet → new step; lines starting with `-` → sub-step under it
- Short lines without a quantity in the ingredient area ("marinade") → group name
- Anything unclear goes into Notes

The result opens in the "write it" page for review, with the original next to it if you uploaded one.

Note that Live Text and Scribble are on-device machine learning features built into iPadOS, but they are not an AI service and nothing leaves the iPad. Live Text reads neat print (like your book) well; messy cursive less so, which is when you fall back to A.

### D. Plain typing
The same "write it" page with the keyboard, on any device.

---

## 5. Viewing on the iPad (and everywhere)

> Superseded by DESIGN.md (Home shelf, Library, Recipe view, Start Cooking, Groceries). Kept for history.
- `/` the "cover": raspberry header, colored category tabs on the right edge, grid of page-style recipe cards
- `/recipe/[slug]` the book page; in landscape on the iPad, ingredients on the left and directions on the right
- **"View original card"** toggle shows the uploaded PDF or photo
- **Cook mode:** large text, tap to check off steps, screen stays awake (Wake Lock API, supported in iPadOS Safari)
- **Serving scaler** (4 → 8 doubles the quantities, using the parsed amounts)
- Search by title, ingredient or tag (Postgres full-text search); print stylesheet for a printed card
- **Add to Home Screen** for an app-like icon; a service worker caches recently viewed recipes so they still open with patchy kitchen Wi-Fi

---

## Progress (project: /Users/louis/Desktop/Misc/recipe_book — Louis commits and pushes)
- **Milestone 2 (design system + hard-coded page): done 2026-10-20.** Components in `src/components/`; cover, category and recipe pages.
- **Step 1 (skeleton): done 2026-10-27, without login.** Supabase schema (migration 000), `save-recipe` Edge Function with the write key, keep-awake workflow, website reading from Supabase and deployed to Vercel. All `scripts/check-setup.sh` checks pass against the live site.
- Next.js upgraded to 15.5.28 (React 19.1.10) on 2026-10-27; Vercel blocks deploys of versions affected by React2Shell (CVE-2025-55182 / CVE-2025-66478).
- Specs in `Specification Documentation/` are regenerated with `python3 scripts/specs/build_specs.py`.

## Docket (queued, not scheduled)
- **Custom book cover** (Louis will provide later): replace the plain raspberry cover page in the book view (`PageFace` cover in `src/components/book/BookView.tsx`) with an uploaded image or design.
- **Write key → your own passphrase** (queued 2026-10-28): rerun `npm run setup:supabase` and paste a passphrase of 4–5 random words instead of pressing Enter; then unlock each browser again. No code change. Bigger alternatives if ever wanted: a separate simple website password with the long key kept on the server (new code plus a rate limit), or login (below), which replaces the key.
- **Login** (deferred 2026-10-20): Supabase Auth, `owner_id` on recipes, owner-only RLS, optional `shared` flag for family. Replaces the write key.
- Custom handwriting font
- Upgrade to Next.js 16 (clears two low-risk `postcss` advisories bundled in Next 15)
- Instant website refresh after saves (today pages refresh within a minute)

## 6. Build order
1. ✅ **Skeleton:** Supabase, tables and RLS (anon read-only; writes only through the `save-recipe` Edge Function with the write key), deployed to Vercel. Login left out (see Docket). Done 2026-10-27
2. ✅ **Design system v1:** the book page matching the photo. Done 2026-10-20. It becomes the **writing page** in R2
3. ✅ **R1 – New look and navigation** (built 2026-10-28, not yet deployed) (DESIGN.md): light-only tokens, Instrument Serif / Figtree / Patrick Hand, sidebar and tab bar, Home book shelf, Library ("My Recipes") cards with search pill, Recipe view in handwriting on cream
4. ✅ **R2 – Editing on the website** (built 2026-10-28; needs migration 001 and a function redeploy before it works live): migration 001 (author, source, photo, description, times cooked, imported flag, grocery items), unlock with the write key (httpOnly cookie), server-side save through `save-recipe`, the **writing page** ("Enter your own" and Edit) with one field per ruled line, recipe photo upload
5. ✅ **R3 – Bringing recipes in** (built 2026-10-28): Save from the web (schema.org recipe data, no AI), Add from photos (upload, original beside the writing page, Paste text box with the paste parser); parser tests with shared fixtures
6. ✅ **R4 – In the kitchen** (built 2026-10-28; search was already done in R1, on the page, which is plenty for a family-sized book): Groceries (one list, optional group by recipe), Start Cooking, serving scaler, search and tag filters
7. **R5 – Polish:** Home Screen install, offline cache, print

---

## Verification
- Milestone 2: compare the hard-coded page with the photo (layout, colors, section order)
- Milestone 4, on a real iPad with an Apple Pencil in Safari: write the sweet chili chicken recipe line by line. Scribble fills each line, new lines appear, "1/3 c sweet chili sauce" splits correctly, and the draft survives a page reload
- Milestone 5: upload the shared photo and a GoodNotes PDF; both show next to the form and appear as the original card after saving
- Milestone 6: Live Text-copy the shared photo and paste it. You should get 2 ingredient groups (marinade with 7 items, drizzle with 6), 4 direction groups with their sub-steps, and the title. Also unit-test the parser with a few typed recipes
- Milestone 7: install to the Home Screen, open a recipe, turn on airplane mode, and check it still opens; check cook mode keeps the screen on
- RLS: the anon key can read but not insert, update or delete. (Once login is built: a second test account can't see the first account's recipes)

## Your own handwriting font (optional, about 1–2 hours)
Not hard, and it fits well here: the site would show recipes in the same handwriting as the book.

**How**
- **Calligraphr** (calligraphr.com, works in the browser): print its template, fill in each box with the same plum pen you use in the book, then scan or photograph it and upload. It produces a `.ttf`/`.otf` file. The free tier covers the basic character set (about 75 characters). The paid tier (about $8/mo, one month is enough) lets you draw **2–3 versions of each letter** that the font rotates between, which keeps it from looking machine-made.
- **iFontMaker** (iPad app, one-time purchase): draw each letter straight on the iPad with the Apple Pencil and export a `.ttf`. No printing or scanning.

**Characters to include:** a–z, A–Z, 0–9, `. , ( ) - / : ' &`, the fractions ½ ⅓ ¼ ¾, and ▷ (or keep ▷ as a CSS icon instead).

**Using it on the site:** convert the font to `.woff2`, put it in `public/fonts/`, and load it with `@font-face` (`font-display: swap`), falling back to Patrick Hand. It replaces the handwriting font everywhere, including the "write it" fields, at no cost to how well Scribble works.

**When:** use Patrick Hand while building (milestone 2) and switch to your own font whenever it's ready. Swapping it in is a one-line change.
