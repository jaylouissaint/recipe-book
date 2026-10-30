# Handoff: Recipe Book

Status as of 2026-10-28, for picking up the work in a new Claude Code session.

## What this is
A personal recipe book styled after Louis's handwritten spiral recipe book (reference photo: `docs/reference/recipe-book-page.jpg`). It is a **website**, used on the iPad from the Home Screen (Scribble and Apple Pencil page mode work in Safari). A native iPad app was prototyped and dropped (2026-10-29).
- **Design (look and screens, both): `docs/DESIGN.md`** (modeled on the Deglaze app, 2026-10-27). Website plan and build order: `docs/PLAN.md`.
- Specs: `Specification Documentation/Recipe_Book_Functional_Specification.docx` and `Recipe_Book_Technical_Specification.docx` (v1.1).

## Where things live
| What | Where |
|---|---|
| Live website | https://ramiyas-recipes.vercel.app (Vercel project `ramiyas-recipes`, deploys from `main`) |
| GitHub | https://github.com/jaylouissaint/recipe-book (public) |
| Supabase project | ref `trdlqlulpfwsfhqnfqfu` (https://trdlqlulpfwsfhqnfqfu.supabase.co) |
| Website env vars | `.env.local` (git-ignored) and Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read-only) |
| Write key | Supabase secret `WRITE_KEY` and Louis's password manager (also in `.env.local` as `WRITE_KEY`, which is git-ignored and not read by the website). Never in the repo or chat. **Never rename it to `NEXT_PUBLIC_WRITE_KEY`:** anything starting with `NEXT_PUBLIC_` is built into the page and visible to everyone |
| GitHub Actions secrets | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (for the keep-awake workflow) |

## How to use the website
**Settings → Unlock editing**
- Paste your write key once per browser. It's kept in a secure cookie that page scripts can't read, and only the website's server sends it on.
- Locked browsers see no + button and no Edit.

## Running a database migration
Migrations live in `supabase/migrations/` and are run by hand, once each, in order (000, 001, …).

**To run one**
1. Open the migration file in VS Code (for example `supabase/migrations/001_redesign_fields_and_groceries.sql`), then select all (Cmd+A) and copy (Cmd+C).
2. In Supabase, open the project → **SQL Editor** → **New query**.
3. Paste it and click **Run**. You should see "Success. No rows returned".

**After migration 002 (2026-10-29), also redeploy the save function:** `npm run deploy:functions`. Then Home's "This week" shows the days instead of "needs a one-time database update", and Table Editor lists **meal_plan**.

**After migration 003 (live updates):** nothing to redeploy. Supabase → **Database → Publications → supabase_realtime** lists recipes, grocery_items and meal_plan. Then a change on one device shows on another open one within a second or two.

**How to tell it worked (migration 001)**
- **Table Editor** (left sidebar) lists **grocery_items** under the existing tables.
- In the **recipes** table, scrolling right shows the new columns: author, source_name, source_url, photo_path, description, times_cooked, imported.
- **Storage** shows a third bucket, **photos**.
- Or ask Claude to check the live database; it can tell from the public key whether the new column and table exist.

Run each migration only once. A second run stops with an error like "column author already exists" and changes nothing, so it's harmless, but it means the migration was already done. To undo one, run its `_rollback.sql` file the same way (back up first).

**Migration history**
- 000_initial_schema: run 2026-10-24.
- 001_redesign_fields_and_groceries: run 2026-10-28 (save-recipe redeployed as version 2 the same day).
- 003_live_updates: written 2026-10-29, **not run yet** (adds three tables to Realtime).
- 002_meal_plan: run 2026-10-29, with save-recipe redeployed (gains `plan-add` and `plan-remove`). Checked: the table reads with the public key, and Home's week is in use.

