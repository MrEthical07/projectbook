<script lang="ts">
	import { getContext, onDestroy, untrack } from "svelte";
	import * as Alert from "$lib/components/ui/alert";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
	import { Textarea } from "$lib/components/ui/textarea";
	import { ExternalLink } from "@lucide/svelte";
	import { page } from "$app/state";
	import { updateResource, updateResourceStatus } from "$lib/remote/resource.remote";
	import { can } from "$lib/utils/permission";

	const projectId = page.params.projectId;

	type ResourceStatus = "Active" | "Archived";
	type LinkedArtifactType = "User Story" | "Problem Statement" | "Idea" | "Task";

	type LinkedArtifact = {
		id: string;
		title: string;
		type: LinkedArtifactType;
		phase: "Empathize" | "Define" | "Ideate" | "Prototype";
		href: string;
	};

	type VersionRow = {
		version: string;
		uploadedBy: string;
		uploadDate: string;
		description: string;
	};

	let { data } = $props();
	const required = <T>(value: T | null | undefined, field: string): T => {
		if (value === undefined || value === null) {
			throw new Error(`Resource payload is missing '${field}'.`);
		}
		return value;
	};
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canEditResource = can(permissions, "resource", "edit");
	let name = $state("");
	let fileType = $state("");
	let docType = $state("");
	let status = $state<ResourceStatus>("Active");
	let description = $state("");
	let owner = $state("");
	let createdAt = $state("");
	let updatedAt = $state("");
	let fileSize = $state("");

	let notesText = $state("");
	let versionDialogOpen = $state(false);
	let archiveDialogOpen = $state(false);
	let unarchiveDialogOpen = $state(false);
	let statusConfirmOpen = $state(false);
	let pendingStatus = $state<ResourceStatus | null>(null);
	let statusMutationPending = $state(false);

	let newVersionDescription = $state("");
	let newVersionLabel = $state("v4");
	let addSectionOpen = $state(false);

	let linkedArtifacts = $state<LinkedArtifact[]>([]);

	let versions = $state<VersionRow[]>([]);

	type SavePhase = "idle" | "saving" | "saved";
	let savePhase = $state<SavePhase>("idle");
	let savedSignature = $state("");
	let saveReady = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;

	let isReadOnly = $derived(status === "Archived" || !canEditResource);
	let currentSignature = $derived(
		JSON.stringify({
			name,
			docType,
			description,
			notesText,
			linkedArtifacts,
			versions
		})
	);
	let isDirty = $derived(saveReady && currentSignature !== savedSignature);
	let saveIndicator = $derived.by(() => {
		if (savePhase === "saving") {
			return "saving";
		}

		if (isDirty) {
			return "edited";
		}

		if (savePhase === "saved") {
			return "saved";
		}

		return "idle";
	});

	const statusBadgeClass = (currentStatus: ResourceStatus) => {
		if (currentStatus === "Archived") {
			return "bg-slate-500/10 text-slate-500 border-slate-500/20";
		}

		return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
	};

	const requestStatusChange = (nextStatus: ResourceStatus) => {
		if (nextStatus === status || statusMutationPending) {
			return;
		}
		pendingStatus = nextStatus;
		statusConfirmOpen = true;
	};

	const confirmStatusChange = async () => {
		if (!pendingStatus || statusMutationPending) {
			return;
		}
		if (!permissions || !canEditResource) {
			return;
		}

		const nextStatus = pendingStatus;
		statusMutationPending = true;
		try {
			const result = await updateResourceStatus({
				input: {
					projectId,
					resourceId: page.params.resourceId,
					status: nextStatus
				}
			});
			if (!result.success) {
				return;
			}

			status = nextStatus;
			pendingStatus = null;
			statusConfirmOpen = false;
		} catch (error) {
			console.error("Failed to update resource status", error);
		} finally {
			statusMutationPending = false;
		}
	};

	const removeLinkedArtifact = (id: string) => {
		linkedArtifacts = linkedArtifacts.filter((item) => item.id !== id);
	};

	const triggerSave = async () => {
		if (!permissions || !canEditResource) return;
		if (savePhase === "saving" || !isDirty) {
			return;
		}

		if (saveTimer) {
			clearTimeout(saveTimer);
		}

		if (savedBadgeTimer) {
			clearTimeout(savedBadgeTimer);
		}

		savePhase = "saving";
		const result = await updateResource({
			input: {
				projectId,
				resourceId: page.params.resourceId,
				state: {
					name,
					docType,
					description,
					notesText,
					linkedArtifacts,
					versions
				}
			}
});
		if (!result.success) {
			savePhase = "idle";
			return;
		}
		updatedAt = new Date().toISOString().slice(0, 10);
		savedSignature = currentSignature;
		savePhase = "saved";
		savedBadgeTimer = setTimeout(() => {
			if (!isDirty) {
				savePhase = "idle";
			}
		}, 1400);
	};

	onDestroy(() => {
		if (saveTimer) {
			clearTimeout(saveTimer);
		}

		if (savedBadgeTimer) {
			clearTimeout(savedBadgeTimer);
		}
	});

	$effect(() => {
		const d = data;
		untrack(() => {
			const resource = required(d.resource, "resource");
			name = required(resource.name, "resource.name");
			fileType = required(resource.fileType, "resource.fileType");
			docType = required(resource.docType, "resource.docType");
			status = resource.status as ResourceStatus;
			description = required(resource.description, "resource.description");
			owner = required(resource.owner, "resource.owner");
			createdAt = required(resource.createdAt, "resource.createdAt");
			updatedAt = required(resource.updatedAt, "resource.updatedAt");
			fileSize = required(resource.fileSize, "resource.fileSize");
			notesText = required(resource.notesText, "resource.notesText");
			linkedArtifacts = structuredClone(resource.linkedArtifacts) as LinkedArtifact[];
			versions = structuredClone(resource.versions) as VersionRow[];
			versionDialogOpen = false;
			archiveDialogOpen = false;
			unarchiveDialogOpen = false;
			statusConfirmOpen = false;
			pendingStatus = null;
			statusMutationPending = false;
			savePhase = "idle";
			savedSignature = JSON.stringify({
				name,
				docType,
				description,
				notesText,
				linkedArtifacts,
				versions
			});
			saveReady = true;
		});
	});
