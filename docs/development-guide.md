# Development Guide

## Run The Project

```bash
pnpm install
pnpm dev
```

## Environment Setup

Set these server-side env vars for local auth + API integration:

- `PROJECTBOOK_API_BASE_URL` (for example `http://localhost:8080/api/v1`)
- `API_URL` (optional fallback alias when `PROJECTBOOK_API_BASE_URL` is unset)

Frontend server auth relies on backend-issued session context responses and no longer requires frontend-side permission-context secret verification.

## Folder Structure (Working View)

- `src/routes/**`: route UI and loaders.
- `src/lib/remote/**`: read/write boundary functions.
- `src/lib/server/api/**`: API transport, auth calls, and error mapping.
- `src/lib/server/auth/**`: cookie and auth helpers.
- `src/lib/components/**`: shared UI.
- `src/lib/utils/**`: small shared helpers.

## Add A New Artifact

1. Add backend routes/DTO handling for the artifact under the backend module.
2. Create a remote file in `src/lib/remote/<artifact>.remote.ts`.
3. Add read and write functions (`query` for reads, `command` for writes) with Zod validation and `remoteQueryRequest`/`remoteMutationRequest` calls.
4. Add frontend mapping to preserve page payload shape expected by loaders and pages.
5. Add route pages:
   - Index: `src/routes/project/[projectId]/<artifact>/+page.ts` and `+page.svelte`
   - Detail: `src/routes/project/[projectId]/<artifact>/[slug]/+page.ts` and `+page.svelte`
6. Hook artifact into sidebar/navigation data so users can reach index and detail routes.

## Add A New Field To An Existing Artifact

1. Add the field to shared type definitions in `src/app.d.ts`.
2. Update backend DTO/repository/service payloads for the field.
3. Update remote read mapping and write payload mapping.
4. Update remote write validation and normalization logic.
5. Bind field in detail page UI and include it in Save payload/signature tracking.

## Modify Remote Functions Safely

1. Keep input as `unknown` and parse with Zod.
2. Enforce permission checks before mutation.
3. Validate linked references and status transitions for client input.
4. Encode all path params with `encodePathSegment`.
5. Return consistent mutation result shape.
5. Avoid introducing service-layer indirection.