## Decisions (don't reopen these)
- **Website only** (2026-10-29; a native iPad app was planned on 2026-10-24). The app was prototyped in the iPad Simulator (reading, writing with Scribble and PencilKit, the flip-through book) and dropped: the website on the iPad Home Screen, with Scribble and Pencil page mode, does what's needed. Its code is in git history: `git show bff8a2e:ios/` (the last commit with `ios/`).
- **Redesign after the Deglaze app** (2026-10-27, DESIGN.md): light only (white/cream, no dark mode), Deglaze green accent `#1F4D3D`, Home = book shelf, recipe view in the video's layout with titles and ingredients in handwriting on cream, writing page = the book page from the photo, Groceries = one simple list.
- **The website adds recipes too** (2026-10-27; it was going to be read-only): Save from the web, Add from photos, Enter your own, and Apple Pencil page mode.
- **No login for now** (deferred 2026-10-20; on the docket). Everyone can read; only the owner's devices save, by sending the write key (`x-write-key`) to the `save-recipe` Edge Function. On the website the key is entered once per device and kept in an httpOnly cookie; writes go through the website's server. Login will replace the write key.
- **Less AI:** web import reads published schema.org recipe data; text from photos comes from the iPad's Live Text (copied and pasted); simple rules sort text; always reviewed before saving.
- **No AI transcription service.** Handwriting becomes text only on the iPad (Scribble, Live Text) or by typing; Pencil page mode keeps the writing as a picture.
- Website stack: Next.js 15.5.28 (App Router, TypeScript), React 19.1.10, Tailwind 4, Supabase, Vercel.
- Supabase GitHub integration: not connected, on purpose. Migrations are run by hand in the SQL Editor, each with a rollback script.
- Fonts: Patrick Hand (content), Montserrat (labels), Zilla Slab (the "recipe:" label). A custom handwriting font may replace Patrick Hand later.
- TypeScript stays (Louis asked about JS on 2026-10-20 and chose to keep TS).

## Working preferences
- Once a plan is approved, make edits without checking in on each one.
- Stay inside the project folder.
- **Never commit or push.** Louis does that.
- **Safari on iPad first** (Louis, 2026-10-29): design and check for iPad Safari before Chrome. Checks run in **WebKit** with Playwright (`webkit` with the "iPad Pro 11" and "iPad Pro 11 landscape" profiles) against a production build of a copy of the project (scratchpad `buildcopy`, port 3123), plus headless Chrome where WebKit can't (service workers). Real Pencil, Scribble and keyboard behavior still need Louis's check.
- **Never run `next build` in the project while Louis's `npm run dev` is up**: build the copy instead.
- Give commands without `<placeholder>` brackets: zsh treats `<` and `>` as redirection, which has broken pasted commands several times. Use real values, or `paste-here` style words.

## Done
- **Milestone 2 (2026-10-20):** design tokens and fonts; components `Spiral`, `SideTabs`, `StatBox`, `TagRow`, `Stickers`, `RecipePage`, `Cover`, `RecipeCard`; cover, category and recipe pages matching the photo.
- **Step 1, shared backend (2026-10-27):**
  - `supabase/migrations/000_initial_schema.sql` (+ rollback), run by Louis 2026-10-24. Tested beforehand in PGlite, including permissions and the rollback.
  - `supabase/functions/save-recipe` deployed (actions: save, delete, upload-url) with `verify_jwt = false`.
  - The website reads from Supabase (`src/lib/supabase.ts`, `src/lib/recipes.ts`); recipe pages live at `/recipe/[slug]`; pages refresh every 60 seconds.
  - `.github/workflows/keep-supabase-awake.yml` runs Mondays and Thursdays (first run green).
  - `scripts/setup-supabase.sh` (`npm run setup:supabase`) and `scripts/check-setup.sh` (`npm run check:setup <site url>`): all checks pass against the live site.
- **Security (2026-10-27):** Next 15.5.4 → 15.5.28 and React → 19.1.10, because Vercel blocked the first deploy over React2Shell (CVE-2025-55182). Two `postcss` advisories bundled in Next remain; they're build-time only and need Next 16 to fix (docket).

- **Website R1 (2026-10-28, deployed):** light-only tokens, Instrument Serif / Figtree fonts, `AppNav` (sidebar at `lg`, bottom tab bar below; hidden on recipe pages on phones), Home shelf (`/`), Library (`/library`, client-side search + category/tag filters), recipe view (`/recipe/[slug]`), the book page moved to `/recipe/[slug]/book`, placeholder Groceries and Settings pages. `Cover`/`RecipeCard` removed. Recipes have no photos yet, so `Thumb` shows a ruled placeholder with the initial. Add to Groceries / Start Cooking are disabled until R4.

