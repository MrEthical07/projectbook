<script lang="ts">
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
	import { toast } from "svelte-sonner";

	type MemberRole = "Owner" | "Admin" | "Editor" | "Viewer";
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

	const members: Member[] = [
		{
			name: "Sophia Lee",
			email: "sophia.lee@projectbook.io",
			role: "Owner",
			joinedDate: "Jan 12, 2024",
			team: "Product",
			location: "San Francisco, CA"
		},
		{
			name: "Marcus Reid",
			email: "marcus.reid@projectbook.io",
			role: "Admin",
			joinedDate: "Feb 3, 2024",
			team: "Design",
			location: "New York, NY"
		},
		{
			name: "Priya Nair",
			email: "priya.nair@projectbook.io",
			role: "Editor",
			joinedDate: "Mar 22, 2024",
			team: "Research",
			location: "Toronto, CA"
		},
		{
			name: "Diego Santos",
			email: "diego.santos@projectbook.io",
			role: "Viewer",
			joinedDate: "Apr 10, 2024",
			team: "Operations",
			location: "Lisbon, PT"
		}
	];

	const invites: Invite[] = [
		{
			email: "melissa.chen@projectbook.io",
			role: "Editor",
			sentDate: "Apr 18, 2024",
			status: "pending"
		},
		{
			email: "ashton.clark@projectbook.io",
			role: "Viewer",
			sentDate: "Apr 20, 2024",
			status: "pending"
		}
	];

	let searchQuery = $state("");
	let isInviteOpen = $state(false);
	let inviteForm = $state({
		name: "",
		email: "",
		role: "Viewer" as MemberRole,
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
			role: "Viewer",
			team: "",
			location: "",
			joinedDate: ""
		};
	};

	/**
	 * Send an invite and surface a toast confirmation for the status update.
	 */
	const handleInviteSubmit = () => {
		toast.success(`Invite sent to ${inviteForm.email || "new member"}.`);
		isInviteOpen = false;
		resetInviteForm();
	};

	const filteredMembers = $derived(filterMembers(searchQuery));
</script>

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
									<Select.Root type="single" bind:value={inviteForm.role}>
										<Select.Trigger id="invite-role">
											{inviteForm.role || "Select a role"}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="Owner" label="Owner">Owner</Select.Item>
											<Select.Item value="Admin" label="Admin">Admin</Select.Item>
											<Select.Item value="Editor" label="Editor">Editor</Select.Item>
											<Select.Item value="Viewer" label="Viewer">Viewer</Select.Item>
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
			</div>
		</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Caption>Active members with access to this workspace.</Table.Caption>
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
						{#each filteredMembers as member}
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
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each invites as invite}
							<Table.Row>
								<Table.Cell class="font-medium">{invite.email}</Table.Cell>
								<Table.Cell>{invite.role}</Table.Cell>
								<Table.Cell>
									<Badge variant={inviteVariant(invite.status)}>
										{invite.status.toUpperCase()}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">{invite.sentDate}</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell class="text-center text-muted-foreground" colspan={4}>
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
