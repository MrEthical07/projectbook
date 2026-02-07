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
	import { Check, Pencil, X } from "@lucide/svelte";

	type PageStatus = "Draft" | "Archived";
	type PageRow = {
		id: string;
		title: string;
		owner: string;
		lastEdited: string;
		linkedArtifactsCount: number;
		status: PageStatus;
		isOrphan: boolean;
	};

	let rows = $state<PageRow[]>([
		{
			id: "research-notes",
			title: "Research notes",
			owner: "Avery Patel",
			lastEdited: "2026-02-06",
			linkedArtifactsCount: 2,
			status: "Draft",
			isOrphan: false,
		},
		{
			id: "stakeholder-brief",
			title: "Stakeholder brief",
			owner: "Nia Clark",
			lastEdited: "2026-01-29",
			linkedArtifactsCount: 0,
			status: "Archived",
			isOrphan: true,
		},
		{
			id: "pilot-summary",
			title: "Pilot summary",
			owner: "Dr. Ramos",
			lastEdited: "2026-02-04",
			linkedArtifactsCount: 1,
			status: "Draft",
			isOrphan: false,
		},
	]);

	let statusFilter = $state<PageStatus | "All">("All");
	let ownerFilter = $state("All");
	let orphanOnly = $state(false);
	let updatedFrom = $state("");
	let updatedTo = $state("");
	let linkedOnly = $state(false);
	let recentOnly = $state(false);

	let createOpen = $state(false);
	let createTitle = $state("");
	let createDescription = $state("");

	let editingId = $state("");
	let editingTitle = $state("");

	const owners = $derived(["All", ...new Set(rows.map((row) => row.owner))]);
	const today = new Date().toISOString().slice(0, 10);
	const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

	const stats = $derived({
		total: rows.length,
		recentlyUpdated: rows.filter((row) => row.lastEdited >= recentCutoff).length,
		linkedPages: rows.filter((row) => row.linkedArtifactsCount > 0).length,
		archivedPages: rows.filter((row) => row.status === "Archived").length,
	});

	const filteredRows = $derived.by(() => {
		return rows.filter((row) => {
			if (statusFilter !== "All" && row.status !== statusFilter) return false;
			if (ownerFilter !== "All" && row.owner !== ownerFilter) return false;
			if (orphanOnly && !row.isOrphan) return false;
			if (linkedOnly && row.linkedArtifactsCount === 0) return false;
			if (recentOnly && row.lastEdited < recentCutoff) return false;
			if (updatedFrom && row.lastEdited < updatedFrom) return false;
			if (updatedTo && row.lastEdited > updatedTo) return false;
			return true;
		});
	});

	const statusClass = (status: PageStatus) =>
		status === "Draft"
			? "bg-blue-50 text-blue-700 border-blue-200"
			: "bg-slate-100 text-slate-700 border-slate-300";

	const applyStatFilter = (target: "Total" | "RecentlyUpdated" | "LinkedPages" | "ArchivedPages") => {
		statusFilter = "All";
		recentOnly = false;
		linkedOnly = false;
		if (target === "RecentlyUpdated") {
			recentOnly = true;
			return;
		}
		if (target === "LinkedPages") {
			linkedOnly = true;
			return;
		}
		if (target === "ArchivedPages") {
			statusFilter = "Archived";
		}
	};

	const slugify = (value: string) =>
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-");

	const createPage = async () => {
		const title = createTitle.trim();
		if (!title) return;
		const id = slugify(title) || "untitled-page";
		rows = [
			{
				id,
				title,
				owner: "Avery Patel",
				lastEdited: today,
				linkedArtifactsCount: 0,
				status: "Draft",
				isOrphan: true,
			},
			...rows,
		];
		createTitle = "";
		createDescription = "";
		createOpen = false;
		await goto(`/project/${page.params.projectId}/pages/${id}`);
	};

	const beginRename = (row: PageRow) => {
		editingId = row.id;
		editingTitle = row.title;
	};

	const cancelRename = () => {
		editingId = "";
		editingTitle = "";
	};

	const saveRename = () => {
		if (!editingId) return;
		const nextTitle = editingTitle.trim();
		if (!nextTitle) return;
		rows = rows.map((row) =>
			row.id === editingId ? { ...row, title: nextTitle, lastEdited: today } : row
		);
		cancelRename();
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
						<Breadcrumb.Page>Pages</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-4 py-2 md:px-20">
		<section class="rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">Pages - Unstructured Documentation</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<h1 class="text-3xl font-semibold">Pages</h1>
				<Dialog.Root bind:open={createOpen}>
					<Dialog.Trigger>
						<Button>Add Page</Button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Create Page</Dialog.Title>
							<Dialog.Description>Minimal setup. Redirects to the page editor immediately.</Dialog.Description>
						</Dialog.Header>
						<div class="grid gap-3">
							<div class="grid gap-2">
								<Label for="page-title">Title</Label>
								<Input id="page-title" bind:value={createTitle} placeholder="Page title" />
							</div>
							<div class="grid gap-2">
								<Label for="page-description">Short Description</Label>
								<Input id="page-description" bind:value={createDescription} placeholder="Optional" />
							</div>
						</div>
						<Dialog.Footer>
							<Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
							<Button onclick={createPage} disabled={!createTitle.trim()}>Create Page</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</section>

		<section class="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-4">
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Total")}>
				<div class="text-xs text-muted-foreground">Total Pages</div>
				<div class="text-2xl font-semibold">{stats.total}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("RecentlyUpdated")}>
				<div class="text-xs text-muted-foreground">Recently Updated</div>
				<div class="text-2xl font-semibold text-blue-700">{stats.recentlyUpdated}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("LinkedPages")}>
				<div class="text-xs text-muted-foreground">Linked Pages</div>
				<div class="text-2xl font-semibold text-emerald-700">{stats.linkedPages}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("ArchivedPages")}>
				<div class="text-xs text-muted-foreground">Archived Pages</div>
				<div class="text-2xl font-semibold text-slate-700">{stats.archivedPages}</div>
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
				<div class="flex items-end gap-3">
					<div class="flex items-center gap-2">
						<input id="page-orphan-only" type="checkbox" bind:checked={orphanOnly} />
						<Label for="page-orphan-only">Orphan Only</Label>
					</div>
				</div>
			</div>
		</section>

		<section class="rounded-lg bg-white p-4">
			<div class="mb-3 text-sm font-medium">Pages</div>
			{#if filteredRows.length === 0}
				<div class="rounded-md border border-dashed p-10 text-center">
					<div class="text-sm font-medium">No pages found</div>
					<div class="mt-1 text-xs text-muted-foreground">
						Pages are optional unstructured docs for project context and references.
					</div>
					<div class="mt-4">
						<Button onclick={() => (createOpen = true)}>Add Page</Button>
					</div>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Page Title</Table.Head>
							<Table.Head>Owner</Table.Head>
							<Table.Head>Last Edited</Table.Head>
							<Table.Head>Linked Artifacts Count</Table.Head>
							<Table.Head>Status</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRows as row (row.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-wrap items-center gap-2">
										{#if editingId === row.id}
											<Input class="h-8 w-64" bind:value={editingTitle} />
											<Button size="icon" variant="ghost" onclick={saveRename}>
												<Check class="h-4 w-4" />
											</Button>
											<Button size="icon" variant="ghost" onclick={cancelRename}>
												<X class="h-4 w-4" />
											</Button>
										{:else}
											<a class="font-medium hover:underline" href={`./pages/${row.id}`}>{row.title}</a>
											<Button size="icon" variant="ghost" onclick={() => beginRename(row)}>
												<Pencil class="h-4 w-4" />
											</Button>
										{/if}
										{#if row.isOrphan}
											<Badge.Badge class="border-red-300 bg-red-50 text-red-700">Warning: Orphan</Badge.Badge>
										{/if}
									</div>
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
								<Table.Cell>{row.lastEdited}</Table.Cell>
								<Table.Cell>{row.linkedArtifactsCount}</Table.Cell>
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

