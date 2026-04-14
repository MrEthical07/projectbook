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

## Documentation

- Full docs: [docs](docs)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Mental model: [docs/mental-model.md](docs/mental-model.md)
- Development guide: [docs/development-guide.md](docs/development-guide.md)

## Changelog

- Release history: [CHANGELOG.md](CHANGELOG.md)

## Architecture Summary

UI (`+page.svelte`) -> route load (`+page.ts`) -> remote functions (`src/lib/remote`) -> data modules (`src/lib/server/data`)

No service layer and no command-pattern abstraction are used.

## Contribution

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/contribution-guide.md](docs/contribution-guide.md).

## License

Licensed under Apache 2.0. See [LICENSE](LICENSE).
