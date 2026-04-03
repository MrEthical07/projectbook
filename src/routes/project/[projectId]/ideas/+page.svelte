<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { getContext } from "svelte";
	import { createIdea as createIdeaRemote } from "$lib/remote/idea.remote";
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
	import { Lightbulb, CircleCheckBig, CircleX, Archive } from "@lucide/svelte";

	let { data } = $props();

	type IdeaStatus = "Considered" | "Selected" | "Rejected" | "Archived";
	type IdeaRow = {
		id: string;
		title: string;
		linkedProblemStatement: string;
		persona: string;
		status: IdeaStatus;
		tasksCount: number;
		owner: string;
		lastUpdated: string;
		linkedProblemLocked: boolean;
		isOrphan: boolean;
	};

	let rows = $state<IdeaRow[]>([]);

	$effect(() => {
		rows = structuredClone(data.rows) as IdeaRow[];
	});
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canCreateIdea = can(permissions, "idea", "create");

	let statusFilter = $state<IdeaStatus | "All">("All");
	let ownerFilter = $state("All");
	let orphanOnly = $state(false);
	let updatedFrom = $state("");
	let updatedTo = $state("");

	let createOpen = $state(false);
	let createTitle = $state("");
	let createError = $state("");

	let owners = $derived(["All", ...new Set(rows.map((row) => row.owner))]);
	let stats = $derived({
		total: rows.length,
		considered: rows.filter((row) => row.status === "Considered").length,
		selected: rows.filter((row) => row.status === "Selected").length,
		rejected: rows.filter((row) => row.status === "Rejected").length,
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

	const statusClass = (status: IdeaStatus) => {
		if (status === "Considered") return "bg-blue-50 text-blue-700 border-blue-200";
		if (status === "Selected") return "bg-emerald-50 text-emerald-700 border-emerald-200";
		if (status === "Rejected") return "bg-slate-100 text-slate-700 border-slate-300";
		return "bg-slate-100 text-slate-600 border-slate-300";
	};

	const applyStatFilter = (target: "Total" | "Considered" | "Selected" | "Rejected") => {
		statusFilter = target === "Total" ? "All" : target;
		orphanOnly = false;
	};

	const createIdea = async () => {
		createError = "";
		if (!canCreateIdea) return;
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
		const result = await createIdeaRemote({
			input: {
				projectId: page.params.projectId,
				actorId,
				title
			},
			permissions
		});
		if (!result.success) {
			createError = result.error;
			return;
		}
		const created = result.data as { id: string };
		createTitle = "";
		createOpen = false;
		await goto(`/project/${page.params.projectId}/ideas/${created.id}`);
	};
</script>

<svelte:head>
	<title>Ideas • {((data as Record<string, unknown>).project as { name?: string } | undefined)?.name ?? "Project"} • ProjectBook</title>
	<meta
		name="description"
		content="Explore and manage solution ideas linked to defined problems."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

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
						<Breadcrumb.Page>Ideas</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="w-full px-4 md:px-20">
		<section class="rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">Ideate - Ideas Index</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<h1 class="text-3xl font-semibold">Ideas</h1>
				{#if canCreateIdea}
					<Dialog.Root bind:open={createOpen}>
						<Dialog.Trigger>
							<Button>Add Idea</Button>
						</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Create Idea</Dialog.Title>
							<Dialog.Description>Creates a considered idea and redirects to detail page.</Dialog.Description>
						</Dialog.Header>
						<div class="grid gap-3">
							<div class="grid gap-2">
								<Label for="idea-title">Title</Label>
								<Input id="idea-title" bind:value={createTitle} />
							</div>
							{#if createError}
								<p class="text-xs text-destructive">{createError}</p>
							{/if}
						</div>
						<Dialog.Footer>
							<Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
							<Button onclick={createIdea} disabled={!createTitle.trim()}>Create Idea</Button>
						</Dialog.Footer>
					</Dialog.Content>
					</Dialog.Root>
				{/if}
			</div>
		</section>

		<section class="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-4">
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Total")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Total Ideas</span><Lightbulb class="size-4" /></div>
				<div class="text-2xl font-semibold">{stats.total}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Considered")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Considered</span><Archive class="size-4" /></div>
				<div class="text-2xl font-semibold text-blue-700">{stats.considered}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Selected")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Selected</span><CircleCheckBig class="size-4" /></div>
				<div class="text-2xl font-semibold text-emerald-700">{stats.selected}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Rejected")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Rejected</span><CircleX class="size-4" /></div>
				<div class="text-2xl font-semibold text-slate-700">{stats.rejected}</div>
			</button>
		</section>

		<section class="rounded-lg bg-white p-4">
			<div class="mb-3 text-sm font-medium">Filters</div>
			<div class="grid gap-3 md:grid-cols-5">
				<div class="grid gap-2">
					<Label>Status</Label>
					<Select.Root type="single" bind:value={statusFilter}>
						<Select.Trigger class="w-full">{statusFilter}</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							<Select.Item value="Considered" label="Considered">Considered</Select.Item>
							<Select.Item value="Selected" label="Selected">Selected</Select.Item>
							<Select.Item value="Rejected" label="Rejected">Rejected</Select.Item>
							<Select.Item value="Archived" label="Archived">Archived</Select.Item>
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
					<input id="idea-orphan-only" type="checkbox" bind:checked={orphanOnly} />
					<Label for="idea-orphan-only">Orphan Only</Label>
				</div>
			</div>
		</section>

		<section class="rounded-lg bg-white p-4">
			<div class="mb-3 text-sm font-medium">Ideas</div>
			{#if filteredRows.length === 0}
				<div class="rounded-md border border-dashed p-10 text-center">
					<div class="text-sm font-medium">No ideas found</div>
					<div class="mt-1 text-xs text-muted-foreground">
						Ideas represent candidate solutions linked to defined problems.
					</div>
					{#if canCreateIdea}
						<div class="mt-4">
							<Button onclick={() => (createOpen = true)}>Add Idea</Button>
						</div>
					{/if}
				</div>
			{:else}
				<div class="border rounded-md">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Idea Title</Table.Head>
							<Table.Head class="text-center">Linked Problem Statement</Table.Head>
							<Table.Head class="text-center">Persona</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head class="text-center">Tasks Count</Table.Head>
							<Table.Head class="text-center">Owner</Table.Head>
							<Table.Head class="text-center">Last Updated</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRows as row (row.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-wrap items-center gap-2">
										<a class="font-medium hover:underline" href={`./ideas/${row.id}`}>{row.title}</a>
										{#if !row.linkedProblemLocked}
											<Badge.Badge class="border-amber-300 bg-amber-50 text-amber-700">Warning: Linked Problem Not Locked</Badge.Badge>
										{/if}
										{#if row.status === "Selected" && row.tasksCount === 0}
											<Badge.Badge class="border-amber-300 bg-amber-50 text-amber-700">Warning: Selected With No Tasks</Badge.Badge>
										{/if}
										{#if row.isOrphan}
											<Badge.Badge class="border-red-300 bg-red-50 text-red-700">Warning: Orphan</Badge.Badge>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell class="text-center">{row.linkedProblemStatement || "None"}</Table.Cell>
								<Table.Cell class="text-center">{row.persona}</Table.Cell>
								<Table.Cell class="text-center">
									<Badge.Badge class={statusClass(row.status)}>{row.status}</Badge.Badge>
								</Table.Cell>
								<Table.Cell class="text-center">{row.tasksCount}</Table.Cell>
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
								<Table.Cell class="text-center">{row.lastUpdated}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
				</div>
			{/if}
		</section>
	</div>
</div>

