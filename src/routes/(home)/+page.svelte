<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Badge from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { resolveProjectIcon } from "$lib/utils/project-icons";
	import {
		acceptWorkspaceInvite,
		declineWorkspaceInvite
	} from "$lib/remote/workspace.remote";
	import {
		Activity,
		Bell,
		Check,
		Clock3,
		FolderKanban,
		Mail,
		MessageSquare,
		Plus,
		Trash2,
		UserPlus
	} from "@lucide/svelte";
	import { onMount } from "svelte";

	let { data } = $props();

	type Project = {
		id: string;
		name: string;
		organization: string;
		icon: ProjectIconKey;
		description?: string;
		role: "Owner" | "Admin" | "Member" | "Viewer" | "Limited Access";
		openTasks?: number;
		lastVisitedAt?: string;
		lastUpdatedAt: string;
	};

	type Invite = {
		id: string;
		projectName: string;
		organizationName: string;
		inviterName: string;
		assignedRole: "Member" | "Viewer" | "Limited Access";
		expiresSoon?: boolean;
	};

	type Notification = {
		id: string;
		text: string;
		timestamp: string;
		icon: typeof Bell;
		url: string;
		unread?: boolean;
	};

	type NotificationSource = {
		id: string;
		text: string;
		timestamp: string;
		url: string;
		unread?: boolean;
	};

	type ActivityItem = {
		id: string;
		userName: string;
		userInitials: string;
		action: string;
		projectName: string;
		timestamp: string;
		involved: boolean;
		occurredAt: string;
	};

	let user = $derived(structuredClone(data.user));
	let projects = $derived<Project[]>(structuredClone(data.projects) as Project[]);
	let invites = $derived<Invite[]>(structuredClone(data.invites) as Invite[]);
	const actorId = $derived(data.user.id);
	let inviteActionError = $state("");

	let acceptOpen = $state(false);
	let acceptTarget = $state<Invite | null>(null);
	let declineOpen = $state(false);
	let declineTarget = $state<Invite | null>(null);

	const openAcceptDialog = (invite: Invite) => {
		acceptTarget = invite;
		acceptOpen = true;
	};

	const openDeclineDialog = (invite: Invite) => {
		declineTarget = invite;
		declineOpen = true;
	};

	const acceptInvite = async () => {
		inviteActionError = "";
		const target = acceptTarget;
		if (!target) return;
		if (!actorId) {
			inviteActionError = "Active user id is missing.";
			return;
		}
		const result = await acceptWorkspaceInvite({
			actorId,
			inviteId: target.id
		});
		if (!result.success) {
			inviteActionError = result.error;
			return;
		}
		acceptOpen = false;
		acceptTarget = null;
		await invalidateAll();
	};

	const declineInvite = async () => {
		inviteActionError = "";
		const target = declineTarget;
		if (!target) return;
		if (!actorId) {
			inviteActionError = "Active user id is missing.";
			return;
		}
		const result = await declineWorkspaceInvite({
			actorId,
			inviteId: target.id
		});
		if (!result.success) {
			inviteActionError = result.error;
			return;
		}
		declineOpen = false;
		declineTarget = null;
		await invalidateAll();
	};

	const toNotifications = (items: NotificationSource[]): Notification[] =>
		items.map((item) => ({
			...item,
			icon: item.url === "/invites" ? Mail : item.unread ? MessageSquare : Bell
		}));

	let notifications = $derived<Notification[]>(
		toNotifications(structuredClone(data.notifications) as NotificationSource[])
	);
	let activity = $derived<ActivityItem[]>(structuredClone(data.activity) as ActivityItem[]);

	const toEpoch = (value?: string) => {
		if (!value) return Number.NEGATIVE_INFINITY;
		const parsed = Date.parse(value);
		return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
	};

	const compareOccurredDesc = (a: ActivityItem, b: ActivityItem) => {
		const timeDelta = toEpoch(b.occurredAt) - toEpoch(a.occurredAt);
		if (timeDelta !== 0) return timeDelta;
		return a.id.localeCompare(b.id);
	};

	let todayLabel = $derived(
		new Date().toLocaleDateString("en-US", {
			weekday: "long",
			month: "short",
			day: "numeric",
			year: "numeric"
		})
	);

	let sortedProjects = $derived.by(() => {
		return [...projects].sort((a, b) => {
			const aPrimary = a.lastVisitedAt ? toEpoch(a.lastVisitedAt) : toEpoch(a.lastUpdatedAt);
			const bPrimary = b.lastVisitedAt ? toEpoch(b.lastVisitedAt) : toEpoch(b.lastUpdatedAt);
			const primaryDelta = bPrimary - aPrimary;
			if (primaryDelta !== 0) return primaryDelta;

			const secondaryDelta = toEpoch(b.lastUpdatedAt) - toEpoch(a.lastUpdatedAt);
			if (secondaryDelta !== 0) return secondaryDelta;

			return a.name.localeCompare(b.name);
		});
	});

	let recentProjects = $derived.by(() => {
		return sortedProjects.slice(0, 6).map((project) => ({
			...project,
			iconComponent: resolveProjectIcon(project.icon)
		}));
	});
	let hasMoreProjects = $derived(sortedProjects.length > 6);
	let pendingInvites = $derived(invites.slice(0, 3));
	let hasPendingInvites = $derived(pendingInvites.length > 0);
	let notificationItems = $derived(notifications.slice(0, 5));
	let unreadNotificationCount = $derived(notifications.filter((item) => item.unread).length);
	let isEmptyWorkspace = $derived(projects.length === 0 && invites.length === 0);

	let activityFeedReady = $state(false);
	let orderedActivity = $derived.by(() => {
		const involvedItems = activity.filter((item) => item.involved).sort(compareOccurredDesc);
		const globalItems = activity.filter((item) => !item.involved).sort(compareOccurredDesc);
		return [...involvedItems, ...globalItems].slice(0, 10);
	});

	onMount(() => {
		const timeout = setTimeout(() => {
			activityFeedReady = true;
		}, 300);
		return () => clearTimeout(timeout);
	});
