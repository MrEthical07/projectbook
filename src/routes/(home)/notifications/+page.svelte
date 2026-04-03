<script lang="ts">
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Badge from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { ExternalLink, Inbox, MailOpen, Trash2 } from "@lucide/svelte";

	type SourceType = "Project Activity" | "Project Invitation" | "System Notification";
	type ReadState = "Unread" | "Read";

	type Notification = {
		id: string;
		title: string;
		description: string;
		project?: string;
		sourceType: SourceType;
		read: boolean;
		timestamp: string;
		inviter?: string;
		role?: string;
		dismissed?: boolean;
	};

	let { data } = $props();
	let notifications = $derived(structuredClone(data.notifications) as Notification[]);

	let filterRead = $state<"All" | ReadState>("All");
	let filterSource = $state<"All" | SourceType>("All");
	let filterProject = $state<string>("All Projects");
	let sortOrder = $state<"Newest first" | "Oldest first">("Newest first");

	let dismissTarget = $state<Notification | null>(null);
	let dismissOpen = $state(false);

	const projects = $derived([
		"All Projects",
		...Array.from(
			new Set(
				notifications
					.filter((item) => item.project && !item.dismissed)
					.map((item) => item.project as string)
			)
		),
	]);

	const unreadCount = $derived(
		notifications.filter((item) => !item.read && !item.dismissed).length
	);

	const visibleNotifications = $derived.by(() => {
		let items = notifications.filter((item) => !item.dismissed);
		if (filterRead !== "All") {
			items = items.filter((item) => (filterRead === "Unread" ? !item.read : item.read));
		}
		if (filterSource !== "All") {
			items = items.filter((item) => item.sourceType === filterSource);
		}
		if (filterProject !== "All Projects") {
			items = items.filter((item) => item.project === filterProject);
		}
		items = [...items].sort((a, b) => {
			if (sortOrder === "Newest first") return a.timestamp.localeCompare(b.timestamp);
			return b.timestamp.localeCompare(a.timestamp);
		});
		return items;
	});

	const markAllRead = () => {
		notifications = notifications.map((item) =>
			item.dismissed ? item : { ...item, read: true }
		);
	};

	const markAsRead = (id: string) => {
		notifications = notifications.map((item) =>
			item.id === id ? { ...item, read: true } : item
		);
	};

	const openDismissDialog = (notification: Notification) => {
		dismissTarget = notification;
		dismissOpen = true;
	};

	const dismissNotification = () => {
		if (!dismissTarget) return;
		notifications = notifications.map((item) =>
			item.id === dismissTarget!.id ? { ...item, dismissed: true } : item
		);
		dismissOpen = false;
		dismissTarget = null;
	};

</script>