- **Website R2 (2026-10-28, deployed with migration 001):**
  - `supabase/migrations/001_redesign_fields_and_groceries.sql` (+ rollback), tested in PGlite: author, source_name, source_url, photo_path, description, times_cooked, imported; `grocery_items`; `record_cooked`, `add_groceries`, `set_grocery_checked`, `clear_groceries` (service role only); `photos` bucket. **Louis must run it in the SQL Editor**, then `npm run deploy:functions`.
  - `save-recipe` gained actions `check`, `cooked`, `groceries-add`, `grocery-check`, `groceries-clear` and the `photos` bucket.
  - Website write path: `src/lib/write.ts` (httpOnly `rb_write_key` cookie + readable `rb_unlocked` flag), server actions in `src/app/actions.ts`, `EditOnly`/`useUnlocked`, Settings → Unlock editing.
  - Writing page `RecipeEditor` at `/new` and `/recipe/[slug]/edit`: one field per ruled line, section names, ▷ / – directions (leading "-" or tap the marker; Tab/Shift+Tab), editable stat box, tag circles, category tabs, photo upload (signed URL, supabase-js loaded on demand), drafts in localStorage, Delete.
  - Parser `src/lib/parse.ts` with `npm test` (node:test) against `shared/fixtures/ingredient-lines.json`.
  - Recipe view shows photo, by/from, description, "Check this import"; Library cards show author and times cooked; green + and Add sheet.
  - Cover photo: set when writing a recipe (Add a photo), or later straight from the recipe view (`CoverPhoto`: "Add a cover photo" / "Change cover" on unlocked devices; uploads, then re-saves the recipe with `photoPath`, keeping the "Check this import" flag). Shared upload code in `src/lib/uploadPhoto.ts`.
  - Not yet tested against the live database (saving, photo upload): do that after the migration and redeploy.
  - `src/lib/recipes.ts` selects `*`, so the site works before and after migration 001.

- **Book view (2026-10-28, deployed):** `/book` with the List | Book `ViewToggle` (on the Library since 2026-10-29); `src/components/book/BookView.tsx` (measures every block in a hidden copy styled like a page, packs fixed-size pages with `pack()` in `src/lib/bookLayout.ts`, single page or two-page spread, WAAPI page-turn, swipe/arrows/buttons, category tabs, contents, `#slug` deep links) and `BookBlocks.tsx` (em/`--line` sized blocks). Long single ingredient groups now split across both columns. The spiral is a repeating background, so the rings always reach the bottom (writing page too). Removed: `/recipe/[slug]/book`, `RecipePage`, `StatBox`, `TagRow`, `SideTabs`. Tests: `src/lib/bookLayout.test.mts`. Checked in headless Chrome at desktop, iPad portrait and phone with test recipes (a long stew and a short cake, added only in a build copy): no clipped blocks on any page.

- **R3, bringing recipes in (2026-10-28, deployed):**
  - **Save from the web** (`/new/web`, also `/new/web?url=…`): server action `importFromWeb` in `src/app/actions.ts` checks the write key (unlocked devices only), fetches the page with `src/lib/safeFetch.ts` and reads its schema.org JSON-LD with `recipeFromHtml` in `src/lib/schemaRecipe.ts` (`@graph`, HowToSection/HowToStep, ISO times, entities, yield, category and tag guesses), falling back to og: meta tags. The result opens in the writing page. The site's photo is copied into the photos bucket only on Save (`copyWebPhoto`).
  - **Address guard:** `safeFetch` allows only http/https on ports 80/443, resolves the host and refuses private, loopback, link-local and metadata addresses at every redirect (max 5), with a 12 s timeout and size caps (5 MB pages, 10 MB photos). It identifies itself honestly as RamiyasRecipes (no browser disguise). Sites that refuse it (Allrecipes and Simply Recipes answered 403 in testing; BBC Good Food worked) get "paste it in instead": the writing page opens with the link and the Paste text box.
  - **Add from photos** (`/new/photo`): pick a photo or PDF (up to 20 MB). It sits beside the writing page (sticky on wide screens, above it on narrow ones) with a **Paste text** box for Live Text. On Save the file uploads to the `originals` bucket as the recipe's original (`source: "upload"`). The recipe menu gains "View the original", and thumbnails fall back to an original JPG/PNG when there's no cover photo.
  - **Paste parser** `parseRecipeText` in `src/lib/pasteText.ts`: headings, the book page's stat box and tag lines, "recipe:" titles that wrap, section names (colon, "For the …", ALL CAPS, or a short line on its own before amounts), ▷/numbered steps with "-" sub-steps and wrapped lines joined. Shared fixtures in `shared/fixtures/pasted-recipes.json` (the first one is a guess at Live Text's output for the sweet chili chicken photo; replace it with real Live Text output when Louis has it). "Paste a recipe's text" is also on Enter your own.
  - Imports save with `imported: true` ("Check this import") until edited and saved again.
  - Also fixed: "1 ½ cups" now reads as 1 ½ (added to the shared ingredient fixtures); the writing page's category tabs no longer make phones scroll sideways.
  - Tested in a build copy with headless Chrome: the guard refusals, a BBC Good Food import (16 ingredients, 11 steps, stats, photo), the blocked-site fallback, and the photo flow with the pasted sweet chili chicken text (title, stats, 2 sections with 14 ingredients, 4 steps with sub-steps). **Saving an import was not tested against the live database**; check that on localhost.

