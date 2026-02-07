# Bug Report and Edge Cases Analysis

This document outlines the bugs, edge cases, and architectural limitations identified in the current implementation of the project.

## 1. General Architecture & State Management

**File Path:** Multiple Files (e.g., `src/routes/project/[projectId]/tasks/+page.svelte`, `src/routes/project/[projectId]/calendar/+page.svelte`, etc.)

**Bug Location:** State Initialization (`let rows = $state(...)`, `let events = $state(...)`)

**Issue Description:**
The application relies heavily on component-local state using `$state` initialized with mock data.
- **Data Persistence:** Data created or modified in one page (e.g., "Add Task") is not persisted to a backend or even a shared client-side store. Navigating away and back resets the state to the initial mock data.
- **State Isolation:** Pages like `tasks/+page.svelte` (list) and `tasks/[slug]/+page.svelte` (detail) do not share data. Creating a task in the list view does not make it available in the detail view. The detail view always shows default or empty state regardless of the URL slug.

**Possible Solution:**
- Implement a centralized store (using Svelte 5 `svelte/store` or a global `$state` object in a `.svelte.ts` module) to share data between pages.
- Integrate a backend or use `localStorage` for more robust persistence during prototyping.

---

## 2. Dashboard (`src/routes/project/[projectId]/+page.svelte`)

**File Path:** `src/routes/project/[projectId]/+page.svelte`

**Bug Location:** Link Construction in Template

**Issue Description:**
- **Double Slashes:** The construction `href={"/project/" + projectId + item.href}` results in double slashes (e.g., `/project/123//tasks...`) because `item.href` typically starts with `/`.
- **Relative Links:** Stat cards use `href={card.href}` where `card.href` is like `/tasks`. This resolves relative to the current URL, potentially leading to incorrect paths depending on the current route depth, or if intended to be root-relative, it misses the project context.
- **Recent Activity Targets:** `item.targetHref` is used directly. If these paths are intended to be within the project context, they are missing the `/project/[projectId]` prefix.

**Bug Location:** Date Handling

**Issue Description:**
- **Timezone Naivety:** `toLocalIsoDate` uses `getMonth() + 1` and `getDate()` which operates on local time. This may cause inconsistencies across timezones if the app scales or if server/client times differ.

**Possible Solution:**
- Use a robust URL construction utility or ensure consistent leading/trailing slash handling.
- Use a date library like `date-fns` or `@internationalized/date` consistently for date manipulations.

---

## 3. Task List (`src/routes/project/[projectId]/tasks/+page.svelte`)

**File Path:** `src/routes/project/[projectId]/tasks/+page.svelte`

**Bug Location:** `onDrop` function and `filteredRows`

**Issue Description:**
- **Kanban State:** Drag-and-drop updates the local `rows` state. However, due to the lack of persistence, these changes are lost on navigation.
- **Filter Logic:** Filtering by date (`updatedFrom`, `updatedTo`) uses simple string comparison on "YYYY-MM-DD". While functional for ISO strings, it lacks validation for missing or malformed dates.

**Bug Location:** `createTask` function

**Issue Description:**
- **Navigation Disconnect:** `createTask` adds a task to the local `rows` array and navigates to the detail page. The detail page, being isolated, does not know about this new task and displays a default state.

**Possible Solution:**
- Connect `createTask` to a shared store.
- Pass the new task data via state or ensure the detail page fetches it from the store using the ID.

---

## 4. Task Detail (`src/routes/project/[projectId]/tasks/[slug]/+page.svelte`)

**File Path:** `src/routes/project/[projectId]/tasks/[slug]/+page.svelte`

**Bug Location:** `handlePlanDrop` and `{#each planItems ... (index)}`

**Issue Description:**
- **Keyed by Index:** The drag-and-drop list for plan items uses `index` as the key (`(index)`). This is an anti-pattern in Svelte (and React) for reorderable lists. It can lead to focus loss, state mix-ups, and animation glitches because the framework reuses the DOM element at index 0 for the new data at index 0, rather than moving the element.

**Bug Location:** Status Logic

**Issue Description:**
- **Lock-out:** When a task status is set to "Completed" or "Abandoned", `isReadOnly` becomes true. This disables the "Change Status" button, making it impossible to reopen the task or correct a mistake. This is a significant UX trap.

**Bug Location:** Initialization

**Issue Description:**
- **Ignoring Slug:** The page initializes with default empty values regardless of the `slug` in the URL. It does not attempt to fetch or look up task data.

**Possible Solution:**
- Use unique IDs for plan items and execution links instead of indices.
- Allow status changes even when completed (perhaps via a specific "Reopen" action).
- Implement data fetching based on `page.params.slug`.

---

## 5. Calendar (`src/routes/project/[projectId]/calendar/+page.svelte`)

**File Path:** `src/routes/project/[projectId]/calendar/+page.svelte`

**Bug Location:** Imports

**Issue Description:**
- **`SvelteDate`:** The code imports `SvelteDate` from `svelte/reactivity`. This export does not exist in standard Svelte 5. This will likely cause a runtime error. It should use standard `Date` or a wrapped reactive date object.

**Bug Location:** `createEvent`

