<script lang="ts">
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
	import { onMount } from "svelte";
	import { Archive, Trash2 } from "@lucide/svelte";
	import * as Select from "$lib/components/ui/select";

	type Role = "Owner" | "Admin" | "Member" | "Viewer";
	type Status = "Active" | "Invited";

	type Member = {
		id: string;
		name: string;
		email: string;
		role: Role;
		status: Status;
		joinedAt: string;
	};

	let currentRole: Role = "Admin" as Role;
	const canEdit = currentRole === "Owner" || currentRole === "Admin";
	const canDelete = currentRole === "Owner";

	let projectName = $state("Project Atlas");
	let projectId = $state("atlas-2026");
	let projectStatus = $state<"Active" | "Archived">("Active");
	let projectDescription = $state("Core product research and prototype delivery.");

	let whiteboardsEnabled = $state(true);
	let advancedDatabasesEnabled = $state(true);
	let calendarManualEventsEnabled = $state(true);
	let resourceVersioningEnabled = $state(true);
	let feedbackAggregationEnabled = $state(true);

	let notifyArtifactCreated = $state(true);
	let notifyArtifactLocked = $state(true);
	let notifyFeedbackAdded = $state(true);
	let notifyResourceUpdated = $state(true);

	let members = $state<Member[]>([
		{
			id: "mem-1",
			name: "Avery Patel",
			email: "avery@league.dev",
			role: "Owner",
			status: "Active",
			joinedAt: "2026-02-04",
		},
		{
			id: "mem-2",
			name: "Nia Clark",
			email: "nia@league.dev",
			role: "Admin",
			status: "Active",
			joinedAt: "2026-02-05",
		},
		{
			id: "mem-3",
			name: "Jordan Lee",
			email: "jordan@league.dev",
			role: "Member",
			status: "Invited",
			joinedAt: "2026-02-06",
		},
	]);

	let archiveOpen = $state(false);
	let deleteOpen = $state(false);
	let deleteConfirmText = $state("");

	type SavePhase = "idle" | "saving" | "saved";
	let savePhase = $state<SavePhase>("idle");
	let savedSignature = $state("");
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;

	const currentSignature = $derived(
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
		})
	);
	const isDirty = $derived(currentSignature !== savedSignature);
	const deletePhrase = $derived(`${projectName.toUpperCase()} DELETE CONFIRM`);
	const canConfirmDelete = $derived(deleteConfirmText === deletePhrase);
	const saveIndicator = $derived.by(() => {
		if (savePhase === "saving") return "saving";
		if (isDirty) return "edited";
		if (savePhase === "saved") return "saved";
		return "idle";
	});

	const triggerSave = () => {
		if (savePhase === "saving" || !isDirty) return;
		if (saveTimer) clearTimeout(saveTimer);
		if (savedBadgeTimer) clearTimeout(savedBadgeTimer);
		savePhase = "saving";
		saveTimer = setTimeout(() => {
			savedSignature = currentSignature;
			savePhase = "saved";
			savedBadgeTimer = setTimeout(() => {
				if (!isDirty) savePhase = "idle";
			}, 1400);
		}, 900);
	};

	onMount(() => {
		savedSignature = currentSignature;
	});

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
					<Button size="sm" onclick={triggerSave} disabled={!isDirty || savePhase === "saving"}>
						{savePhase === "saving" ? "Saving..." : "Save changes"}
					</Button>
					<Dialog.Root bind:open={archiveOpen}>
						<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })}>
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
								<Dialog.Close class={buttonVariants()} onclick={() => (projectStatus = "Archived")}>
									Archive
								</Dialog.Close>
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
										onclick={() => {}}
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
				<Select.Root type="single" value="In-app">
					<Select.Trigger>In-app</Select.Trigger>
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
					<Button class="mt-3" size="sm" variant="outline">
						View log
					</Button>
				</div>
				<div class="rounded-md border border-border p-3">
					<div class="text-sm font-medium">Lifecycle controls</div>
					<div class="text-xs text-muted-foreground">
						Archive or delete this project with confirmation.
					</div>
					<div class="mt-3 flex flex-wrap gap-2">
						<Button size="sm" variant="outline" onclick={() => (archiveOpen = true)}>
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
										onclick={() => {}}
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
