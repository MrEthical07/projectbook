# ProjectBook Web

ProjectBook is a SvelteKit 2 + Svelte 5 workspace application for running a full Design Thinking workflow inside projects:

- Empathize: stories and journeys
- Define: problem statements
- Ideate: ideas
- Prototype: tasks
- Test: feedback

It also includes project support modules (pages, resources, calendar), team management, role-based permissions, and a local auth system for demo/dev use.

## What This Repository Contains

- A complete frontend + server route implementation using SvelteKit.
- In-memory server data stores (no database required to run locally).
- SvelteKit remote functions (`query`/`command`) as the app's data access layer.
- Authentication with sessions, signup/login, email verification, and password reset flows.
- Seeded workspace/project content to make the app usable immediately after startup.

## Tech Stack

- Svelte 5 (runes mode)
- SvelteKit 2
- Vite 7
- Tailwind CSS 4 + `tw-animate-css`
- shadcn-svelte + bits-ui component patterns
- Zod + sveltekit-superforms
- `@node-rs/argon2` for password hashing
- `sveltekit-rate-limiter` + lightweight in-memory auth rate limiting

## Local Setup

### Prerequisites

- Node.js (modern LTS recommended)
- pnpm

### Install

```bash
pnpm install
```

### Run Development Server

```bash
pnpm run dev
```

### Build

```bash
pnpm run build
pnpm run preview
```

### Type/Project Checks

```bash
pnpm run check
```

## Authentication and Access

The app seeds two local accounts at server start (`src/hooks.server.ts` + `src/lib/server/auth/service.ts`):

- Superadmin:
  - Email: `admin@projectbook.com`
  - Password: `admin`
  - Access: full workspace/project access
- Demo:
  - Email: `demo@projectbook.com`
  - Password: `demo`
  - Access: restricted, read-only scoped view

### Auth Behavior

- Session cookie: `projectbook_session`
- Notice cookie: `projectbook_auth_notice`
- Session duration:
  - 7 days default
  - 30 days with "remember me"
- Password policy:
  - Minimum 10 chars
  - Must include uppercase, lowercase, number, and special character

### Route Protection

- All non-public routes require auth.
- Public routes:
  - `/auth`
  - `/auth/verify`
  - `/auth/forgot-password`
  - `/auth/reset-password`
- Unauthenticated requests are redirected to `/auth`.

### Rate Limiting

- Global IP limiter in `hooks.server.ts`: `100` requests per minute.
- Additional in-memory auth action limits in `src/lib/server/auth/rate-limit.ts`:
  - login: 10 attempts / 15 min
  - signup: 5 attempts / 15 min
  - resend verification: 3 attempts / 15 min
  - forgot password: 3 attempts / 15 min

## Authorization Model

Roles:

- `Owner`
- `Admin`
- `Editor`
- `Member`
- `Viewer`
- `Limited Access`

Permissions are enforced per domain:

- `project`, `story`, `problem`, `idea`, `task`, `feedback`, `resource`, `page`, `calendar`, `member`

Actions per domain:

- `view`, `create`, `edit`, `delete`, `archive`, `statusChange`

Project layout (`src/routes/project/[projectId]/+layout.svelte`) gates pages using resolved effective permissions from `getProjectAccess`.

## Demo Scope Rules

For the demo account, `applyAccountWorkspaceScope` restricts visible data to one project (`atlas-2026`) and enforces viewer-level behavior. This includes:

- Pruning workspace/project lists
- Restricting artifacts to scoped project data
- Enforcing read-only membership behavior where applicable

## Data Architecture

### In-Memory Stores

- Main store: `src/lib/server/data/datastore.ts`
- Auth store: `src/lib/server/auth/store.ts`

All data is in-memory for runtime simplicity. Restarting the dev server resets state to seeded defaults.

### Seed Data

Seed files under `src/lib/server/data/*.data.ts` populate:

- workspace dashboards
- project dashboard
- stories, journeys, problems, ideas, tasks, feedback
- pages, resources, calendar
- activity streams, team members, and role-permission maps

### Remote Functions Layer

Server data access/mutations live in `src/lib/remote/*.remote.ts` using SvelteKit remote functions (`query` and `command`) and are consumed directly by route loads and page actions/components.

## Main App Flow

### Workspace Scope

- `/` workspace dashboard
- `/projects`, `/projects/new`
- `/invites`, `/notifications`, `/activity`
- `/account`
- `/docs`

### Project Scope

- `/project/[projectId]` dashboard
- Design Thinking artifacts:
  - `/stories`
  - `/journeys`
  - `/problem-statement`
  - `/ideas`
  - `/tasks`
  - `/feedback`
- Support modules:
  - `/pages`
  - `/resources`
  - `/calendar`
  - `/activity`
- Team and governance:
  - `/team/members`
  - `/team/roles`
  - `/settings`

## Key Directories

- `src/routes`: route pages and layouts
- `src/lib/remote`: server-side remote query/command API surface
- `src/lib/server/data`: in-memory seeded domain data
- `src/lib/server/auth`: auth/session/token/cookie/rate-limit logic
- `src/lib/components`: UI composition (workspace + project sidebars, shared UI primitives)
- `openapi.yaml`: API contract draft/reference artifact

## Current Limitations

- No persistent database yet (runtime in-memory state).
- No production email provider wired; verification/reset links are tracked in auth store/log flow for local behavior.
- Seeded credentials are intentionally static for local/demo development and should not be used in production.

## Notes for Future Productionization

- Replace in-memory stores with persistent storage.
- Integrate real email delivery for verification and password reset.
- Replace default seeded credentials and hardcoded demo account patterns.
- Move from `adapter-auto` to a deployment-specific adapter and infra configuration.