**Issue Description:**
- **Validation:** There is no validation to ensure `endTime` is after `startTime`.
- **Persistence:** Created events are stored in local state and lost on navigation.

**Bug Location:** `goPrevMonth` / `goNextMonth`

**Issue Description:**
- **Mutation:** The navigation logic modifies `currentMonth` string by creating a date object, modifying it, and converting back to string. If `SvelteDate` is just `Date`, this works logic-wise but relies on the non-existent import.

**Possible Solution:**
- Remove `SvelteDate` import and use standard `Date` with `DateFormatter` or `@internationalized/date`.
- Add validation for time ranges.

---

## 6. Calendar Event Detail (`src/routes/project/[projectId]/calendar/[eventId]/+page.svelte`)

**File Path:** `src/routes/project/[projectId]/calendar/[eventId]/+page.svelte`

**Bug Location:** Initialization

**Issue Description:**
- **Hardcoded Event:** The page initializes `event` with a hardcoded "Weekly prototype review" object. It ignores `page.params.eventId`, so every event URL shows the same data.

**Bug Location:** Actions

**Issue Description:**
- **Delete Action:** The delete confirmation dialog's action is `onclick={() => {}}` (empty function). It does nothing.
- **Save Action:** `triggerSave` updates local state and simulates a network delay, but does not actually persist data anywhere.

**Bug Location:** Template Variable Shadowing

**Issue Description:**
- **Variable Shadowing:** In `Select.Root`, the `onSelectedChange` handler uses `(event) => addLinkedArtifact(event.detail.value)`. While `addLinkedArtifact` correctly uses the component-level `event` state, shadowing the `event` variable name in the handler arguments can lead to confusion and potential bugs if the handler logic expands.

**Possible Solution:**
- Implement data lookup by ID.
- Implement delete logic (updating shared store).
- Rename the handler argument to `e` or `changeEvent` to avoid shadowing.

---

## 7. Notifications (`src/routes/notifications/+page.svelte`)

**File Path:** `src/routes/notifications/+page.svelte`

**Bug Location:** Data Source

**Issue Description:**
- **Mock Data:** Notifications are hardcoded.
- **Dismissal:** Dismissing a notification removes it from the view (via filter) but does not persist this state. Refreshing the page brings it back.

**Possible Solution:**
- Persist read/dismissed state.

---

## 8. Invites (`src/routes/invites/+page.svelte`)

**File Path:** `src/routes/invites/+page.svelte`

**Bug Location:** Actions

**Issue Description:**
- **Persistence:** Accepting or declining invites modifies local state only.
- **Empty State:** If all invites are handled, the empty state is shown, but a refresh resets everything.

**Possible Solution:**
- Integrate with project/user store to actually add the user to a project.

---

## 9. Add Project (`src/routes/add-project/+page.svelte`)

**File Path:** `src/routes/add-project/+page.svelte`

**Bug Location:** `validateEmails` and `addInviteRow`

**Issue Description:**
- **Empty Email Validation:** The `validateEmails` function returns `true` (valid) if an email field is empty (because `!trimmed` returns `""` which is falsy, so `!err` is true). This allows users to add multiple empty rows and "send" invites to them.
- **Persistence:** The `createProject` action validates the name against a hardcoded list but does not actually create a project in any store.

**Bug Location:** `sendInvites`

**Issue Description:**
- **No-op:** `sendInvites` simulates saving but performs no logic to actually send invites or store them.

**Possible Solution:**
- Filter out empty email strings before processing/validating.
- Implement project creation logic.

---

## 10. Sidebar & Navigation (`src/lib/components/sidebar/subMenu.svelte`)

**File Path:** `src/lib/components/sidebar/subMenu.svelte`

**Bug Location:** Actions

**Issue Description:**
- **Unimplemented Actions:** The `add` function calls `alert("add")`.
- **Broken Dropdown:** "Rename" and "Delete" dropdown items have no `onclick` handlers.
- **Snippet Usage:** The usage of snippets like `{#snippet child({ props })}` inside `Collapsible.Root` and `DropdownMenu` components depends on specific library implementations (likely `bits-ui` or similar patterns in `shadcn-svelte`). If the underlying components don't support this slot prop pattern exactly as used, it may result in rendering issues or non-functional props.
- **Nested Anchors:** `Sidebar.MenuSubButton` often renders as a button or link. Placing an `<a>` tag inside it might create illegal nested interactive elements depending on the implementation of `MenuSubButton`.

**File Path:** `src/lib/components/sidebar/app-sidebar.svelte`

**Bug Location:** Active Path Logic

**Issue Description:**
- **Fragile Path Parsing:** The logic to determine the active path relies on splitting `page.url.pathname`.
    - If the URL is `/project/123`, it correctly identifies root.
    - If the URL does not contain `project/` (e.g. `/my-account`), the fallback logic might incorrectly identify the dashboard as active or fail to highlight anything.
    - It uses a hardcoded `dummyProjectId` fallback which might not match any real project context.

**Possible Solution:**
- Implement real actions for sidebar items.
- Use a more robust routing/matching logic (e.g., SvelteKit's `page.route.id`).

---
