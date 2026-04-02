# Security Best Practices Report

## Executive summary

This codebase has a few solid building blocks, including `HttpOnly` session cookies, Argon2 password hashing, and hashed reset/verification tokens. The highest-risk issues are architectural: authorization decisions are delegated to client-supplied permission objects across remote function endpoints, the runtime seeds a known superadmin account with hard-coded credentials, and project access is derived from a global in-memory workspace user instead of the authenticated session. Those three issues together make privilege escalation and full project compromise realistic if this code is exposed beyond a local prototype.

## Critical findings

### SBP-001: Client-controlled authorization on server-side remote mutations

Impact: A low-privilege authenticated user can tamper with remote-function payloads to grant themselves permissions, modify protected artifacts, invite users, change roles, archive data, or delete project content.

- Severity: Critical
- Locations:
  - `src/lib/remote/project.remote.ts:227`
  - `src/lib/remote/project.remote.ts:295`
  - `src/lib/remote/project.remote.ts:332`
  - `src/lib/remote/story.remote.ts:166`
  - `src/lib/remote/story.remote.ts:225`
  - `src/lib/remote/page.remote.ts:159`
  - `src/lib/remote/page.remote.ts:207`
  - `src/lib/remote/problem.remote.ts:321`
  - `src/lib/remote/problem.remote.ts:371`
  - `src/routes/project/[projectId]/team/members/+page.svelte:207`
  - `src/routes/project/[projectId]/team/roles/+page.svelte:202`
  - `src/routes/project/[projectId]/team/roles/+page.svelte:229`
  - `src/routes/project/[projectId]/stories/+page.svelte:110`
  - `src/routes/project/[projectId]/stories/[slug]/+page.svelte:219`
- Evidence:
  - Server commands accept `permissions: EffectivePermissions` from the caller and immediately authorize on that object, for example `if (!canMemberCreate(permissions))` in `src/lib/remote/project.remote.ts:236` and `if (!canEditStory(permissions))` in `src/lib/remote/story.remote.ts:234`.
  - The browser sends that authority-bearing object back to the server, for example `createProjectInvite({ ..., permissions })` in `src/routes/project/[projectId]/team/members/+page.svelte:207-214` and `updateProjectRolePermissions({ ..., permissions: access.permissions })` in `src/routes/project/[projectId]/team/roles/+page.svelte:202-209`.
  - Client pages also pass caller identity fields such as `actorId` into remote mutations, for example `actorId` in `src/routes/project/[projectId]/stories/+page.svelte:102-116`, and the server trusts it in `actorNameFor(parsed.data.actorId)` at `src/lib/remote/story.remote.ts:184`.
- Why this fails secure-by-default:
  - Authorization state is attacker-controlled input.
  - The server is not deriving privileges from `event.locals.user`, a session lookup, or a server-side membership record.
  - The same pattern appears across multiple remote modules, so the blast radius is not limited to one route.
- Recommended remediation:
  - Remove `permissions` and `actorId` from all client-callable mutation inputs.
  - Derive the caller from the authenticated request on the server, then load membership and effective permissions server-side.
  - Centralize authorization in one helper such as `requireProjectPermission(event, projectId, domain, action)`.
  - Treat remote functions as public attack surfaces and validate both identity and project membership on every query and mutation.

### SBP-002: Hard-coded superadmin credentials are seeded on first request

Impact: Anyone who knows the repository can sign in as a privileged account using default credentials and gain administrative control.

- Severity: Critical
- Locations:
  - `src/lib/server/auth/constants.ts:10`
  - `src/lib/server/auth/constants.ts:11`
  - `src/hooks.server.ts:11`
  - `src/hooks.server.ts:14`
  - `src/lib/server/auth/service.ts:293`
  - `src/lib/server/auth/service.ts:304`
- Evidence:
  - The repository defines `SUPERADMIN_EMAIL = "admin@projectbook.com"` and `SUPERADMIN_PASSWORD = "admin"` in `src/lib/server/auth/constants.ts:10-11`.
  - Every process seeds that account on first request by calling `authService.seedSuperAdmin()` from the global request hook in `src/hooks.server.ts:13-17`.
  - `seedSuperAdmin()` hashes and inserts the account automatically in `src/lib/server/auth/service.ts:293-309`.
- Why this fails secure-by-default:
  - Privileged bootstrap credentials are committed in source control.
  - The account is enabled automatically instead of through a one-time, operator-controlled bootstrap path.
- Recommended remediation:
  - Delete the hard-coded superadmin credentials from source.
  - If bootstrap is required, gate it behind an explicit CLI/admin migration step or a one-time environment-provided secret that is mandatory in non-development environments.
  - Refuse startup when bootstrap secrets are missing in production-like environments.
  - Rotate any credentials that may already have been used outside local development.

## High findings

### SBP-003: Authenticated session state is disconnected from project identity and authorization

Impact: Different signed-in users can collapse onto the same effective workspace identity, causing cross-user data exposure, privilege confusion, and broken tenant isolation.

- Severity: High
- Locations:
  - `src/hooks.server.ts:21`
  - `src/hooks.server.ts:25`
  - `src/lib/server/data/datastore.ts:50`
  - `src/lib/server/data/datastore.ts:52`
  - `src/lib/remote/access.remote.ts:40`
  - `src/lib/remote/access.remote.ts:52`
  - `src/routes/project/[projectId]/+layout.ts:5`
  - `src/routes/project/[projectId]/+layout.svelte:12`
