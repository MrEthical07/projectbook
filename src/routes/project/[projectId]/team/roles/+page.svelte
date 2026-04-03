<script lang="ts">
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Switch } from "$lib/components/ui/switch";
	import { Toaster } from "$lib/components/ui/sonner";
	import * as Table from "$lib/components/ui/table";
	import {
		updateProjectMemberRole,
		updateProjectRolePermissions
	} from "$lib/remote/project.remote";
	import { permissionActions, permissionDomains } from "$lib/constants/permissions";
	import { can } from "$lib/utils/permission";
	import { page } from "$app/state";
	import { getContext, onMount } from "svelte";
	import { toast } from "svelte-sonner";

	type Member = {
		id: string;
		name: string;
		email: string;
		role: ProjectRole;
		status: "active" | "invited";
		updatedAt: string;
	};

	const roleValues: ProjectRole[] = [
		"Owner",
		"Admin",
		"Editor",
		"Member",
		"Viewer",
		"Limited Access"
	];

	const requiredString = (value: unknown, path: string): string => {
		if (typeof value !== "string" || value.trim().length === 0) {
			throw new Error(`Invalid or missing '${path}'.`);
		}
		return value.trim();
	};

	const requiredRole = (value: unknown, path: string): ProjectRole => {
		if (!roleValues.includes(value as ProjectRole)) {
			throw new Error(`Invalid '${path}'.`);
		}
		return value as ProjectRole;
	};

	const requiredStatus = (value: unknown, path: string): "active" | "invited" => {
		if (typeof value !== "string") {
			throw new Error(`Invalid '${path}'.`);
		}
		const normalized = value.trim().toLowerCase();
		if (normalized !== "active" && normalized !== "invited") {
			throw new Error(`Invalid '${path}'. Expected active or invited.`);
		}
		return normalized;
	};

	const requiredDateLike = (value: unknown, fallbackA: unknown, fallbackB: unknown, path: string): string => {
		const first = typeof value === "string" ? value.trim() : "";
		if (first.length > 0) {
			return first;
		}
		const second = typeof fallbackA === "string" ? fallbackA.trim() : "";
		if (second.length > 0) {
			return second;
		}
		const third = typeof fallbackB === "string" ? fallbackB.trim() : "";
		if (third.length > 0) {
			return third;
		}
		throw new Error(`Invalid or missing '${path}'.`);
	};

	let { data } = $props();
	const access = getContext<ProjectAccess | undefined>("access");
	const canEditPermissions = can(access?.permissions, "member", "edit");
	const canView = can(access?.permissions, "member", "view");
	const projectId = page.params.projectId;

	const resolveRolePermissionPayload = (): {
		permissions: RolePermissionMap;
		firstRole: ProjectRole;
	} => {
		const rawRolePermissions = structuredClone(data.rolePermissions);
		if (
			!rawRolePermissions ||
			typeof rawRolePermissions !== "object" ||
			Array.isArray(rawRolePermissions)
		) {
			throw new Error("Invalid 'rolePermissions' payload.");
		}
		const keys = Object.keys(rawRolePermissions);
		if (keys.length === 0) {
			throw new Error("Role permissions payload is empty.");
		}
		return {
			permissions: rawRolePermissions as RolePermissionMap,
			firstRole: requiredRole(keys[0], "rolePermissions[0]")
		};
	};

	const initialRolePayload = resolveRolePermissionPayload();
	let rolePermissions = $state(initialRolePayload.permissions);
	let roleOptions = $derived(Object.keys(rolePermissions) as ProjectRole[]);
	let selectedRole = $state<ProjectRole>(initialRolePayload.firstRole);

	const parseMembers = (): Member[] => {
		const rawMembers = structuredClone(data.members);
		if (!Array.isArray(rawMembers)) {
			throw new Error("Invalid 'members' payload. Expected an array.");
		}
		return rawMembers.map((member, index) => {
			if (!member || typeof member !== "object") {
				throw new Error(`Invalid 'members[${index}]'.`);
			}
			const row = member as unknown as Record<string, unknown>;
			return {
				id: requiredString(row.id, `members[${index}].id`),
				name: requiredString(row.name, `members[${index}].name`),
				email: requiredString(row.email, `members[${index}].email`),
				role: requiredRole(row.role, `members[${index}].role`),
				status: requiredStatus(row.status, `members[${index}].status`),
				updatedAt: requiredDateLike(
					row.updatedAt,
					row.joinedAt,
					row.joinedDate,
					`members[${index}].updatedAt`
				)
			};
		});
	};
	let members = $state<Member[]>(parseMembers());

	let permissionsSaving = $state(false);
	let permissionsSavePhase = $state<"idle" | "saving" | "saved">("idle");
	let permissionsSavedSignature = $state("");
	let permissionsSaveTimer: ReturnType<typeof setTimeout> | null = null;
	let permissionsSavedBadgeTimer: ReturnType<typeof setTimeout> | null = null;

	let permissionsSignature = $derived(JSON.stringify(rolePermissions));
	let permissionsDirty = $derived(permissionsSignature !== permissionsSavedSignature);
	let permissionsIndicator = $derived.by(() => {
		if (permissionsSavePhase === "saving") return "saving";
		if (permissionsDirty) return "edited";
		if (permissionsSavePhase === "saved") return "saved";
		return "idle";
	});

	let selectedRolePermissions = $derived.by(() => {
		const selected = rolePermissions[selectedRole];
		if (!selected) {
			throw new Error(`Permission matrix missing for role '${selectedRole}'.`);
		}
		return selected;
	});

	const formatDomainLabel = (domain: PermissionDomain): string =>
		domain.charAt(0).toUpperCase() + domain.slice(1);

	const formatActionLabel = (action: PermissionAction): string =>
		action === "statusChange"
			? "Status Change"
			: action.charAt(0).toUpperCase() + action.slice(1);

	const setPermission = (
		domain: PermissionDomain,
		action: PermissionAction,
		value: boolean
	) => {
		if (!canEditPermissions) return;
		rolePermissions = {
			...rolePermissions,
			[selectedRole]: {
				...rolePermissions[selectedRole],
				[domain]: {
					...rolePermissions[selectedRole][domain],
					[action]: value
				}
			}
		};
	};

	const savePermissions = async () => {
		if (permissionsSaving) return;
		if (!permissionsDirty) return;
		if (!canEditPermissions) return;
		if (!access?.permissions) return;

		permissionsSaving = true;
		permissionsSavePhase = "saving";
		if (permissionsSaveTimer) clearTimeout(permissionsSaveTimer);
		if (permissionsSavedBadgeTimer) clearTimeout(permissionsSavedBadgeTimer);

		const result = await updateProjectRolePermissions({
			input: {
				projectId,
				role: selectedRole,
				permissions: selectedRolePermissions
			},
			permissions: access.permissions
		});

		permissionsSaving = false;
		if (!result.success) {
			permissionsSavePhase = "idle";
			toast.error(result.error);
			return;
		}

		permissionsSavedSignature = permissionsSignature;
		permissionsSavePhase = "saved";
		toast.success("Role permissions saved.");
		permissionsSavedBadgeTimer = setTimeout(() => {
			if (!permissionsDirty) permissionsSavePhase = "idle";
		}, 1400);
	};

	const saveRoleChange = async (member: Member) => {
		if (!canEditPermissions) return;
		if (!access?.permissions) return;
		const result = await updateProjectMemberRole({
			input: {
				projectId,
				memberId: member.id,
				role: member.role
			},
			permissions: access.permissions
		});
		if (!result.success) {
			toast.error(result.error);
			return;
		}
		toast.success(`Role updated for ${member.name}.`);
		members = members.map(m => m.id === member.id ? { ...m, role: member.role, updatedAt: "Just now" } : m);
	};

	const statusVariant = (status: Member["status"]) => (status === "invited" ? "secondary" : "default");

	onMount(() => {
		permissionsSavedSignature = permissionsSignature;
	});
