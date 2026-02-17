<script lang="ts">
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Badge from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { ChevronLeft, ChevronRight, ListFilter } from "@lucide/svelte";

	let { data } = $props();

	type ActivityType = "Artifacts" | "Tasks" | "Feedback" | "Comments";
	type DateFilter = "All time" | "Today" | "Last 7 days" | "Last 30 days";

	type ActivityItem = {
		id: string;
		userName: string;
		userInitials: string;
		action: string;
		artifactName: string;
		artifactUrl: string;
		projectId: string;
		projectName: string;
		type: ActivityType;
		timestamp: string;
		occurredAt: string;
	};

	const pageSize = 12;

	let activities = $state<ActivityItem[]>(structuredClone(data.activities) as ActivityItem[]);

	let projectFilter = $state("All Projects");
	let typeFilter = $state<"All" | ActivityType>("All");
	let dateFilter = $state<DateFilter>("All time");
	let currentPage = $state(1);

	const toEpoch = (value: string) => {
		const parsed = Date.parse(value);
		return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
	};

	const compareByOccurredDesc = (a: ActivityItem, b: ActivityItem) => {
		const timeDelta = toEpoch(b.occurredAt) - toEpoch(a.occurredAt);
		if (timeDelta !== 0) return timeDelta;
		return a.id.localeCompare(b.id);
	};

	let projectOptions = $derived([
		"All Projects",
		...Array.from(new Set(activities.map((item) => item.projectName))).sort((a, b) =>
			a.localeCompare(b)
		)
	]);

	let filteredActivities = $derived.by(() => {
		let items = [...activities];

		if (projectFilter !== "All Projects") {
			items = items.filter((item) => item.projectName === projectFilter);
		}

		if (typeFilter !== "All") {
			items = items.filter((item) => item.type === typeFilter);
		}

		const now = Date.now();
		const startOfToday = new Date(new Date().toDateString()).getTime();
		if (dateFilter === "Today") {
			items = items.filter((item) => toEpoch(item.occurredAt) >= startOfToday);
		} else if (dateFilter === "Last 7 days") {
			items = items.filter((item) => toEpoch(item.occurredAt) >= now - 7 * 24 * 60 * 60 * 1000);
		} else if (dateFilter === "Last 30 days") {
			items = items.filter((item) => toEpoch(item.occurredAt) >= now - 30 * 24 * 60 * 60 * 1000);
		}

		return items.sort(compareByOccurredDesc);
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filteredActivities.length / pageSize)));
	let safeCurrentPage = $derived(Math.min(Math.max(currentPage, 1), totalPages));
	let pageActivities = $derived.by(() => {
		const start = (safeCurrentPage - 1) * pageSize;
		return filteredActivities.slice(start, start + pageSize);
	});

	const previousPage = () => {
		if (safeCurrentPage > 1) currentPage = safeCurrentPage - 1;
	};

	const nextPage = () => {
		if (safeCurrentPage < totalPages) currentPage = safeCurrentPage + 1;
	};
</script>

<div class="flex flex-col gap-2 rounded-lg border bg-white p-2">
	<header
		class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex w-full items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page>Workspace Activity</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-5 py-2 md:px-20">
		<section class="rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">Workspace activity</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="grid gap-1">
					<h1 class="text-3xl font-semibold">Workspace Activity</h1>
					<p class="text-sm text-muted-foreground">Recent activity across your projects</p>
				</div>
			</div>
		</section>

		<section class="rounded-lg bg-white p-4">
			<div class="mb-4 flex items-center gap-2 text-sm font-medium">
				<ListFilter class="h-4 w-4 text-muted-foreground" />
				<span>Filters</span>
			</div>
			<div class="grid gap-4 md:grid-cols-3">
				<div class="grid gap-2">
					<Label>Project</Label>
					<Select.Root type="single" bind:value={projectFilter}>
						<Select.Trigger class="w-full">{projectFilter}</Select.Trigger>
						<Select.Content>
							{#each projectOptions as project (project)}
								<Select.Item value={project} label={project}>{project}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="grid gap-2">
					<Label>Type</Label>
					<Select.Root type="single" bind:value={typeFilter}>
						<Select.Trigger class="w-full">{typeFilter}</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							<Select.Item value="Artifacts" label="Artifacts">Artifacts</Select.Item>
							<Select.Item value="Tasks" label="Tasks">Tasks</Select.Item>
							<Select.Item value="Feedback" label="Feedback">Feedback</Select.Item>
							<Select.Item value="Comments" label="Comments">Comments</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="grid gap-2">
					<Label>Date</Label>
					<Select.Root type="single" bind:value={dateFilter}>
						<Select.Trigger class="w-full">{dateFilter}</Select.Trigger>
						<Select.Content>
							<Select.Item value="All time" label="All time">All time</Select.Item>
							<Select.Item value="Today" label="Today">Today</Select.Item>
							<Select.Item value="Last 7 days" label="Last 7 days">Last 7 days</Select.Item>
							<Select.Item value="Last 30 days" label="Last 30 days">Last 30 days</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</section>

		<section class="rounded-lg bg-white p-4">
			<div class="mb-4 text-sm font-medium">Activity Feed</div>
			{#if pageActivities.length === 0}
				<div class="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
					No activity found for the selected filters.
				</div>
			{:else}
				<div class="space-y-2">
					{#each pageActivities as item (item.id)}
						<a
							href={item.artifactUrl}
							class="flex items-start gap-3 rounded-md border border-border/80 p-3 transition hover:border-muted-foreground/40"
						>
							<Avatar.Root class="h-8 w-8">
								<Avatar.Fallback class="text-[10px]">{item.userInitials}</Avatar.Fallback>
							</Avatar.Root>

							<div class="min-w-0 flex-1">
								<div class="text-sm">
									<span class="font-medium">{item.userName}</span>
									<span class="text-muted-foreground"> {item.action} </span>
									<span class="font-medium">{item.artifactName}</span>
								</div>
								<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
									<span>{item.projectName}</span>
									<span>-</span>
									<span>{item.timestamp}</span>
								</div>
							</div>

							<Badge.Badge variant="outline">{item.type}</Badge.Badge>
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<section class="flex items-center justify-between rounded-lg bg-white p-4">
			<div class="text-xs text-muted-foreground">
				Page {safeCurrentPage} of {totalPages}
			</div>
			<div class="flex items-center gap-2">
				<Button size="sm" variant="outline" onclick={previousPage} disabled={safeCurrentPage === 1}>
					<ChevronLeft class="mr-1 h-4 w-4" />
					Previous
				</Button>
				<Button size="sm" variant="outline" onclick={nextPage} disabled={safeCurrentPage === totalPages}>
					Next
					<ChevronRight class="ml-1 h-4 w-4" />
				</Button>
			</div>
		</section>
	</div>
</div>
