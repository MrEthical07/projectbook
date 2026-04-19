<script lang="ts">
	import { invalidate } from "$app/navigation";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Badge from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Switch } from "$lib/components/ui/switch";
	import { Textarea } from "$lib/components/ui/textarea";
	import { getContext, onMount } from "svelte";
	import { page } from "$app/state";
	import {
		archiveProject as archiveProjectRemote,
		deleteProject as deleteProjectRemote,
		updateProjectSettings as updateProjectSettingsRemote
	} from "$lib/remote/project.remote";
	import { can } from "$lib/utils/permission";
	import { Archive, Trash2 } from "@lucide/svelte";
	import * as Select from "$lib/components/ui/select";

	type Role = "Owner" | "Admin" | "Editor" | "Viewer" | "Limited Access";
	type Status = "Active" | "Invited";

	type Member = {
		id: string;
		name: string;
		email: string;
		role: Role;
		status: Status;
		joinedAt: string;
	};

	const roleValues: Role[] = ["Owner", "Admin", "Editor", "Viewer", "Limited Access"];

	const requiredString = (value: unknown, path: string): string => {
		if (typeof value !== "string" || value.trim().length === 0) {
			throw new Error(`Invalid or missing '${path}'.`);
		}
		return value.trim();
	};

	const requiredRole = (value: unknown, path: string): Role => {
		if (!roleValues.includes(value as Role)) {
			throw new Error(`Invalid '${path}'.`);
		}
		return value as Role;
	};

	const requiredStatus = (value: unknown, path: string): Status => {
		if (typeof value !== "string") {
			throw new Error(`Invalid '${path}'.`);
		}
		const normalized = value.trim().toLowerCase();
		if (normalized === "active") return "Active";
		if (normalized === "invited") return "Invited";
		throw new Error(`Invalid '${path}'. Expected Active or Invited.`);
	};

	let { data } = $props();
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	if (!access?.role) {
		throw new Error("Project access role is missing.");
	}
	let currentRole: Role = requiredRole(access.role, "access.role");
	const canEdit = can(permissions, "project", "edit");
	const canDelete = can(permissions, "project", "delete");
	const canArchiveProject = can(permissions, "project", "archive");
	const initialSettings = () => data.settings;
	const toMembers = (settings: typeof data.settings): Member[] => {
		const rawMembers = structuredClone(settings.members);
		if (!Array.isArray(rawMembers)) {
			throw new Error("Invalid 'settings.members' payload.");
		}
		return rawMembers.map((member, index) => {
			if (!member || typeof member !== "object") {
				throw new Error(`Invalid 'settings.members[${index}]'.`);
			}
			const row = member as unknown as Record<string, unknown>;
			return {
				id: requiredString(row.id, `settings.members[${index}].id`),
				name: requiredString(row.name, `settings.members[${index}].name`),
				email: requiredString(row.email, `settings.members[${index}].email`),
				role: requiredRole(row.role, `settings.members[${index}].role`),
				status: requiredStatus(row.status, `settings.members[${index}].status`),
				joinedAt: requiredString(row.joinedAt, `settings.members[${index}].joinedAt`)
			};
		});
	};

	let projectName = $state(initialSettings().projectName);
	let projectId = $derived.by(() => {
		const routeProjectId = page.params.projectId?.trim();
		if (!routeProjectId) {
			throw new Error("Missing project id in route.");
		}
		return routeProjectId;
	});
	let projectStatus = $state<"Active" | "Archived">(initialSettings().projectStatus);
	let projectDescription = $state(initialSettings().projectDescription);

	let whiteboardsEnabled = $state(initialSettings().whiteboardsEnabled);
	let advancedDatabasesEnabled = $state(initialSettings().advancedDatabasesEnabled);
	let calendarManualEventsEnabled = $state(initialSettings().calendarManualEventsEnabled);
	let resourceVersioningEnabled = $state(initialSettings().resourceVersioningEnabled);
	let feedbackAggregationEnabled = $state(initialSettings().feedbackAggregationEnabled);

	let notifyArtifactCreated = $state(initialSettings().notifyArtifactCreated);
	let notifyArtifactLocked = $state(initialSettings().notifyArtifactLocked);
	let notifyFeedbackAdded = $state(initialSettings().notifyFeedbackAdded);
	let notifyResourceUpdated = $state(initialSettings().notifyResourceUpdated);
	let deliveryChannel = $state<"In-app" | "Email">(initialSettings().deliveryChannel);

	let members = $state<Member[]>(toMembers(initialSettings()));

	let archiveOpen = $state(false);
	let deleteOpen = $state(false);
	let deleteConfirmText = $state("");

	type SavePhase = "idle" | "saving" | "saved";
	let savePhase = $state<SavePhase>("idle");
	let savedSignature = $state("");
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;
	let actionError = $state("");

	let currentSignature = $derived(
		JSON.stringify({
			projectName,
			projectDescription,
			projectStatus,
			whiteboardsEnabled,
			advancedDatabasesEnabled,
			calendarManualEventsEnabled,
			resourceVersioningEnabled,
			feedbackAggregationEnabled,
			notifyArtifactCreated,
			notifyArtifactLocked,
			notifyFeedbackAdded,
			notifyResourceUpdated,
			deliveryChannel
		})
	);
	let isDirty = $derived(currentSignature !== savedSignature);
	let deletePhrase = $derived(`${projectName.toUpperCase()} DELETE CONFIRM`);
	let canConfirmDelete = $derived(deleteConfirmText === deletePhrase);
	let saveIndicator = $derived.by(() => {
		if (savePhase === "saving") return "saving";
		if (isDirty) return "edited";
		if (savePhase === "saved") return "saved";
		return "idle";
	});

	const triggerSave = async () => {
		if (!permissions) {
			actionError = "Permissions context is unavailable.";
			return;
		}
		if (!canEdit) {
			actionError = "You do not have permission to edit project settings.";
			return;
		}
		if (savePhase === "saving" || !isDirty) return;
		actionError = "";
		if (saveTimer) clearTimeout(saveTimer);
		if (savedBadgeTimer) clearTimeout(savedBadgeTimer);
		savePhase = "saving";
		try {
			const result = await updateProjectSettingsRemote({
				input: {
					projectId,
					settings: {
						projectName,
						projectDescription,
						projectStatus,
						whiteboardsEnabled,
						advancedDatabasesEnabled,
						calendarManualEventsEnabled,
						resourceVersioningEnabled,
						feedbackAggregationEnabled,
						notifyArtifactCreated,
						notifyArtifactLocked,
						notifyFeedbackAdded,
						notifyResourceUpdated,
						deliveryChannel
					}
				}
			});
			if (!result.success) {
				savePhase = "idle";
				actionError = result.error;
				return;
			}
			savedSignature = currentSignature;
			savePhase = "saved";
			savedBadgeTimer = setTimeout(() => {
				if (!isDirty) savePhase = "idle";
			}, 1400);
		} catch (error) {
			console.error("Failed to save project settings", error);
			savePhase = "idle";
			actionError = "Unable to save settings right now.";
		}
	};

	onMount(() => {
		savedSignature = currentSignature;
	});

	const archiveProject = async () => {
		if (!permissions) {
			actionError = "Permissions context is unavailable.";
			return;
		}
		try {
			const result = await archiveProjectRemote({
				input: {
					projectId
				}
			});
			if (!result.success) {
				actionError = result.error;
				return;
			}
			actionError = "";
			archiveOpen = false;
			await invalidate((url) => url.pathname === page.url.pathname);
		} catch (error) {
			console.error("Failed to archive project", error);
			actionError = "Unable to archive project right now.";
		}
	};

	const deleteProject = async () => {
		if (!permissions) {
			actionError = "Permissions context is unavailable.";
			return;
		}
		try {
			const result = await deleteProjectRemote({
				input: {
					projectId
				}
			});
			if (!result.success) {
				actionError = result.error;
				return;
			}
			actionError = "";
			deleteOpen = false;
			await invalidate((url) => url.pathname === page.url.pathname);
		} catch (error) {
			console.error("Failed to delete project", error);
			actionError = "Unable to delete project right now.";
		}
	};