</script>

<svelte:head>
	<title>Team Roles • {data.project?.name ?? "Project"} • ProjectBook</title>
	<meta name="description" content="Configure team roles and permissions for project collaboration." />
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
						<Breadcrumb.Link href="/project/{projectId}/team">Members</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Roles</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	{#if !canView}
		<Card.Root>
			<Card.Header>
				<Card.Title>Access Denied</Card.Title>
				<Card.Description>
					You do not have permission to view this section. Contact your project administrator.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<Card.Title>Role Permissions</Card.Title>
					<Card.Description>
						Unified action permissions per domain.
					</Card.Description>
				</div>
				<div class="grid gap-2">
					<Label>Role</Label>
					<Select.Root type="single" bind:value={selectedRole}>
						<Select.Trigger class="min-w-48">{selectedRole}</Select.Trigger>
						<Select.Content>
							{#each roleOptions as role (role)}
								<Select.Item value={role} label={role}>{role}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Domain</Table.Head>
							{#each permissionActions as action (action)}
								<Table.Head class="text-center">{formatActionLabel(action)}</Table.Head>
							{/each}
						</Table.Row>
					</Table.Header>
						<Table.Body>
							{#each permissionDomains as domain (domain)}
								<Table.Row>
									<Table.Cell class="font-medium">{formatDomainLabel(domain)}</Table.Cell>
									{#each permissionActions as action (action)}
										<Table.Cell class="text-center">
											<Switch
												checked={selectedRolePermissions[domain][action]}
												onCheckedChange={(value) => setPermission(domain, action, value)}
												disabled={!canEditPermissions}
											/>
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
					<Button onclick={savePermissions} disabled={!canEditPermissions || permissionsSaving || !permissionsDirty}>
						{permissionsSaving ? "Saving..." : "Save permissions"}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Member Roles</Card.Title>
				<Card.Description>
					Review access levels, update roles, and track the latest changes.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Caption>Only authorized users can update roles.</Table.Caption>
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
									<Select.Root type="single" bind:value={member.role} disabled={!canEditPermissions}>
										<Select.Trigger>{member.role}</Select.Trigger>
										<Select.Content>
											{#each roleOptions as role (role)}
												<Select.Item value={role} label={role}>{role}</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</Table.Cell>
								<Table.Cell>{member.updatedAt}</Table.Cell>
								<Table.Cell class="text-right">
									<Button variant="outline" onclick={() => saveRoleChange(member)} disabled={!canEditPermissions}>
										Save
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