- **R4, in the kitchen (2026-10-28, deployed):**
  - **Serving scaler:** `src/components/kitchen/Scale.tsx` (`ScaleProvider` around the recipe view, `ServingsStat`, `ScaledIngredients`); the maths in `src/lib/scale.ts` (reads "1 1/2", "½", "2-3"; writes kitchen fractions down to 1/8, including 1/6).
  - **Groceries:** `/groceries` (dynamic) with `src/components/kitchen/GroceryList.tsx`; read with `listGroceries()` in `src/lib/groceries.ts`; writes through new server actions `addGroceries`, `checkGrocery`, `clearGroceries` (changes show at once and roll back if a save fails). "Add to Groceries" on a recipe is a sheet in `KitchenButtons.tsx`.
  - **Start Cooking:** `/recipe/[slug]/cook?scale=…` with `CookMode.tsx` (gather page, steps, swipe/arrows, Wake Lock); step ingredients from `ingredientsForStep()` in `src/lib/cook.ts`. The end page, and "Mark as cooked" in the recipe menu, call the new `recordCooked` action. The recipe view shows "cooked N times".
  - Tests: `scale.test.mts`, `cook.test.mts` (27 in all). Checked in headless Chrome at desktop and phone size with only the unlocked-display cookie (no write key, so nothing was written live): scaling, the sheet, cooking steps, the end page, the groceries page and the "locked" messages. **Adding, checking and clearing groceries and recording a cook were not tried against the live database**; check them on localhost.