</script>

	<svelte:head>
		<title>Settings • {((data as Record<string, unknown>).project as { name?: string } | undefined)?.name ?? "Project"} • ProjectBook</title>
		<meta
			name="description"
			content="Manage project settings, feature flags, and lifecycle controls."
		/>
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
						<Breadcrumb.Page>Settings</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-5 py-2 md:px-20">
		<div class="flex flex-col gap-2 rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				Project settings - Admin controls
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-3">
					<h1 class="text-3xl font-semibold">{projectName}</h1>
					<Badge.Badge variant="outline">{projectStatus}</Badge.Badge>
				</div>
				<div class="flex items-center gap-2">
					<div class="flex flex-col items-end text-xs text-muted-foreground leading-tight min-h-6">
						{#if saveIndicator === "edited"}
							<span class="text-amber-600">Edited</span>
						{:else if saveIndicator === "saving"}
							<span class="text-blue-600">Saving...</span>
						{:else if saveIndicator === "saved"}
							<span class="text-emerald-600">Saved</span>
						{/if}
					</div>
					<Button size="sm" onclick={triggerSave} disabled={!canEdit || !isDirty || savePhase === "saving"}>
						{savePhase === "saving" ? "Saving..." : "Save changes"}
					</Button>
					<Dialog.Root bind:open={archiveOpen}>
						<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })} disabled={!canArchiveProject}>
							<Archive class="mr-2 h-4 w-4" />
							Archive Project
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Archive this project?</Dialog.Title>
								<Dialog.Description>
									Archiving makes the project read-only but preserves all data.
								</Dialog.Description>
							</Dialog.Header>
							<Dialog.Footer>
								<Dialog.Close class={buttonVariants({ variant: "outline" })}>
									Cancel
								</Dialog.Close>
								<Button onclick={archiveProject}>
									Archive
								</Button>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
					{#if canDelete}
						<Dialog.Root
							bind:open={deleteOpen}
							onOpenChange={(open) => {
								if (open) deleteConfirmText = "";
							}}
						>
							<Dialog.Trigger class={buttonVariants({ variant: "destructive", size: "sm" })}>
								<Trash2 class="mr-2 h-4 w-4" />
								Delete Project
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Delete this project permanently?</Dialog.Title>
									<Dialog.Description>
										This action is irreversible. To confirm, type the phrase below exactly.
									</Dialog.Description>
								</Dialog.Header>
								<div class="grid gap-3 py-2">
									<div class="rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
										{deletePhrase}
									</div>
									<div class="grid gap-2">
										<Label>Confirmation phrase</Label>
										<Input bind:value={deleteConfirmText} placeholder={deletePhrase} />
									</div>
								</div>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants({ variant: "destructive" })}
										disabled={!canConfirmDelete}
										onclick={deleteProject}
									>
										Delete
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					{/if}
				</div>
			</div>
			<div class="flex flex-wrap items-center gap-4 px-3 text-xs text-muted-foreground">
				<span>Project ID: {projectId}</span>
				<span>Role: {currentRole}</span>
			</div>
			{#if actionError}
				<p class="px-3 text-xs text-destructive">{actionError}</p>
			{/if}
		</div>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">General Project Settings</div>
			<div class="grid gap-4 md:grid-cols-2">
				<div class="grid gap-2">
					<Label>Project name</Label>
					<Input bind:value={projectName} disabled={!canEdit} />
				</div>
				<div class="grid gap-2">
					<Label>Project identifier</Label>
					<Input value={projectId} disabled />
				</div>
				<div class="grid gap-2 md:col-span-2">
					<Label>Description</Label>
					<Textarea rows={3} bind:value={projectDescription} disabled={!canEdit} />
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<div class="text-sm font-medium">Team Members</div>
			</div>
			<div class="grid gap-2">
				<div class="grid grid-cols-[1.4fr_1.6fr_0.7fr_0.8fr] gap-3 text-xs text-muted-foreground">
					<span>Name</span>
					<span>Email</span>
					<span>Status</span>
					<span>Joined</span>
				</div>
				<Separator />
				{#each members as member (member.id)}
					<div class="grid grid-cols-[1.4fr_1.6fr_0.7fr_0.8fr] gap-3 items-center text-sm">
						<div class="flex items-center gap-2">
							<Avatar.Root class="h-7 w-7">
								<Avatar.Fallback class="text-[10px]">
									{member.name
										.split(" ")
										.map((part) => part[0])
										.join("")
										.slice(0, 2)}
								</Avatar.Fallback>
							</Avatar.Root>
							<span>{member.name}</span>
						</div>
						<span class="text-muted-foreground">{member.email}</span>
						<Badge.Badge variant="outline">{member.status}</Badge.Badge>
						<span class="text-muted-foreground">{member.joinedAt}</span>
					</div>
				{/each}
			</div>
		</section>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Feature Configuration</div>
			<div class="grid gap-3 md:grid-cols-2">
				<div class="flex items-center justify-between gap-2 rounded-md border border-border p-3">
					<div>
						<div class="text-sm font-medium">Enable whiteboards</div>
						<div class="text-xs text-muted-foreground">Shared canvases for workshops.</div>
					</div>
					<Switch bind:checked={whiteboardsEnabled} />
				</div>
				<div class="flex items-center justify-between gap-2 rounded-md border border-border p-3">
					<div>
						<div class="text-sm font-medium">Advanced page databases</div>
						<div class="text-xs text-muted-foreground">Enable complex page views.</div>
					</div>
					<Switch bind:checked={advancedDatabasesEnabled} />
				</div>
				<div class="flex items-center justify-between gap-2 rounded-md border border-border p-3">
					<div>
						<div class="text-sm font-medium">Calendar manual events</div>
						<div class="text-xs text-muted-foreground">Allow standalone events.</div>
					</div>
					<Switch bind:checked={calendarManualEventsEnabled} />
				</div>
				<div class="flex items-center justify-between gap-2 rounded-md border border-border p-3">
					<div>
						<div class="text-sm font-medium">Resource versioning</div>
						<div class="text-xs text-muted-foreground">Always on by default.</div>
					</div>
					<Switch bind:checked={resourceVersioningEnabled} disabled />
				</div>
				<div class="flex items-center justify-between gap-2 rounded-md border border-border p-3">
					<div>
						<div class="text-sm font-medium">Feedback aggregation views</div>
						<div class="text-xs text-muted-foreground">Summary insights for test phase.</div>
					</div>
					<Switch bind:checked={feedbackAggregationEnabled} />
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Notifications</div>
			<div class="grid gap-3 md:grid-cols-2">
				<div class="flex items-center justify-between gap-2 rounded-md border border-border p-3">
					<div>
						<div class="text-sm font-medium">Artifact created</div>
						<div class="text-xs text-muted-foreground">Notify on new artifacts.</div>
					</div>
					<Switch bind:checked={notifyArtifactCreated} />
				</div>
				<div class="flex items-center justify-between gap-2 rounded-md border border-border p-3">
					<div>
						<div class="text-sm font-medium">Artifact locked</div>
						<div class="text-xs text-muted-foreground">When definitions are locked.</div>
					</div>
					<Switch bind:checked={notifyArtifactLocked} />
				</div>
				<div class="flex items-center justify-between gap-2 rounded-md border border-border p-3">
					<div>
						<div class="text-sm font-medium">Feedback added</div>
						<div class="text-xs text-muted-foreground">Testing insights submitted.</div>
					</div>
					<Switch bind:checked={notifyFeedbackAdded} />
				</div>
				<div class="flex items-center justify-between gap-2 rounded-md border border-border p-3">
					<div>
						<div class="text-sm font-medium">Resource updated</div>
						<div class="text-xs text-muted-foreground">New file versions uploaded.</div>
					</div>
					<Switch bind:checked={notifyResourceUpdated} />
				</div>
			</div>
			<div class="grid gap-2">
				<Label>Delivery channel</Label>
				<Select.Root type="single" bind:value={deliveryChannel}>
					<Select.Trigger>{deliveryChannel}</Select.Trigger>
					<Select.Content>
						<Select.Item value="In-app" label="In-app">In-app</Select.Item>
						<Select.Item value="Email" label="Email">Email</Select.Item>
					</Select.Content>
				</Select.Root>
				<div class="text-xs text-muted-foreground">
					Email delivery is optional and configurable per role.
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Data & Lifecycle</div>
			<div class="grid gap-3 md:grid-cols-2">
				<div class="rounded-md border border-border p-3">
					<div class="text-sm font-medium">Export project data</div>
					<div class="text-xs text-muted-foreground">
						Download a read-only snapshot of this project.
					</div>
					<Button class="mt-3" size="sm" variant="outline">
						Export data
					</Button>
				</div>
				<div class="rounded-md border border-border p-3">
					<div class="text-sm font-medium">Export resources</div>
					<div class="text-xs text-muted-foreground">
						Download all uploaded files as a package.
					</div>
					<Button class="mt-3" size="sm" variant="outline">
						Export files
					</Button>
				</div>
				<div class="rounded-md border border-border p-3">
					<div class="text-sm font-medium">Audit log</div>
					<div class="text-xs text-muted-foreground">
						View historical changes and administrative actions.
					</div>
					<Button class="mt-3" size="sm" variant="outline" href="/project/{projectId}/activity">
						View log
					</Button>
				</div>
				<div class="rounded-md border border-border p-3">
					<div class="text-sm font-medium">Lifecycle controls</div>
					<div class="text-xs text-muted-foreground">
						Archive or delete this project with confirmation.
					</div>
					<div class="mt-3 flex flex-wrap gap-2">
						<Button size="sm" variant="outline" onclick={() => (archiveOpen = true)} disabled={!canArchiveProject}>
							Archive project
						</Button>
						<Dialog.Root
							bind:open={deleteOpen}
							onOpenChange={(open) => {
								if (open) deleteConfirmText = "";
							}}
						>
							<Dialog.Trigger class={buttonVariants({ variant: "destructive", size: "sm" })}>
								Delete Project
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Delete this project permanently?</Dialog.Title>
									<Dialog.Description>
										This action is irreversible. To confirm, type the phrase below exactly.
									</Dialog.Description>
								</Dialog.Header>
								<div class="grid gap-3 py-2">
									<div class="rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
										{deletePhrase}
									</div>
									<div class="grid gap-2">
										<Label>Confirmation phrase</Label>
										<Input bind:value={deleteConfirmText} placeholder={deletePhrase} />
									</div>
								</div>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants({ variant: "destructive" })}
										disabled={!canConfirmDelete}
										onclick={deleteProject}
									>
										Delete
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					</div>
				</div>
			</div>
		</section>
	</div>
</div>
