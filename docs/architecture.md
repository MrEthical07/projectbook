# Architecture

## Runtime Path

UI (`page.svelte`)
-> `page.ts`
-> remote functions
-> `src/lib/server/api/*` client helpers
-> backend API (`/api/v1/*`)

## Why This Architecture

- No service layer: the remote layer already owns input parsing, validation, permission checks, and state mutation.
- No command-pattern abstraction: command/query functions from `$app/server` are the execution boundary.
- Remote is the boundary: UI does not call backend API helpers directly.
- Simplicity is intentional: fewer layers means lower cognitive overhead and faster debugging.

## Layer Ownership

- `src/routes/**`
  - Page UI and route-level data loading.
  - Owns rendering, local state, and Save interactions.

- `src/lib/remote/**`
  - Boundary for read/write operations.
  - Owns Zod validation, permission gating, API payload normalization, and mutation results.

- `src/lib/server/api/**`
  - Auth-aware API transport, token refresh handling, and error normalization.
  - Owns request envelopes and backend communication concerns.

- `src/lib/server/auth/**`
  - Cookie management for access, refresh, and auth notice state.
  - Owns browser auth token persistence strategy and backend-issued permission-context token verification.

- `src/hooks.server.ts`
  - Parses permission-context token (`projectbook_permission_ctx`) and hydrates request locals.
  - Falls back to `/api/v1/system/session-context` when token is missing/expired.

- `src/lib/components/**`
  - UI composition primitives and domain components.

- `src/lib/utils/**`
  - Shared helpers such as permission checks for UI decisions.

## Folder Structure Snapshot

- `src/routes/project/[projectId]/**`: project-scoped pages and artifact detail screens.
- `src/lib/remote/*.remote.ts`: domain and user-home boundary functions.
- `src/lib/server/api/*.ts`: backend API client, auth calls, and remote helpers.
- `src/lib/server/auth/*.ts`: auth cookie and server auth utilities.
