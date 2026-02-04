<script lang="ts">
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Toaster } from "$lib/components/ui/sonner";
	import * as Table from "$lib/components/ui/table";
	import { MemberRole } from "$lib/constants/member-roles";
	import { toast } from "svelte-sonner";

	type Member = {
		name: string;
		email: string;
		role: MemberRole;
		status: "active" | "invited";
		updatedAt: string;
	};

	const roleOptions = Object.values(MemberRole);

	let members = $state<Member[]>([
		{
			name: "Sophia Lee",
			email: "sophia.lee@projectbook.io",
			role: MemberRole.Owner,
			status: "active",
			updatedAt: "Today, 10:42 AM"
		},
		{
			name: "Marcus Reid",
			email: "marcus.reid@projectbook.io",
			role: MemberRole.Admin,
			status: "active",
			updatedAt: "Yesterday, 6:15 PM"
		},
		{
			name: "Priya Nair",
			email: "priya.nair@projectbook.io",
			role: MemberRole.Editor,
			status: "active",
			updatedAt: "Mar 22, 2024"
		},
		{
			name: "Diego Santos",
			email: "diego.santos@projectbook.io",
			role: MemberRole.Viewer,
			status: "invited",
			updatedAt: "Invite sent Apr 20, 2024"
		}
	]);

	/**
	 * Persist a role update for a member and surface a toast confirmation.
	 */
	const saveRoleChange = (member: Member) => {
		toast.success(`Role updated for ${member.name}.`);
		member.updatedAt = "Just now";
		members = members;
	};

	/**
	 * Provide a quick visual tag for member status.
	 */
	const statusVariant = (status: Member["status"]) => {
		if (status === "invited") {
			return "secondary";
		}

		return "default";
	};
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
						<Breadcrumb.Page>Roles</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>Member roles</Card.Title>
			<Card.Description>
				Review access levels, update roles, and track the latest changes.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Caption>Only admins can change roles for other members.</Table.Caption>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Email</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Role</Table.Head>
						<Table.Head>Last updated</Table.Head>
						<Table.Head class="text-right">Action</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each members as member}
						<Table.Row>
							<Table.Cell class="font-medium">{member.name}</Table.Cell>
							<Table.Cell>{member.email}</Table.Cell>
							<Table.Cell>
								<Badge variant={statusVariant(member.status)}>
									{member.status.toUpperCase()}
								</Badge>
							</Table.Cell>
							<Table.Cell class="min-w-48">
								<Select.Root type="single" bind:value={member.role}>
									<Select.Trigger>
										{member.role}
									</Select.Trigger>
									<Select.Content>
										{#each roleOptions as role}
											<Select.Item value={role} label={role}>
												{role}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</Table.Cell>
							<Table.Cell>{member.updatedAt}</Table.Cell>
							<Table.Cell class="text-right">
								<Button variant="outline" onclick={() => saveRoleChange(member)}>
									Save
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
