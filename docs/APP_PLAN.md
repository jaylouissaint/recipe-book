# Recipe Book iPad App — Build and Run Plan (SideStore)

Status: draft for approval, 2026-10-24. This changes an earlier decision: there will be a native iPad app, installed with **SideStore** using a free Apple ID (no $99/yr developer account). The app is a full recipe book, not only a writing and scanning tool. It is refreshed automatically, so the iPad never needs to be plugged in after setup.

## Decisions in this plan (please confirm)
1. **Both an app and a website, sharing one database.** The iPad app does everything: reading, writing, scanning, cooking. The website stays for family and other devices, and as a fallback if the app ever stops opening. It becomes **read-only** (browse, search, print, Home Screen install), so the web "write it", upload and paste pages (old build-order steps 4–6) move to the app instead of being built twice.
2. **Still no login.** Only the owner's iPad can save recipes. It sends a private **write key**, typed in once in the app's Settings and kept in the iPad Keychain (never compiled into the app), to a Supabase Edge Function that does the saving. Everyone else can only read. When login is built later (on the docket), it replaces the write key.
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
| Louis | Install **Xcode** from the Mac App Store (about 15 GB), open it once, then run `sudo xcode-select -s /Applications/Xcode.app` |
| Louis | Create a **separate Apple ID** used only for signing; don't type your main Apple ID into a community tool |
| Louis | On the iPad: turn on Developer Mode; install SideStore and create its pairing file following the current guide at sidestore.io (needs the Mac once) |
| Louis | Install the local VPN app SideStore's guide names, and sign in to SideStore with the signing Apple ID |
| Claude | Create a minimal "Hello Recipe" SwiftUI project in `ios/` and `scripts/build-ipa.sh` (builds an unsigned `.ipa` that SideStore signs) |
| Louis | Install the `.ipa` through SideStore |
| Louis | Shortcuts → Automation → **Time of Day, daily 3:00 AM, Run Immediately**: connect VPN → SideStore **Refresh All** → disconnect VPN. Add a second automation **When charging** with the same actions |

**Done when:** the hello app is still opening 10+ days later with no cable, and SideStore shows the expiry date moving forward each day.

## Phase 1 — Shared backend (also unblocks the website)
- Supabase project (Louis creates it; keys go in `.env.local`, which git ignores, and in Vercel).
- Migration `supabase/migrations/000_initial_schema.sql`: `recipes`, `ingredient_groups`, `ingredients`, `step_groups`, `steps` (from PLAN.md §3), plus `updated_at` triggers and a `deleted_at` column so deletes sync. RLS on everything; anon can **read only**.
- Storage buckets: `originals` (scans, photos, PDFs) and `handwriting` (PencilKit drawings + rendered PNGs). Public read; writes only through the Edge Function.
- Edge Function `save-recipe`: checks the `x-write-key` header against a Supabase secret, then replaces the recipe and its child rows in one transaction; also signs upload URLs. Rollback script alongside the migration.
- Seed the sweet chili chicken recipe. Switch the website's `listRecipes()`/`getRecipe()` to Supabase and deploy to Vercel (old step 1, without login).
- GitHub Action to keep the database awake (free Supabase projects pause after about a week of no activity), the same way the financial planner does it.

**Done when:** the website shows the recipe from the database; a save with the anon key is rejected; a save with the write key works.

## Phase 2 — App: reading the book
- SwiftUI app for iPad (portrait and landscape, Split View and Slide Over).
- Design system ported from the website: the same color tokens and dark mode; Patrick Hand, Montserrat and Zilla Slab bundled (all free Google Fonts, OFL licensed).
- Screens: **Cover** (raspberry header, category tabs, recipe grid) → **Recipe page** matching the photo (stat box, tag row with hand-drawn ✗, two balanced ingredient columns, ▷ steps with – sub-steps, ruled paper, stickers, spiral), side tabs for categories.
- Data: SwiftData model matching the database; sync on launch, on pull-to-refresh and after saving (download rows with a newer `updated_at` since the last sync; on conflict, the newest save wins, which is fine with one person writing).
- Settings screen: write key (Keychain), sync status, last refresh.

**Done when:** the sweet chili chicken page on the iPad matches the photo side by side, and opens in airplane mode.

## Phase 3 — App: writing recipes by hand
Two ways to write, on the same book-page layout:
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
- **Cook mode:** large text, tap to check off steps, screen stays awake.
- **Serving scaler** using the parsed amounts.
- **Search** (title, ingredient, tag) and **tag filters** using the checkbox row; works offline.
- Print / share a recipe as a PDF from the share sheet.

## Phase 6 — Automatic updates
- `.github/workflows/ios-release.yml`: when Louis pushes a tag like `app-v1.2.0`, a GitHub macOS runner builds the unsigned `.ipa`, attaches it to a GitHub Release, and updates `sidestore/source.json` (a SideStore/AltStore "source" file).
- In SideStore, add the source URL once. New versions then show up in SideStore to install with one tap; the daily automation keeps whichever version is installed signed.
- The repo is public, so the `.ipa` is public too. It contains no secrets (the write key lives only in the Keychain); the Supabase URL and anon key inside it can only read.

**Done when:** pushing a tag produces a Release, and SideStore offers the new version without a computer.

## Website changes
- Keep: deploy (Phase 1), recipes from the database, cover, categories, search, print, Home Screen install and offline reading (old steps 1, 3, 7).
- Drop from the website (now in the app): the "write it" page, upload/transcribe and paste parser (old steps 4–6). An optional simple typed editor can be added later for adding recipes from a laptop.
- The parsing rules are written once in the docs, with shared test cases in `shared/fixtures/*.json` that both the Swift tests and any website tests run against.

## Docs to update after approval
- PLAN.md (website scope and decisions), HANDOFF.md.
- Functional and Technical Specifications: new sections for the iPad app, SideStore install and refresh, the write key, sync, and the release pipeline; mark the web "write it"/upload/paste requirements as moved to the app.

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