</script>

<svelte:head>
	<title>Dashboard • ProjectBook</title>
	<meta
		name="description"
		content="Overview of your projects, recent activity, and quick actions."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<div class="flex flex-col gap-2 rounded-lg bg-background">
	<header
		class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex w-full items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page>Workspace</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	{#if isEmptyWorkspace}
		<section class="mx-auto flex min-h-[72vh] w-full max-w-2xl flex-col items-center justify-center gap-6 rounded-2xl bg-card p-10 text-center shadow-sm">
			<div class="grid gap-2">
				<h1 class="text-3xl font-semibold tracking-tight">Welcome to ProjectBook</h1>
				<p class="text-sm text-muted-foreground">
					Start your first workspace project to plan research, align ideas, and move from
					problem framing to validated outcomes.
				</p>
			</div>
			<Button href="/projects/new" size="lg">
				<Plus class="mr-2 h-4 w-4" />
				Create Your First Project
			</Button>
		</section>
	{:else}
		<div class="grid gap-6 px-4 pb-6 lg:grid-cols-3">
			<div class="space-y-6 lg:col-span-2">
				<section class="rounded-2xl bg-card p-6 shadow-sm">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<div class="grid gap-1">
							<h1 class="text-3xl font-semibold tracking-tight">Good Morning, {user.name}</h1>
							<p class="text-sm text-muted-foreground">Here's your workspace overview.</p>
						</div>
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<Clock3 class="h-3.5 w-3.5" />
							<span>{todayLabel}</span>
						</div>
					</div>
				</section>

				<section class="rounded-2xl bg-card p-6 shadow-sm">
					<div class="mb-4 text-sm font-medium">Quick Actions</div>
					<div class="grid gap-3 sm:grid-cols-3">
						<a
							href="/projects/new"
							class="rounded-xl bg-primary p-4 text-primary-foreground transition hover:opacity-95"
						>
							<div class="mb-3 inline-flex rounded-md bg-primary-foreground/20 p-2">
								<Plus class="h-4 w-4" />
							</div>
							<div class="text-sm font-semibold">Create Project</div>
						</a>

						<a
							href="/invites"
							class="rounded-xl bg-muted p-4 text-foreground transition hover:bg-muted/80"
						>
							<div class="mb-3 inline-flex rounded-md bg-background p-2">
								<UserPlus class="h-4 w-4" />
							</div>
							<div class="flex items-center gap-2">
								<span class="text-sm font-semibold">Join Project</span>
								{#if hasPendingInvites}
									<Badge.Badge variant="secondary">{pendingInvites.length}</Badge.Badge>
								{/if}
							</div>
						</a>

						<a
							href="/projects"
							class="rounded-xl bg-muted p-4 text-foreground transition hover:bg-muted/80"
						>
							<div class="mb-3 inline-flex rounded-md bg-background p-2">
								<FolderKanban class="h-4 w-4" />
							</div>
							<div class="text-sm font-semibold">View All Projects</div>
						</a>
					</div>
				</section>

				<section class="rounded-2xl bg-card p-6 shadow-sm">
					<div class="mb-4 flex items-center justify-between gap-3">
						<div class="text-sm font-medium">Recent Projects</div>
						{#if hasMoreProjects}
							<a class={buttonVariants({ variant: "link", size: "sm" })} href="/projects">
								View All Projects
							</a>
						{/if}
					</div>
					<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{#each recentProjects as project (project.id)}
							<a
								href={`/project/${project.id}`}
								class="rounded-xl bg-muted/40 p-4 transition hover:bg-muted/70"
							>
								<div class="mb-3 flex items-start justify-between gap-2">
									<div class="inline-flex h-8 w-8 items-center justify-center rounded-md bg-background text-xs font-semibold">
										<project.iconComponent class="h-4 w-4" />
									</div>
									{#if project.openTasks}
										<Badge.Badge variant="outline">{project.openTasks} open tasks</Badge.Badge>
									{/if}
								</div>
								<div class="grid gap-1">
									<div class="line-clamp-1 text-sm font-semibold">{project.name}</div>
									<div class="text-xs text-muted-foreground">{project.organization}</div>
									{#if project.description}
										<div class="line-clamp-2 text-xs text-muted-foreground">
											{project.description}
										</div>
									{/if}
									<div class="pt-1 text-[11px] text-muted-foreground">
										Updated {new Date(project.lastUpdatedAt).toLocaleDateString("en-US")}
									</div>
								</div>
							</a>
						{/each}
					</div>
				</section>

				<section class="rounded-2xl bg-card p-6 shadow-sm">
					<div class="mb-4 text-sm font-medium">All Projects</div>
					<div class="overflow-hidden rounded-lg bg-muted/30">
						<table class="w-full text-left text-sm">
							<thead class="text-xs uppercase tracking-wide text-muted-foreground">
								<tr>
									<th class="px-4 py-3">Project Name</th>
									<th class="px-4 py-3">Role</th>
									<th class="px-4 py-3">Last Updated</th>
								</tr>
							</thead>
							<tbody>
								{#each sortedProjects as project (project.id)}
									<tr class="border-t border-border/60">
										<td class="px-4 py-3">
											<a href={`/project/${project.id}`} class="font-medium hover:text-primary">
												{project.name}
											</a>
										</td>
										<td class="px-4 py-3 text-muted-foreground">{project.role}</td>
										<td class="px-4 py-3 text-muted-foreground">
											{new Date(project.lastUpdatedAt).toLocaleDateString("en-US")}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
			</div>

			<aside class="space-y-6">
				{#if hasPendingInvites}
					<section class="rounded-2xl bg-card p-5 shadow-sm">
						<div class="mb-4 flex items-center justify-between gap-3">
							<div class="text-sm font-medium">Invites</div>
							<a class={buttonVariants({ variant: "link", size: "sm" })} href="/invites">View all</a>
						</div>
						<div class="space-y-3">
							{#each pendingInvites as invite (invite.id)}
								<div class="rounded-lg bg-muted/40 p-3">
									<div class="mb-1 text-sm font-semibold">{invite.projectName}</div>
									<div class="text-xs text-muted-foreground">{invite.organizationName}</div>
									<div class="mt-2 text-xs text-muted-foreground">
										Invited by {invite.inviterName} as {invite.assignedRole}
									</div>
									<div class="mt-3 flex items-center gap-1">
										<Button size="sm" onclick={() => openAcceptDialog(invite)}>
											<Check class="h-4 w-4" />
											Accept
										</Button>
										<Button
											size="sm"
											variant="outline"
											onclick={() => openDeclineDialog(invite)}
										>
											Decline
										</Button>
										{#if invite.expiresSoon}
											<Badge.Badge class="ms-auto bg-warning text-warning-foreground">
												Expiring soon
											</Badge.Badge>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<section class="rounded-2xl bg-card p-5 shadow-sm">
					<div class="mb-4 flex items-center justify-between gap-3">
						<div class="text-sm font-medium">Notifications</div>
						{#if unreadNotificationCount > 0}
							<Badge.Badge variant="secondary">{unreadNotificationCount}</Badge.Badge>
						{/if}
					</div>
					{#if notificationItems.length === 0}
						<div class="text-xs text-muted-foreground">No new notifications.</div>
					{:else}
						<div class="space-y-1">
							{#each notificationItems as item (item.id)}
								<a
									href={item.url}
									class="flex items-start gap-3 rounded-md p-2 transition hover:bg-muted/60"
								>
									<div class="mt-0.5 rounded-md bg-muted p-1.5">
										<item.icon class="h-3.5 w-3.5" />
									</div>
									<div class="min-w-0 flex-1">
										<div class="line-clamp-2 text-xs">{item.text}</div>
										<div class="pt-1 text-[11px] text-muted-foreground">{item.timestamp}</div>
									</div>
								</a>
							{/each}
						</div>
					{/if}
				</section>

				<section class="rounded-2xl bg-card p-5 shadow-sm">
					<div class="mb-4 flex items-center justify-between gap-3">
						<div class="text-sm font-medium">Activity Feed</div>
						<a class={buttonVariants({ variant: "link", size: "sm" })} href="/activity">View all</a>
					</div>
					{#if !activityFeedReady}
						<div class="grid gap-2">
							<div class="h-10 animate-pulse rounded-md bg-muted"></div>
							<div class="h-10 animate-pulse rounded-md bg-muted"></div>
							<div class="h-10 animate-pulse rounded-md bg-muted"></div>
						</div>
					{:else}
						<div class="space-y-2">
							{#each orderedActivity as item (item.id)}
								<div class="flex items-start gap-3 rounded-md p-2">
									<Avatar.Root class="h-7 w-7">
										<Avatar.Fallback class="text-[10px]">{item.userInitials}</Avatar.Fallback>
									</Avatar.Root>
									<div class="min-w-0 flex-1">
										<div class="text-xs">
											<span class="font-medium">{item.userName}</span>
											<span class="text-muted-foreground"> {item.action} - {item.projectName}</span>
										</div>
										<div class="pt-1 text-[11px] text-muted-foreground">{item.timestamp}</div>
									</div>
									{#if item.involved}
										<Activity class="mt-0.5 h-3.5 w-3.5 text-primary" />
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</section>
			</aside>
		</div>
	{/if}
</div>

<Dialog.Root bind:open={acceptOpen} onOpenChange={(open) => open || (acceptTarget = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Accept this invitation?</Dialog.Title>
			<Dialog.Description>
				You'll join this project in your workspace immediately.
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
			This will remove the invite from your pending list.
		</div>
		{#if inviteActionError}
			<p class="text-xs text-destructive">{inviteActionError}</p>
		{/if}
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Button onclick={acceptInvite}>
				<Check class="h-4 w-4" />
				Accept invitation
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={declineOpen} onOpenChange={(open) => open || (declineTarget = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Decline this invitation?</Dialog.Title>
			<Dialog.Description>
				Declining removes this invite from your pending list.
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
			This action cannot be undone.
		</div>
		{#if inviteActionError}
			<p class="text-xs text-destructive">{inviteActionError}</p>
		{/if}
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Button variant="destructive" onclick={declineInvite}>
				<Trash2 class="mr-2 h-4 w-4" />
				Decline invitation
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
