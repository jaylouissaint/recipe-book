# Recipe Book iPad App — Build and Run Plan (SideStore)

Status: Phase 1 done 2026-10-27; Phases 2 and 3 built 2026-10-28/29 (Simulator); Phase 0 blocked on SideStore; Phases 4–6 not started. Plan written 2026-10-24. This changes an earlier decision: there will be a native iPad app, installed with **SideStore** using a free Apple ID (no $99/yr developer account). The app is a full recipe book, not only a writing and scanning tool. It is refreshed automatically, so the iPad never needs to be plugged in after setup.

## Decisions in this plan
All in effect. The look and screens of both the app and the website follow `docs/DESIGN.md` (decided 2026-10-27, modeled on the Deglaze app).

1. **Both an app and a website, sharing one database, with the same screens.** The iPad app does everything: reading, writing (including Apple Pencil page mode), scanning, cooking, groceries. The website does the same except page mode and on-device scanning; it can add recipes too (decided 2026-10-27; it was going to be read-only). The website stays the fallback if the app ever stops opening.
2. **Still no login.** Only the owner's devices can save recipes (the iPad app, and website devices unlocked with the write key; see DESIGN.md). It sends a private **write key**, typed in once in the app's Settings and kept in the iPad Keychain (never compiled into the app), to a Supabase Edge Function that does the saving. Everyone else can only read. When login is built later (on the docket), it replaces the write key.
3. **Works offline first.** Recipes live on the iPad (SwiftData) and sync with Supabase when online. An expired app or bad Wi-Fi never loses data.
4. **Minimum iPadOS 17**, which SwiftData needs. Check: Settings → General → About → iPadOS version.
5. **The app goes in the same GitHub repo**, in `ios/`.

## How it fits together
```
iPad app (SwiftUI)  ── read ──►  Supabase (Postgres + Storage)  ◄── read ──  Website (Next.js on Vercel)
   │  local SwiftData copy           ▲
   └── save (write key) ──► Edge Function "save-recipe" (service role, checks write key)

GitHub: push a version tag ─► GitHub Actions (macOS) builds unsigned .ipa ─► GitHub Release + source.json
iPad:   SideStore reads source.json ─► offers update │ Shortcuts automation re-signs the app daily
```

## Limits of the free Apple ID (designed around)
- Certificates last **7 days**; SideStore re-signs on the iPad and a daily Shortcuts automation keeps it ahead of that.
- **3 sideloaded apps** at once (SideStore uses one) and **10 new app IDs per 7 days**. App extensions (e.g. a Share extension) use extra app IDs, so v1 has none.
- Free accounts can't use iCloud/CloudKit, push notifications, Sign in with Apple, or App Groups. Sync goes through Supabase instead.
- Developer Mode must be on (Settings → Privacy & Security → Developer Mode).
- A major iPadOS update can invalidate SideStore's pairing file; then the computer is needed once to make a new one.

---

## Phase 0 — Prove the install-and-refresh pipeline first (about an evening)
Do this before writing the real app, because it's the riskiest part.

| Who | Step |
|---|---|
| Louis | ✅ Install **Xcode**. The App Store's Xcode needs macOS 26, so on Sequoia (15.6.1) it's **Xcode 16.4** from developer.apple.com/download/all; then `sudo xcode-select -s /Applications/Xcode.app` (your Mac password). Also `brew install xcodegen` ✅ |
| Louis | Create a **separate Apple ID** used only for signing; don't type your main Apple ID into a community tool |
| Louis | On the iPad: install **LocalDevVPN** and connect; on the Mac, install SideStore with **iloader** (github.com/nab138/iloader) signed in with the signing Apple ID; trust the developer app, turn on Developer Mode, sign in to SideStore with the same Apple ID and tap the 7 DAYS counter (docs.sidestore.io/docs/installation/install) |
| — | **Blocked 2026-10-28:** iloader signs in fine, but SideStore's own sign-in fails with -80045 (Apple changed sign-in in October; many open SideStore issues, fix pending in PR #1683). Try other anisette servers in SideStore Settings, or wait for a SideStore release |
| Claude | ✅ "Hello Recipe" SwiftUI app in `ios/` (XcodeGen `ios/project.yml`; shows build date, version and the recipe titles read with the public key). `npm run ios:sim` opens it in the iPad Simulator; `npm run ios:ipa` builds the unsigned `build/ios/RamiyasRecipes.ipa` for SideStore. Builds go to `~/Library/Developer/Xcode/DerivedData/RamiyasRecipes-cli`, because code signing refuses the Desktop's iCloud file metadata. `scripts/ios-secrets.sh` writes the git-ignored `ios/Secrets.xcconfig` from `.env.local` (Supabase host and public key only, never the write key) |
| Louis | Install the `.ipa` through SideStore |
| Louis | Shortcuts → Automation → **Time of Day, daily 3:00 AM, Run Immediately**: connect VPN → SideStore **Refresh All** → disconnect VPN. Add a second automation **When charging** with the same actions |

