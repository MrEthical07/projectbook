<script lang="ts">
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Badge from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Check, Inbox, Trash2 } from "@lucide/svelte";

	type InviteStatus = "Active" | "Archived";
	type Invite = {
		id: string;
		projectName: string;
		projectDescription: string;
		projectStatus: InviteStatus;
		projectId?: string;
		inviterName: string;
		inviterRole: "Owner" | "Admin";
		inviterEmail?: string;
		assignedRole: "Member" | "Viewer";
		sentAt: string;
		expiresAt?: string;
		expired?: boolean;
	};

	let invites = $state<Invite[]>([
		{
			id: "inv-1",
			projectName: "Atlas Research",
			projectDescription: "Prototype new onboarding flows for early-stage cohorts.",
			projectStatus: "Active",
			projectId: "atlas-2026",
			inviterName: "Maya Singh",
			inviterRole: "Owner",
			inviterEmail: "maya@league.dev",
			assignedRole: "Member",
			sentAt: "Feb 3, 2026",
			expiresAt: "Feb 10, 2026",
		},
		{
			id: "inv-2",
			projectName: "Northwind Revamp",
			projectDescription: "Reframe the testing experience and consolidate insight reports.",
			projectStatus: "Active",
			inviterName: "Jordan Lee",
			inviterRole: "Admin",
			inviterEmail: "jordan@northwind.io",
			assignedRole: "Viewer",
			sentAt: "Jan 28, 2026",
			expired: true,
		},
	]);

	let acceptOpen = $state(false);
	let acceptTarget = $state<Invite | null>(null);
	let declineOpen = $state(false);
	let declineTarget = $state<Invite | null>(null);

	const pendingCount = $derived(invites.filter((invite) => !invite.expired).length);

	const openAcceptDialog = (invite: Invite) => {
		acceptTarget = invite;
		acceptOpen = true;
	};

	const openDeclineDialog = (invite: Invite) => {
		declineTarget = invite;
		declineOpen = true;
	};

	const acceptInvite = () => {
		if (!acceptTarget || acceptTarget.expired) return;
		invites = invites.filter((item) => item.id !== acceptTarget.id);
		acceptOpen = false;
		acceptTarget = null;
	};

	const declineInvite = () => {
		if (!declineTarget) return;
		invites = invites.filter((item) => item.id !== declineTarget.id);
		declineOpen = false;
		declineTarget = null;
	};
</script>

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
						<Breadcrumb.Page>Invites</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-5 py-2 md:px-20">
		<div class="flex flex-col gap-2 rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">Invites - Inbox</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-3">
					<h1 class="text-3xl font-semibold">Invites</h1>
					<Badge.Badge variant="outline">{pendingCount} pending</Badge.Badge>
				</div>
			</div>
		</div>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Pending Invitations</div>
			{#if invites.length === 0}
				<div class="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-10 text-center">
					<Inbox class="h-6 w-6 text-muted-foreground" />
					<div class="text-sm font-medium">No pending invitations</div>
					<div class="text-xs text-muted-foreground">
						When you're invited to a project, it will appear here.
					</div>
				</div>
			{:else}
				<div class="grid gap-4">
					{#each invites as invite (invite.id)}
						<div
							class={`flex flex-col gap-4 rounded-md border p-4 ${
								invite.expired ? "border-amber-200 bg-amber-50/50" : "border-border"
							}`}
						>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="grid gap-1">
									<div class="flex flex-wrap items-center gap-2">
										<h2 class="text-lg font-semibold">{invite.projectName}</h2>
										{#if invite.expired}
											<Badge.Badge variant="outline">Expired</Badge.Badge>
										{:else}
											<Badge.Badge variant="outline">{invite.projectStatus}</Badge.Badge>
										{/if}
									</div>
									<div class="text-sm text-muted-foreground">{invite.projectDescription}</div>
									{#if invite.projectId}
										<div class="text-xs text-muted-foreground">Project ID - {invite.projectId}</div>
									{/if}
								</div>
								<div class="flex flex-col items-end text-xs text-muted-foreground">
									<span>Sent {invite.sentAt}</span>
									{#if invite.expiresAt}
										<span>Expires {invite.expiresAt}</span>
									{/if}
								</div>
							</div>

							<Separator />

							<div class="grid gap-3 md:grid-cols-2">
								<div class="grid gap-1">
									<div class="text-xs uppercase tracking-wide text-muted-foreground">Inviter</div>
									<div class="flex items-center gap-2 text-sm font-medium">
										<Avatar.Root class="h-7 w-7">
											<Avatar.Fallback class="text-[10px]">
												{invite.inviterName
													.split(" ")
													.map((part) => part[0])
													.join("")
													.slice(0, 2)}
											</Avatar.Fallback>
										</Avatar.Root>
										<span>{invite.inviterName}</span>
									</div>
									<div class="text-xs text-muted-foreground">
										{invite.inviterRole}
										{#if invite.inviterEmail}
											<span> - {invite.inviterEmail}</span>
										{/if}
									</div>
								</div>
								<div class="grid gap-1">
									<div class="text-xs uppercase tracking-wide text-muted-foreground">
										Invitation Details
									</div>
									<div class="text-sm font-medium">Role - {invite.assignedRole}</div>
									<div class="text-xs text-muted-foreground">Sent {invite.sentAt}</div>
								</div>
							</div>

							<div class="flex flex-wrap items-center gap-2">
								<Button
									size="sm"
									disabled={invite.expired}
									on:click={() => openAcceptDialog(invite)}
								>
									<Check class="mr-2 h-4 w-4" />
									Accept invitation
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={invite.expired}
									on:click={() => openDeclineDialog(invite)}
								>
									Decline invitation
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>

<Dialog.Root bind:open={acceptOpen} onOpenChange={(open) => open || (acceptTarget = null)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Accept this invitation?</Dialog.Title>
			<Dialog.Description>
				You'll join the project immediately with the assigned role.
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
			This action will add the project to your workspace.
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Button on:click={acceptInvite}>
				<Check class="mr-2 h-4 w-4" />
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
				Declining removes this invite permanently. You won't be able to recover it.
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
			This action cannot be undone.
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Button variant="destructive" on:click={declineInvite}>
				<Trash2 class="mr-2 h-4 w-4" />
				Decline invitation
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
