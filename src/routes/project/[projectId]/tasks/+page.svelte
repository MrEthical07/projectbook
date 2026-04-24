<script lang="ts">
	import { goto, invalidate } from "$app/navigation";
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import { getContext } from "svelte";
	import {
		getTasks as getTasksRemote,
		createTask as createTaskRemote,
		updateTaskStatus as updateTaskStatusRemote
	} from "$lib/remote/task.remote";
	import { can } from "$lib/utils/permission";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Badge from "$lib/components/ui/badge";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as Table from "$lib/components/ui/table";
	import {
		ClipboardList,
		CircleDashed,
		LoaderCircle,
		CircleCheckBig,
		ArchiveX
	} from "@lucide/svelte";

	let { data } = $props();

	type TaskStatus = "Planned" | "In Progress" | "Completed" | "Abandoned";
	type ViewMode = "Table" | "Kanban";
	type TaskRow = {
		id: string;
		title: string;
		linkedIdea: string;
		linkedProblemStatement: string;
		persona: string;
		owner: string;
		deadline: string;
		lastUpdated: string;
		status: TaskStatus;
		ideaRejected: boolean;
		hasFeedback: boolean;
		isOrphan: boolean;
	};

	const statusOrder: TaskStatus[] = ["Planned", "In Progress", "Completed", "Abandoned"];
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canCreateTask = can(permissions, "task", "create");
	const canChangeTaskStatus = can(permissions, "task", "statusChange");

	let rows = $state<TaskRow[]>([]);
	let nextCursor = $state<string | null>(null);
	let isLoadingMore = $state(false);

	$effect(() => {
		rows = structuredClone(data.rows) as TaskRow[];
		nextCursor = typeof data.nextCursor === "string" && data.nextCursor.length > 0 ? data.nextCursor : null;
	});

	let viewMode = $state<ViewMode>("Table");
	let statusFilter = $state<TaskStatus | "All">("All");
	let ownerFilter = $state("All");
	let orphanOnly = $state(false);
	let updatedFrom = $state("");
	let updatedTo = $state("");

	let createOpen = $state(false);
	let createTitle = $state("");
	let createError = $state("");
	let isCreatingTask = $state(false);

	let draggingTaskId = $state("");

	let owners = $derived(["All", ...new Set(rows.map((row) => row.owner))]);
	let stats = $derived({
		total: rows.length,
		planned: rows.filter((row) => row.status === "Planned").length,
		inProgress: rows.filter((row) => row.status === "In Progress").length,
		completed: rows.filter((row) => row.status === "Completed").length,
		abandoned: rows.filter((row) => row.status === "Abandoned").length,
	});

	let filteredRows = $derived.by(() => {
		return rows.filter((row) => {
			if (statusFilter !== "All" && row.status !== statusFilter) return false;
			if (ownerFilter !== "All" && row.owner !== ownerFilter) return false;
			if (orphanOnly && !row.isOrphan) return false;
			if (updatedFrom && row.lastUpdated < updatedFrom) return false;
			if (updatedTo && row.lastUpdated > updatedTo) return false;
			return true;
		});
	});

	const statusClass = (status: TaskStatus) => {
		if (status === "Planned") return "bg-blue-500/10 text-blue-500 border-blue-500/20";
		if (status === "In Progress") return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
		if (status === "Completed") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
		return "bg-slate-500/10 text-slate-500 border-slate-500/20";
	};

	const mergeRows = (current: TaskRow[], incoming: TaskRow[]): TaskRow[] => {
		const seen = new Set(current.map((row) => row.id));
		const merged = [...current];
		for (const row of incoming) {
			if (!seen.has(row.id)) {
				seen.add(row.id);
				merged.push(row);
			}
		}
		return merged;
	};

	const loadMoreTasks = async () => {
		if (isLoadingMore || !nextCursor) {
			return;
		}
		isLoadingMore = true;
		try {
			const result = await getTasksRemote({
				projectId: page.params.projectId ?? "",
				cursor: nextCursor,
				limit: 20,
				...(statusFilter !== "All" ? { status: statusFilter } : {})
			});
			rows = mergeRows(rows, result.items as TaskRow[]);
			nextCursor = result.nextCursor;
		} catch (error) {
			console.error("Failed to load more tasks", error);
		} finally {
			isLoadingMore = false;
		}
	};

	const applyStatFilter = (target: "Total" | TaskStatus) => {
		statusFilter = target === "Total" ? "All" : target;
		orphanOnly = false;
	};

	const setViewMode = (next: ViewMode) => {
		viewMode = next;
		localStorage.setItem(`tasks-index-view-${page.params.projectId}`, next);
	};

	onMount(() => {
		const stored = localStorage.getItem(`tasks-index-view-${page.params.projectId}`);
		if (stored === "Table" || stored === "Kanban") {
			viewMode = stored;
		}
	});

	let groupedForKanban = $derived.by(() => {
		const result: Record<TaskStatus, TaskRow[]> = {
			Planned: [],
			"In Progress": [],
			Completed: [],
			Abandoned: [],
		};
		for (const row of filteredRows) {
			result[row.status].push(row);
		}
		return result;
	});

	const onDrop = async (targetStatus: TaskStatus) => {
		if (!canChangeTaskStatus) return;
		if (!permissions) return;
		if (!draggingTaskId) return;
		const taskId = draggingTaskId;
		draggingTaskId = "";
		try {
			const result = await updateTaskStatusRemote({
				input: {
					projectId: page.params.projectId,
					taskId,
					status: targetStatus
				}
			});
			if (!result.success) return;
			await invalidate((url) => url.pathname === page.url.pathname);
		} catch (error) {
			console.error("Failed to update task status", error);
		}
	};

	const createTask = async () => {
		if (isCreatingTask) return;
		createError = "";
		if (!canCreateTask) return;
		if (!permissions) {
			createError = "Permissions data is unavailable.";
			return;
		}
		const actorId = access?.user.id;
		if (!actorId) {
			createError = "Active user id is missing.";
			return;
		}
		const title = createTitle.trim();
		if (!title) return;
		isCreatingTask = true;
		try {
			const result = await createTaskRemote({
				input: {
					projectId: page.params.projectId,
					actorId,
					title
				}
			});
			if (!result.success) {
				createError = result.error;
				return;
			}
			const created = result.data as { id: string };
			createTitle = "";
			createOpen = false;
			await goto(`/project/${page.params.projectId}/tasks/${created.id}`);
		} catch (error) {
			console.error("Failed to create task", error);
			createError = "Unable to create task right now.";
		} finally {
			isCreatingTask = false;
		}
	};
