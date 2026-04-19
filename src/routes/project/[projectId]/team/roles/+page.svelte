<script lang="ts">
	import * as Alert from "$lib/components/ui/alert";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Badge } from "$lib/components/ui/badge";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Toaster } from "$lib/components/ui/sonner";
	import { Switch } from "$lib/components/ui/switch";
	import * as Table from "$lib/components/ui/table";
	import { permissionActions, permissionDomains } from "$lib/constants/permissions";
	import {
		updateProjectMemberPermissions,
		updateProjectRolePermissions
	} from "$lib/remote/project.remote";
	import {
		applyPermissionDependencyRules,
		can,
		enforcePermissionMaskDependencies,
		isCustomPermissionMask,
		maskToPermissions,
		normalizePermissionMask,
		validatePermissionMaskValue
	} from "$lib/utils/permission";
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
		isCustom: boolean;
		permissionMask: PermissionMask;
	};

	const roleValues: ProjectRole[] = [
		"Owner",
		"Admin",
		"Editor",
		"Member",
		"Viewer",
		"Limited Access"
	];

	const customRoleChangeAlertText =
		"Custom permissions are active. Role change won't affect permissions. To update permissions, edit the permissions explicitely.";

	const roleMatrixChangeAlertText =
		"For the users whos custom permissions are active, Role change won't affect permissions. To update permissions, edit the permissions explicitely.";

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

	const requiredDateLike = (
		value: unknown,
		fallbackA: unknown,
		fallbackB: unknown,
		path: string
	): string => {
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

	const resolveRolePermissionMaskPayload = (): {
		permissionMasks: RolePermissionMaskMap;
		firstRole: ProjectRole;
	} => {
		const rawRolePermissionMasks = structuredClone(
			(data as Record<string, unknown>).rolePermissionMasks
		);
		if (
			!rawRolePermissionMasks ||
			typeof rawRolePermissionMasks !== "object" ||
			Array.isArray(rawRolePermissionMasks)
		) {
			throw new Error("Invalid 'rolePermissionMasks' payload.");
		}
		const entries = Object.entries(rawRolePermissionMasks as Record<string, unknown>);
		if (entries.length === 0) {
			throw new Error("Role permission masks payload is empty.");
		}

		const permissionMasks = {} as RolePermissionMaskMap;
		for (const [rawRole, rawMask] of entries) {
			const role = requiredRole(rawRole, `rolePermissionMasks.${rawRole}`);
			permissionMasks[role] = enforcePermissionMaskDependencies(
				normalizePermissionMask(rawMask)
			);
		}

		return {
			permissionMasks,
			firstRole: requiredRole(entries[0][0], "rolePermissionMasks[0]")
		};
	};

	const initialRolePayload = resolveRolePermissionMaskPayload();
	let rolePermissionMasks = $state(initialRolePayload.permissionMasks);
	let roleOptions = $derived(Object.keys(rolePermissionMasks) as ProjectRole[]);
	let selectedRole = $state<ProjectRole>(initialRolePayload.firstRole);

	const parseMembers = (masks: RolePermissionMaskMap): Member[] => {
		const rawMembers = structuredClone(data.members);
		if (!Array.isArray(rawMembers)) {
			throw new Error("Invalid 'members' payload. Expected an array.");
		}

		return rawMembers.map((member, index) => {
			if (!member || typeof member !== "object") {
				throw new Error(`Invalid 'members[${index}]'.`);
			}
			const row = member as Record<string, unknown>;
			const role = requiredRole(row.role, `members[${index}].role`);
			const roleMask = enforcePermissionMaskDependencies(
				normalizePermissionMask(masks[role])
			);
			const memberMask = enforcePermissionMaskDependencies(
				normalizePermissionMask(row.permissionMask ?? roleMask)
			);
			const isCustom =
				row.isCustom === true && isCustomPermissionMask(memberMask, roleMask);

			return {
				id: requiredString(row.id, `members[${index}].id`),
				name: requiredString(row.name, `members[${index}].name`),
				email: requiredString(row.email, `members[${index}].email`),
				role,
				status: requiredStatus(row.status, `members[${index}].status`),
				updatedAt: requiredDateLike(
					row.updatedAt,
					row.joinedAt,
					row.joinedDate,
					`members[${index}].updatedAt`
				),
				isCustom,
				permissionMask: isCustom ? memberMask : roleMask
			};
		});
	};

	let members = $state<Member[]>(parseMembers(initialRolePayload.permissionMasks));

	let permissionsSaving = $state(false);
	let permissionsSavePhase = $state<"idle" | "saving" | "saved">("idle");
	let permissionsSavedSignature = $state("");
	let permissionsSavedBadgeTimer: ReturnType<typeof setTimeout> | null = null;
	let roleMatrixAlert = $state("");

	let permissionsSignature = $derived(JSON.stringify(rolePermissionMasks));
	let permissionsDirty = $derived(permissionsSignature !== permissionsSavedSignature);
	let permissionsIndicator = $derived.by(() => {
		if (permissionsSavePhase === "saving") return "saving";
		if (permissionsDirty) return "edited";
		if (permissionsSavePhase === "saved") return "saved";
		return "idle";
	});

	let selectedRoleMask = $derived(
		normalizePermissionMask(rolePermissionMasks[selectedRole])
	);
	let selectedRolePermissions = $derived(maskToPermissions(selectedRoleMask));

	const setRolePermission = (
		domain: PermissionDomain,
		action: PermissionAction,
		value: boolean
	) => {
		if (!canEditPermissions) return;
		rolePermissionMasks = {
			...rolePermissionMasks,
			[selectedRole]: applyPermissionDependencyRules(
				rolePermissionMasks[selectedRole],
				domain,
				action,
				value
			)
		};
	};

	const saveRolePermissions = async () => {
		if (permissionsSaving) return;
		if (!permissionsDirty) return;
		if (!canEditPermissions) return;
		if (!access?.permissions) return;
		const selectedValidation = validatePermissionMaskValue(selectedRoleMask);
		if (!selectedValidation.valid) {
			toast.error(selectedValidation.errors.join("; "));
			return;
		}

		permissionsSaving = true;
		permissionsSavePhase = "saving";
		if (permissionsSavedBadgeTimer) clearTimeout(permissionsSavedBadgeTimer);

		try {
			const result = await updateProjectRolePermissions({
				input: {
					projectId,
					role: selectedRole,
					permissionMask: selectedRoleMask
				}
			});

			if (!result.success) {
				permissionsSavePhase = "idle";
				toast.error(result.error);
				return;
			}

			const normalizedMask = normalizePermissionMask(result.data.permissionMask);
			rolePermissionMasks = {
				...rolePermissionMasks,
				[selectedRole]: normalizedMask
			};
			members = members.map((member) => {
				if (member.role !== selectedRole || member.isCustom) return member;
				return {
					...member,
					permissionMask: normalizedMask
				};
			});

			permissionsSavedSignature = JSON.stringify({
				...rolePermissionMasks,
				[selectedRole]: normalizedMask
			});
			permissionsSavePhase = "saved";
			roleMatrixAlert = roleMatrixChangeAlertText;
			toast.success("Role permissions saved.");
			permissionsSavedBadgeTimer = setTimeout(() => {
				if (!permissionsDirty) permissionsSavePhase = "idle";
			}, 1400);
		} catch (error) {
			console.error("Failed to save role permissions", error);
			permissionsSavePhase = "idle";
			toast.error("Unable to save role permissions right now.");
		} finally {
			permissionsSaving = false;
		}
	};

	let memberDialogOpen = $state(false);
	let memberSavePending = $state(false);
	let editingMemberId = $state<string | null>(null);
	let memberDraftRole = $state<ProjectRole>("Member");
	let memberDraftIsCustom = $state(false);
	let memberDraftPermissionMask = $state<PermissionMask>("0");
	let confirmRevertCustomOpen = $state(false);

	let editingMember = $derived(
		members.find((member) => member.id === editingMemberId) ?? null
	);
	let memberDraftRoleMask = $derived(
		normalizePermissionMask(rolePermissionMasks[memberDraftRole])
	);
	let memberDraftPermissions = $derived(maskToPermissions(memberDraftPermissionMask));
	let memberDraftEffectiveIsCustom = $derived(
		memberDraftIsCustom &&
			isCustomPermissionMask(memberDraftPermissionMask, memberDraftRoleMask)
	);
	let showRoleChangeCustomAlert = $derived(
		editingMember?.isCustom === true &&
			memberDraftRole !== editingMember?.role &&
			memberDraftIsCustom
	);

	const setMemberDraftRole = (nextRoleValue: string) => {
		const nextRole = requiredRole(nextRoleValue, "memberDraftRole");
		memberDraftRole = nextRole;
		if (!memberDraftIsCustom) {
			memberDraftPermissionMask = normalizePermissionMask(rolePermissionMasks[nextRole]);
		}
	};

	const openMemberPermissionDialog = (member: Member) => {
		editingMemberId = member.id;
		memberDraftRole = member.role;
		memberDraftIsCustom = member.isCustom;
		memberDraftPermissionMask = member.permissionMask;
		confirmRevertCustomOpen = false;
		memberDialogOpen = true;
	};

	const closeMemberPermissionDialog = () => {
		memberDialogOpen = false;
		editingMemberId = null;
		memberSavePending = false;
		confirmRevertCustomOpen = false;
	};

	const onToggleCustomPermissions = (value: boolean) => {
		if (!value && editingMember?.isCustom) {
			confirmRevertCustomOpen = true;
			return;
		}

		memberDraftIsCustom = value;
		if (!value) {
			memberDraftPermissionMask = memberDraftRoleMask;
		}
	};

	const confirmRevertFromCustom = () => {
		memberDraftIsCustom = false;
		memberDraftPermissionMask = memberDraftRoleMask;
		confirmRevertCustomOpen = false;
	};

	const setMemberDraftPermission = (
		domain: PermissionDomain,
		action: PermissionAction,
		value: boolean
	) => {
		if (!memberDraftIsCustom || !canEditPermissions) return;
		memberDraftPermissionMask = applyPermissionDependencyRules(
			memberDraftPermissionMask,
			domain,
			action,
			value
		);
	};

	const saveMemberPermissions = async () => {
		if (memberSavePending) return;
		if (!editingMember) return;
		if (!canEditPermissions) return;
		if (!access?.permissions) return;

		memberSavePending = true;
		const effectivePermissionMask = memberDraftEffectiveIsCustom
			? normalizePermissionMask(memberDraftPermissionMask)
			: memberDraftRoleMask;
		const draftValidation = validatePermissionMaskValue(effectivePermissionMask);
		if (!draftValidation.valid) {
			memberSavePending = false;
			toast.error(draftValidation.errors.join("; "));
			return;
		}

		try {
			const result = await updateProjectMemberPermissions({
				input: {
					projectId,
					memberId: editingMember.id,
					role: memberDraftRole,
					isCustom: memberDraftEffectiveIsCustom,
					permissionMask: effectivePermissionMask
				}
			});

			if (!result.success) {
				toast.error(result.error);
				return;
			}

			members = members.map((member) => {
				if (member.id !== editingMember.id) return member;
				return {
					...member,
					role: result.data.role,
					isCustom: result.data.isCustom,
					permissionMask: normalizePermissionMask(result.data.permissionMask),
					updatedAt: "Just now"
				};
			});

			toast.success(`Permissions updated for ${editingMember.name}.`);
			closeMemberPermissionDialog();
		} catch (error) {
			console.error("Failed to save member permissions", error);
			toast.error("Unable to save member permissions right now.");
		} finally {
			memberSavePending = false;
		}
	};

	const formatDomainLabel = (domain: PermissionDomain): string =>
		domain.charAt(0).toUpperCase() + domain.slice(1);

	const formatActionLabel = (action: PermissionAction): string =>
		action === "statusChange"
			? "Status Change"
			: action.charAt(0).toUpperCase() + action.slice(1);

	const statusVariant = (status: Member["status"]) =>
		status === "invited" ? "secondary" : "default";

	onMount(() => {
		permissionsSavedSignature = permissionsSignature;
	});
</script>

<svelte:head>
	<title>
		Roles &amp; Permissions •
		{((data as Record<string, unknown>).project as { name?: string } | undefined)?.name ?? "Project"}
		• ProjectBook
	</title>
	<meta
		name="description"
		content="Configure role permissions and member access for this project."
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
			<Card.Header>
				<Card.Title>Member Roles</Card.Title>
				<Card.Description>
					Review access levels and open the permission editor for each member.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Table.Root>
					<Table.Caption>Only authorized users can update permissions.</Table.Caption>
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
								<Table.Cell>
									<div class="flex flex-wrap items-center gap-2">
										<span>{member.role}</span>
										{#if member.isCustom}
											<Badge variant="secondary">Custom</Badge>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>{member.updatedAt}</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										variant="outline"
										onclick={() => openMemberPermissionDialog(member)}
										disabled={!canEditPermissions}
									>
										Edit permissions
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>

		<Dialog.Root bind:open={memberDialogOpen} onOpenChange={(open) => !open && closeMemberPermissionDialog()}>
			<Dialog.Content class="">
				<Dialog.Header>
					<Dialog.Title>Edit Member Permissions</Dialog.Title>
					<Dialog.Description>
						Choose role and optionally customize permissions for the selected member.
					</Dialog.Description>
				</Dialog.Header>

				{#if editingMember}
					<div class="grid gap-4 py-2">
						<div class="flex flex-row gap-2 sm:max-w-xs">
							<Label>Role</Label>
							<Select.Root
								type="single"
								value={memberDraftRole}
								onValueChange={setMemberDraftRole}
								disabled={!canEditPermissions}
							>
								<Select.Trigger>{memberDraftRole}</Select.Trigger>
								<Select.Content>
									{#each roleOptions as role (role)}
										<Select.Item value={role} label={role}>
											{role}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<div class="flex items-center justify-between rounded-md border p-3">
							<div>
								<p class="text-sm font-medium">Customize permissions?</p>
								<p class="text-xs text-muted-foreground">
									When enabled, this member can have a custom permission matrix.
								</p>
							</div>
							<Switch
								checked={memberDraftIsCustom}
								onCheckedChange={onToggleCustomPermissions}
								disabled={!canEditPermissions}
							/>
						</div>

						{#if showRoleChangeCustomAlert}
							<Alert.Root>
								<Alert.Title>Custom permissions are active</Alert.Title>
								<Alert.Description>{customRoleChangeAlertText}</Alert.Description>
							</Alert.Root>
						{/if}

						{#if memberDraftIsCustom}
							<div class="rounded-md border overflow-hidden">
								<div class="border-b px-4 py-3">
									<p class="text-sm font-medium">Custom permission matrix</p>
									<p class="text-xs text-muted-foreground">
										Adjust any of the 60 permissions for this member.
									</p>
								</div>
								<div class="max-h-100 overflow-auto p-4">
									<Table.Root>
										<Table.Header>
											<Table.Row>
												<Table.Head>Domain</Table.Head>
												{#each permissionActions as action (action)}
													<Table.Head class="text-center min-w-15">
														{formatActionLabel(action)}
													</Table.Head>
												{/each}
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each permissionDomains as domain (domain)}
												<Table.Row>
													<Table.Cell class="font-medium">
														{formatDomainLabel(domain)}
													</Table.Cell>
													{#each permissionActions as action (action)}
														<Table.Cell class="text-center">
															<Switch
																checked={memberDraftPermissions[domain][action]}
																onCheckedChange={(value) =>
																	setMemberDraftPermission(domain, action, value)}
																disabled={!canEditPermissions}
															/>
														</Table.Cell>
													{/each}
												</Table.Row>
											{/each}
										</Table.Body>
									</Table.Root>
								</div>
							</div>
						{/if}
					</div>

					<Dialog.Footer>
						<Button variant="outline" onclick={closeMemberPermissionDialog}>Cancel</Button>
						<Button onclick={saveMemberPermissions} disabled={!canEditPermissions || memberSavePending}>
							{memberSavePending ? "Saving..." : "Save"}
						</Button>
					</Dialog.Footer>
				{/if}
			</Dialog.Content>
		</Dialog.Root>

		<AlertDialog.Root bind:open={confirmRevertCustomOpen}>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Revert custom permissions?</AlertDialog.Title>
					<AlertDialog.Description>
						This will revert from custom permissions to role specific permissions. Still want to continue?
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
					<AlertDialog.Action onclick={confirmRevertFromCustom}>Continue</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>

		<Card.Root>
			<Card.Header class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<Card.Title>Role Permissions</Card.Title>
					<Card.Description>
						Role specific permission matrix. These settings apply to members without custom
						overrides.
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
											onCheckedChange={(value) => setRolePermission(domain, action, value)}
											disabled={!canEditPermissions}
										/>
									</Table.Cell>
								{/each}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>

				{#if roleMatrixAlert}
					<Alert.Root class="mt-4">
						<Alert.Title>Role permissions updated</Alert.Title>
						<Alert.Description>{roleMatrixAlert}</Alert.Description>
					</Alert.Root>
				{/if}

				<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
					<div class="min-h-4 text-xs text-muted-foreground">
						{#if permissionsIndicator === "edited"}
							<span class="text-amber-600">Edited</span>
						{:else if permissionsIndicator === "saving"}
							<span class="text-blue-600">Saving...</span>
						{:else if permissionsIndicator === "saved"}
							<span class="text-emerald-600">Saved</span>
						{/if}
					</div>
					<Button
						onclick={saveRolePermissions}
						disabled={!canEditPermissions || permissionsSaving || !permissionsDirty}
					>
						{permissionsSaving ? "Saving..." : "Save permissions"}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>