<svelte:head>
	<title>Notifications • ProjectBook</title>
	<meta name="description" content="View updates, alerts, and important changes across your workspace." />
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<div class="flex flex-col gap-2 p-2 bg-white border rounded-lg">
	<header
		class="flex h-12 shrink-0 w-full items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex items-center gap-2 px-4 w-full">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page>Notifications</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-5 py-2 md:px-20">
		<div class="flex flex-col gap-2 rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				Notifications Ã‚Â· Inbox
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-3">
					<h1 class="text-3xl font-semibold">Notifications</h1>
					<Badge.Badge variant="outline">{unreadCount} unread</Badge.Badge>
				</div>
				<div class="flex items-center gap-2">
					{#if unreadCount > 0}
						<Button size="sm" variant="outline" onclick={markAllRead}>
							Mark all as read
						</Button>
					{/if}
				</div>
			</div>
		</div>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Filters</div>
			<div class="grid gap-4 md:grid-cols-4">
				<div class="grid gap-2">
					<Label>Read status</Label>
					<Select.Root type="single" bind:value={filterRead}>
						<Select.Trigger class="w-full">{filterRead}</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							<Select.Item value="Unread" label="Unread">Unread</Select.Item>
							<Select.Item value="Read" label="Read">Read</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label>Source type</Label>
					<Select.Root type="single" bind:value={filterSource}>
						<Select.Trigger class="w-full">{filterSource}</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							<Select.Item value="Project Activity" label="Project Activity">
								Project Activity
							</Select.Item>
							<Select.Item value="Project Invitation" label="Project Invitation">
								Project Invitation
							</Select.Item>
							<Select.Item value="System Notification" label="System Notification">
								System Notification
							</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label>Project</Label>
					<Select.Root type="single" bind:value={filterProject}>
						<Select.Trigger class="w-full">{filterProject}</Select.Trigger>
						<Select.Content>
							{#each projects as project (project)}
								<Select.Item value={project} label={project}>{project}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label>Sort</Label>
					<Select.Root type="single" bind:value={sortOrder}>
						<Select.Trigger class="w-full">{sortOrder}</Select.Trigger>
						<Select.Content>
							<Select.Item value="Newest first" label="Newest first">Newest first</Select.Item>
							<Select.Item value="Oldest first" label="Oldest first">Oldest first</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Notifications</div>
			{#if visibleNotifications.length === 0}
				<div class="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-10 text-center">
					<Inbox class="h-6 w-6 text-muted-foreground" />
					<div class="text-sm font-medium">No notifications to show</div>
					<div class="text-xs text-muted-foreground">
						Try adjusting filters or check back later.
					</div>
				</div>
			{:else}
				<div class="grid gap-3">
					{#each visibleNotifications as item (item.id)}
						<div
							class="flex flex-col gap-3 rounded-md border border-border p-3 transition hover:border-muted-foreground/40"
						>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="flex items-start gap-3">
									<div
										class={`mt-1 h-2 w-2 rounded-full ${
											item.read ? "bg-muted-foreground/40" : "bg-emerald-500"
										}`}
									></div>
									<div class="grid gap-1">
										<div class="flex flex-wrap items-center gap-2">
											<div class="text-sm font-medium">{item.title}</div>
											{#if item.sourceType === "System Notification"}
												<Badge.Badge variant="outline">System</Badge.Badge>
											{:else}
												<Badge.Badge variant="outline">{item.project}</Badge.Badge>
											{/if}
										</div>
										<div class="text-xs text-muted-foreground">{item.description}</div>
										<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
											<span>{item.sourceType}</span>
											<span>Ã‚Â·</span>
											<span>{item.timestamp}</span>
										</div>
										{#if item.inviter}
											<div class="flex items-center gap-2 text-xs text-muted-foreground">
												<Avatar.Root class="h-6 w-6">
													<Avatar.Fallback class="text-[9px]">
														{item.inviter
															.split(" ")
															.map((part) => part[0])
															.join("")
															.slice(0, 2)}
													</Avatar.Fallback>
												</Avatar.Root>
												<span>{item.inviter}</span>
												<span>Ã‚Â·</span>
												<span>{item.role}</span>
											</div>
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-2">
									{#if item.sourceType === "Project Invitation"}
									<Tooltip.Provider>
										<Tooltip.Root>
											<Tooltip.Trigger>
												<a
													class={buttonVariants({ variant: "ghost", size: "icon" })}
													href="/invites"
													aria-label="Open invites"
												>
													<ExternalLink class="h-4 w-4" />
												</a>
											</Tooltip.Trigger>
											<Tooltip.Content>Open invites</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									{/if}
									{#if !item.read}
										<Button size="sm" variant="outline" onclick={() => markAsRead(item.id)}>
											<MailOpen class="mr-2 h-4 w-4" />
											Mark read
										</Button>
									{/if}
									<Button size="sm" variant="ghost" onclick={() => openDismissDialog(item)}>
										<Trash2 class="mr-2 h-4 w-4" />
										Dismiss
									</Button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>

<Dialog.Root bind:open={dismissOpen} onOpenChange={(open) => open || (dismissTarget = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Dismiss this notification?</Dialog.Title>
			<Dialog.Description>
				Dismissed notifications are removed permanently and cannot be recovered.
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
			This action cannot be undone.
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Button variant="destructive" onclick={dismissNotification}>
				<Trash2 class="mr-2 h-4 w-4" />
				Dismiss
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
