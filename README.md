# ProjectBook

ProjectBook is a Design Thinking–first workspace that transforms fragmented project work into a structured, traceable flow from user insight to validated outcomes.

## What It Is

ProjectBook is a next-generation project workspace designed around Design Thinking as a first-class system, not just a methodology.

Unlike traditional tools that isolate documents, tasks, and feedback, ProjectBook models product development as a connected chain of artifacts — from user stories and problem statements to ideas, prototype tasks, and real-world feedback. Every decision is traceable, every artifact is linked, and context is never lost.

At its core, ProjectBook enforces a structured thinking model:

Insights lead to problems
Problems lead to ideas
Ideas lead to experiments
Experiments lead to learning

This ensures teams don’t just execute — they understand why they’re building what they build.

Built using SvelteKit with Svelte 5 runes, the platform delivers a highly reactive, modular UI with strict data boundaries, permission-aware rendering, and efficient server communication via remote functions. Combined with a hybrid backend architecture (Go + PostgreSQL + MongoDB), ProjectBook provides both flexibility and rigor.

The result is a system that doesn’t just manage work — it preserves thinking.

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

### Note
The projectbook requires fully configured and running backend api to work properly. Please refer to the [ProjectBook Backend](https://github.com/MrEthical07/projectbook-backend) repository for setup instructions. Make sure all env variables are properly set and the backend is running before starting the web application.

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

## Important Links
- ProjectBook website: [projectbook.design](https://projectbook.dev)
- ProjectBook Backend: [github.com/MrEthical07/projectbook-backend](https://github.com/MrEthical07/projectbook-backend)
- ProjectBook Demo: [demo.projectbook.dev](https://demo.projectbook.dev)

## Contribution

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/contribution-guide.md](docs/contribution-guide.md).

## License

Licensed under Apache 2.0. See [LICENSE](LICENSE).