- Evidence:
  - The request hook authenticates the session cookie and places the user in `event.locals.user` in `src/hooks.server.ts:21-33`.
  - Project access does not use `event.locals.user`; instead `getProjectAccess()` derives the actor from `datastore.workspace.user` in `src/lib/remote/access.remote.ts:52-53`.
  - That backing user is a single hard-coded global object, `user: { id: "u-1", name: "Ayush", email: "ayush@projectbook.dev" }`, in `src/lib/server/data/datastore.ts:50-57`.
  - The project layout then exposes `data.access.permissions` to the client context in `src/routes/project/[projectId]/+layout.svelte:12-23`.
- Why this fails secure-by-default:
  - Authentication and authorization are handled by separate, inconsistent identity sources.
  - The code does not preserve per-user or per-tenant isolation once a request enters the project data layer.
- Recommended remediation:
  - Replace the global workspace user with a real per-session principal lookup.
  - Pass request-local identity into project loaders and remote commands, or move access derivation into server-only load functions that use `event.locals.user`.
  - Make membership and role resolution data-driven per user and per project.
  - Add integration tests proving that two different users receive different access results and cannot read or mutate each other's project data.

## Medium findings

### SBP-004: Sessions, reset tokens, verification tokens, and rate limits are stored only in process memory

Impact: Restarts invalidate security state, multi-instance deployments create inconsistent auth behavior, and IP throttling becomes easy to bypass by distributing requests across instances.

- Severity: Medium
- Locations:
  - `src/lib/server/auth/store.ts:17`
  - `src/lib/server/auth/store.ts:18`
  - `src/lib/server/auth/store.ts:21`
  - `src/lib/server/auth/rate-limit.ts:1`
  - `src/lib/server/auth/service.ts:162`
  - `src/lib/server/auth/service.ts:179`
- Evidence:
  - Authentication state lives in in-memory arrays under `authStore` in `src/lib/server/auth/store.ts:17-23`.
  - Rate limiting uses a process-local `Map` in `src/lib/server/auth/rate-limit.ts:1-21`.
  - Sessions are created and appended to that in-memory store in `src/lib/server/auth/service.ts:162-181`.
- Why this fails secure-by-default:
  - Security controls depend on process lifetime instead of durable/shared state.
  - Horizontal scaling or server restarts weaken or break auth invariants.
- Recommended remediation:
  - Move sessions, reset tokens, verification tokens, and rate-limit counters into durable/shared storage such as a database or Redis.
  - Add expiry enforcement in that shared layer.
  - If this repository is still a prototype, clearly document that the current auth store is development-only and must not be internet exposed as-is.

### SBP-005: Authentication and verification flows leak account state through user-facing errors

Impact: An attacker can enumerate valid email addresses and account state, improving credential stuffing, phishing, and targeted password-reset attacks.

- Severity: Medium
- Locations:
  - `src/lib/server/auth/service.ts:151`
  - `src/lib/server/auth/service.ts:231`
  - `src/routes/auth/+page.server.ts:57`
  - `src/routes/auth/verify/+page.server.ts:50`
  - `src/routes/auth/+page.server.ts:95`
- Evidence:
  - Login distinguishes `email_unverified` from `invalid_credentials` in `src/lib/server/auth/service.ts:151-153`, and returns a distinct user-facing message in `src/routes/auth/+page.server.ts:57-65`.
  - Resend verification distinguishes `not_found` from `already_verified` in `src/lib/server/auth/service.ts:231-242`, and the page returns different errors in `src/routes/auth/verify/+page.server.ts:50-60`.
  - Signup also confirms that an email is already registered in `src/routes/auth/+page.server.ts:95-98`.
- Recommended remediation:
  - Return a generic response such as "If the account is eligible, we sent instructions."
  - Log the internal reason server-side for operators instead of exposing it to the user.
  - Keep rate limits, device fingerprinting, and alerting on top of the generic responses.

## Low findings

### SBP-006: No CSP or baseline browser security headers are visible in application code

Impact: If edge infrastructure is not adding them, the app misses important defense-in-depth controls against XSS, clickjacking, and content-type confusion.

- Severity: Low
- Locations:
  - `src/app.html:1`
  - `src/hooks.server.ts:46`
  - `svelte.config.js:12`
- Evidence:
  - `src/app.html:1-10` contains no CSP meta tag or other browser security directives.
  - `src/hooks.server.ts:46` returns `resolve(event)` without adding security headers.
  - `svelte.config.js:12-20` enables remote functions but does not configure any security header behavior.
- False-positive note:
  - These headers may be set by a reverse proxy, CDN, or hosting platform and are not visible in this repository.
- Recommended remediation:
  - Verify runtime responses for at least `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, clickjacking protection (`frame-ancestors` or `X-Frame-Options`), and a restrictive `Referrer-Policy`.
  - If no edge layer exists, add those headers in the SvelteKit server path.

## Existing strengths

- `src/lib/server/auth/cookies.ts:5-20` sets session cookies `HttpOnly`, `SameSite="strict"`, and `Secure` outside development.
- `src/lib/server/auth/password.ts:1-15` uses Argon2 for password hashing.
- `src/lib/server/auth/service.ts:168-181` and `src/lib/server/auth/service.ts:209-214` avoid storing raw session/reset/verification tokens by hashing tokens before lookup.
- `src/routes/auth/forgot-password/+page.server.ts:12-24` returns a generic success path for password reset requests, which is a better anti-enumeration pattern than the other auth flows.

## Secure-by-default priorities

1. Rebuild remote-function authorization so the server derives identity and permissions from the authenticated session, never from client input.
2. Remove the default superadmin bootstrap path and replace it with an explicit operator-controlled initialization flow.
3. Replace global in-memory identity and auth state with per-user, durable storage and server-side membership checks.
4. Normalize auth error messages and move the remaining security state into shared storage.
5. Verify or add baseline browser security headers before internet exposure.
