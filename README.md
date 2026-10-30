# Ramiya's Recipes

A personal recipe book styled after a handwritten spiral recipe book, live at
https://ramiyas-recipes.vercel.app. It's a Next.js website reading from Supabase, used on the iPad from a
Home Screen shortcut in Safari, with Scribble and the Apple Pencil. Everyone can read; only browsers
unlocked with the write key can change anything.

## Where to start
- `docs/HANDOFF.md`: current state, decisions, how to run migrations, and what's next.
- `docs/DESIGN.md`: the look and every screen.
- `docs/PLAN.md`: the original plan, build order and parsing rules.
- `Specification Documentation/`: the Functional and Technical Specifications (built from `scripts/specs/`).

## Running it
```bash
npm install
npm run dev        # http://localhost:3000 (offline and live updates only work in a production build)
npm test           # parser, scaler, cooking and book-layout tests
npm run lint
```
`.env.local` (git-ignored) holds the public Supabase URL and key; see `.env.example`.

## Backend
- Database changes: numbered files in `supabase/migrations/` with rollbacks, run by hand in the Supabase SQL Editor.
- The only write path is the `save-recipe` Edge Function: `npm run deploy:functions`.
- `npm run setup:supabase` sets up the project and the write key; `npm run check:setup https://ramiyas-recipes.vercel.app` checks everything.

Pushing to `main` deploys to Vercel.
