# ProjectBook

A Design Thinking-first platform for building people-centric projects without context fragmentation.

## What It Is

ProjectBook is a SvelteKit application for structuring product work from research to validation. It keeps artifacts connected so teams can follow decisions across the full workflow.

## Problem It Solves

Teams lose context when work is split across documents, boards, and chat. ProjectBook reduces that fragmentation by keeping linked artifacts in one project flow.

## Core Concept

Design Thinking workflow:

Empathize -> Define -> Ideate -> Prototype -> Test

Artifact chain:

Story -> Problem -> Idea -> Task -> Feedback

## Key Features

- Design Thinking phase-based workflow.
- Linked artifacts with traceable context.
- Explicit orphan-state visibility.
- Role/permission-aware project access.

## Tech Stack

- SvelteKit + Svelte 5
- TypeScript
- Vite
- Zod
- Tailwind CSS and shadcn-svelte UI components

## Getting Started

```bash
pnpm install
pnpm run dev
```

## Docker (Production)

Build the production image from the web repository root:

```bash
docker build -t projectbook-web:prod .
```

Run the image with runtime-injected configuration:

```bash
docker run --rm -p 3000:3000 \
	-e PROJECTBOOK_API_BASE_URL=http://host.docker.internal:8080/api/v1 \
	-e API_URL=http://host.docker.internal:8080 \
	-e NODE_ENV=production \
	-e HOST=0.0.0.0 \
	projectbook-web:prod
```

Container notes:
- The image does not bundle secrets or `.env` files.
- Runtime configuration is provided through environment variables.
- The backend API is an external dependency and is not bundled into the web image.

## Documentation

- Full docs: [docs](docs)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Mental model: [docs/mental-model.md](docs/mental-model.md)
- Development guide: [docs/development-guide.md](docs/development-guide.md)

## Changelog

- Release history: [CHANGELOG.md](CHANGELOG.md)

## Architecture Summary

UI (`+page.svelte`) -> route load (`+page.ts`) -> remote functions (`src/lib/remote`) -> API helpers (`src/lib/server/api`) -> backend (`/api/v1/*`)

No service layer and no command-pattern abstraction are used.

Auth and permission hydration:
- Access/refresh tokens are stored in HttpOnly cookies.
- Frontend server hooks hydrate locals from backend-issued `/api/v1/system/session-context` token snapshots (`projectbook_permission_ctx`) instead of per-request `whoami` calls.

## Contribution

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/contribution-guide.md](docs/contribution-guide.md).

## License

Licensed under Apache 2.0. See [LICENSE](LICENSE).