**Done when:** the hello app is still opening 10+ days later with no cable, and SideStore shows the expiry date moving forward each day.

## Phase 1 — Shared backend (also unblocks the website) ✅ done 2026-10-27
Built as described below, except that the website doesn't need the service role key at all (it only reads), and `supabase/config.toml` turns off JWT checks for `save-recipe`. Setup is `npm run setup:supabase`; `npm run check:setup <site url>` checks everything (all passing on 2026-10-27 against https://ramiyas-recipes.vercel.app). Supabase project ref: `trdlqlulpfwsfhqnfqfu`.

- Supabase project (Louis creates it; keys go in `.env.local`, which git ignores, and in Vercel).
- Migration `supabase/migrations/000_initial_schema.sql`: `recipes`, `ingredient_groups`, `ingredients`, `step_groups`, `steps` (from PLAN.md §3), plus `updated_at` triggers and a `deleted_at` column so deletes sync. RLS on everything; anon can **read only**.
- Storage buckets: `originals` (scans, photos, PDFs) and `handwriting` (PencilKit drawings + rendered PNGs). Public read; writes only through the Edge Function.
- Edge Function `save-recipe`: checks the `x-write-key` header against a Supabase secret, then replaces the recipe and its child rows in one transaction; also signs upload URLs. Rollback script alongside the migration.
- Seed the sweet chili chicken recipe. Switch the website's `listRecipes()`/`getRecipe()` to Supabase and deploy to Vercel (old step 1, without login).
- GitHub Action to keep the database awake (free Supabase projects pause after about a week of no activity), the same way the financial planner does it.

**Done when:** the website shows the recipe from the database; a save with the anon key is rejected; a save with the write key works.

