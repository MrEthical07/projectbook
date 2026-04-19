<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { getContext } from "svelte";
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
	import { Check, Pencil, X, FileStack, Clock3, Link2, Archive } from "@lucide/svelte";
	import { createPage as createPageRemote, getPages as getPagesRemote, renamePage as renamePageRemote } from "$lib/remote/page.remote";
	import { can } from "$lib/utils/permission";

	let { data } = $props();
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canCreatePage = can(permissions, "page", "create");
	const canEditPage = can(permissions, "page", "edit");

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

	let rows = $state<PageRow[]>([]);
	let nextCursor = $state<string | null>(null);
	let isLoadingMore = $state(false);

	$effect(() => {
		rows = structuredClone(data.rows) as PageRow[];
		nextCursor = typeof data.nextCursor === "string" && data.nextCursor.length > 0 ? data.nextCursor : null;
	});

	let statusFilter = $state<PageStatus | "All">("All");
	let ownerFilter = $state("All");
	let orphanOnly = $state(false);
	let updatedFrom = $state("");
	let updatedTo = $state("");
	let linkedOnly = $state(false);
	let recentOnly = $state(false);

	let createOpen = $state(false);
	let createTitle = $state("");
	let isCreatingPage = $state(false);
	let mutationError = $state("");

	let editingId = $state("");
	let editingTitle = $state("");

	let owners = $derived(["All", ...new Set(rows.map((row) => row.owner))]);
	const today = new Date().toISOString().slice(0, 10);
	const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

	let stats = $derived({
		total: rows.length,
		recentlyUpdated: rows.filter((row) => row.lastEdited >= recentCutoff).length,
		linkedPages: rows.filter((row) => row.linkedArtifactsCount > 0).length,
		archivedPages: rows.filter((row) => row.status === "Archived").length,
	});

	let filteredRows = $derived.by(() => {
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

	const mergeRows = (current: PageRow[], incoming: PageRow[]): PageRow[] => {
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

	const loadMorePages = async () => {
		if (isLoadingMore || !nextCursor) {
			return;
		}
		isLoadingMore = true;
		try {
			const result = await getPagesRemote({
				projectId: page.params.projectId ?? "",
				cursor: nextCursor,
				limit: 20,
				...(statusFilter !== "All" ? { status: statusFilter } : {})
			});
			rows = mergeRows(rows, result.items as PageRow[]);
			nextCursor = result.nextCursor;
		} catch (error) {
			console.error("Failed to load more pages", error);
		} finally {
			isLoadingMore = false;
		}
	};

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

	const createPage = async () => {
		if (isCreatingPage) return;
		mutationError = "";
		if (!permissions || !canCreatePage) {
			mutationError = "You do not have permission to create pages.";
			return;
		}
		const actorId = access?.user.id;
		if (!actorId) {
			mutationError = "Active user id is missing.";
			return;
		}
		const title = createTitle.trim();
		if (!title) return;
		isCreatingPage = true;
		try {
			const result = await createPageRemote({
				input: {
					projectId: page.params.projectId,
					actorId,
					title
				}
			});
			if (!result.success) {
				mutationError = result.error;
				return;
			}
			const created = result.data;
			rows = [created as PageRow, ...rows];
			createTitle = "";
			createOpen = false;
			await goto(`/project/${page.params.projectId}/pages/${created.id}`);
		} catch (error) {
			console.error("Failed to create page", error);
			mutationError = "Unable to create page right now.";
		} finally {
			isCreatingPage = false;
		}
	};

	const beginRename = (row: PageRow) => {
		editingId = row.id;
		editingTitle = row.title;
	};

	const cancelRename = () => {
		editingId = "";
		editingTitle = "";
	};

	const saveRename = async () => {
		mutationError = "";
		if (!permissions || !canEditPage) {
			mutationError = "You do not have permission to rename pages.";
			return;
		}
		if (!editingId) return;
		const nextTitle = editingTitle.trim();
		if (!nextTitle) return;
		try {
			const result = await renamePageRemote({
				input: {
					projectId: page.params.projectId,
					pageId: editingId,
					title: nextTitle
				}
			});
			if (!result.success) {
				mutationError = result.error;
				return;
			}
			rows = rows.map((row) =>
				row.id === editingId
					? { ...row, title: result.data.title, lastEdited: result.data.lastEdited }
					: row
			);
			cancelRename();
		} catch (error) {
			console.error("Failed to rename page", error);
			mutationError = "Unable to rename page right now.";
		}
	};
</script>

<svelte:head>
	<title>Pages • {((data as Record<string, unknown>).project as { name?: string } | undefined)?.name ?? "Project"} • ProjectBook</title>
	<meta
		name="description"
		content="Manage custom project pages and linked artifact documentation."
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
						<Button disabled={!canCreatePage}>Add Page</Button>
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
							{#if mutationError}
								<p class="text-xs text-destructive">{mutationError}</p>
							{/if}
						</div>
						<Dialog.Footer>
							<Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
							<Button onclick={createPage} disabled={!canCreatePage || !createTitle.trim() || isCreatingPage}>
								{isCreatingPage ? "Creating..." : "Create Page"}
							</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</section>

		<section class="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-4">
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("Total")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Total Pages</span><FileStack class="size-4" /></div>
				<div class="text-2xl font-semibold">{stats.total}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("RecentlyUpdated")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Recently Updated</span><Clock3 class="size-4" /></div>
				<div class="text-2xl font-semibold text-blue-700">{stats.recentlyUpdated}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("LinkedPages")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Linked Pages</span><Link2 class="size-4" /></div>
				<div class="text-2xl font-semibold text-emerald-700">{stats.linkedPages}</div>
			</button>
			<button class="rounded-md border p-3 text-left" onclick={() => applyStatFilter("ArchivedPages")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Archived Pages</span><Archive class="size-4" /></div>
				<div class="text-2xl font-semibold text-slate-700">{stats.archivedPages}</div>
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
						<Button onclick={() => (createOpen = true)} disabled={!canCreatePage}>Add Page</Button>
					</div>
				</div>
			{:else}
				<div class="border rounded-md">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Page Title</Table.Head>
							<Table.Head class="text-center">Owner</Table.Head>
							<Table.Head class="text-center">Last Edited</Table.Head>
							<Table.Head class="text-center">Linked Artifacts Count</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRows as row (row.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-wrap items-center gap-2">
										{#if editingId === row.id}
											<Input class="h-8 w-64" bind:value={editingTitle} />
											<Button size="icon" variant="ghost" onclick={saveRename} disabled={!canEditPage}>
												<Check class="h-4 w-4" />
											</Button>
											<Button size="icon" variant="ghost" onclick={cancelRename}>
												<X class="h-4 w-4" />
											</Button>
										{:else}
											<a class="font-medium hover:underline" href={`./pages/${row.id}`}>{row.title}</a>
											<Button size="icon" variant="ghost" onclick={() => beginRename(row)} disabled={!canEditPage}>
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
								<Table.Cell class="text-center">{row.lastEdited}</Table.Cell>
								<Table.Cell class="text-center">{row.linkedArtifactsCount}</Table.Cell>
								<Table.Cell class="text-center">
									<Badge.Badge class={statusClass(row.status)}>{row.status}</Badge.Badge>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
				</div>
			{/if}
			{#if nextCursor}
				<div class="mt-3 flex justify-center">
					<Button variant="outline" onclick={loadMorePages} disabled={isLoadingMore}>
						{isLoadingMore ? "Loading..." : "Load More"}
					</Button>
				</div>
			{/if}
		</section>
	</div>
</div>

