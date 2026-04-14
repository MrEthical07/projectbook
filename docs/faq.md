# FAQ

## How does the frontend talk to the backend?

Route loaders and actions call remote functions, and remotes call backend endpoints through `src/lib/server/api/remote.ts` helpers. This keeps the page contract stable while allowing backend payload normalization in one place.

## What happens if the API is down?

Network and backend-unavailable failures are normalized into structured API errors. The UI receives a consistent message: backend API is unavailable, with a retry hint (and local-dev hint to start the backend server).

## Why no auto-save?

Explicit Save keeps writes intentional, avoids noisy updates during drafting, and makes permission or validation failures visible at commit time.

## Why no service layer?

Remote files already contain boundary logic (validation, permissions, mapping, mutation result handling). Adding a service layer would duplicate responsibility and increase complexity.

## Why full object replacement instead of patching?

Snapshot-style saves keep behavior deterministic and reduce drift from partial updates. Remote commands derive normalized persisted fields from a complete editor state.

## Why enforce Design Thinking structure?

The system is built for context continuity across phases. Phase-linked artifacts make decisions traceable from user signal to tested outcome.