## Phase 2 — App: reading the book ✅ built 2026-10-28 (Simulator; not on the iPad yet)
Built as described below, in `ios/RamiyasRecipes/` (App, Model, Data, Views; fonts in `Fonts/`, the website's stickers as SVGs and a placeholder icon in `Assets.xcassets`). SwiftData keeps each recipe with its ingredient groups and steps as Codable arrays. `Sync` downloads rows with `updated_at` newer than the last one seen and removes deleted ones, and pictures are saved in Application Support. Settings checks the write key with save-recipe's `check` action and keeps it in the Keychain. The recipe menu has "View the book page" (the book-page layout, one scrolling page per recipe) and "View the original". The flip-through book (the website's `/book`) was added 2026-10-29: Home's Shelf | Book switch and "Open in the book" (`Model/BookLayout.swift`, `Views/BookView.swift`, with the iPad's page curl). Not yet: Groceries / Start Cooking (Phase 5). Tests: `npm run ios:test` (formatting, column split, decoding).

- SwiftUI app for iPad (portrait and landscape, Split View and Slide Over).
- Design from `docs/DESIGN.md`: light only, Deglaze green accent, Instrument Serif / Figtree / Patrick Hand bundled (all free Google Fonts, OFL licensed).
- Screens: tab bar (Home book shelf, Library, Groceries, Settings) and the + Add sheet; **Library** cards; **Recipe view** in handwriting on cream with "Add to Groceries" and "Start Cooking"; "View handwritten page" shows the book-style page.
- Data: SwiftData model matching the database; sync on launch, on pull-to-refresh and after saving (download rows with a newer `updated_at` since the last sync; on conflict, the newest save wins, which is fine with one person writing).
- Settings screen: write key (Keychain), sync status, last refresh.

**Done when:** the app's screens match the website's (after website step R1), and every recipe opens in airplane mode.

## Phase 3 — App: writing recipes by hand ✅ built 2026-10-29 (Simulator; not on the iPad yet)
Built as described below, in `Views/WritingView.swift`, `Views/PencilPage.swift`, `Model/Parse.swift`, `Model/Draft.swift` and `Data/Writer.swift`. Page mode is a fixed ruled page with printed areas (title, two ingredient columns, directions, notes); recognized lines are sorted by area, so no headings need writing. The drawing is saved as a PNG in the `handwriting` bucket (the strokes stay on the iPad only until saved). Edit and Delete are in the recipe menu. Still to check: saving live, and real Pencil writing on the iPad (the "done when" below).

The **writing page** looks like the book page from the photo (DESIGN.md). Two ways to write on it:
- **Write on the lines (Scribble):** each ruled line is a native text field; Scribble turns writing into text as you go (the old "write it" page, now native).
- **Write on the page (PencilKit):** write freely anywhere with the Apple Pencil. The drawing is kept as the recipe's **handwritten page**, and Apple's on-device Vision text recognition turns it into text, which you then check line by line. Nothing leaves the iPad.
- Ingredient line parser in Swift ("1/3 c sweet chili sauce" → amount / unit / item), groups, steps and sub-steps, stat box, tags, notes.
- Drafts saved locally after every change.
- A **"View handwritten page"** toggle on the recipe page shows your actual handwriting.

**Done when:** writing the sweet chili chicken recipe both ways gives the same groups and steps as the photo; a draft survives force-quitting the app.

## Phase 4 — App: scanning and importing
- **Scan a page** with the built-in document scanner (finds the edges and flattens the page) for cards from the spiral book.
- **Import** photos (Photos picker) and PDFs (Files; displayed with PDFKit), including GoodNotes/Notability exports.
- Text recognition on the scan or PDF → **paste parser** (the PLAN.md §4C rules) → review in the editor, with the original shown beside it.
- The original goes to the `originals` bucket and opens from **"View original card"**.

**Done when:** scanning the reference photo's page gives the title, 2 ingredient groups (7 and 6 items) and 4 step groups for review.

## Phase 5 — App: in the kitchen
- **Groceries:** one list, optional group by recipe, synced with the website.
- **Start Cooking:** one step at a time in large handwriting, check off steps, screen stays awake.
- **Serving scaler** using the parsed amounts.
- **Search** (title, ingredient, tag) and **tag filters** using the checkbox row; works offline.
- Print / share a recipe as a PDF from the share sheet.

## Phase 6 — Automatic updates
- `.github/workflows/ios-release.yml`: when Louis pushes a tag like `app-v1.2.0`, a GitHub macOS runner builds the unsigned `.ipa`, attaches it to a GitHub Release, and updates `sidestore/source.json` (a SideStore/AltStore "source" file).
- In SideStore, add the source URL once. New versions then show up in SideStore to install with one tap; the daily automation keeps whichever version is installed signed.
- The repo is public, so the `.ipa` is public too. It contains no secrets (the write key lives only in the Keychain); the Supabase URL and anon key inside it can only read.

**Done when:** pushing a tag produces a Release, and SideStore offers the new version without a computer.

## Website changes
- The website gets the same redesign and the same ways to add recipes (PLAN.md build steps R1–R5). It's built first, since it's live; the app phases then copy its screens.
- Save from the web runs on the website's server (`/api/import`), and the app calls the same endpoint, so there is one importer.
- The parsing rules are written once in the docs, with shared test cases in `shared/fixtures/*.json` that both the Swift and the TypeScript tests run against.

## Docs
Updated 2026-10-27: PLAN.md, HANDOFF.md, and both specifications (v1.1, which cover the iPad app, SideStore, the write key, sync and the release pipeline). Keep them in step with each phase.

## Risks
| Risk | What happens | Mitigation |
|---|---|---|
| Automation fails for 7+ days (iPad off, VPN broken) | App won't open until refreshed | Two automations (daily + when charging); the website still works; data stays on the iPad and in Supabase |
| iPadOS update breaks SideStore pairing | Refreshes fail | Make a new pairing file with the Mac (about 10 min); update SideStore |
| Apple changes sideloading rules | SideStore may stop working for a while | Everything also lives in Supabase and on the website; app data isn't locked in |
| Write key leaks | Someone could edit recipes | Change it in Supabase secrets and re-enter it on the iPad; later replaced by login |
| Free Supabase project pauses | App falls back to its offline copy; website can't load | Keep-alive GitHub Action |

## Order and rough effort
Phase 0 (an evening, mostly Louis) → Phase 1 (1–2 sessions) → Phase 2 (2–3 sessions) → Phase 3 (3–4 sessions) → Phase 4 (2–3 sessions) → Phase 5 (1–2 sessions) → Phase 6 (1 session; it can move earlier once Phase 2 exists, to avoid manual installs).
Each phase ends with Swift tests and an Xcode build (Claude), a check on the iPad (Louis), then Louis commits and pushes.