</script>

<svelte:head>
	<title>Tasks • {((data as Record<string, unknown>).project as { name?: string } | undefined)?.name ?? "Project"} • ProjectBook</title>
	<meta
		name="description"
		content="Track and manage tasks derived from selected ideas."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<div class="flex flex-col gap-2 rounded-lg border bg-background p-2">
	<header
		class="flex h-12 w-full items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex w-full items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page>Tasks</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-4 py-2 md:px-20">
		<section class="rounded-lg bg-background p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">Prototype - Tasks Index</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<h1 class="text-3xl font-semibold">Tasks</h1>
				{#if canCreateTask}
					<Dialog.Root bind:open={createOpen}>
						<Dialog.Trigger>
							<Button>Add Task</Button>
						</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Create Task</Dialog.Title>
							<Dialog.Description>Creates a planned task and redirects to the task page.</Dialog.Description>
						</Dialog.Header>
						<div class="grid gap-3">
							<div class="grid gap-2">
								<Label for="task-title">Title</Label>
								<Input id="task-title" bind:value={createTitle} />
							</div>
							{#if createError}
								<p class="text-xs text-destructive">{createError}</p>
							{/if}
						</div>
						<Dialog.Footer>
							<Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
							<Button onclick={createTask} disabled={!createTitle.trim() || isCreatingTask}>
								{isCreatingTask ? "Creating..." : "Create Task"}
							</Button>
						</Dialog.Footer>
					</Dialog.Content>
					</Dialog.Root>
				{/if}
			</div>
		</section>

		<section class="grid gap-3 rounded-lg bg-background p-4 md:grid-cols-5">
			<button class="rounded-md border p-3 text-left cursor-pointer" onclick={() => applyStatFilter("Total")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Total Tasks</span><ClipboardList class="size-4" /></div>
				<div class="text-2xl font-semibold">{stats.total}</div>
			</button>
			<button class="rounded-md border p-3 text-left cursor-pointer" onclick={() => applyStatFilter("Planned")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Planned</span><CircleDashed class="size-4" /></div>
				<div class="text-2xl font-semibold text-blue-500">{stats.planned}</div>
			</button>
			<button class="rounded-md border p-3 text-left cursor-pointer" onclick={() => applyStatFilter("In Progress")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>In Progress</span><LoaderCircle class="size-4" /></div>
				<div class="text-2xl font-semibold text-indigo-500">{stats.inProgress}</div>
			</button>
			<button class="rounded-md border p-3 text-left cursor-pointer" onclick={() => applyStatFilter("Completed")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Completed</span><CircleCheckBig class="size-4" /></div>
				<div class="text-2xl font-semibold text-emerald-500">{stats.completed}</div>
			</button>
			<button class="rounded-md border p-3 text-left cursor-pointer" onclick={() => applyStatFilter("Abandoned")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Abandoned</span><ArchiveX class="size-4" /></div>
				<div class="text-2xl font-semibold text-slate-500">{stats.abandoned}</div>
			</button>
		</section>

		<section class="rounded-lg bg-background p-4">
			<div class="mb-3 text-sm font-medium">View Controls</div>
			<div class="flex items-center gap-2">
				<Button variant={viewMode === "Table" ? "default" : "outline"} onclick={() => setViewMode("Table")}>
					Table
				</Button>
				<Button variant={viewMode === "Kanban" ? "default" : "outline"} onclick={() => setViewMode("Kanban")}>
					Kanban
				</Button>
			</div>
		</section>

		<section class="rounded-lg bg-background p-4">
			<div class="mb-3 text-sm font-medium">Filters</div>
			<div class="grid gap-3 md:grid-cols-5">
				<div class="grid gap-2">
					<Label>Status</Label>
					<Select.Root type="single" bind:value={statusFilter}>
						<Select.Trigger class="w-full">{statusFilter}</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							{#each statusOrder as status (status)}
								<Select.Item value={status} label={status}>{status}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label>Owner</Label>
					<Select.Root type="single" bind:value={ownerFilter}>
						<Select.Trigger class="w-full">{ownerFilter}</Select.Trigger>
						<Select.Content>
							{#each owners as owner (owner)}
								<Select.Item value={owner} label={owner}>{owner}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label>Last Updated From</Label>
					<Input type="date" bind:value={updatedFrom} />
				</div>
				<div class="grid gap-2">
					<Label>Last Updated To</Label>
					<Input type="date" bind:value={updatedTo} />
				</div>
				<div class="flex items-end gap-2">
					<input id="task-orphan-only" type="checkbox" bind:checked={orphanOnly} />
					<Label for="task-orphan-only">Orphan Only</Label>
				</div>
			</div>
		</section>

		<section class="rounded-lg bg-background p-4">
			<div class="mb-3 text-sm font-medium">{viewMode === "Table" ? "Tasks Table" : "Tasks Kanban"}</div>
			{#if filteredRows.length === 0}
				<div class="rounded-md border border-dashed p-10 text-center">
					<div class="text-sm font-medium">No tasks found</div>
					<div class="mt-1 text-xs text-muted-foreground">
						Tasks track hypothesis execution and should stay linked to idea/problem context.
					</div>
					{#if canCreateTask}
						<div class="mt-4">
							<Button onclick={() => (createOpen = true)}>Add Task</Button>
						</div>
					{/if}
				</div>
			{:else if viewMode === "Table"}
				<div class="border rounded-md">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Task Title</Table.Head>
							<Table.Head class="text-center">Linked Idea</Table.Head>
							<Table.Head class="text-center">Linked Problem Statement</Table.Head>
							<Table.Head class="text-center">Persona</Table.Head>
							<Table.Head class="text-center">Owner</Table.Head>
							<Table.Head class="text-center">Deadline</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRows as row (row.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-wrap items-center gap-2">
										<a class="font-medium hover:underline" href={`./tasks/${row.id}`}>{row.title}</a>
										{#if row.ideaRejected}
											<Badge.Badge class="border-amber-500/20 bg-amber-500/10 text-amber-500">Warning: Linked Idea Rejected</Badge.Badge>
										{/if}
										{#if row.status === "Completed" && !row.hasFeedback}
											<Badge.Badge class="border-amber-500/20 bg-amber-500/10 text-amber-500">Warning: Completed With No Feedback</Badge.Badge>
										{/if}
										{#if row.isOrphan}
											<Badge.Badge class="border-red-500/20 bg-red-500/10 text-red-500">Warning: Orphan</Badge.Badge>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell class="text-center">{row.linkedIdea || "None"}</Table.Cell>
								<Table.Cell class="text-center">{row.linkedProblemStatement || "None"}</Table.Cell>
								<Table.Cell class="text-center">{row.persona}</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<Avatar.Root class="h-7 w-7">
											<Avatar.Fallback>
												{row.owner
													.split(" ")
													.map((part) => part[0])
													.join("")
													.slice(0, 2)}
											</Avatar.Fallback>
										</Avatar.Root>
										<span>{row.owner}</span>
									</div>
								</Table.Cell>
								<Table.Cell class="text-center">{row.deadline}</Table.Cell>
								<Table.Cell class="text-center">
									<Badge.Badge class={statusClass(row.status)}>{row.status}</Badge.Badge>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
				</div>
			{:else}
				<div class="grid gap-3 md:grid-cols-4">
					{#each statusOrder as status (status)}
						<div
							class="min-h-55 rounded-md border bg-muted/20 p-3"
							role="region"
							aria-label={`Drop zone for ${status}`}
							ondragover={(event) => event.preventDefault()}
							ondrop={() => onDrop(status)}
						>
							<div class="mb-3 flex items-center justify-between">
								<div class="text-sm font-medium">{status}</div>
								<Badge.Badge class={statusClass(status)}>{groupedForKanban[status].length}</Badge.Badge>
							</div>
							<div class="space-y-2">
								{#each groupedForKanban[status] as row (row.id)}
									<div
										class="cursor-move rounded-md border bg-background p-3"
										role="button"
										tabindex="0"
										aria-label={`Task card ${row.title}`}
										draggable={canChangeTaskStatus}
										ondragstart={() => canChangeTaskStatus && (draggingTaskId = row.id)}
									>
										<a class="text-sm font-medium hover:underline" href={`./tasks/${row.id}`}>{row.title}</a>
										<div class="mt-2 flex items-center gap-2">
											<Avatar.Root class="h-6 w-6">
												<Avatar.Fallback>
													{row.owner
														.split(" ")
														.map((part) => part[0])
														.join("")
														.slice(0, 2)}
												</Avatar.Fallback>
											</Avatar.Root>
											<span class="text-xs text-muted-foreground">{row.owner}</span>
										</div>
										<div class="mt-2 flex flex-wrap gap-2">
											<Badge.Badge variant="outline">{row.linkedIdea || "No Idea"}</Badge.Badge>
											{#if row.ideaRejected}
												<Badge.Badge class="border-amber-500/20 bg-amber-500/10 text-amber-500">Warning: Idea Rejected</Badge.Badge>
											{/if}
											{#if row.status === "Completed" && !row.hasFeedback}
												<Badge.Badge class="border-amber-500/20 bg-amber-500/10 text-amber-500">Warning: No Feedback</Badge.Badge>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
			{#if nextCursor}
				<div class="mt-3 flex justify-center">
					<Button variant="outline" onclick={loadMoreTasks} disabled={isLoadingMore}>
						{isLoadingMore ? "Loading..." : "Load More"}
					</Button>
				</div>
			{/if}
		</section>
	</div>
</div>

