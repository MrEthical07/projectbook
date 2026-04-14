# Data Flow

## Read Flow

page -> `page.ts` -> remote -> API client -> backend

1. `+page.svelte` renders props.
2. `+page.ts` calls a remote query.
3. Remote query validates scope and calls backend API through `remoteQueryRequest`.
4. Page receives shaped data.

## Write Flow

UI edit -> Save button -> remote update command -> backend mutation

1. User edits local page state.
2. User clicks Save.
3. UI sends a full editor state payload to remote command.
4. Remote validates input, permissions, and payload shape.
5. Remote sends mutation payload through `remoteMutationRequest`.
6. Remote maps backend response to the page contract.

## Full Replacement Strategy

Write commands are snapshot-based at the UI contract level, even when backend endpoints support partial updates.

- UI sends full editable state for the screen.
- Remote derives and normalizes backend payload fields from that state.
- Remote maps backend responses back to stable page-friendly shapes.

This keeps behavior deterministic and reduces partial-update drift.

## Why No Auto-Save

- Prevents noisy writes while users are still drafting.
- Makes permission failures explicit at commit time.
- Keeps status transitions and linked artifact rules intentional.

## Why Validation Lives In Remote

- UI state can be stale or manipulated.
- Remote is the trust boundary before mutation.
- Centralized validation and mapping keeps behavior consistent across pages.
