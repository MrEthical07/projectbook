<script lang="ts">
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { page } from "$app/state";
	import { getProjectActivity } from "$lib/remote/activity.remote";

	type ActivityType =
		| "Artifact created"
		| "Artifact updated"
		| "Artifact locked"
		| "Task status changed"
		| "Feedback added"
		| "Comment added"
		| "Resource uploaded"
		| "Event created";

	type ActivityItem = {
		id: string;
		user: string;
		initials: string;
		type: ActivityType;
		action: string;
		artifact: string;
		path: string;
		at: string;
		details: string;
	};

	type RawActivityItem = {
		id: string;
		user: string;
		initials: string;
		action: string;
		artifact: string;
		href: string;
		at: string;
	};

	const toActivityItem = (item: RawActivityItem): ActivityItem => ({
		id: item.id,
		user: item.user,
		initials: item.initials,
		type: mapType(item.action),
		action: item.action,
		artifact: item.artifact,
		path: item.href,
		at: item.at,
		details: `${item.action} ${item.artifact}`
	});

	let { data } = $props();
	let projectId = $derived(
		(page.params.projectId ?? (data as { projectId?: string }).projectId ?? "").trim()
	);
	let selectedType = $state<ActivityType | "All">("All");
	let selectedUser = $state<string>("All");
	let selectedWindow = $state<"All" | "24h" | "7d" | "30d">("All");
	let detailOpen = $state(false);
	let selectedItemId = $state("");
	let nextCursor = $state<string | null>(null);
	let isLoadingMore = $state(false);
	let loadMoreError = $state("");

	let now = new Date();
	const mapType = (action: string): ActivityType => {
		if (action.includes("locked")) return "Artifact locked";
		if (action.includes("status")) return "Task status changed";
		if (action.includes("Feedback")) return "Feedback added";
		if (action.includes("Comment")) return "Comment added";
		if (action.includes("Resource") || action.includes("uploaded")) return "Resource uploaded";
		if (action.includes("Event") || action.includes("event")) return "Event created";
		if (action.includes("created")) return "Artifact created";
		return "Artifact updated";
	};
	let items = $state<ActivityItem[]>([]);

	$effect(() => {
		const initialItems = structuredClone(data.items) as RawActivityItem[];
		items = initialItems.map(toActivityItem);
		const initialCursor = (data as { nextCursor?: string | null }).nextCursor;
		nextCursor = typeof initialCursor === "string" && initialCursor.trim().length > 0
			? initialCursor
			: null;
		loadMoreError = "";
		isLoadingMore = false;
		selectedItemId = "";
		detailOpen = false;
	});

	const loadMore = async () => {
		if (!projectId || !nextCursor || isLoadingMore) {
			return;
		}

		loadMoreError = "";
		isLoadingMore = true;
		try {
			const result = await getProjectActivity({
				projectId,
				limit: 20,
				cursor: nextCursor
			});
			const nextBatch = result.items.map(toActivityItem);
			const deduped = new Map<string, ActivityItem>();
			for (const item of [...items, ...nextBatch]) {
				deduped.set(item.id, item);
			}
			items = [...deduped.values()];
			nextCursor = result.nextCursor;
		} catch {
			loadMoreError = "Failed to load more activity. Please try again.";
		} finally {
			isLoadingMore = false;
		}
	};

	let users = $derived(["All", ...new Set(items.map((item) => item.user))]);
	let selectedItem = $derived(items.find((item) => item.id === selectedItemId) ?? null);

	let filteredItems = $derived.by(() => {
		return items.filter((item) => {
			if (selectedType !== "All" && item.type !== selectedType) return false;
			if (selectedUser !== "All" && item.user !== selectedUser) return false;
			if (selectedWindow !== "All") {
				const diffMs = +now - +new Date(item.at);
				const hours = diffMs / 3_600_000;
				if (selectedWindow === "24h" && hours > 24) return false;
				if (selectedWindow === "7d" && hours > 24 * 7) return false;
				if (selectedWindow === "30d" && hours > 24 * 30) return false;
			}
			return true;
		});
	});

	const fmtAgo = (value: string) => {
		const minutes = Math.round((+now - +new Date(value)) / 60_000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.round(hours / 24)}d ago`;
	};

	const openDetails = (id: string) => {
		selectedItemId = id;
		detailOpen = true;
	};
</script>

<svelte:head>
	<title>Activity • {((data as Record<string, unknown>).project as { name?: string } | undefined)?.name ?? "Project"} • ProjectBook</title>
	<meta
		name="description"
		content="Review activity across this project and its artifacts."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<div class="flex flex-col gap-4 rounded-lg bg-background p-4">
	<header
		class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href={`/project/${projectId}`}>Project Dashboard</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Activity Log</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-4 md:px-20">
		<section class="rounded-lg bg-background p-4">
			<div class="text-xs uppercase tracking-wide text-muted-foreground">Project Activity</div>
			<div class="mt-2 flex flex-wrap items-center justify-between gap-3">
				<h1 class="text-3xl font-semibold">Activity Log</h1>
				<Badge variant="outline">{filteredItems.length} items</Badge>
			</div>
		</section>

		<section class="rounded-lg bg-background p-4">
			<div class="mb-3 text-sm font-medium">Filters</div>
			<div class="grid gap-3 md:grid-cols-3">
				<div class="grid gap-2">
					<Select.Root type="single" bind:value={selectedType}>
						<Select.Trigger class="w-full">{selectedType}</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							<Select.Item value="Artifact created" label="Artifact created">Artifact created</Select.Item>
							<Select.Item value="Artifact updated" label="Artifact updated">Artifact updated</Select.Item>
							<Select.Item value="Artifact locked" label="Artifact locked">Artifact locked</Select.Item>
							<Select.Item value="Task status changed" label="Task status changed">Task status changed</Select.Item>
							<Select.Item value="Feedback added" label="Feedback added">Feedback added</Select.Item>
							<Select.Item value="Comment added" label="Comment added">Comment added</Select.Item>
							<Select.Item value="Resource uploaded" label="Resource uploaded">Resource uploaded</Select.Item>
							<Select.Item value="Event created" label="Event created">Event created</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Select.Root type="single" bind:value={selectedUser}>
						<Select.Trigger class="w-full">{selectedUser}</Select.Trigger>
						<Select.Content>
							{#each users as user (user)}
								<Select.Item value={user} label={user}>{user}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Select.Root type="single" bind:value={selectedWindow}>
						<Select.Trigger class="w-full">{selectedWindow}</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All time">All time</Select.Item>
							<Select.Item value="24h" label="Last 24h">Last 24h</Select.Item>
							<Select.Item value="7d" label="Last 7d">Last 7d</Select.Item>
							<Select.Item value="30d" label="Last 30d">Last 30d</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</section>

		<section class="rounded-lg bg-background p-4">
			<div class="mb-3 text-sm font-medium">Recent Activity</div>
			<div class="space-y-3">
				{#each filteredItems as item (item.id)}
					<button
						type="button"
						class="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/40"
						onclick={() => openDetails(item.id)}
					>
						<Avatar.Root class="size-8 rounded-full">
							<Avatar.Fallback class="rounded-full text-[10px]">{item.initials}</Avatar.Fallback>
						</Avatar.Root>
						<div class="min-w-0 flex-1">
							<p class="text-sm leading-5">
								<span class="font-medium">{item.user}</span>
								<span class="text-muted-foreground"> {item.action} </span>
								<span class="font-medium text-primary">{item.artifact}</span>
							</p>
							<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
								<Badge variant="outline">{item.type}</Badge>
								<span>{fmtAgo(item.at)}</span>
							</div>
						</div>
					</button>
				{:else}
					<div class="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
						No activity matches the selected filters.
					</div>
				{/each}

				{#if nextCursor}
					<div class="pt-2">
						<Button variant="outline" onclick={loadMore} disabled={isLoadingMore}>
							{isLoadingMore ? "Loading..." : "Load more"}
						</Button>
					</div>
				{/if}
				{#if loadMoreError}
					<p class="text-xs text-destructive">{loadMoreError}</p>
				{/if}
			</div>
		</section>
	</div>
</div>

<Dialog.Root bind:open={detailOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Activity Details</Dialog.Title>
			<Dialog.Description>Complete information for the selected activity entry.</Dialog.Description>
		</Dialog.Header>
		{#if selectedItem}
			<div class="grid gap-2 text-sm">
				<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">User</span><span>{selectedItem.user}</span></div>
				<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Type</span><span>{selectedItem.type}</span></div>
				<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Action</span><span>{selectedItem.action}</span></div>
				<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Artifact</span><span>{selectedItem.artifact}</span></div>
				<div class="rounded-md border px-3 py-2">
					<div class="text-muted-foreground">Details</div>
					<div class="mt-1">{selectedItem.details}</div>
				</div>
			</div>
		{/if}
		<Dialog.Footer>
			{#if selectedItem}
				<Button variant="outline" href={selectedItem.path}>Open Artifact</Button>
			{/if}
			<Dialog.Close>Close</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
