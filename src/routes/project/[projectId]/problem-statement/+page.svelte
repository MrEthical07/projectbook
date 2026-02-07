<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
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

	let rows = $state<ProblemRow[]>([
		{
			id: "deadline-clarity-students",
			statement: "Students need a clear way to track assignment deadlines because requirements are fragmented across channels.",
			linkedSources: ["Story: Streamline checkout for first-time users", "Journey: Student assignment journey"],
			painPointsCount: 3,
			ideasCount: 2,
			status: "Locked",
			owner: "Avery Patel",
			lastUpdated: "2026-02-03",
			isOrphan: false,
		},
		{
			id: "creator-setup-friction",
			statement: "New creators need confidence during setup because the first publish flow feels uncertain and high-risk.",
			linkedSources: [],
			painPointsCount: 1,
			ideasCount: 0,
			status: "Draft",
			owner: "Nia Clark",
			lastUpdated: "2026-02-01",
			isOrphan: true,
		},
		{
			id: "handoff-visibility-gap",
			statement: "Team leads need visibility into handoffs because accountability drops between stages.",
			linkedSources: ["Journey: Onboarding first week"],
			painPointsCount: 2,
			ideasCount: 1,
			status: "Archived",
			owner: "Dr. Ramos",
			lastUpdated: "2026-01-25",
			isOrphan: false,
		},
	]);

	let statusFilter = $state<ProblemStatus | "All">("All");
	let ownerFilter = $state("All");
	let orphanOnly = $state(false);
	let updatedFrom = $state("");
	let updatedTo = $state("");

	let createOpen = $state(false);
	let createTitle = $state("");
	let createDescription = $state("");

	const owners = $derived(["All", ...new Set(rows.map((row) => row.owner))]);
	const stats = $derived({
		total: rows.length,
		draft: rows.filter((row) => row.status === "Draft").length,
		locked: rows.filter((row) => row.status === "Locked").length,
		orphan: rows.filter((row) => row.isOrphan).length,
	});

	const filteredRows = $derived.by(() => {
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

	const applyStatFilter = (target: "Total" | "Draft" | "Locked" | "Orphan") => {
		statusFilter = "All";
		orphanOnly = false;
		if (target === "Draft") statusFilter = "Draft";
		if (target === "Locked") statusFilter = "Locked";
		if (target === "Orphan") orphanOnly = true;
	};

	const truncate = (text: string, max = 94) => (text.length > max ? `${text.slice(0, max)}...` : text);

	const slugify = (value: string) =>
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-");

	const createProblem = async () => {
		const title = createTitle.trim();
		if (!title) return;
		const id = slugify(title) || "untitled-problem";
		rows = [
			{
				id,
				statement: title,
				linkedSources: [],
				painPointsCount: 0,
				ideasCount: 0,
				status: "Draft",
				owner: "Avery Patel",
				lastUpdated: new Date().toISOString().slice(0, 10),
				isOrphan: true,
			},
			...rows,
		];
		createTitle = "";
		createDescription = "";
		createOpen = false;
		await goto(`/project/${page.params.projectId}/problem-statement/${id}`);
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
							<div class="grid gap-2">
								<Label for="problem-description">Short Description</Label>
								<Input id="problem-description" bind:value={createDescription} placeholder="Optional" />
							</div>
						</div>
						<Dialog.Footer>
							<Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
							<Button onclick={createProblem} disabled={!createTitle.trim()}>Create Problem</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</section>

		<section class="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-4">
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Total")}>
				<div class="text-xs text-muted-foreground">Total Problems</div>
				<div class="text-2xl font-semibold">{stats.total}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Draft")}>
				<div class="text-xs text-muted-foreground">Draft Problems</div>
				<div class="text-2xl font-semibold text-blue-700">{stats.draft}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Locked")}>
				<div class="text-xs text-muted-foreground">Locked Problems</div>
				<div class="text-2xl font-semibold text-emerald-700">{stats.locked}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Orphan")}>
				<div class="text-xs text-muted-foreground">Orphan Problems</div>
				<div class="text-2xl font-semibold text-red-700">{stats.orphan}</div>
			</button>
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
							<Select.Item value="Draft" label="Draft">Draft</Select.Item>
							<Select.Item value="Locked" label="Locked">Locked</Select.Item>
							<Select.Item value="Archived" label="Archived">Archived</Select.Item>
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
					<div class="mt-4">
						<Button onclick={() => (createOpen = true)}>Add Problem Statement</Button>
					</div>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Problem Statement</Table.Head>
							<Table.Head>Linked Story / Journey</Table.Head>
							<Table.Head>Pain Points Count</Table.Head>
							<Table.Head>Ideas Count</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Owner</Table.Head>
							<Table.Head>Last Updated</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRows as row (row.id)}
							<Table.Row>
								<Table.Cell class="max-w-75 truncate">
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
								<Table.Cell class="max-w-75 truncate">{row.linkedSources.length > 0 ? row.linkedSources.join(", ") : "None"}</Table.Cell>
								<Table.Cell class="max-w-75 truncate">{row.painPointsCount}</Table.Cell>
								<Table.Cell class="max-w-75 truncate">{row.ideasCount}</Table.Cell>
								<Table.Cell class="max-w-75 truncate">
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
								<Table.Cell>{row.lastUpdated}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</section>
	</div>
</div>

