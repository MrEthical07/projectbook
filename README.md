# ProjectBook

ProjectBook is a structured product-thinking system that transforms fragmented work into a traceable chain from user insight to validated outcomes.

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

## Why ProjectBook Exists

Most tools separate documents, tasks, and feedback into disconnected systems.
This fragmentation destroys context and breaks the reasoning behind decisions.

ProjectBook is built to enforce continuity:
every artifact is connected, every decision is traceable, and every outcome is tied back to its origin.

## System Overview

ProjectBook is not built as separate frontend and backend layers.

It is a single system where:
- the backend enforces permissions, policies, and data integrity
- the frontend reflects those rules through controlled data access and rendering

This ensures:
- consistent permission enforcement
- traceable data flow
- predictable system behavior

## System Constraints

The frontend enforces strict architectural boundaries:

- UI routes (`src/routes/**`) never call backend APIs directly — all access is routed through remote functions
- Remote functions define the only allowed query/command boundaries
- No intermediate service layer is allowed between UI and remote functions
- All mutations must pass through schema validation (Zod) before execution
- Permission checks must use bitmask-based `hasPerm` evaluation — not role-based logic
- Full-state payloads are required for mutations (no partial patching)

These constraints are enforced through structure and runtime checks, not developer convention.


## Why These Decisions Exist

ProjectBook prioritizes:
- traceability over flexibility
- explicit flow over convenience
- enforced structure over optional patterns

This leads to deliberate constraints:
- fewer abstraction layers in frontend
- strict data boundaries in backend
- controlled permission propagation

This system intentionally sacrifices flexibility to guarantee consistency, traceability, and correctness.


## Core Model

Design Thinking Flow:
Empathize → Define → Ideate → Prototype → Test

Artifact Chain:
Story → Problem → Idea → Task → Feedback

Each step is explicitly linked.
Nothing exists in isolation.


## What Makes ProjectBook Different

- Not a task manager — a structured thinking system
- Enforces artifact relationships instead of optional linking
- Eliminates context loss by design
- Makes reasoning behind decisions traceable
- Exposes orphaned artifacts instead of hiding them


## Key Capabilities

- End-to-end artifact traceability from user insight to validated outcome
- Design Thinking phases enforced as system structure, not labels
- Explicit artifact relationships with orphan-state visibility
- Permission-aware execution across UI and backend
- Structured workflow progression with enforced context continuity


## Tech Stack

- SvelteKit + Svelte 5
- TypeScript
- Vite
- Zod
- Tailwind CSS and shadcn-svelte UI components

## System Guarantees

The system ensures:

- Every operation follows a defined execution path
- Permissions are consistently enforced across UI and backend
- Data relationships remain explicit and traceable
- No hidden or implicit data mutations occur
- System behavior is deterministic under defined inputs
- No mutation can bypass validation or permission checks
- UI state always reflects backend-enforced constraints

## Tradeoffs

This architecture introduces deliberate tradeoffs:

- Reduced flexibility in favor of enforceable structure
- Increased architectural rigidity due to strict boundaries
- Additional complexity in permission propagation and cache invalidation
- Full-state mutation model increases payload size but eliminates merge conflicts and state drift

These tradeoffs are intentional to ensure consistency, traceability, and correctness.


## What This System Avoids

- No direct API calls from UI components
- No hidden data access paths
- No implicit permission checks
- No loosely defined data relationships
- No silent fallbacks or magic behavior

Clarity and enforceability are prioritized over flexibility.

## Execution Model

ProjectBook enforces a strict end-to-end execution flow:

UI → Route Load → Remote Functions → API Layer → Backend Modules → Store → Database

### Frontend
- Route-based data loading using SvelteKit load functions
- Remote functions define strict query (`query()`) and mutation (`command()`) boundaries
- All reads pass through cache-aware query handlers
- All writes pass through validated command handlers with explicit invalidation
- Local state managed via Svelte 5 runes using full-state snapshots


### Backend
- Request pipeline:
  handler → service → repository → store → database
- Policy stages:
  auth → project scope → permission resolution → RBAC → rate limiting → caching

### Example Flow

Updating a task:

1. User edits task in UI
2. Local state updates via runes
3. Remote command is triggered
4. API helper sends request to backend
5. Backend validates auth and permissions
6. Service defines transaction
7. Repository executes update via store
8. Cache invalidation is triggered
9. Updated data returns through same path

All operations follow this controlled path.
There are no alternate execution routes or hidden access paths.

## Cache System

- In-process query cache with structured tag-based invalidation
- Cache applied only to read operations (`query`)
- Explicit invalidation triggered by mutation responses
- Cache scoped by user, project, and route context

Cache correctness is enforced through explicit invalidation, not implicit TTL-based assumptions.



## Technical Decisions

- No service layer in frontend — direct remote-function model for clarity and control
- Permission-aware rendering based on backend-issued context snapshots
- Strict separation between UI, data access, and backend contracts
- Hybrid backend architecture (Go + PostgreSQL + MongoDB) for structured and flexible data handling
- Redis-backed caching with explicit invalidation strategies
- Policy-driven middleware for authentication, rate limiting, and observability

## System Design Philosophy

- Explicit over implicit behavior
- Structure over flexibility where it matters
- Security and permissions enforced at every layer
- No hidden coupling between artifacts
- Fail-fast validation over silent fallback



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

## Project Links

- Frontend: https://github.com/MrEthical07/projectbook
- Backend: https://github.com/MrEthical07/projectbook-backend
- Live App: https://projectbook.dev
- Demo: https://demo.projectbook.dev
- Auth Engine (goAuth): https://github.com/MrEthical07/goAuth

## Contribution

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/contribution-guide.md](docs/contribution-guide.md).

## License

Licensed under Apache 2.0. See [LICENSE](LICENSE).
