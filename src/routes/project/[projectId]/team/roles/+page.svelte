<script lang="ts">
    import { page } from "$app/state";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Switch } from "$lib/components/ui/switch";
	import { Toaster } from "$lib/components/ui/sonner";
	import * as Table from "$lib/components/ui/table";
	import { MemberRole } from "$lib/constants/member-roles";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
    import { store } from "$lib/stores.svelte";
    import type { Member } from "$lib/types";

    const projectId = $derived(page.params.projectId ?? "");
    const project = $derived(store.projects.find(p => p.id === projectId));

    // Map store members to local display
    // Store member role is string, but here enum is used. Cast or map.
    // MemberRole enum values match string ("Owner", etc) likely.

    const members = $derived((project?.members || []).map(m => ({
        ...m,
        updatedAt: m.joinedAt // Fallback
    })));

	const roleOptions = Object.values(MemberRole);
	const permissions = [
		{ id: "create", label: "Create artifacts" },
		{ id: "edit", label: "Edit artifacts" },
		{ id: "lock", label: "Lock artifacts" },
		{ id: "archive", label: "Archive artifacts" },
		{ id: "manage_members", label: "Manage members" },
		{ id: "edit_settings", label: "Edit project settings" }
	] as const;

	let permissionsSaving = $state(false);
	let permissionsSavePhase = $state<"idle" | "saving" | "saved">("idle");
	let permissionsSavedSignature = $state("");
	let permissionsSaveTimer: ReturnType<typeof setTimeout> | null = null;
	let permissionsSavedBadgeTimer: ReturnType<typeof setTimeout> | null = null;
	let permissionMatrix = $state<Record<(typeof permissions)[number]["id"], Record<MemberRole, boolean>>>({
		create: {
			[MemberRole.Owner]: true,
			[MemberRole.Admin]: true,
			[MemberRole.Editor]: true,
			[MemberRole.Viewer]: false
		},
		edit: {
			[MemberRole.Owner]: true,
			[MemberRole.Admin]: true,
			[MemberRole.Editor]: true,
			[MemberRole.Viewer]: false
		},
		lock: {
			[MemberRole.Owner]: true,
			[MemberRole.Admin]: true,
			[MemberRole.Editor]: false,
			[MemberRole.Viewer]: false
		},
		archive: {
			[MemberRole.Owner]: true,
			[MemberRole.Admin]: false,
			[MemberRole.Editor]: false,
			[MemberRole.Viewer]: false
		},
		manage_members: {
			[MemberRole.Owner]: true,
			[MemberRole.Admin]: true,
			[MemberRole.Editor]: false,
			[MemberRole.Viewer]: false
		},
		edit_settings: {
			[MemberRole.Owner]: true,
			[MemberRole.Admin]: true,
			[MemberRole.Editor]: false,
			[MemberRole.Viewer]: false
		}
	});

	const permissionsSignature = $derived(JSON.stringify(permissionMatrix));
	const permissionsDirty = $derived(permissionsSignature !== permissionsSavedSignature);
	const permissionsIndicator = $derived.by(() => {
		if (permissionsSavePhase === "saving") return "saving";
		if (permissionsDirty) return "edited";
		if (permissionsSavePhase === "saved") return "saved";
		return "idle";
	});

	/**
	 * Persist a role update for a member and surface a toast confirmation.
	 */
	const saveRoleChange = (member: any, newRole: string) => {
        if (!project) return;

        const updatedMembers = project.members.map(m => m.id === member.id ? { ...m, role: newRole as any } : m);
        store.updateProject(project.id, { members: updatedMembers });

		toast.success(`Role updated for ${member.name}.`);
	};

	/**
	 * Provide a quick visual tag for member status.
	 */
	const statusVariant = (status: string) => {
		if (status === "Invited") { // Matched types.ts
			return "secondary";
		}
		return "default";
	};

	const savePermissions = () => {
		if (permissionsSaving) return;
		if (!permissionsDirty) return;
		permissionsSaving = true;
		permissionsSavePhase = "saving";
		if (permissionsSaveTimer) clearTimeout(permissionsSaveTimer);
		if (permissionsSavedBadgeTimer) clearTimeout(permissionsSavedBadgeTimer);
		setTimeout(() => {
			permissionsSaving = false;
			permissionsSavedSignature = permissionsSignature;
			permissionsSavePhase = "saved";
			toast.success("Role permissions saved.");
			permissionsSavedBadgeTimer = setTimeout(() => {
				if (!permissionsDirty) permissionsSavePhase = "idle";
			}, 1400);
		}, 900);
	};

	onMount(() => {
		permissionsSavedSignature = permissionsSignature;
	});
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
			<Card.Title>Roles permissions</Card.Title>
			<Card.Description>
				Configure what each role can do across the project workspace.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Permission</Table.Head>
						{#each roleOptions as role (role)}
							<Table.Head class="text-center">{role}</Table.Head>
						{/each}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each permissions as permission (permission.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{permission.label}</Table.Cell>
							{#each roleOptions as role (role)}
								<Table.Cell class="text-center">
									<Switch bind:checked={permissionMatrix[permission.id][role]} />
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
			<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
				<div class="text-xs text-muted-foreground min-h-4">
					{#if permissionsIndicator === "edited"}
						<span class="text-amber-600">Edited</span>
					{:else if permissionsIndicator === "saving"}
						<span class="text-blue-600">Saving...</span>
					{:else if permissionsIndicator === "saved"}
						<span class="text-emerald-600">Saved</span>
					{/if}
				</div>
				<Button onclick={savePermissions} disabled={permissionsSaving || !permissionsDirty}>
					{permissionsSaving ? "Saving..." : "Save permissions"}
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

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
					{#each members as member (member.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{member.name}</Table.Cell>
							<Table.Cell>{member.email}</Table.Cell>
							<Table.Cell>
								<Badge variant={statusVariant(member.status)}>
									{member.status.toUpperCase()}
								</Badge>
							</Table.Cell>
							<Table.Cell class="min-w-48">
								<Select.Root type="single" value={member.role} onValueChange={(v) => saveRoleChange(member, v)}>
									<Select.Trigger>
										{member.role}
									</Select.Trigger>
									<Select.Content>
										{#each roleOptions as role (role)}
											<Select.Item value={role} label={role}>
												{role}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</Table.Cell>
							<Table.Cell>{member.updatedAt}</Table.Cell>
							<Table.Cell class="text-right">
								<!-- Removed manual save button as select change saves immediately or we can re-add -->
                                <!-- Let's keep manual save consistent with previous UI but it needs local state to track pending changes if we use button -->
                                <!-- For simplicity, I made onValueChange trigger save directly. Button is redundant now but visual. -->
                                <Button variant="outline" disabled>
									Saved
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