- **Website: Pencil page mode (2026-10-29, deployed):** the writing page has **Write on the lines | Write on the page**. Page mode (`src/components/PencilPage.tsx`) is a ruled canvas for the Apple Pencil (pressure-sensitive pen, stroke eraser, Undo, Clear page, "Draw with finger"); Safari reports the Pencil as a "stylus" touch, so only it is stopped from scrolling and fingers still scroll. The title, stats, tags, category and photo stay as fields above it (Scribble works there). The writing is **not read into text** (Louis's choice: no AI transcription service, and Safari can't use Apple's on-device recognition): on Save it becomes a PNG in the `handwriting` bucket (`source: "pencil"`), cut off a couple of lines below the writing. Unsaved strokes are kept in the browser beside the draft. Editing a Pencil recipe draws new ink over the saved page ("Clear page" starts over). A recipe with a handwritten page and no lines shows the page on its recipe view (and hides Add to Groceries / Start Cooking) and in the book view. Tests: 28 pass (one new book-layout case); checked in headless Chrome at desktop and iPad size (drawing with the mouse, undo, eraser, draft restored after reload, Save making the image then stopping at the locked upload, no sideways scroll). Also fixed: the selected category tab made the writing page scroll 2px sideways at iPad width. **Not tested:** the real Apple Pencil (Louis, on the iPad), and saving live.

- **iPad app dropped (2026-10-29, Louis):** the app (Phases 1–3 and the flip-through book, built in the Simulator) was removed from the repo; the website does everything on the iPad. Code: `git show bff8a2e:ios/`. Louis undoes the Xcode/SideStore setup on his devices.

- **Website tweaks (2026-10-29, deployed):**
  - **Home Screen:** whisk-and-wooden-spoon icon (`src/app/icon.svg`, `src/app/apple-icon.png`, `public/icon-192.png`/`icon-512.png`), `src/app/manifest.ts`, and `appleWebApp.title` "Ramiya’s Recipes" in `layout.tsx`, so the iPad no longer guesses the name from the page title. Remove the old shortcut and add it again to pick these up.
  - **List | Book** toggle moved from Home to the Library (`ViewToggle`); `/book` is titled "My Recipes" and lights up the Library tab.
  - **Cover photo** shown whole (`CoverPhoto`, `pictureUrl()` in `Thumb.tsx`), not cropped to a fixed box.
  - **Tags** trimmed to Quick & Easy, Slow Cooker, One Pot/Pan, Air Fryer, Veg (`TAGS` in `src/lib/book.ts`; removed ids stay in the database, unseen). The paste parser still skips all the book's printed labels (`BOOK_TAG_LABELS`).
  - **Favorites:** a star in the top right corner of each Library card (`FavoriteStar.tsx`, outside the card's link; saves the whole recipe with the `family-favorite` tag toggled; no database change). It was by the recipe view's title first; Louis moved it. Home's row is now "Favorites".
  - **Book cover** is now the icon: the wooden spoon and whisk on cream ruled paper (`SpoonAndWhisk` in `Stickers.tsx`), no longer plain raspberry.
  - **Writing page:** "Add a photo" moved to the page's top right; page mode has "+ Add a page" (each page its own canvas; saved as one tall PNG, scaled down past 16 megapixels for Safari).
  - **Safari first (Louis, 2026-10-29):** the iPad's Safari is the target. Checks now run in **WebKit** (Playwright 1.55, WebKit 26, iPad Pro 11" profile, portrait and landscape) from the scratchpad, not only Chrome. Safari fixes: Enter moves to the next line straight away (iPad Safari only keeps the keyboard up for focus moved during the key press), and the Pencil page turns off Safari's text selection and callout.
  - Tested in WebKit as an iPad and in headless Chrome (every page; the book turning; typing and Enter on the lines; drawing on two pages; Save stopping at the locked upload; no sideways scroll; no errors). 28 tests pass. **Not tested live:** the star saving, the icon and name on the real iPad.

- **Home rebuilt as the kitchen (2026-10-29, deployed; migration 002 run and save-recipe redeployed the same day; the week plan is in use; built fresh on every visit until 2026-10-30, now cached and refreshed on changes):**
  - **Pick up where you left off** (`src/components/home/PickUp.tsx`, `src/lib/remember.ts`): Start Cooking remembers its page in the browser (`CookMode` writes it, `?step=` reopens it); recipe pages remember being opened (`RememberRecipe`). **Surprise me** opens a random recipe.
  - **This week** (`src/components/home/WeekPlan.tsx`, `src/lib/plan.ts`): migration `002_meal_plan.sql` (+ rollback; tested in PGlite: rules, permissions, cleanup of days over a month old, rollback), save-recipe actions `plan-add` / `plan-remove`, server actions `addMeal` / `removeMeal`. Until 002 is run, Home says the update is needed. **Add the week to Groceries** uses the grocery sheet, now its own component (`kitchen/GrocerySheet.tsx`, also used by the recipe's Add to Groceries) with one section per recipe.
  - **Groceries at a glance** and **To finish** (handwritten-only recipes) on Home (cached since 2026-10-30, refreshed on every change). Home no longer has the category shelves, Favorites or Recently added (`Shelf.tsx` removed).
  - **Library filters:** category tabs and ★ Favorites above the list; `/library?category=…` / `?favorites=1`; `/category/[slug]` redirects there; "in Mains" on a recipe links there.
  - **Handwritten-only recipes:** the recipe view shows "Type the lines" in place of Add to Groceries / Start Cooking; `/recipe/[slug]/edit?lines=1` opens the lines with the handwritten page beside them (`HandwrittenPanel` in `RecipeEditor.tsx`, with Paste text for Live Text).
  - Also fixed: the writing page's title squeezed into a narrow column beside a photo or handwritten page (title and stat box now wrap), and the category tabs made that two-column layout scroll sideways.
  - Tested in WebKit as an iPad, portrait and landscape: Home's sections, last opened, continue cooking at step 2 with the scale kept, Surprise me, Library filters from a link, the week with sample meals (scratch-only test page; the live table doesn't exist yet), the week's grocery sheet (29 items in 2 sections), the add-a-meal sheet reaching the locked server, Type the lines. 28 tests pass. **Not tested live:** adding and removing meals and adding the week to Groceries (needs 002, the redeploy and the write key).

- **Offline, live updates and photo paste rules (2026-10-29, built, not yet deployed; needs migration 003):**
  - **Paste rules for handwritten cards** (`src/lib/pasteText.ts`), tuned on Louis's salted maple banana bread card, both as iPad Live Text copied it and as Apple's text recognition reads the photo (two new cases in `shared/fixtures/pasted-recipes.json`): lines Live Text runs together are split before a clear cooking verb (`splitRunTogether`; not after "&"/"and"/"then", not "heavy cream" or "low heat"); a word cut across two lines is joined; without headings, a line with no amount stays an ingredient when another amount follows within two lines or it reads like one, and a line that starts like a step starts the steps (`STEP_START`); misreads tidied (stray capitals, "BRead", "0z"/"20z", "6q", "?" for "&"); unitless "1709"/"3400"/"69" read as grams in a recipe measured in grams (`fixMisreadGrams`). The card now gives 10 ingredients and 5 steps; Live Text dropped "72g white sugar" and garbled the bake step, which is left for review. The tag labels printed in the book (`BOOK_TAG_LABELS`) are still skipped.
  - **Offline** (`public/sw.js`, `src/components/Offline.tsx`, production only): pages opened are saved and shown with no signal (an offline note at the top; an unopened page gets an offline page); the site's files and recipe pictures are saved (pictures fetched with CORS, up to 300). **Grocery check-offs** made offline are kept in the browser (`rb-grocery-pending`) and sent when back online. Tested in Chrome with the server stopped (WebKit test tools can't run service workers).
  - **Live updates** (`src/components/LiveUpdates.tsx`, migration `003_live_updates.sql` + rollback, tested in PGlite): every open page listens to Supabase Realtime for changes to recipes, the grocery list and the week, and refreshes within about a second; it also refreshes when brought back to the front or when the connection returns. Checked in WebKit: the Realtime connection opens on every page, and coming back refreshes.
  - **Full-screen Home Screen app** (Louis, 2026-10-29): `display: "standalone"` in `src/app/manifest.ts` and `appleWebApp.capable` in `layout.tsx`; the writing page's Cancel falls back to the recipe or the Library when there's no history. The app has its own storage, so unlock editing once inside it. Remove the old shortcut and add it again.
  - **Menu as a top capsule, or at the side** (Louis, 2026-10-29): on iPad and wider, `AppNav` shows a floating capsule at the top centre (like iPadOS's tab bar), with a sidebar button that moves the menu to a left sidebar and back. The choice is kept in localStorage (`rb-nav`) and applied before drawing by a script in `layout.tsx` (`data-nav="side"` on `<html>`; Tailwind variant `navside:` in `globals.css`). Phones keep the bottom tab bar.
  - **Quicker tab switches:** the tapped tab lights up at once. Home and Groceries are cached pages again (`revalidate = 60`, like the Library), so the site loads them ahead and switching is instant (30–65 ms in WebKit, from about 0.6 s live, 1.7 s when the server was asleep). Every change refreshes them straight away (`refreshGroceries()` in `actions.ts` for grocery changes, including check-offs; `revalidatePath("/")` for meals; recipe saves refresh every page), and live updates refresh other open devices. (A loading shell and a 30-second page cache were tried first and removed: the shell's flash made it feel slower.)
  - **Docs refreshed:** specifications v2.0 (website only), PLAN.md, DESIGN.md, README.md, this file.
  - 32 tests pass; lint and types clean; no errors or sideways scroll in WebKit (iPad portrait and landscape).

## Next
1. **Run migration 003** (`supabase/migrations/003_live_updates.sql`, steps above), then commit and push. After the deploy: open a recipe or two and the grocery list, turn on airplane mode, check they still open and check something off; turn it back off and see the check-off saved; with the site open on two devices, check something off on one.
2. **Try on the iPad:** pasting the banana bread card's Live Text into Add from photos (it should sort into 10 ingredients and 5 steps), Pencil page mode, the favorite stars, Type the lines, the Home Screen icon (re-add the shortcut).
3. **Re-add the Home Screen shortcut** after the deploy (delete the old one, Share → Add to Home Screen): it should open full screen. Unlock editing once inside it (Settings). Then **the print check** (R5).

## Docket (queued, not scheduled)
- **A second book: "Who's using this" (Louis, 2026-10-30):** Louis wants his own book ("Jay's Recipes") alongside Ramiya's. Two ways:
  - **Book switcher (smaller; try first):** Settings gets "Who's using this: Ramiya / Jay". A migration adds a `book` column (default `ramiya`) to recipes, grocery_items and meal_plan; every read filters by it; saves send it; the title, Home Screen name and book cover follow it. Each book gets its own addresses (e.g. `/jay/…`) so pages can stay cached (the choice can't come from a cookie without making every page slow). Still no login: both books stay readable by anyone with the link, and the one write key still guards changes (whoever has it can change either book).
  - **Login (bigger):** Supabase Auth (email link or passkey), recipes owned by a person (`owner_id`), database rules so each person changes only their own, optional sharing. **The write key would no longer be needed:** it only stands in for "this is the owner". With login, each request carries the signed-in person's session, which the database checks itself, per person, and which can be signed out on one device without changing a key everywhere. Reading would then be private unless shared.
- **Custom book cover** (optional): the cover is now the Home Screen icon's wooden spoon and whisk on ruled paper (`SpoonAndWhisk` in `Stickers.tsx`, used by the `PageFace` cover in `src/components/book/BookView.tsx`). Swap it for an uploaded image or design if Louis wants one later.
- **Write key → your own passphrase** (queued 2026-10-28): rerun `npm run setup:supabase` and paste a passphrase of 4–5 random words instead of pressing Enter; then unlock each browser again. No code change. Bigger alternatives if ever wanted: a separate simple website password with the long key kept on the server (new code plus a rate limit), or login (below), which replaces the key.
- Login (Supabase Auth, `owner_id`, owner-only RLS, `shared` flag for family). Replaces the write key.
- Custom handwriting font (Louis making it; steps in PLAN.md "Your own handwriting font"); Next.js 16 upgrade; instant website refresh after saves.

## Documentation: match the Financial Planner project
Louis wants this project's documentation to match the financial planner at
`/Users/louis/Desktop/Career and Financial Future/financial-planner/Specification Documentation/`.
That folder has two Word files. The recipe site should get the same pair:
`Specification Documentation/Recipe_Book_Functional_Specification.docx` and `Recipe_Book_Technical_Specification.docx`.

**Functional Specification layout**
- Title block: app name in caps, "Functional Specification", a one-line subtitle, "Version x.x | date | Document status: Living specification (source of truth)"
- "Document control" table: Application, Companion document, Functional scope, Requirement states
- 1. Purpose and document conventions; 2. Users, access and navigation; then one section per feature area
- Requirements written as `FR-AREA-NNN  Title`, then a paragraph, then an `Acceptance:` line and a `Verification status:` line (e.g. "To verify", "Implemented <date>, owner verification pending", "Deployed and verified by owner <date> (commit abc123)")
- Definitions table (Metric | Definition / rule) where rules apply across the app
- "Functional acceptance test matrix" (ID AT-01… | Test | Expected result)
- "Requirements status and change control" with a dated change log and a "Queued (not scheduled)" list
- Appendix A. Worked examples (Scenario | Expected behavior); Appendix B. Local testing and release workflow

**Technical Specification layout**
- Title block, plus an attribute table: Application, Frontend, Backend / Database, Hosting, Source control, Primary authentication, Document date
- 1. Purpose and Scope (1.1 Primary objectives, 1.2 Out of scope); 2. System Architecture (Layer | Technology table; 2.1 Logical data flow); 3. Authentication, Authorization, and User Isolation; then data model and feature sections; a test/validation table; "Planned / Recommended Enhancements"
- Appendix A. Key Business Rules (Rule | Definition); Appendix B. Repository / Deployment Workflow (Step 1 update code → Step 2 test locally → Step 3 verify with lint/test/build → Step 4 owner commits and pushes, Vercel deploys; migrations in `supabase/migrations`, run by hand with rollback scripts; migration history list)

**How the formatting is matched (done):** `scripts/specs/build_specs.py` copies each planner .docx package (styles, numbering, theme, page setup, footer) and writes a new body using the same paragraph and table XML as the planner. The text lives in `scripts/specs/spec_content.py`. Edit that file, then run `python3 scripts/specs/build_specs.py` to regenerate both files in `Specification Documentation/`. A Quick Look preview (`qlmanage -t -s 900 -o <dir> <file>.docx`) shows the first page for a visual check against the planner docs.
