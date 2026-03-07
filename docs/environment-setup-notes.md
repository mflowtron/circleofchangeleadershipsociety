# Environment Setup & Application Notes

## What I ran in this environment

1. Installed dependencies with `npm ci`.
2. Ran baseline verification:
   - `npm run test` ✅
   - `npm run build` ✅
   - `npm run lint` ❌ (existing repository lint issues; details below)

## Local development setup

### Prerequisites

- Node.js 18+ (Node 20 recommended for Vite 5)
- npm 9+
- Optional: Supabase CLI if you want to run edge functions/migrations locally

### Install and run

```bash
npm ci
npm run dev
```

The Vite dev server runs on the default Vite port unless overridden (`vite` command in `package.json`).

## Required environment variables

The frontend Supabase client reads:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These are required in local `.env` for authenticated app features and data calls. They are consumed in `src/integrations/supabase/client.ts`.

Supabase edge functions additionally depend on server-side env vars like:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- Function-specific keys (e.g., Mux/webhook/API provider secrets)

## How the app is organized (learned behavior)

### Runtime architecture

- Frontend is a Vite + React + TypeScript SPA.
- Global providers in `src/App.tsx`:
  - React Query for data caching
  - ThemeProvider (dark/light/system)
  - AuthProvider for user/profile/module access
  - Sidebar provider and shared toast/tooltip systems
- Data access pattern is hook-centric (`src/hooks/*`) with Supabase integration in `src/integrations/supabase/*`.

### Route model

The app is effectively three experiences in one codebase:

1. **LMS** (`/lms/...`)
2. **Event public + management** (`/events/...` + `/events/manage/...`)
3. **Attendee mobile-style app** (`/attendee/app/...`)

`RootRouter` drives post-login navigation by approval status, default role, and module access. Multi-access users are sent to dashboard selection.

### Backend integration model

- Supabase is the active backend (see `supabase/config.toml` and large migrations/functions footprint).
- Edge functions are heavily used for business workflows (registration/payment verification, attendee messaging, push notifications, feed comments, etc.).
- `docs/DATA_DICTIONARY.md` is the central schema reference for tables/functions/buckets.

## Lovable + Claude context

- Repo started from Lovable scaffold (README still had default Lovable boilerplate before this notes file).
- Current code shows substantial post-scaffold customization:
  - rich route segmentation,
  - extensive domain hooks/components,
  - many Supabase edge functions and migrations,
  - attendee/event registration/payment flows.

In short: this is no longer a basic Lovable starter; it is an actively evolved production-style app where Lovable appears to have been the origin point and subsequent AI/human iterations (including Claude) expanded features.

## Current quality snapshot

- **Tests:** pass (currently minimal coverage: one Vitest file)
- **Build:** passes
- **Lint:** fails with many pre-existing errors/warnings (not introduced by this setup pass), including:
  - `@typescript-eslint/no-explicit-any`
  - React hooks dependency warnings
  - a few style/typing rule violations

Recommendation: if desired, do a dedicated lint-hardening pass by domain (attendee feed, events management, then edge functions) to avoid mixing behavior changes with typing cleanup.
