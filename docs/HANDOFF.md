# Handoff: Recipe Book

Status as of 2026-10-27, for picking up the work in a new Claude Code session.

## What this is
A personal recipe book styled after Louis's handwritten spiral recipe book (reference photo: `docs/reference/recipe-book-page.jpg`). It is a **website**, live now, plus a planned **native iPad app** that shares the same Supabase database.
- **Design (look and screens, both): `docs/DESIGN.md`** (modeled on the Deglaze app, 2026-10-27). Website plan and build order: `docs/PLAN.md`. iPad app plan: `docs/APP_PLAN.md`.
- Specs: `Specification Documentation/Recipe_Book_Functional_Specification.docx` and `Recipe_Book_Technical_Specification.docx` (v1.1).

## Where things live
| What | Where |
|---|---|
| Live website | https://ramiyas-recipes.vercel.app (Vercel project `ramiyas-recipes`, deploys from `main`) |
| GitHub | https://github.com/jaylouissaint/recipe-book (public) |
| Supabase project | ref `trdlqlulpfwsfhqnfqfu` (https://trdlqlulpfwsfhqnfqfu.supabase.co) |
| Website env vars | `.env.local` (git-ignored) and Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (read-only) |
| Write key | Supabase secret `WRITE_KEY` and Louis's password manager. Never in the repo, the app binary, or chat |
| GitHub Actions secrets | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (for the keep-awake workflow) |

## Decisions (don't reopen these)
- **Website plus a native iPad app** (changed 2026-10-24; it was website only). The app is installed with **SideStore** on a free Apple ID (no $99/yr developer account) and refreshed by a daily Shortcuts automation, so no cable after setup. It is a full recipe book, not only a writing tool.
- **Redesign after the Deglaze app** (2026-10-27, DESIGN.md): light only (white/cream, no dark mode), Deglaze green accent `#1F4D3D`, Home = book shelf, recipe view in the video's layout with titles and ingredients in handwriting on cream, writing page = the book page from the photo, Groceries = one simple list.
- **The website adds recipes too** (2026-10-27; it was going to be read-only): Save from the web, Add from photos, Enter your own, the same as the app. The app also gets Apple Pencil page mode and on-device scanning.
- **No login for now** (deferred 2026-10-20; on the docket). Everyone can read; only the owner's devices save, by sending the write key (`x-write-key`) to the `save-recipe` Edge Function. On the website the key is entered once per device and kept in an httpOnly cookie; writes go through the website's server. Login will replace the write key.
- **Less AI:** web import reads published schema.org recipe data; photos use on-device text recognition; simple rules sort text; always reviewed before saving.
- **No AI transcription service.** Handwriting becomes text only on the iPad (Scribble, Live Text, Vision text recognition) or by typing.
- Website stack: Next.js 15.5.28 (App Router, TypeScript), React 19.1.10, Tailwind 4, Supabase, Vercel. App stack (planned): SwiftUI, SwiftData, PencilKit, VisionKit, PDFKit, iPadOS 17+.
- Supabase GitHub integration: not connected, on purpose. Migrations are run by hand in the SQL Editor, each with a rollback script.
- Fonts: Patrick Hand (content), Montserrat (labels), Zilla Slab (the "recipe:" label). A custom handwriting font may replace Patrick Hand later.
- TypeScript stays (Louis asked about JS on 2026-10-20 and chose to keep TS).

## Working preferences
- Once a plan is approved, make edits without checking in on each one.
- Stay inside the project folder.
- **Never commit or push.** Louis does that.
- Give commands without `<placeholder>` brackets: zsh treats `<` and `>` as redirection, which has broken pasted commands several times. Use real values, or `paste-here` style words.

## Done
- **Milestone 2 (2026-10-20):** design tokens and fonts; components `Spiral`, `SideTabs`, `StatBox`, `TagRow`, `Stickers`, `RecipePage`, `Cover`, `RecipeCard`; cover, category and recipe pages matching the photo.
- **Step 1 / App Phase 1 (2026-10-27):**
  - `supabase/migrations/000_initial_schema.sql` (+ rollback), run by Louis 2026-10-24. Tested beforehand in PGlite, including permissions and the rollback.
  - `supabase/functions/save-recipe` deployed (actions: save, delete, upload-url) with `verify_jwt = false`.
  - The website reads from Supabase (`src/lib/supabase.ts`, `src/lib/recipes.ts`); recipe pages live at `/recipe/[slug]`; pages refresh every 60 seconds.
  - `.github/workflows/keep-supabase-awake.yml` runs Mondays and Thursdays (first run green).
  - `scripts/setup-supabase.sh` (`npm run setup:supabase`) and `scripts/check-setup.sh` (`npm run check:setup <site url>`): all checks pass against the live site.
- **Security (2026-10-27):** Next 15.5.4 → 15.5.28 and React → 19.1.10, because Vercel blocked the first deploy over React2Shell (CVE-2025-55182). Two `postcss` advisories bundled in Next remain; they're build-time only and need Next 16 to fix (docket).

## Next
1. **Website R1** (PLAN.md build order): new look and navigation, Home shelf, Library, Recipe view (DESIGN.md). Then R2 (editing + writing page), R3 (import), R4 (groceries, cooking, search), R5 (polish).
2. **iPad app Phase 0** can run in parallel: Louis installs Xcode (not installed yet; this Mac is an M4 on macOS 15.6.1) and sets up SideStore; Claude makes a minimal SwiftUI app in `ios/` and `scripts/build-ipa.sh`.

## Docket (queued, not scheduled)
- Login (Supabase Auth, `owner_id`, owner-only RLS, `shared` flag for family). Replaces the write key.
- Custom handwriting font; Next.js 16 upgrade; instant website refresh after saves; app Share extension (uses extra app IDs on a free account).

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
