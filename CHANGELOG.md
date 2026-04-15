# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] - 2026-04-14

### Changed

- Completed migration to a home/project information model across routes, remotes, datastore, and shared types.
- Unified API contracts and implementation naming around `/home/*` and project-centric terminology.
- Updated architecture, security, and legal documentation to match the new home/project model.
- Migrated all frontend remote modules in `src/lib/remote` from datastore-backed logic to backend API-backed requests via `src/lib/server/api/remote.ts`.
- Updated artifact remotes (`problem`, `idea`, `task`, `feedback`, `page`, `resource`, `calendar`) to preserve page payload contracts while mapping backend response shapes.
- Switched frontend auth actions and request lifecycle to backend auth API integration with access/refresh token cookie handling (`projectbook_access`, `projectbook_refresh`).
- Switched permission context from frontend-signed cookies to backend-issued session-context tokens (`projectbook_permission_ctx`) with 30-minute expiry and hook-level locals hydration.
- Hardened permission-context secret resolution so production runtime requires a non-default `PROJECTBOOK_PERMISSION_CONTEXT_SECRET` (32+ chars), while dev retains explicit fallback behavior.

### Fixed

- API transport now normalizes network-unavailable failures into structured 503 responses with user-facing guidance, instead of leaking low-level fetch errors.
- Removed redundant per-request identity fetch path by consuming backend session-context token snapshots in hooks.

### Removed

- Deprecated compatibility modules tied to the legacy tenant-oriented model.

### Security

- Enforced session-principal ownership for mutation actor resolution in remote handlers.

## [0.5.0] - 2026-04-05

### Added

- Public project governance files: license, contributing guide, code of conduct, security policy.
- GitHub issue and pull request templates.
- CI workflow with required PR gate running both check and build jobs.
- Comprehensive architecture and contributor documentation under docs.
- Repository-level reference docs for RBAC and database design.

### Changed

- README rewritten for public release readiness.
- In-memory sample data trimmed and anonymized to a minimal neutral baseline.
- Package version set to 0.5.0 for the first official public tag.

### Security

- Removed superadmin auto-seeding and hardcoded superadmin credentials.
- Added request-aware authorization utility for trusted access resolution.
- Hardened remote mutation handlers to derive permissions server-side and ignore caller-supplied permissions.

### Fixed

- Sidebar remote import path updated to ensure module resolution consistency.
- Repository ignore rules updated for release artifacts and local files.
