# Permissions

## Permission Model

Action set used by the system:

- `view`
- `create`
- `edit`
- `delete`
- `archive`
- `statusChange`

Requested core write actions:

- `create`
- `edit`
- `delete`
- `archive`
- `statusChange`

## Domain-Based Permissions

Permissions are evaluated per domain:

- `project`
- `story`
- `problem`
- `idea`
- `task`
- `feedback`
- `resource`
- `page`
- `calendar`
- `member`

## Why Role Is Not Used Directly In UI

UI does not gate actions by role strings (`Owner`, `Admin`, etc.). It gates by effective permission booleans.

Reason:

- Roles are policy inputs.
- Effective permissions are execution outputs.

## Backend Resolves, Frontend Enforces UX

- Backend-side remote (`getProjectAccess`) resolves role to effective permissions.
- Frontend consumes effective permissions to render UX safely.
- Remote commands re-check permissions before mutation.

## Read vs Write vs Status Change

- Read: `view` controls route visibility and section access.
- Write: `create`, `edit`, `delete`, `archive` gate mutation commands.
- Status changes: `statusChange` is a separate capability from `edit`.

## UI Behavior Patterns

- Hide: actions not relevant to the user should not be shown.
- Disable: visible controls can be disabled when action is blocked.
- Block: route-level access denial when `view` is missing.
