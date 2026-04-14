<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { page } from "$app/state";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Popover from "$lib/components/ui/popover";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Toaster } from "$lib/components/ui/sonner";
	import * as Table from "$lib/components/ui/table";
	import {
		cancelProjectInvite,
		createProjectInvite
	} from "$lib/remote/project.remote";
	import { getContext } from "svelte";
	import { can } from "$lib/utils/permission";
	import { toast } from "svelte-sonner";

	type MemberRole =
		| "Owner"
		| "Admin"
		| "Editor"
		| "Member"
		| "Viewer"
		| "Limited Access";
	type InviteStatus = "pending" | "accepted";

	type Member = {
		name: string;
		email: string;
		role: MemberRole;
		joinedDate: string;
		team: string;
		location: string;
	};

	type Invite = {
		email: string;
		role: MemberRole;
		sentDate: string;
		status: InviteStatus;
	};

	const roleValues: MemberRole[] = [
		"Owner",
		"Admin",
		"Editor",
		"Member",
		"Viewer",
		"Limited Access"
	];
	const inviteStatusValues: InviteStatus[] = ["pending", "accepted"];

	const requiredString = (value: unknown, path: string): string => {
		if (typeof value !== "string" || value.trim().length === 0) {
			throw new Error(`Invalid or missing '${path}'.`);
		}
		return value.trim();
	};

	const requiredRole = (value: unknown, path: string): MemberRole => {
		if (!roleValues.includes(value as MemberRole)) {
			throw new Error(`Invalid '${path}'.`);
		}
		return value as MemberRole;
	};

	const requiredInviteStatus = (value: unknown, path: string): InviteStatus => {
		if (!inviteStatusValues.includes(value as InviteStatus)) {
			throw new Error(`Invalid '${path}'.`);
		}
		return value as InviteStatus;
	};

	const optionalString = (value: unknown, fallback: string): string => {
		if (typeof value !== "string") return fallback;
		const normalized = value.trim();
		return normalized.length > 0 ? normalized : fallback;
	};

	const resolveDateLike = (value: unknown, fallback: unknown, fallbackText: string): string => {
		const primary = typeof value === "string" ? value.trim() : "";
		if (primary.length > 0) {
			return primary;
		}
		const secondary = typeof fallback === "string" ? fallback.trim() : "";
		if (secondary.length > 0) {
			return secondary;
		}
		return fallbackText;
	};

	const parseInvites = (source: unknown, path: string): Invite[] => {
		if (!Array.isArray(source)) return [];
		const parsed: Invite[] = [];
		for (const [index, item] of source.entries()) {
			if (!item || typeof item !== "object") {
				continue;
			}
			const row = item as Record<string, unknown>;
			try {
				parsed.push({
					email: requiredString(row.email, `${path}[${index}].email`),
					role: requiredRole(row.role, `${path}[${index}].role`),
					sentDate: requiredString(row.sentDate, `${path}[${index}].sentDate`),
					status: requiredInviteStatus(row.status, `${path}[${index}].status`)
				});
			} catch {
				continue;
			}
		}
		return parsed;
	};

	let { data } = $props();
	const projectId = page.params.projectId;
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canInviteMember = can(permissions, "member", "create");
	const canEditMember = can(permissions, "member", "edit");
	const canCancelInvite = can(permissions, "member", "delete");
	let members = $derived.by<Member[]>(() => {
		const rawMembers = structuredClone(data.members);
		if (!Array.isArray(rawMembers)) return [];
		const parsed: Member[] = [];
		for (const [index, item] of rawMembers.entries()) {
			if (!item || typeof item !== "object") {
				continue;
			}
			const row = item as unknown as Record<string, unknown>;
			try {
				parsed.push({
					name: requiredString(row.name, `members[${index}].name`),
					email: requiredString(row.email, `members[${index}].email`),
					role: requiredRole(row.role, `members[${index}].role`),
					joinedDate: resolveDateLike(row.joinedDate, row.joinedAt, "Unknown"),
					team: optionalString(row.team, "Unassigned"),
					location: optionalString(row.location, "Unknown")
				});
			} catch {
				continue;
			}
		}
		return parsed;
	});

	let invites = $derived.by<Invite[]>(() => {
		return parseInvites(structuredClone(data.invites), "invites");
	});

	let searchQuery = $state("");
	let isInviteOpen = $state(false);
	let inviteForm = $state({
		name: "",
		email: "",
		role: "Limited Access" as MemberRole,
		team: "",
		location: "",
		joinedDate: ""
	});

	/**
	 * Filter members by name, email, role, team, or location.
	 */
	const filterMembers = (query: string) => {
		const normalizedQuery = query.trim().toLowerCase();

		if (!normalizedQuery) {
			return members;
		}

		return members.filter((member) => {
			return [
				member.name,
				member.email,
				member.role,
				member.team,
				member.location
			]
				.join(" ")
				.toLowerCase()
				.includes(normalizedQuery);
		});
	};

	/**
	 * Provide badge styling based on invite status.
	 */
	const inviteVariant = (status: InviteStatus) => {
		if (status === "pending") {
			return "secondary";
		}

		return "default";
	};

	/**
	 * Reset the invite form after sending or dismissing the popover.
	 */
	const resetInviteForm = () => {
		inviteForm = {
			name: "",
			email: "",
			role: "Limited Access",
			team: "",
			location: "",
			joinedDate: ""
		};
	};

	/**
	 * Send an invite and surface a toast confirmation for the status update.
	 */
	const handleInviteSubmit = async () => {
		const email = inviteForm.email.trim();
		if (!email) {
			toast.error("Invite email is required.");
			return;
		}
		if (!permissions) {
			toast.error("Permission denied.");
			return;
		}

		const result = await createProjectInvite({
			input: {
				projectId,
				email,
				role: canEditMember ? inviteForm.role : "Limited Access"
			}
});
		if (!result.success) {
			toast.error(result.error);
			return;
		}

		toast.success(`Invite sent to ${email}.`);
		isInviteOpen = false;
		resetInviteForm();
		await invalidateAll();
	};

	const cancelInvite = async (email: string) => {
		if (!permissions) {
			toast.error("Permissions context is unavailable.");
			return;
		}
		const result = await cancelProjectInvite({
			input: {
				projectId,
				email
			}
});
		if (!result.success) {
			toast.error(result.error);
			return;
		}
		toast.info(`Invite to ${email} cancelled.`);
		await invalidateAll();
	};

	let filteredMembers = $derived(filterMembers(searchQuery));
