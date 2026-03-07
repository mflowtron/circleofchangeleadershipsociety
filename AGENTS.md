# AGENTS.md

## Cursor Cloud specific instructions

This is a Vite + React 18 + TypeScript SPA with a hosted Supabase backend. There is no local backend to run.

### Services

| Service | How to run | Notes |
|---------|-----------|-------|
| Vite dev server | `npm run dev` | Runs on port 8080, binds all interfaces |

### Key commands

See `CLAUDE.md` for full project instructions. Standard commands from `package.json`:

- **Dev server**: `npm run dev` (port 8080)
- **Lint**: `npm run lint` (ESLint; pre-existing warnings/errors in codebase)
- **Test**: `npm run test` (vitest)
- **Build**: `npm run build`

### Non-obvious notes

- The `.env` file with `VITE_SUPABASE_*` variables is already committed and required for the app to connect to its hosted Supabase backend. Do not remove it.
- The app redirects unauthenticated users to `/auth`. Public pages include `/events` and `/events/:slug`.
- There are no local databases, Docker containers, or backend services to start. All backend functionality is provided by the hosted Supabase instance and its Edge Functions.
- `npm run lint` exits with code 1 due to ~129 pre-existing issues (mostly `@typescript-eslint/no-explicit-any`). This is expected and not caused by new changes.
- The project uses `tsconfig.app.json` with `strict: false` — prefer strict typing in new code regardless.
