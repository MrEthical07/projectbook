<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { getContext } from "svelte";
	import { createProblem as createProblemRemote, getProblems as getProblemsRemote } from "$lib/remote/problem.remote";
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
	import { CircleDot, FilePenLine, LockKeyhole, Unlink } from "@lucide/svelte";

	let { data } = $props();

	type ProblemStatus = "Draft" | "Locked" | "Archived";
	type ProblemRow = {
		id: string;
		statement: string;
		linkedSources: string[];
		painPointsCount: number;
		ideasCount: number;
		status: ProblemStatus;
		owner: string;
		lastUpdated: string;
		isOrphan: boolean;
	};

	let rows = $state<ProblemRow[]>([]);
	let nextCursor = $state<string | null>(null);
	let isLoadingMore = $state(false);

	$effect(() => {
		rows = structuredClone(data.rows) as ProblemRow[];
		nextCursor = typeof data.nextCursor === "string" && data.nextCursor.length > 0 ? data.nextCursor : null;
	});
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canCreateProblem = can(permissions, "problem", "create");

	let statusFilter = $state<ProblemStatus | "All">("All");
	let ownerFilter = $state("All");
	let orphanOnly = $state(false);
	let updatedFrom = $state("");
	let updatedTo = $state("");

	let createOpen = $state(false);
	let createTitle = $state("");
	let createError = $state("");
	let isCreatingProblem = $state(false);

	let owners = $derived(["All", ...new Set(rows.map((row) => row.owner))]);
	let stats = $derived({
		total: rows.length,
		draft: rows.filter((row) => row.status === "Draft").length,
		locked: rows.filter((row) => row.status === "Locked").length,
		orphan: rows.filter((row) => row.isOrphan).length,
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

	const statusClass = (status: ProblemStatus) => {
		if (status === "Draft") return "bg-blue-50 text-blue-700 border-blue-200";
		if (status === "Locked") return "bg-emerald-50 text-emerald-700 border-emerald-200";
		return "bg-slate-100 text-slate-700 border-slate-300";
	};

	const mergeRows = (current: ProblemRow[], incoming: ProblemRow[]): ProblemRow[] => {
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

	const loadMoreProblems = async () => {
		if (isLoadingMore || !nextCursor) {
			return;
		}
		isLoadingMore = true;
		try {
			const result = await getProblemsRemote({
				projectId: page.params.projectId ?? "",
				cursor: nextCursor,
				limit: 20,
				...(statusFilter !== "All" ? { status: statusFilter } : {})
			});
			rows = mergeRows(rows, result.items as ProblemRow[]);
			nextCursor = result.nextCursor;
		} finally {
			isLoadingMore = false;
		}
	};

	const applyStatFilter = (target: "Total" | "Draft" | "Locked" | "Orphan") => {
		statusFilter = "All";
		orphanOnly = false;
		if (target === "Draft") statusFilter = "Draft";
		if (target === "Locked") statusFilter = "Locked";
		if (target === "Orphan") orphanOnly = true;
	};

	const truncate = (text: string, max = 94) => (text.length > max ? `${text.slice(0, max)}...` : text);

	const createProblem = async () => {
		if (isCreatingProblem) return;
		createError = "";
		if (!canCreateProblem) return;
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
		isCreatingProblem = true;
		const result = await createProblemRemote({
			input: {
				projectId: page.params.projectId,
				actorId,
				statement: title
			}
});
		isCreatingProblem = false;
		if (!result.success) {
			createError = result.error;
			return;
		}
		const created = result.data as { id: string };
		createTitle = "";
		createOpen = false;
		await goto(`/project/${page.params.projectId}/problem-statement/${created.id}`);
	};
</script>

<svelte:head>
	<title>Problem Statements • {((data as Record<string, unknown>).project as { name?: string } | undefined)?.name ?? "Project"} • ProjectBook</title>
	<meta
		name="description"
		content="Define and manage problem statements derived from research insights."
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
						<Breadcrumb.Page>Problem Statements</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-4 py-2 md:px-20">
		<section class="rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">Define - Problem Statements Index</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<h1 class="text-3xl font-semibold">Problem Statements</h1>
				{#if canCreateProblem}
					<Dialog.Root bind:open={createOpen}>
						<Dialog.Trigger>
							<Button >Add Problem Statement</Button>
						</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Create Problem Statement</Dialog.Title>
							<Dialog.Description>Creates a draft and redirects to the statement page.</Dialog.Description>
						</Dialog.Header>
						<div class="grid gap-3">
							<div class="grid gap-2">
								<Label for="problem-title">Title</Label>
								<Input id="problem-title" bind:value={createTitle} />
							</div>
							{#if createError}
								<p class="text-xs text-destructive">{createError}</p>
							{/if}
						</div>
						<Dialog.Footer>
							<Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
							<Button onclick={createProblem} disabled={!createTitle.trim() || isCreatingProblem}>
								{isCreatingProblem ? "Creating..." : "Create Problem"}
							</Button>
						</Dialog.Footer>
					</Dialog.Content>
					</Dialog.Root>
				{/if}
			</div>
		</section>

		<section class="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-4">
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Total")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Total Problems</span><CircleDot class="size-4" /></div>
				<div class="text-2xl font-semibold">{stats.total}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Draft")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Draft Problems</span><FilePenLine class="size-4" /></div>
				<div class="text-2xl font-semibold text-blue-700">{stats.draft}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Locked")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Locked Problems</span><LockKeyhole class="size-4" /></div>
				<div class="text-2xl font-semibold text-emerald-700">{stats.locked}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Orphan")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Orphan Problems</span><Unlink class="size-4" /></div>
				<div class="text-2xl font-semibold text-red-700">{stats.orphan}</div>
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
							<Select.Item value="Draft" label="Draft">Draft</Select.Item>
							<Select.Item value="Locked" label="Locked">Locked</Select.Item>
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
					<input id="problem-orphan-only" type="checkbox" bind:checked={orphanOnly} />
					<Label for="problem-orphan-only">Orphan Only</Label>
				</div>
			</div>
		</section>

		<section class="rounded-lg bg-white p-4">
			<div class="mb-3 text-sm font-medium">Problem Statements</div>
			{#if filteredRows.length === 0}
				<div class="rounded-md border border-dashed p-10 text-center">
					<div class="text-sm font-medium">No problem statements found</div>
					<div class="mt-1 text-xs text-muted-foreground">
						Problem statements convert empathy signals into define-phase commitments.
					</div>
					{#if canCreateProblem}
						<div class="mt-4">
							<Button onclick={() => (createOpen = true)}>Add Problem Statement</Button>
						</div>
					{/if}
				</div>
			{:else}
				<div class="border rounded-md">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Problem Statement</Table.Head>
							<Table.Head class="text-center">Linked Story / Journey</Table.Head>
							<Table.Head class="text-center">Pain Points Count</Table.Head>
							<Table.Head class="text-center">Ideas Count</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head class="text-center">Owner</Table.Head>
							<Table.Head class="text-center">Last Updated</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRows as row (row.id)}
							<Table.Row>
								<Table.Cell class="max-w-75 truncate text-center">
									<div class="flex flex-wrap items-center gap-2">
										<a class="font-medium hover:underline" href={`./problem-statement/${row.id}`}>
											{truncate(row.statement)}
										</a>
										{#if row.isOrphan}
											<Badge.Badge class="border-red-300 bg-red-50 text-red-700">Warning: Orphan</Badge.Badge>
										{/if}
										{#if row.status === "Draft"}
											<Badge.Badge class="border-amber-300 bg-amber-50 text-amber-700">Warning: Draft</Badge.Badge>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell class="max-w-75 truncate text-center">{row.linkedSources.length > 0 ? row.linkedSources.join(", ") : "None"}</Table.Cell>
								<Table.Cell class="max-w-75 truncate text-center">{row.painPointsCount}</Table.Cell>
								<Table.Cell class="max-w-75 truncate text-center">{row.ideasCount}</Table.Cell>
								<Table.Cell class="max-w-75 truncate text-center">
									<Badge.Badge class={statusClass(row.status)}>{row.status}</Badge.Badge>
								</Table.Cell>
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
			{#if nextCursor}
				<div class="mt-3 flex justify-center">
					<Button variant="outline" onclick={loadMoreProblems} disabled={isLoadingMore}>
						{isLoadingMore ? "Loading..." : "Load More"}
					</Button>
				</div>
			{/if}
		</section>
	</div>
</div>

