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

	type Outcome = "Validated" | "Invalidated" | "Needs Iteration";
	type FeedbackRow = {
		id: string;
		title: string;
		linkedArtifacts: string[];
		outcome: Outcome;
		linkedTaskOrIdea: string;
		owner: string;
		createdDate: string;
		hasTaskLink: boolean;
		isOrphan: boolean;
	};

	let rows = $state<FeedbackRow[]>([
		{
			id: "deadline-lane-session-1",
			title: "Deadline lane usability session",
			linkedArtifacts: ["Task: Deadline lane view", "Idea: Deadline lane view"],
			outcome: "Validated",
			linkedTaskOrIdea: "Task: Deadline lane view",
			owner: "Avery Patel",
			createdDate: "2026-02-06",
			hasTaskLink: true,
			isOrphan: false,
		},
		{
			id: "creator-flow-feedback",
			title: "Creator setup walkthrough findings",
			linkedArtifacts: ["Idea: Smart reminder bundles"],
			outcome: "Needs Iteration",
			linkedTaskOrIdea: "Idea: Smart reminder bundles",
			owner: "Nia Clark",
			createdDate: "2026-02-03",
			hasTaskLink: false,
			isOrphan: false,
		},
		{
			id: "pilot-alpha-notes",
			title: "Pilot alpha notes",
			linkedArtifacts: [],
			outcome: "Invalidated",
			linkedTaskOrIdea: "",
			owner: "Dr. Ramos",
			createdDate: "2026-01-26",
			hasTaskLink: false,
			isOrphan: true,
		},
	]);

	let statusFilter = $state<Outcome | "All">("All");
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
		validated: rows.filter((row) => row.outcome === "Validated").length,
		invalidated: rows.filter((row) => row.outcome === "Invalidated").length,
		needsIteration: rows.filter((row) => row.outcome === "Needs Iteration").length,
	});

	const filteredRows = $derived.by(() => {
		return rows.filter((row) => {
			if (statusFilter !== "All" && row.outcome !== statusFilter) return false;
			if (ownerFilter !== "All" && row.owner !== ownerFilter) return false;
			if (orphanOnly && !row.isOrphan) return false;
			if (updatedFrom && row.createdDate < updatedFrom) return false;
			if (updatedTo && row.createdDate > updatedTo) return false;
			return true;
		});
	});

	const outcomeClass = (outcome: Outcome) => {
		if (outcome === "Validated") return "bg-emerald-50 text-emerald-700 border-emerald-200";
		if (outcome === "Invalidated") return "bg-slate-100 text-slate-700 border-slate-300";
		return "bg-amber-50 text-amber-700 border-amber-300";
	};

	const applyStatFilter = (target: "Total" | "Validated" | "Invalidated" | "Needs Iteration") => {
		statusFilter = target === "Total" ? "All" : target;
		orphanOnly = false;
	};

	const slugify = (value: string) =>
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-");

	const createFeedback = async () => {
		const title = createTitle.trim();
		if (!title) return;
		const id = slugify(title) || "untitled-feedback";
		rows = [
			{
				id,
				title,
				linkedArtifacts: [],
				outcome: "Needs Iteration",
				linkedTaskOrIdea: "",
				owner: "Avery Patel",
				createdDate: new Date().toISOString().slice(0, 10),
				hasTaskLink: false,
				isOrphan: true,
			},
			...rows,
		];
		createTitle = "";
		createDescription = "";
		createOpen = false;
		await goto(`/project/${page.params.projectId}/feedback/${id}`);
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
						<Breadcrumb.Page>Feedback</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-4 py-2 md:px-20">
		<section class="rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">Test - Feedback Index</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<h1 class="text-3xl font-semibold">Feedback</h1>
				<Dialog.Root bind:open={createOpen}>
					<Dialog.Trigger>
						<Button>Add Feedback</Button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Create Feedback</Dialog.Title>
							<Dialog.Description>Creates feedback in default outcome and redirects to detail page.</Dialog.Description>
						</Dialog.Header>
						<div class="grid gap-3">
							<div class="grid gap-2">
								<Label for="feedback-title">Title</Label>
								<Input id="feedback-title" bind:value={createTitle} />
							</div>
							<div class="grid gap-2">
								<Label for="feedback-description">Short Description</Label>
								<Input id="feedback-description" bind:value={createDescription} placeholder="Optional" />
							</div>
						</div>
						<Dialog.Footer>
							<Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
							<Button onclick={createFeedback} disabled={!createTitle.trim()}>Create Feedback</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</section>

		<section class="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-4">
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Total")}>
				<div class="text-xs text-muted-foreground">Total Feedback</div>
				<div class="text-2xl font-semibold">{stats.total}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Validated")}>
				<div class="text-xs text-muted-foreground">Validated</div>
				<div class="text-2xl font-semibold text-emerald-700">{stats.validated}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Invalidated")}>
				<div class="text-xs text-muted-foreground">Invalidated</div>
				<div class="text-2xl font-semibold text-slate-700">{stats.invalidated}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Needs Iteration")}>
				<div class="text-xs text-muted-foreground">Needs Iteration</div>
				<div class="text-2xl font-semibold text-amber-700">{stats.needsIteration}</div>
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
							<Select.Item value="Validated" label="Validated">Validated</Select.Item>
							<Select.Item value="Invalidated" label="Invalidated">Invalidated</Select.Item>
							<Select.Item value="Needs Iteration" label="Needs Iteration">Needs Iteration</Select.Item>
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
					<input id="feedback-orphan-only" type="checkbox" bind:checked={orphanOnly} />
					<Label for="feedback-orphan-only">Orphan Only</Label>
				</div>
			</div>
		</section>

		<section class="rounded-lg bg-white p-4">
			<div class="mb-3 text-sm font-medium">Feedback</div>
			{#if filteredRows.length === 0}
				<div class="rounded-md border border-dashed p-10 text-center">
					<div class="text-sm font-medium">No feedback found</div>
					<div class="mt-1 text-xs text-muted-foreground">
						Feedback captures observations and interpretation from tests.
					</div>
					<div class="mt-4">
						<Button onclick={() => (createOpen = true)}>Add Feedback</Button>
					</div>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Feedback Title</Table.Head>
							<Table.Head>Linked Artifact(s)</Table.Head>
							<Table.Head>Outcome</Table.Head>
							<Table.Head>Linked Task / Idea</Table.Head>
							<Table.Head>Owner</Table.Head>
							<Table.Head>Created Date</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRows as row (row.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-wrap items-center gap-2">
										<a class="font-medium hover:underline" href={`./feedback/${row.id}`}>{row.title}</a>
										{#if !row.hasTaskLink}
											<Badge.Badge class="border-amber-300 bg-amber-50 text-amber-700">Warning: No Task Linked</Badge.Badge>
										{/if}
										{#if row.isOrphan}
											<Badge.Badge class="border-red-300 bg-red-50 text-red-700">Warning: Orphan</Badge.Badge>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>{row.linkedArtifacts.length > 0 ? row.linkedArtifacts.join(", ") : "None"}</Table.Cell>
								<Table.Cell>
									<Badge.Badge class={outcomeClass(row.outcome)}>{row.outcome}</Badge.Badge>
								</Table.Cell>
								<Table.Cell>{row.linkedTaskOrIdea || "None"}</Table.Cell>
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
								<Table.Cell>{row.createdDate}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</section>
	</div>
</div>