</script>

<svelte:head>
	<title>{name || "Resource"} • Resources • ProjectBook</title>
	<meta
		name="description"
		content="View this resource, its versions, and linked project artifacts."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<div class="flex flex-col gap-2 p-2 bg-background border rounded-lg w-full">
	<header
		class="flex h-12 shrink-0 w-full items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex items-center gap-2 px-4 w-full">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="/project/{projectId}/resources">Resources</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{name}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col md:px-20 gap-4 py-2">
		<div class="flex mt-2 flex-col bg-background rounded-lg gap-2 p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				Resource - File
			</div>
			<Input
				type="text"
				bind:value={name}
				class="bg-transparent outline-0 shadow-none border-0 text-4xl! h-fit py-4 px-3"
				disabled={isReadOnly}
			/>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="outline">{fileType}</Badge>
					<Badge variant="secondary">{docType}</Badge>
					<Badge class={statusBadgeClass(status)} variant="outline">
						{status}
					</Badge>
					{#if status === "Archived"}
						<Dialog.Root bind:open={unarchiveDialogOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })} disabled={!canEditResource || statusMutationPending}>
								Unarchive
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Unarchive this resource?</Dialog.Title>
									<Dialog.Description>
										This will make the resource editable again.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants()}
										onclick={() => requestStatusChange("Active")}
										disabled={!canEditResource || statusMutationPending}
									>
										Unarchive
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					{:else}
						<Dialog.Root bind:open={archiveDialogOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })} disabled={!canEditResource || statusMutationPending}>
								Archive
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Archive this resource?</Dialog.Title>
									<Dialog.Description>
										Archived resources are read-only and kept for history.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants()}
										onclick={() => requestStatusChange("Archived")}
										disabled={!canEditResource || statusMutationPending}
									>
										Archive
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					{/if}
				</div>
				<div class="flex items-center gap-3">
					<div class="flex flex-col items-end text-xs text-muted-foreground leading-tight min-h-6">
						{#if saveIndicator === "edited"}
							<span class="text-amber-600">Edited</span>
						{:else if saveIndicator === "saving"}
							<span class="text-blue-600">Saving...</span>
						{:else if saveIndicator === "saved"}
							<span class="text-emerald-600">Saved</span>
						{/if}
					</div>
					<Button
						size="sm"
						onclick={triggerSave}
						disabled={!canEditResource || savePhase === "saving" || !isDirty}
					>
						{savePhase === "saving" ? "Saving..." : "Save changes"}
					</Button>
				</div>
			</div>
		</div>

		<Separator class="mt-2 px-2"></Separator>

		<div class="py-2 w-full flex flex-col gap-4">
			<section class="flex flex-col gap-3 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Resource Overview</span>
					<Separator></Separator>
				</div>
				<div class="grid gap-4 md:grid-cols-2">
					<div class="rounded-lg border border-border p-6 text-sm text-muted-foreground">
						Preview not available for this file type.
					</div>
					<div class="flex flex-col gap-3">
						<Button class={buttonVariants()}>
							Download Latest
						</Button>
						<div class="text-sm text-muted-foreground">File size: {fileSize}</div>
						<div class="text-sm text-muted-foreground">Last updated: {updatedAt}</div>
					</div>
				</div>
			</section>

			<section class="flex flex-col gap-3 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Linked Artifacts</span>
					<Separator></Separator>
				</div>
				<div class="grid gap-3">
					{#each linkedArtifacts as artifact (artifact.id)}
						<div class="flex flex-col gap-3 rounded-lg border border-border p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="flex flex-col gap-1">
									<span class="text-sm font-medium text-foreground">{artifact.title}</span>
									<span class="text-xs text-muted-foreground">{artifact.type}</span>
								</div>
								<div class="flex items-center gap-2">
									<Button
										variant="ghost"
										size="sm"
										class="h-8 w-8 p-0"
										href={artifact.href}
										aria-label={`Open ${artifact.type.toLowerCase()}`}
									>
										<ExternalLink class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										class="h-7 px-2 text-destructive hover:text-destructive"
										onclick={() => removeLinkedArtifact(artifact.id)}
										disabled={isReadOnly}
									>
										Remove
									</Button>
								</div>
							</div>
							<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
								<div class="bg-accent px-2 py-1 rounded-lg text-xs font-medium">
									{artifact.phase}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section class="flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Version History</span>
					<Separator></Separator>
				</div>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Version</TableHead>
							<TableHead>Uploaded By</TableHead>
							<TableHead>Upload Date</TableHead>
							<TableHead>Change Description</TableHead>
							<TableHead></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each versions as version, index (version.version)}
							<TableRow class={index === 0 ? "bg-muted/40" : ""}>
								<TableCell>{version.version}</TableCell>
								<TableCell>{version.uploadedBy}</TableCell>
								<TableCell>{version.uploadDate}</TableCell>
								<TableCell>{version.description}</TableCell>
								<TableCell>
									<Button variant="outline" size="sm">Download</Button>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</section>

			<section class="flex flex-col gap-3 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Metadata Details</span>
					<Separator></Separator>
				</div>
				<div class="grid gap-3 md:grid-cols-2">
					<div class="grid gap-2">
						<Label for="resource-name">Resource name</Label>
						<Input id="resource-name" bind:value={name} disabled={isReadOnly} />
					</div>
					<div class="grid gap-2">
						<Label for="doc-type">Document type</Label>
						<Input id="doc-type" bind:value={docType} disabled={isReadOnly} />
					</div>
					<div class="grid gap-2 md:col-span-2">
						<Label for="resource-description">Description</Label>
						<Textarea
							id="resource-description"
							bind:value={description}
							disabled={isReadOnly}
						/>
					</div>
					<div class="grid gap-2">
						<Label>Owner</Label>
						<Input value={owner} disabled />
					</div>
					<div class="grid gap-2">
						<Label>Created At</Label>
						<Input value={createdAt} disabled />
					</div>
					<div class="grid gap-2">
						<Label>Last Updated</Label>
						<Input value={updatedAt} disabled />
					</div>
				</div>
			</section>

			<section class="flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Add New Version</span>
					<Separator></Separator>
				</div>
				<Dialog.Root bind:open={versionDialogOpen}>
					<Dialog.Trigger
						class={buttonVariants({ variant: "outline" })}
						disabled={isReadOnly}
					>
						Upload New Version
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Upload new version</Dialog.Title>
							<Dialog.Description>
								This will create a new version and keep the previous ones.
							</Dialog.Description>
						</Dialog.Header>
						<div class="grid gap-3">
							<div class="grid gap-2">
								<Label for="version-file">File</Label>
								<Input id="version-file" type="file" />
							</div>
						<div class="grid gap-2">
							<Label for="version-description">Change description</Label>
							<Input
								id="version-description"
								placeholder="Describe what changed"
								bind:value={newVersionDescription}
							/>
						</div>
						<div class="grid gap-2">
							<Label for="version-label">Version</Label>
							<Input
								id="version-label"
								placeholder="v00.00"
								bind:value={newVersionLabel}
							/>
						</div>
						<div class="grid gap-2">
							<Label>Uploaded by</Label>
							<Input value={owner} disabled />
						</div>
						</div>
						<Dialog.Footer>
							<Dialog.Close class={buttonVariants({ variant: "outline" })}>
								Cancel
							</Dialog.Close>
							<Button class={buttonVariants()} disabled={!newVersionDescription}>
								Upload Version
							</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			</section>

			<section class="flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Notes</span>
					<Separator></Separator>
				</div>
				<Textarea
					id="resource-notes"
					placeholder="Additional notes"
					bind:value={notesText}
					disabled={isReadOnly}
				/>
			</section>
		</div>
	</div>
</div>

<Dialog.Root bind:open={statusConfirmOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Confirm status change</Dialog.Title>
			<Dialog.Description>
				Archiving makes the resource read-only but keeps all versions available.
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-lg border border-border px-3 py-2 text-sm">
			New status: {pendingStatus ?? "None"}
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })} disabled={statusMutationPending}>
				Cancel
			</Dialog.Close>
			<Button class={buttonVariants()} onclick={confirmStatusChange} disabled={!canEditResource || statusMutationPending}>
				{statusMutationPending ? "Saving..." : "Confirm status"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
