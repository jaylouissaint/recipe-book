# Recipe Site — End-to-End Build Plan

## Context
You want a personal recipe website with two ways to add recipes: typing them in, or writing them by hand on an iPad. It should also work well for reading recipes on the iPad. The look follows your spiral recipe book (photo: "Sweet chili chicken with coconut lime drizzle"), so it feels like an extension of the physical book.

**Decisions so far**
- **No native app.** Everything is a website; on the iPad you add it to the Home Screen so it opens full screen like an app.
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
- **Supabase:** Postgres, Storage for uploaded PDFs and photos (login queued, see Docket)
- **pdf.js** (`pdfjs-dist`) to show uploaded PDF pages in the browser
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
Row Level Security means each person sees only their own recipes, with an optional `shared` flag for family.

---

## 4. Adding recipes

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
- `/` the "cover": raspberry header, colored category tabs on the right edge, grid of page-style recipe cards
- `/recipe/[id]` the book page; in landscape on the iPad, ingredients on the left and directions on the right
- **"View original card"** toggle shows the uploaded PDF or photo
- **Cook mode:** large text, tap to check off steps, screen stays awake (Wake Lock API, supported in iPadOS Safari)
- **Serving scaler** (4 → 8 doubles the quantities, using the parsed amounts)
- Search by title, ingredient or tag (Postgres full-text search); print stylesheet for a printed card
- **Add to Home Screen** for an app-like icon; a service worker caches recently viewed recipes so they still open with patchy kitchen Wi-Fi

---

## Progress (project: /Users/louis/Desktop/Misc/recipe_book — user commits/pushes)
**Done (milestone 2, part 1)**
- Next.js 15 + Tailwind 4 starter project created
- `src/app/globals.css`: palette tokens (light and dark), `.label-caps`, `.ruled`, print rules
- `src/app/layout.tsx`: Patrick Hand / Montserrat / Zilla Slab fonts, title, theme color
- `src/lib/types.ts`: Recipe, IngredientGroup, Ingredient, StepGroup
- `src/lib/book.ts`: tag list (from the photo) and categories with tab colors
- `src/lib/recipes.ts`: sweet chili chicken hard-coded; `listRecipes()` and `getRecipe()` (to be switched to Supabase later)

**Done (milestone 2, part 2, 2026-10-20; not committed)**
- `src/components/`: `Spiral` (SVG ring pattern down the left edge), `SideTabs` (vertical colored tabs on the right; a horizontal strip on phones), `StatBox`, `TagRow` (circle checkboxes with a hand-drawn ✗), `Stickers` (SVG rolling pin, whisk + spoon, plate), `RecipePage` (title row with "recipe:" and a teal asterisk for favorites; ingredient groups split into two balanced columns padded to equal ruled lines; directions with ▷ steps and "–" sub-steps)
- `src/app/page.tsx`: raspberry "cover" header with a thin white inner border, category strip, grid of page-style recipe cards
- `src/app/recipe/[id]/page.tsx` (with `generateStaticParams`) and `src/app/category/[slug]/page.tsx`
- Check with `npm run build` + `npm run lint`, then `npm run dev` and compare against the photo (lint and build pass; compared in headless Chrome; owner check pending)
- Also added `Cover` and `RecipeCard` components and the `.paper-lines` ruled-paper class
- Spec docs drafted in `Specification Documentation/` (Functional + Technical, matching the financial planner)

## Docket (queued, not scheduled)
- **Login page / sign-in** (deferred 2026-10-20): Supabase Auth, `owner_id` on recipes, owner-only RLS, optional `shared` flag for family. Until it exists, add/edit/upload pages must not be publicly reachable on a deployed site (Vercel deployment protection, or run them only locally)
- Custom handwriting font; shopping list

## 6. Build order
1. **Skeleton:** Next.js + Tailwind + Supabase, tables and RLS (anon read-only; writes only from server code), deploy to Vercel. Login left out for now (see Docket)
2. **Design system:** tokens, fonts, ruled paper, stat box, tag row, side tabs, stickers. Build the sweet chili chicken page hard-coded to match the photo
3. **Recipe pages:** view, home grid, categories, search
4. **"Write it" page:** line-per-field form, ingredient parser, groups, steps and sub-steps, autosave; test with Scribble on the iPad
5. **Upload + split-screen transcribe:** PDF/image upload, pdf.js viewer, original-card toggle
6. **Paste-text parser** (plus PDF text-layer prefill)
7. **iPad polish:** PWA manifest and offline cache, cook mode, scaler, dark mode, print

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

**Using it on the site:** convert the font to `.woff2`, put it in `web/public/fonts/`, and load it with `@font-face` (`font-display: swap`), falling back to Patrick Hand. It replaces the handwriting font everywhere, including the "write it" fields, at no cost to how well Scribble works.

**When:** use Patrick Hand while building (milestone 2) and switch to your own font whenever it's ready. Swapping it in is a one-line change.
