<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { onMount } from "svelte";
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
    import { store } from "$lib/stores.svelte";
    import type { TaskRow, TaskStatus, ViewMode } from "$lib/types";

	const projectId = $derived(page.params.projectId ?? "");
	const statusOrder: TaskStatus[] = ["Planned", "In Progress", "Completed", "Abandoned"];

    // Derived from global store
    const projectTasks = $derived(store.tasks.filter(t => t.projectId === projectId));

	let viewMode = $state<ViewMode>("Table");
	let statusFilter = $state<TaskStatus | "All">("All");
	let ownerFilter = $state("All");
	let orphanOnly = $state(false);
	let updatedFrom = $state("");
	let updatedTo = $state("");

	let createOpen = $state(false);
	let createTitle = $state("");
	let createDescription = $state("");

	let draggingTaskId = $state("");

	const owners = $derived(["All", ...new Set(projectTasks.map((row) => row.owner))]);
	const stats = $derived({
		total: projectTasks.length,
		planned: projectTasks.filter((row) => row.status === "Planned").length,
		inProgress: projectTasks.filter((row) => row.status === "In Progress").length,
		completed: projectTasks.filter((row) => row.status === "Completed").length,
		abandoned: projectTasks.filter((row) => row.status === "Abandoned").length,
	});

	const filteredRows = $derived.by(() => {
		return projectTasks.filter((row) => {
			if (statusFilter !== "All" && row.status !== statusFilter) return false;
			if (ownerFilter !== "All" && row.owner !== ownerFilter) return false;
			if (orphanOnly && !row.isOrphan) return false;
			if (updatedFrom && row.deadline < updatedFrom) return false;
			if (updatedTo && row.deadline > updatedTo) return false;
			return true;
		});
	});

	const statusClass = (status: TaskStatus) => {
		if (status === "Planned") return "bg-blue-50 text-blue-700 border-blue-200";
		if (status === "In Progress") return "bg-indigo-50 text-indigo-700 border-indigo-200";
		if (status === "Completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
		return "bg-slate-100 text-slate-700 border-slate-300";
	};

	const applyStatFilter = (target: "Total" | TaskStatus) => {
		statusFilter = target === "Total" ? "All" : target;
		orphanOnly = false;
	};

	const setViewMode = (next: ViewMode) => {
		viewMode = next;
		localStorage.setItem(`tasks-index-view-${projectId}`, next);
	};

	onMount(() => {
		const stored = localStorage.getItem(`tasks-index-view-${projectId}`);
		if (stored === "Table" || stored === "Kanban") {
			viewMode = stored;
		}
	});

	const groupedForKanban = $derived.by(() => {
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

	const onDrop = (targetStatus: TaskStatus) => {
		if (!draggingTaskId) return;
        store.updateTask(projectId, draggingTaskId, { status: targetStatus });
		draggingTaskId = "";
	};

	const slugify = (value: string) =>
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-");

	const createTask = async () => {
		const title = createTitle.trim();
		if (!title) return;
		const id = slugify(title) || "untitled-task";
        const newTask: TaskRow = {
            id,
            projectId,
            title,
            linkedIdea: "",
            linkedProblemStatement: "",
            persona: "Unknown",
            owner: "Avery Patel", // Default owner
            deadline: new Date().toISOString().slice(0, 10),
            status: "Planned",
            ideaRejected: false,
            hasFeedback: false,
            isOrphan: true,
            description: createDescription
        };
        store.addTask(newTask);

		createTitle = "";
		createDescription = "";
		createOpen = false;
		await goto(`/project/${projectId}/tasks/${id}`);
	};
</script>

<div class="flex flex-col gap-2 rounded-lg border bg-white p-2">
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
		<section class="rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">Prototype - Tasks Index</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<h1 class="text-3xl font-semibold">Tasks</h1>
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
							<div class="grid gap-2">
								<Label for="task-description">Short Description</Label>
								<Input id="task-description" bind:value={createDescription} placeholder="Optional" />
							</div>
						</div>
						<Dialog.Footer>
							<Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
							<Button onclick={createTask} disabled={!createTitle.trim()}>Create Task</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</section>

		<section class="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-5">
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Total")}>
				<div class="text-xs text-muted-foreground">Total Tasks</div>
				<div class="text-2xl font-semibold">{stats.total}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Planned")}>
				<div class="text-xs text-muted-foreground">Planned</div>
				<div class="text-2xl font-semibold text-blue-700">{stats.planned}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("In Progress")}>
				<div class="text-xs text-muted-foreground">In Progress</div>
				<div class="text-2xl font-semibold text-indigo-700">{stats.inProgress}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Completed")}>
				<div class="text-xs text-muted-foreground">Completed</div>
				<div class="text-2xl font-semibold text-emerald-700">{stats.completed}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Abandoned")}>
				<div class="text-xs text-muted-foreground">Abandoned</div>
				<div class="text-2xl font-semibold text-slate-700">{stats.abandoned}</div>
			</button>
		</section>

		<section class="rounded-lg bg-white p-4">
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

		<section class="rounded-lg bg-white p-4">
			<div class="mb-3 text-sm font-medium">Filters</div>
			<div class="grid gap-3 md:grid-cols-5">
				<div class="grid gap-2">
					<Label>Status</Label>
					<Select.Root type="single" bind:value={statusFilter}>
						<Select.Trigger>{statusFilter}</Select.Trigger>
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
						<Select.Trigger>{ownerFilter}</Select.Trigger>
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

		<section class="rounded-lg bg-white p-4">
			<div class="mb-3 text-sm font-medium">{viewMode === "Table" ? "Tasks Table" : "Tasks Kanban"}</div>
			{#if filteredRows.length === 0}
				<div class="rounded-md border border-dashed p-10 text-center">
					<div class="text-sm font-medium">No tasks found</div>
					<div class="mt-1 text-xs text-muted-foreground">
						Tasks track hypothesis execution and should stay linked to idea/problem context.
					</div>
					<div class="mt-4">
						<Button onclick={() => (createOpen = true)}>Add Task</Button>
					</div>
				</div>
			{:else if viewMode === "Table"}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Task Title</Table.Head>
							<Table.Head>Linked Idea</Table.Head>
							<Table.Head>Linked Problem Statement</Table.Head>
							<Table.Head>Persona</Table.Head>
							<Table.Head>Owner</Table.Head>
							<Table.Head>Deadline</Table.Head>
							<Table.Head>Status</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRows as row (row.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-wrap items-center gap-2">
										<a class="font-medium hover:underline" href={`./tasks/${row.id}`}>{row.title}</a>
										{#if row.ideaRejected}
											<Badge.Badge class="border-amber-300 bg-amber-50 text-amber-700">Warning: Linked Idea Rejected</Badge.Badge>
										{/if}
										{#if row.status === "Completed" && !row.hasFeedback}
											<Badge.Badge class="border-amber-300 bg-amber-50 text-amber-700">Warning: Completed With No Feedback</Badge.Badge>
										{/if}
										{#if row.isOrphan}
											<Badge.Badge class="border-red-300 bg-red-50 text-red-700">Warning: Orphan</Badge.Badge>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>{row.linkedIdea || "None"}</Table.Cell>
								<Table.Cell>{row.linkedProblemStatement || "None"}</Table.Cell>
								<Table.Cell>{row.persona}</Table.Cell>
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
								<Table.Cell>{row.deadline}</Table.Cell>
								<Table.Cell>
									<Badge.Badge class={statusClass(row.status)}>{row.status}</Badge.Badge>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
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
										class="cursor-move rounded-md border bg-white p-3"
										role="button"
										tabindex="0"
										aria-label={`Task card ${row.title}`}
										draggable="true"
										ondragstart={() => (draggingTaskId = row.id)}
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
												<Badge.Badge class="border-amber-300 bg-amber-50 text-amber-700">Warning: Idea Rejected</Badge.Badge>
											{/if}
											{#if row.status === "Completed" && !row.hasFeedback}
												<Badge.Badge class="border-amber-300 bg-amber-50 text-amber-700">Warning: No Feedback</Badge.Badge>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>
