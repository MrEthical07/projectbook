# ProjectBook RBAC Matrix and Artifact Impact

## 1. Scope and Source of Truth

This RBAC document is grounded in:

- role values in [src/lib/constants/member-roles.ts](src/lib/constants/member-roles.ts)
- permission domains/actions in [src/lib/constants/permissions.ts](src/lib/constants/permissions.ts)
- default matrix in [src/lib/server/data/project.data.ts](src/lib/server/data/project.data.ts)
- API semantics in [API-GUIDELINES.md](API-GUIDELINES.md)
- enforcement paths in [src/lib/remote/project.remote.ts](src/lib/remote/project.remote.ts) and [src/lib/utils/permission.ts](src/lib/utils/permission.ts)

This is the matrix shown and edited in the team roles page at [src/routes/project/[projectId]/team/roles/+page.svelte](src/routes/project/[projectId]/team/roles/+page.svelte).

## 2. Roles

- Owner
- Admin
- Editor
- Member
- Viewer
- Limited Access

### Role invariants

- Owner permissions are full and should not be modified through role-permission APIs.
- Owner role cannot be assigned through member role update API.
- Project role permissions are project-scoped and override defaults for non-owner roles.
- Permission checks are always server-side.

## 3. Permission Model

### 3.1 Domains

- `project`
- `story` (also governs journeys)
- `problem`
- `idea`
- `task`
- `feedback`
- `resource`
- `page`
- `calendar`
- `member`

### 3.2 Actions

- `view`
- `create`
- `edit`
- `delete`
- `archive`
- `statusChange`

## 4. Full Default Matrix (Team Roles Page)

Legend: `Y` = allowed, `N` = denied

### 4.1 Owner

| Domain | view | create | edit | delete | archive | statusChange |
| --- | --- | --- | --- | --- | --- | --- |
| project | Y | Y | Y | Y | Y | Y |
| story | Y | Y | Y | Y | Y | Y |
| problem | Y | Y | Y | Y | Y | Y |
| idea | Y | Y | Y | Y | Y | Y |
| task | Y | Y | Y | Y | Y | Y |
| feedback | Y | Y | Y | Y | Y | Y |
| resource | Y | Y | Y | Y | Y | Y |
| page | Y | Y | Y | Y | Y | Y |
| calendar | Y | Y | Y | Y | Y | Y |
| member | Y | Y | Y | Y | Y | Y |

### 4.2 Admin

| Domain | view | create | edit | delete | archive | statusChange |
| --- | --- | --- | --- | --- | --- | --- |
| project | Y | N | Y | N | Y | Y |
| story | Y | Y | Y | Y | Y | Y |
| problem | Y | Y | Y | Y | Y | Y |
| idea | Y | Y | Y | Y | Y | Y |
| task | Y | Y | Y | Y | Y | Y |
| feedback | Y | Y | Y | Y | Y | Y |
| resource | Y | Y | Y | Y | Y | Y |
| page | Y | Y | Y | Y | Y | Y |
| calendar | Y | Y | Y | Y | Y | Y |
| member | Y | Y | Y | Y | N | Y |

### 4.3 Editor

| Domain | view | create | edit | delete | archive | statusChange |
| --- | --- | --- | --- | --- | --- | --- |
| project | Y | N | N | N | N | N |
| story | Y | Y | Y | N | N | Y |
| problem | Y | Y | Y | N | N | Y |
| idea | Y | Y | Y | N | N | Y |
| task | Y | Y | Y | N | N | Y |
| feedback | Y | Y | Y | N | N | Y |
| resource | Y | Y | Y | N | N | N |
| page | Y | Y | Y | N | N | N |
| calendar | Y | Y | Y | N | N | N |
| member | Y | N | N | N | N | N |

### 4.4 Member

| Domain | view | create | edit | delete | archive | statusChange |
| --- | --- | --- | --- | --- | --- | --- |
| project | Y | N | N | N | N | N |
| story | Y | Y | Y | N | N | N |
| problem | Y | Y | Y | N | N | N |
| idea | Y | Y | Y | N | N | N |
| task | Y | Y | Y | N | N | Y |
| feedback | Y | Y | Y | N | N | Y |
| resource | Y | Y | Y | N | N | N |
| page | Y | Y | Y | N | N | N |
| calendar | Y | Y | N | N | N | N |
| member | N | N | N | N | N | N |

### 4.5 Viewer

| Domain | view | create | edit | delete | archive | statusChange |
| --- | --- | --- | --- | --- | --- | --- |
| project | Y | N | N | N | N | N |
| story | Y | N | N | N | N | N |
| problem | Y | N | N | N | N | N |
| idea | Y | N | N | N | N | N |
| task | Y | N | N | N | N | N |
| feedback | Y | N | N | N | N | N |
| resource | Y | N | N | N | N | N |
| page | Y | N | N | N | N | N |
| calendar | Y | N | N | N | N | N |
| member | Y | N | N | N | N | N |

### 4.6 Limited Access

