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

	type JourneyStatus = "Draft" | "Archived";
	type JourneyRow = {
		id: string;
		title: string;
		linkedPersonas: string[];
		stagesCount: number;
		painPointsCount: number;
		owner: string;
		lastUpdated: string;
		status: JourneyStatus;
		isOrphan: boolean;
	};

	let rows = $state<JourneyRow[]>([
		{
			id: "student-assignment-journey",
			title: "Student assignment journey",
			linkedPersonas: ["Avery Patel"],
			stagesCount: 6,
			painPointsCount: 3,
			owner: "Avery Patel",
			lastUpdated: "2026-02-04",
			status: "Draft",
			isOrphan: false,
		},
		{
			id: "creator-publish-journey",
			title: "Creator publish journey",
			linkedPersonas: [],
			stagesCount: 5,
			painPointsCount: 2,
			owner: "Nia Clark",
			lastUpdated: "2026-01-30",
			status: "Draft",
			isOrphan: true,
		},
		{
			id: "onboarding-first-week",
			title: "Onboarding first week",
			linkedPersonas: ["Liam Gomez"],
			stagesCount: 4,
			painPointsCount: 0,
			owner: "Dr. Ramos",
			lastUpdated: "2026-01-22",
			status: "Archived",
			isOrphan: false,
		},
	]);

	let statusFilter = $state<JourneyStatus | "All">("All");
	let ownerFilter = $state("All");
	let orphanOnly = $state(false);
	let updatedFrom = $state("");
	let updatedTo = $state("");
	let qualityFilter = $state<"All" | "WithPainPoints" | "WithLinkedPersona">("All");

	let createOpen = $state(false);
	let createTitle = $state("");
	let createDescription = $state("");

	const owners = $derived(["All", ...new Set(rows.map((row) => row.owner))]);
	const stats = $derived({
		total: rows.length,
		withPainPoints: rows.filter((row) => row.painPointsCount > 0).length,
		linkedPersonas: rows.filter((row) => row.linkedPersonas.length > 0).length,
		archived: rows.filter((row) => row.status === "Archived").length,
	});

	const filteredRows = $derived.by(() => {
		return rows.filter((row) => {
			if (statusFilter !== "All" && row.status !== statusFilter) return false;
			if (ownerFilter !== "All" && row.owner !== ownerFilter) return false;
			if (orphanOnly && !row.isOrphan) return false;
			if (qualityFilter === "WithPainPoints" && row.painPointsCount === 0) return false;
			if (qualityFilter === "WithLinkedPersona" && row.linkedPersonas.length === 0) return false;
			if (updatedFrom && row.lastUpdated < updatedFrom) return false;
			if (updatedTo && row.lastUpdated > updatedTo) return false;
			return true;
		});
	});

	const statusClass = (status: JourneyStatus) =>
		status === "Draft"
			? "bg-blue-50 text-blue-700 border-blue-200"
			: "bg-slate-100 text-slate-700 border-slate-300";

	const applyStatFilter = (target: "Total" | "WithPainPoints" | "WithLinkedPersona" | "Archived") => {
		statusFilter = "All";
		qualityFilter = "All";
		if (target === "WithPainPoints") qualityFilter = "WithPainPoints";
		if (target === "WithLinkedPersona") qualityFilter = "WithLinkedPersona";
		if (target === "Archived") statusFilter = "Archived";
	};

	const slugify = (value: string) =>
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-");

	const createJourney = async () => {
		const title = createTitle.trim();
		if (!title) return;
		const id = slugify(title) || "untitled-journey";
		rows = [
			{
				id,
				title,
				linkedPersonas: [],
				stagesCount: 0,
				painPointsCount: 0,
				owner: "Avery Patel",
				lastUpdated: new Date().toISOString().slice(0, 10),
				status: "Draft",
				isOrphan: true,
			},
			...rows,
		];
		createTitle = "";
		createDescription = "";
		createOpen = false;
		await goto(`/project/${page.params.projectId}/journeys/${id}`);
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
						<Breadcrumb.Page>User Journeys</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-4 py-2 md:px-20">
		<section class="rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">Empathize - Journeys Index</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<h1 class="text-3xl font-semibold">User Journeys</h1>
				<Dialog.Root bind:open={createOpen}>
					<Dialog.Trigger>
						<Button>Add Journey</Button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Create Journey</Dialog.Title>
							<Dialog.Description>Creates a draft journey and redirects to its page.</Dialog.Description>
						</Dialog.Header>
						<div class="grid gap-3">
							<div class="grid gap-2">
								<Label for="journey-title">Title</Label>
								<Input id="journey-title" bind:value={createTitle} />
							</div>
							<div class="grid gap-2">
								<Label for="journey-description">Short Description</Label>
								<Input id="journey-description" bind:value={createDescription} placeholder="Optional" />
							</div>
						</div>
						<Dialog.Footer>
							<Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
							<Button onclick={createJourney} disabled={!createTitle.trim()}>Create Journey</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</section>

		<section class="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-4">
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Total")}>
				<div class="text-xs text-muted-foreground">Total Journeys</div>
				<div class="text-2xl font-semibold">{stats.total}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("WithPainPoints")}>
				<div class="text-xs text-muted-foreground">Journeys with Pain Points</div>
				<div class="text-2xl font-semibold text-blue-700">{stats.withPainPoints}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("WithLinkedPersona")}>
				<div class="text-xs text-muted-foreground">Linked Personas</div>
				<div class="text-2xl font-semibold text-emerald-700">{stats.linkedPersonas}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Archived")}>
				<div class="text-xs text-muted-foreground">Archived Journeys</div>
				<div class="text-2xl font-semibold text-slate-700">{stats.archived}</div>
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
					<input id="journey-orphan-only" type="checkbox" bind:checked={orphanOnly} />
					<Label for="journey-orphan-only">Orphan Only</Label>
				</div>
			</div>
		</section>

		<section class="rounded-lg bg-white p-4">
			<div class="mb-3 text-sm font-medium">Journeys</div>
			{#if filteredRows.length === 0}
				<div class="rounded-md border border-dashed p-10 text-center">
					<div class="text-sm font-medium">No journeys found</div>
					<div class="mt-1 text-xs text-muted-foreground">
						Journeys map user flow and pain points across stages.
					</div>
					<div class="mt-4">
						<Button onclick={() => (createOpen = true)}>Add Journey</Button>
					</div>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Journey Title</Table.Head>
							<Table.Head>Linked Persona(s)</Table.Head>
							<Table.Head>Stages Count</Table.Head>
							<Table.Head>Pain Points Count</Table.Head>
							<Table.Head>Owner</Table.Head>
							<Table.Head>Last Updated</Table.Head>
							<Table.Head>Status</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRows as row (row.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-wrap items-center gap-2">
										<a class="font-medium hover:underline" href={`./journeys/${row.id}`}>{row.title}</a>
										{#if row.painPointsCount === 0}
											<Badge.Badge class="border-amber-300 bg-amber-50 text-amber-700">Warning: No Pain Points</Badge.Badge>
										{/if}
										{#if row.linkedPersonas.length === 0}
											<Badge.Badge class="border-amber-300 bg-amber-50 text-amber-700">Warning: No Linked Persona</Badge.Badge>
										{/if}
										{#if row.isOrphan}
											<Badge.Badge class="border-red-300 bg-red-50 text-red-700">Warning: Orphan</Badge.Badge>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>{row.linkedPersonas.length > 0 ? row.linkedPersonas.join(", ") : "None"}</Table.Cell>
								<Table.Cell>{row.stagesCount}</Table.Cell>
								<Table.Cell>{row.painPointsCount}</Table.Cell>
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
								<Table.Cell>
									<Badge.Badge class={statusClass(row.status)}>{row.status}</Badge.Badge>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</section>
	</div>
</div>