</script>

	<svelte:head>
		<title>Members • {((data as Record<string, unknown>).project as { name?: string } | undefined)?.name ?? "Project"} • ProjectBook</title>
		<meta
			name="description"
			content="Manage project members, invites, and assigned access roles."
		/>
		<meta name="robots" content="noindex, nofollow" />
		<meta name="googlebot" content="noindex, nofollow" />
	</svelte:head>

<div class="flex flex-col gap-4 rounded-lg bg-background p-4">
	<Toaster position="top-right" />
	<header
		class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="/members">Members</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Team dashboard</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-4">
		<Card.Root>
			<Card.Header class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<Card.Title>Team members</Card.Title>
					<Card.Description>
						Manage people, assign roles, and track pending invites.
					</Card.Description>
				</div>
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
					<Input
						placeholder="Search by name, email, team, or role"
						bind:value={searchQuery}
						class="sm:w-72"
					/>
				{#if canInviteMember}
					<Popover.Root bind:open={isInviteOpen}>
						<Popover.Trigger class={buttonVariants()}>Add member</Popover.Trigger>
						<Popover.Content class="w-96">
							<div class="flex flex-col gap-4">
								<div>
									<h3 class="text-sm font-semibold">Invite a new member</h3>
									<p class="text-xs text-muted-foreground">
										Add details below to send an invite and assign access.
									</p>
								</div>
								<div class="grid gap-3">
									<div class="grid gap-2">
										<Label for="invite-name">Name</Label>
										<Input id="invite-name" placeholder="Full name" bind:value={inviteForm.name} />
									</div>
									<div class="grid gap-2">
										<Label for="invite-email">Email</Label>
										<Input
											id="invite-email"
											type="email"
											placeholder="name@company.com"
											bind:value={inviteForm.email}
										/>
									</div>
									<div class="grid gap-2">
										<Label for="invite-role">Role</Label>
										<Select.Root type="single" bind:value={inviteForm.role} disabled={!canEditMember}>
											<Select.Trigger id="invite-role">
												{inviteForm.role}
											</Select.Trigger>
											<Select.Content>
												<Select.Item value="Owner" label="Owner">Owner</Select.Item>
												<Select.Item value="Admin" label="Admin">Admin</Select.Item>
												<Select.Item value="Editor" label="Editor">Editor</Select.Item>
												<Select.Item value="Viewer" label="Viewer">Viewer</Select.Item>
												<Select.Item value="Limited Access" label="Limited Access">Limited Access</Select.Item>
											</Select.Content>
										</Select.Root>
									</div>
									<div class="grid gap-2">
										<Label for="invite-team">Team</Label>
										<Input id="invite-team" placeholder="Team or squad" bind:value={inviteForm.team} />
									</div>
									<div class="grid gap-2">
										<Label for="invite-location">Location</Label>
										<Input
											id="invite-location"
											placeholder="City, Country"
											bind:value={inviteForm.location}
										/>
									</div>
									<div class="grid gap-2">
										<Label for="invite-date">Joined date</Label>
										<Input id="invite-date" type="date" bind:value={inviteForm.joinedDate} />
									</div>
								</div>
								<div class="flex justify-end gap-2">
									<Button
										variant="outline"
										onclick={() => {
											isInviteOpen = false;
											resetInviteForm();
										}}
									>
										Cancel
									</Button>
									<Button onclick={handleInviteSubmit}>Send invite</Button>
								</div>
							</div>
						</Popover.Content>
					</Popover.Root>
				{/if}
			</div>
		</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Caption>Active members with access to this project.</Table.Caption>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head>Email</Table.Head>
							<Table.Head>Role</Table.Head>
							<Table.Head>Team</Table.Head>
							<Table.Head>Location</Table.Head>
							<Table.Head class="text-right">Joined</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredMembers as member (member.email)}
							<Table.Row>
								<Table.Cell class="font-medium">{member.name}</Table.Cell>
								<Table.Cell>{member.email}</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">{member.role}</Badge>
								</Table.Cell>
								<Table.Cell>{member.team}</Table.Cell>
								<Table.Cell>{member.location}</Table.Cell>
								<Table.Cell class="text-right">{member.joinedDate}</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell class="text-center text-muted-foreground" colspan={6}>
									No members match this search.
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Pending invites</Card.Title>
				<Card.Description>
					Invitations awaiting acceptance or follow-up.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Caption>Review invites and resend if needed.</Table.Caption>
					<Table.Header>
						<Table.Row>
							<Table.Head>Email</Table.Head>
							<Table.Head>Role</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Sent</Table.Head>
							<Table.Head class="text-right">Action</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each invites as invite (invite.email)}
							<Table.Row>
								<Table.Cell class="font-medium">{invite.email}</Table.Cell>
								<Table.Cell>{invite.role}</Table.Cell>
								<Table.Cell>
									<Badge variant={inviteVariant(invite.status)}>
										{invite.status.toUpperCase()}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">{invite.sentDate}</Table.Cell>
								<Table.Cell class="text-right">
									{#if canCancelInvite}
										<Button variant="outline" size="sm" onclick={() => cancelInvite(invite.email)}>Cancel</Button>
									{/if}
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell class="text-center text-muted-foreground" colspan={5}>
									No pending invites right now.
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	</div>
</div>