| Domain | view | create | edit | delete | archive | statusChange |
| --- | --- | --- | --- | --- | --- | --- |
| project | N | N | N | N | N | N |
| story | N | N | N | N | N | N |
| problem | N | N | N | N | N | N |
| idea | N | N | N | N | N | N |
| task | N | N | N | N | N | N |
| feedback | N | N | N | N | N | N |
| resource | N | N | N | N | N | N |
| page | N | N | N | N | N | N |
| calendar | N | N | N | N | N | N |
| member | N | N | N | N | N | N |

## 5. Artifact Impact by Domain

### 5.1 `story` domain impact (stories and journeys)

- Controls story endpoints and journey endpoints.
- `statusChange` controls:
  - story: `Draft`, `Locked`, `Archived`
  - journey: `Draft`, `Archived`
- If denied, users can still read/edit only if corresponding `view`/`edit` is true.

### 5.2 `problem` domain impact

- Controls create/update/lock/status change for problem statements.
- `statusChange` is required for `Draft`/`Locked`/`Archived` transitions.
- Locking problems impacts idea lifecycle because idea selection requires linked problem locked.

### 5.3 `idea` domain impact

- Controls create/update/select/status change for ideas.
- `statusChange` governs transitions across `Considered`, `Selected`, `Rejected`, `Archived`.

### 5.4 `task` domain impact

- Controls create/update/status change for tasks.
- `statusChange` governs transitions across `Planned`, `In Progress`, `Completed`, `Blocked`, `Abandoned`.

### 5.5 `feedback` domain impact

- Controls create/update of feedback artifacts.
- `statusChange` is enabled for roles that can drive feedback lifecycle decisions in team workflows.

### 5.6 `resource` domain impact

- Controls create/update/delete/archive/status operations for resources and version-management operations.
- In default matrix, Editor and Member cannot `statusChange` resources.

### 5.7 `page` domain impact

- Controls create/update/delete/archive/status operations for pages.
- In default matrix, Editor and Member cannot `statusChange` pages.

### 5.8 `calendar` domain impact

- Controls manual calendar event create/update/delete/archive/status operations.
- Derived events are always read-only by business rule even if role has edit/delete.
- In default matrix, Member can create but cannot edit calendar events.

### 5.9 `member` domain impact

- Controls team and invite management:
  - `create`: send invite
  - `delete`: cancel invite
  - `edit`: update member role and role-permission matrix
  - `view`: access members/roles pages
- Admin has `member.archive = N` in default matrix.

### 5.10 `project` domain impact

- Controls project settings update, project archive, and delete.
- Admin can archive project but cannot delete project by default.
- Editor/Member/Viewer cannot mutate project settings by default.

## 6. Action Semantics

- `view`: read/list/get access
- `create`: new artifact/member invite creation
- `edit`: update content or mutable metadata
- `delete`: destructive removal (where API allows)
- `archive`: logical archive/unarchive behavior
- `statusChange`: explicit lifecycle transitions

## 7. Artifact Lifecycle Permissions

| Artifact | Domain | Status field | Action needed for transition |
| --- | --- | --- | --- |
| Story | story | `Draft`/`Locked`/`Archived` | `story.statusChange` |
| Journey | story | `Draft`/`Archived` | `story.statusChange` |
| Problem | problem | `Draft`/`Locked`/`Archived` | `problem.statusChange` |
| Idea | idea | `Considered`/`Selected`/`Rejected`/`Archived` | `idea.statusChange` |
| Task | task | `Planned`/`In Progress`/`Completed`/`Abandoned`/`Blocked` | `task.statusChange` |
| Resource | resource | `Active`/`Archived` | `resource.statusChange` |
| Page | page | `Draft`/`Archived` | `page.statusChange` |
| Calendar Event | calendar | lifecycle via event mutation | `calendar.statusChange` where applicable |

## 8. Role Impact Summary Across Artifacts

| Role | Practical artifact impact |
| --- | --- |
| Owner | Full control across all artifacts, project, and team permissions |
| Admin | Full artifact control, strong team control, no project delete, no member archive |
| Editor | Can create/edit all artifact types, no deletes/archives, selective status transitions |
| Member | Can create/edit most artifacts, task/feedback status transitions only, no team management |
| Viewer | Read-only access to artifacts and member list |
| Limited Access | No artifact access |

## 9. Team Roles Page Behavior

- The roles page renders all domain/action toggles for each role.
- Changes are persisted per project via role-permission update endpoint.
- Owner role remains immutable by API rule.
- Effective permissions are evaluated at request time through `can(permissions, domain, action)`.

## 10. Implementation Notes

- Keep this matrix synchronized with `rolePermissionsData` in [src/lib/server/data/project.data.ts](src/lib/server/data/project.data.ts).
- If new domains or actions are introduced, update:
  - constants in [src/lib/constants/permissions.ts](src/lib/constants/permissions.ts)
  - RBAC type contracts in [src/app.d.ts](src/app.d.ts)
  - team roles UI in [src/routes/project/[projectId]/team/roles/+page.svelte](src/routes/project/[projectId]/team/roles/+page.svelte)
  - this file.
