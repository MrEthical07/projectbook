<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { getContext } from "svelte";
	import { createFeedback as createFeedbackRemote, getFeedback as getFeedbackRemote } from "$lib/remote/feedback.remote";
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
	import { MessageSquareQuote, CircleCheckBig, CircleX, AlertTriangle } from "@lucide/svelte";

	let { data } = $props();

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

	let rows = $state<FeedbackRow[]>([]);
	let nextCursor = $state<string | null>(null);
	let isLoadingMore = $state(false);

	$effect(() => {
		rows = structuredClone(data.rows) as FeedbackRow[];
		nextCursor = typeof data.nextCursor === "string" && data.nextCursor.length > 0 ? data.nextCursor : null;
	});
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canCreateFeedback = can(permissions, "feedback", "create");

	let statusFilter = $state<Outcome | "All">("All");
	let ownerFilter = $state("All");
	let orphanOnly = $state(false);
	let updatedFrom = $state("");
	let updatedTo = $state("");

	let createOpen = $state(false);
	let createTitle = $state("");
	let createError = $state("");
	let isCreatingFeedback = $state(false);

	let owners = $derived(["All", ...new Set(rows.map((row) => row.owner))]);
	let stats = $derived({
		total: rows.length,
		validated: rows.filter((row) => row.outcome === "Validated").length,
		invalidated: rows.filter((row) => row.outcome === "Invalidated").length,
		needsIteration: rows.filter((row) => row.outcome === "Needs Iteration").length,
	});

	let filteredRows = $derived.by(() => {
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
		if (outcome === "Validated") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
		if (outcome === "Invalidated") return "bg-slate-500/10 text-slate-500 border-slate-500/20";
		return "bg-amber-500/10 text-amber-500 border-amber-500/20";
	};

	const mergeRows = (current: FeedbackRow[], incoming: FeedbackRow[]): FeedbackRow[] => {
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

	const loadMoreFeedback = async () => {
		if (isLoadingMore || !nextCursor) {
			return;
		}
		isLoadingMore = true;
		try {
			const result = await getFeedbackRemote({
				projectId: page.params.projectId ?? "",
				cursor: nextCursor,
				limit: 20,
				...(statusFilter !== "All" ? { outcome: statusFilter } : {})
			});
			rows = mergeRows(rows, result.items as FeedbackRow[]);
			nextCursor = result.nextCursor;
		} catch (error) {
			console.error("Failed to load more feedback", error);
		} finally {
			isLoadingMore = false;
		}
	};

	const applyStatFilter = (target: "Total" | "Validated" | "Invalidated" | "Needs Iteration") => {
		statusFilter = target === "Total" ? "All" : target;
		orphanOnly = false;
	};

	const createFeedback = async () => {
		if (isCreatingFeedback) return;
		createError = "";
		if (!canCreateFeedback) return;
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
		isCreatingFeedback = true;
		try {
			const result = await createFeedbackRemote({
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
			await goto(`/project/${page.params.projectId}/feedback/${created.id}`);
		} catch (error) {
			console.error("Failed to create feedback", error);
			createError = "Unable to create feedback right now.";
		} finally {
			isCreatingFeedback = false;
		}
	};
</script>

<svelte:head>
	<title>Feedback • {((data as Record<string, unknown>).project as { name?: string } | undefined)?.name ?? "Project"} • ProjectBook</title>
	<meta
		name="description"
		content="Capture feedback and learnings from testing and validation."
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
						<Breadcrumb.Page>Feedback</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-4 py-2 md:px-20">
		<section class="rounded-lg bg-background p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">Test - Feedback Index</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<h1 class="text-3xl font-semibold">Feedback</h1>
				{#if canCreateFeedback}
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
							{#if createError}
								<p class="text-xs text-destructive">{createError}</p>
							{/if}
						</div>
						<Dialog.Footer>
							<Button variant="outline" onclick={() => (createOpen = false)}>Cancel</Button>
							<Button onclick={createFeedback} disabled={!createTitle.trim() || isCreatingFeedback}>
								{isCreatingFeedback ? "Creating..." : "Create Feedback"}
							</Button>
						</Dialog.Footer>
					</Dialog.Content>
					</Dialog.Root>
				{/if}
			</div>
		</section>

		<section class="grid gap-3 rounded-lg bg-background p-4 md:grid-cols-4">
			<button class="rounded-md border p-3 text-left cursor-pointer" onclick={() => applyStatFilter("Total")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Total Feedback</span><MessageSquareQuote class="size-4" /></div>
				<div class="text-2xl font-semibold">{stats.total}</div>
			</button>
			<button class="rounded-md border p-3 text-left cursor-pointer" onclick={() => applyStatFilter("Validated")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Validated</span><CircleCheckBig class="size-4" /></div>
				<div class="text-2xl font-semibold text-emerald-500">{stats.validated}</div>
			</button>
			<button class="rounded-md border p-3 text-left cursor-pointer" onclick={() => applyStatFilter("Invalidated")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Invalidated</span><CircleX class="size-4" /></div>
				<div class="text-2xl font-semibold text-slate-500">{stats.invalidated}</div>
			</button>
			<button class="rounded-md border p-3 text-left cursor-pointer" onclick={() => applyStatFilter("Needs Iteration")}>
				<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground"><span>Needs Iteration</span><AlertTriangle class="size-4" /></div>
				<div class="text-2xl font-semibold text-amber-500">{stats.needsIteration}</div>
			</button>
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
							<Select.Item value="Validated" label="Validated">Validated</Select.Item>
							<Select.Item value="Invalidated" label="Invalidated">Invalidated</Select.Item>
							<Select.Item value="Needs Iteration" label="Needs Iteration">Needs Iteration</Select.Item>
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
					<input id="feedback-orphan-only" type="checkbox" bind:checked={orphanOnly} />
					<Label for="feedback-orphan-only">Orphan Only</Label>
				</div>
			</div>
		</section>

		<section class="rounded-lg bg-background p-4">
			<div class="mb-3 text-sm font-medium">Feedback</div>
			{#if filteredRows.length === 0}
				<div class="rounded-md border border-dashed p-10 text-center">
					<div class="text-sm font-medium">No feedback found</div>
					<div class="mt-1 text-xs text-muted-foreground">
						Feedback captures observations and interpretation from tests.
					</div>
					{#if canCreateFeedback}
						<div class="mt-4">
							<Button onclick={() => (createOpen = true)}>Add Feedback</Button>
						</div>
					{/if}
				</div>
			{:else}
				<div class="border rounded-md">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Feedback Title</Table.Head>
							<Table.Head class="text-center">Linked Artifact(s)</Table.Head>
							<Table.Head class="text-center">Outcome</Table.Head>
							<Table.Head class="text-center">Linked Task / Idea</Table.Head>
							<Table.Head class="text-center">Owner</Table.Head>
							<Table.Head class="text-center">Created Date</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredRows as row (row.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-wrap items-center gap-2">
										<a class="font-medium hover:underline" href={`./feedback/${row.id}`}>{row.title}</a>
										{#if !row.hasTaskLink}
											<Badge.Badge class="border-amber-500/20 bg-amber-500/10 text-amber-500">Warning: No Task Linked</Badge.Badge>
										{/if}
										{#if row.isOrphan}
											<Badge.Badge class="border-red-500/20 bg-red-500/10 text-red-500">Warning: Orphan</Badge.Badge>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell class="text-center">{row.linkedArtifacts.length > 0 ? row.linkedArtifacts.join(", ") : "None"}</Table.Cell>
								<Table.Cell class="text-center">
									<Badge.Badge class={outcomeClass(row.outcome)}>{row.outcome}</Badge.Badge>
								</Table.Cell>
								<Table.Cell class="text-center">{row.linkedTaskOrIdea || "None"}</Table.Cell>
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
								<Table.Cell class="text-center">{row.createdDate}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
				</div>
			{/if}
			{#if nextCursor}
				<div class="mt-3 flex justify-center">
					<Button variant="outline" onclick={loadMoreFeedback} disabled={isLoadingMore}>
						{isLoadingMore ? "Loading..." : "Load More"}
					</Button>
				</div>
			{/if}
		</section>
	</div>
</div>

