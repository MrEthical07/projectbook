<script lang="ts">
	import { invalidate } from "$app/navigation";
	import { page } from "$app/state";
	import { selectIdea, updateIdea, updateIdeaStatus } from "$lib/remote/idea.remote";
	import { can } from "$lib/utils/permission";
	import { getContext, onDestroy, untrack } from "svelte";
	import { toast } from "svelte-sonner";
	import * as Alert from "$lib/components/ui/alert";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Textarea } from "$lib/components/ui/textarea";
	import { ChevronDown, ExternalLink, Info, X } from "@lucide/svelte";

	type IdeaStatus = "Considered" | "Selected" | "Rejected";
	type PageStatus = IdeaStatus | "Archived";
	type OptionalModuleKey =
		| "approach"
		| "alternatives"
		| "tradeoffs"
		| "risks"
		| "assumptions";

	type LinkedProblemStatement = {
		id: string;
		title: string;
		phase: "Define";
		href: string;
		status: "Draft" | "Locked" | "Archived";
	};

	type LinkedStory = {
		id: string;
		title: string;
		phase: "Empathize";
		href: string;
	};

	const moduleDetails: Record<
		OptionalModuleKey,
		{ title: string; placeholder: string }
	> = {
		approach: {
			title: "Approach - How it Works",
			placeholder: "Explain the approach at a conceptual level.",
		},
		alternatives: {
			title: "Alternatives Considered",
			placeholder: "List other ideas you considered.",
		},
		tradeoffs: {
			title: "Trade-offs",
			placeholder: "Describe what this idea sacrifices or deprioritizes.",
		},
		risks: {
			title: "Risks",
			placeholder: "Call out any risk areas to watch.",
		},
		assumptions: {
			title: "Assumptions",
			placeholder: "List assumptions that still need validation.",
		},
	};

	const optionalModules: OptionalModuleKey[] = [
		"approach",
		"alternatives",
		"tradeoffs",
		"risks",
		"assumptions",
	];

	let { data } = $props();
	const required = <T>(value: T | null | undefined, field: string): T => {
		if (value === undefined || value === null) {
			throw new Error(`Idea payload is missing '${field}'.`);
		}
		return value;
	};
	let projectId = $derived(page.params.projectId);
	const routeParams = page.params as Record<string, string | undefined>;
	let ideaId = $derived(routeParams.ideaId ?? "");
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canEditIdea = can(permissions, "idea", "edit");
	const canChangeIdeaStatus = can(permissions, "idea", "statusChange");
	const canArchiveIdea = can(permissions, "idea", "archive");
	let problemOptions = $state<LinkedProblemStatement[]>([]);
	let linkedStories = $state<LinkedStory[]>([]);
	let derivedPersonas = $state<string[]>([]);
	let title = $state("");
	let description = $state("");
	let ideaStatus = $state<IdeaStatus>("Considered");
	let isArchived = $state(false);
	let summaryTitle = $state("");
	let summaryDescription = $state("");
	let notesText = $state("");
	let selectedProblemId = $state("");
	let pendingProblemId = $state("");
	let addSectionOpen = $state(false);
	let statusDialogOpen = $state(false);
	let statusConfirmOpen = $state(false);
	let archiveDialogOpen = $state(false);
	let unarchiveDialogOpen = $state(false);
	let linkProblemOpen = $state(false);
	let derivedOpen = $state(true);
	let activeModules = $state<OptionalModuleKey[]>([]);
	let pendingStatus = $state<IdeaStatus | null>(null);
	let statusMutationPending = $state(false);
	let metadataOpen = $state(false);
	let moduleContent = $state<Record<OptionalModuleKey, string>>({
		approach: "",
		alternatives: "",
		tradeoffs: "",
		risks: "",
		assumptions: ""
	});
	let moduleOpen = $state<Record<OptionalModuleKey, boolean>>({
		approach: true,
		alternatives: true,
		tradeoffs: true,
		risks: true,
		assumptions: true,
	});

	let pageStatus = $derived<PageStatus>(isArchived ? "Archived" : ideaStatus);
	let linkedProblem = $derived(
		problemOptions.find((problem) => problem.id === selectedProblemId) ?? null
	);
	let pendingProblem = $derived(
		problemOptions.find((problem) => problem.id === pendingProblemId) ?? null
	);

	let isReadOnly = $derived(isArchived || ideaStatus === "Rejected" || !canEditIdea);
	let isSummaryReadOnly = $derived(isArchived || ideaStatus !== "Considered");
	type SavePhase = "idle" | "saving" | "saved";
	let savePhase = $state<SavePhase>("idle");
	let savedSignature = $state("");
	let saveReady = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;
	let currentSignature = $derived(
		JSON.stringify({
			title,
			description,
			ideaStatus,
			isArchived,
			summaryTitle,
			summaryDescription,
			notesText,
			selectedProblemId,
			activeModules,
			moduleContent,
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

	const addModule = (moduleKey: OptionalModuleKey) => {
		if (!activeModules.includes(moduleKey)) {
			activeModules = [...activeModules, moduleKey];
		}
	};

	const removeModule = (moduleKey: OptionalModuleKey) => {
		if (activeModules.includes(moduleKey)) {
			activeModules = activeModules.filter((key) => key !== moduleKey);
		}
	};

	const toggleModule = (moduleKey: OptionalModuleKey) => {
		moduleOpen[moduleKey] = !moduleOpen[moduleKey];
		moduleOpen = { ...moduleOpen };
	};

	const confirmLinkProblem = () => {
		if (!pendingProblemId) {
			return;
		}

		selectedProblemId = pendingProblemId;
		pendingProblemId = "";
		linkProblemOpen = false;
	};

	const requestStatusChange = (nextStatus: IdeaStatus) => {
		if (nextStatus === ideaStatus) return;
		pendingStatus = nextStatus;
		statusDialogOpen = false;
		statusConfirmOpen = true;
	};

	const changeArchiveState = async (nextArchived: boolean) => {
		if (!canArchiveIdea) {
			return;
		}
		if (!permissions || statusMutationPending) {
			return;
		}

		statusMutationPending = true;
		try {
			const result = await updateIdeaStatus({
				input: {
					projectId,
					ideaId,
					status: nextArchived ? "Archived" : "Considered"
				}
			});
			if (!result.success) {
				toast.error("error" in result ? result.error : "Status change failed.");
				return;
			}

			await invalidate((url) => url.pathname === page.url.pathname);
			isArchived = nextArchived;
			savedSignature = currentSignature;
		} catch (error) {
			console.error("Failed to update idea archive state", error);
			toast.error("Status change failed.");
		} finally {
			statusMutationPending = false;
		}
	};

	const confirmStatusChange = async () => {
		if (!canChangeIdeaStatus) return;
		if (!permissions) return;
		if (statusMutationPending) return;
		if (!pendingStatus) {
			return;
		}

		const targetStatus = pendingStatus;
		statusMutationPending = true;
		try {
			const result =
				targetStatus === "Selected"
					? await selectIdea({
							input: {
								projectId,
								ideaId
							}
						})
					: await updateIdeaStatus({
							input: {
								projectId,
								ideaId,
								status: targetStatus
							}
						});
			if (!result.success) {
				toast.error("error" in result ? result.error : "Status change failed.");
				return;
			}
			await invalidate((url) => url.pathname === page.url.pathname);

			ideaStatus = targetStatus;
			pendingStatus = null;
			statusDialogOpen = false;
			statusConfirmOpen = false;
		} catch (error) {
			console.error("Failed to update idea status", error);
			toast.error("Status change failed.");
		} finally {
			statusMutationPending = false;
		}
	};

	const statusVariant = (currentStatus: PageStatus) => {
		if (currentStatus === "Archived") {
			return "destructive";
		}

		if (currentStatus === "Selected") {
			return "default";
		}

		if (currentStatus === "Rejected") {
			return "secondary";
		}

		return "outline";
	};

	const statusBadgeClass = (currentStatus: PageStatus) => {
		if (currentStatus === "Selected") {
			return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
		}

		if (currentStatus === "Rejected") {
			return "bg-rose-500/10 text-rose-500 border-rose-500/20";
		}

		if (currentStatus === "Archived") {
			return "bg-slate-500/10 text-slate-500 border-slate-500/20";
		}

		return "bg-amber-500/10 text-amber-500 border-amber-500/20";
	};

	const isStatusImmutable = (currentStatus: IdeaStatus): boolean =>
		currentStatus === "Selected" || currentStatus === "Rejected";

	const triggerSave = async () => {
		if (!canEditIdea) return;
		if (!permissions) return;
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
		const result = await updateIdea({
			input: {
				projectId,
				ideaId,
				state: {
					title,
					description,
					summaryTitle,
					summaryDescription,
					notesText,
					selectedProblemId,
					activeModules,
					moduleContent
				}
			}
});
		if (!result.success) {
			savePhase = "idle";
			toast.error("error" in result ? result.error : "Save failed.");
			return;
		}
		savedSignature = currentSignature;
		savePhase = "saved";
		toast.success("Changes saved");
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
			problemOptions = structuredClone(d.problemOptions) as LinkedProblemStatement[];
			linkedStories = structuredClone(d.linkedStories) as LinkedStory[];
			derivedPersonas = structuredClone(d.derivedPersonas) as string[];

			title = required(d.idea.title, "idea.title");
			description = required(d.idea.description, "idea.description");
			ideaStatus = required(d.idea.status as IdeaStatus, "idea.status");
			isArchived = Boolean(required(d.isArchived, "isArchived"));
			summaryTitle = required(d.summaryTitle, "summaryTitle");
			summaryDescription = required(d.summaryDescription, "summaryDescription");
			notesText = required(d.notesText, "notesText");
			selectedProblemId = required(d.selectedProblemId, "selectedProblemId");
			pendingProblemId = "";

			activeModules = (Array.isArray(d.activeModules)
				? structuredClone(d.activeModules)
				: []) as OptionalModuleKey[];
			const mc = required(
				d.moduleContent as Record<OptionalModuleKey, string> | undefined,
				"moduleContent"
			);
			moduleContent = {
				approach: mc.approach,
				alternatives: mc.alternatives,
				tradeoffs: mc.tradeoffs,
				risks: mc.risks,
				assumptions: mc.assumptions
			};
			moduleOpen = {
				approach: true,
				alternatives: true,
				tradeoffs: true,
				risks: true,
				assumptions: true,
			};

			pendingStatus = null;
			statusConfirmOpen = false;
			statusMutationPending = false;
			savePhase = "idle";

			savedSignature = JSON.stringify({
				title,
				description,
				ideaStatus,
				isArchived,
				summaryTitle,
				summaryDescription,
				notesText,
				selectedProblemId,
				activeModules,
				moduleContent,
			});
			saveReady = true;
		});
	});
</script>

<svelte:head>
	<title>{title || "Idea"} • Ideas • ProjectBook</title>
	<meta
		name="description"
		content="View and refine this idea, linked context, and decision notes."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

{#key ideaId}
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
						<Breadcrumb.Link href="../ideas">Ideas</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{title || "New Idea"}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col md:px-20 gap-4 py-2">
		<div class="flex mt-2 flex-col bg-background rounded-lg gap-2 p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				Idea - Ideate
			</div>
			<Input
				type="text"
				bind:value={title}
				class="bg-transparent outline-0 shadow-none border-0 text-4xl! h-fit py-4 px-3"
				placeholder="Idea Title"
				disabled={isReadOnly}
			/>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-2">
					<Button variant="outline" size="icon" onclick={() => (metadataOpen = true)} aria-label="Open idea metadata">
						<Info class="h-4 w-4" />
					</Button>
					<Badge class={statusBadgeClass(pageStatus)} variant="outline">
						{pageStatus}
					</Badge>
					{#if isArchived}
						<Dialog.Root bind:open={unarchiveDialogOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })}>
								Unarchive
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Unarchive this idea?</Dialog.Title>
									<Dialog.Description>
										This will make the idea editable again.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants()}
										onclick={() => changeArchiveState(false)}
										disabled={!canArchiveIdea || statusMutationPending}
									>
										Unarchive
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					{:else}
						<Dialog.Root bind:open={archiveDialogOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })}>
								Archive
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Archive this idea?</Dialog.Title>
									<Dialog.Description>
										Archived ideas are read-only and kept for history.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants()}
										onclick={() => changeArchiveState(true)}
										disabled={!canArchiveIdea || statusMutationPending}
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
						disabled={!canEditIdea || savePhase === "saving" || !isDirty}
					>
						{savePhase === "saving" ? "Saving..." : "Save changes"}
					</Button>
				</div>
			</div>
</div>


<Dialog.Root bind:open={metadataOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Artifact Metadata</Dialog.Title>
			<Dialog.Description>Read-only metadata for this idea.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-2 text-sm">
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Owner</span><span>{data.metadata?.owner ?? "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Last updated</span><span>{data.metadata?.lastUpdated ?? "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Status</span><span>{pageStatus}</span></div>
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Close</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={statusConfirmOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Confirm status change</Dialog.Title>
			<Dialog.Description>
				{#if pendingStatus === "Selected"}
					Selecting this idea enables task creation downstream.
				{:else if pendingStatus === "Rejected"}
					Rejected ideas become read-only except Notes.
				{:else}
					This will move the idea back to Considered.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-lg border border-border px-3 py-2 text-sm">
			New status: {pendingStatus ?? "None"}
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })} disabled={statusMutationPending}>
				Cancel
			</Dialog.Close>
			<Button onclick={confirmStatusChange} disabled={statusMutationPending || !canChangeIdeaStatus}>
				{statusMutationPending ? "Saving..." : "Confirm status"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
		<Separator class="mt-2 px-2"></Separator>

		<div class="py-2 w-full flex flex-col gap-4">
			<section class="flex flex-col gap-3 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Linked Problem Statement</span>
					<Separator></Separator>
				</div>
				{#if !linkedProblem}
					<div class="flex flex-col gap-3 max-w-xl">
						<Label class="text-muted-foreground" for="linked-problem">
							Linked problem statement
						</Label>
						{#if problemOptions.length === 0}
							<div class="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
								No locked problem statements available. Lock a problem statement first.
							</div>
						{:else}
						<Select.Root type="single" bind:value={pendingProblemId}>
							<Select.Trigger id="linked-problem">
								{pendingProblemId
									? problemOptions.find((problem) => problem.id === pendingProblemId)?.title
									: "Select a problem statement"}
							</Select.Trigger>
							<Select.Content>
								{#each problemOptions as problem (problem.id)}
									<Select.Item value={problem.id} label={problem.title}>
										{problem.title}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{/if}
						<div class="flex items-center gap-3">
							<Dialog.Root bind:open={linkProblemOpen}>
								<Dialog.Trigger
									class={buttonVariants({ variant: "outline", size: "sm" })}
									disabled={!pendingProblemId}
								>
									Link problem statement
								</Dialog.Trigger>
								<Dialog.Content>
									<Dialog.Header>
										<Dialog.Title>Link this problem statement?</Dialog.Title>
										<Dialog.Description>
											This cannot be changed later. Make sure this is the right problem.
										</Dialog.Description>
									</Dialog.Header>
									<div class="rounded-lg border border-border px-3 py-2 text-sm">
										{pendingProblem?.title ?? "No problem selected"}
									</div>
									<Dialog.Footer>
										<Dialog.Close class={buttonVariants({ variant: "outline" })}>
											Cancel
										</Dialog.Close>
										<Dialog.Close
											class={buttonVariants()}
											onclick={confirmLinkProblem}
										>
											Confirm link
										</Dialog.Close>
									</Dialog.Footer>
								</Dialog.Content>
							</Dialog.Root>
							<span class="text-xs text-muted-foreground">
								Once linked, this problem statement cannot be changed.
							</span>
						</div>
					</div>
				{:else}
					{#if linkedProblem.status === "Archived"}
						<Alert.Root class="border border-orange-200 bg-orange-50 text-orange-700">
							<Alert.Title>Problem statement archived</Alert.Title>
							<Alert.Description>
								This idea remains valid but upstream context is archived.
							</Alert.Description>
						</Alert.Root>
					{:else if linkedProblem.status !== "Locked"}
						<Alert.Root class="border border-orange-200 bg-orange-50 text-orange-700">
							<Alert.Title>Problem statement not locked</Alert.Title>
							<Alert.Description>
								This idea is linked to a problem statement that is still editable.
							</Alert.Description>
						</Alert.Root>
					{/if}
					<div class="border border-border rounded-lg p-4 flex flex-col gap-3">
						<div class="flex items-start justify-between gap-3">
							<div class="text-sm font-medium">{linkedProblem.title}</div>
							<Button
								variant="ghost"
								size="sm"
								class="h-8 w-8 p-0"
								href={linkedProblem.href}
								aria-label="Open problem statement"
							>
								<ExternalLink class="h-4 w-4" />
							</Button>
						</div>
						<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<div class="bg-accent px-2 py-1 rounded-lg text-xs font-medium">
								{linkedProblem.phase}
							</div>
							<div class="bg-muted px-2 py-1 rounded-lg text-xs">
								{linkedProblem.status}
							</div>
						</div>
					</div>
				{/if}
			</section>

			{#if linkedProblem}
				<section class="flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
					<div class="flex flex-row gap-2 items-center w-full">
						<span class="font-medium text-nowrap">Derived Context</span>
						<Separator></Separator>
						<Button
							variant="ghost"
							size="sm"
							class="h-7 px-2"
							onclick={() => {
								derivedOpen = !derivedOpen;
							}}
						>
							<ChevronDown
								class={`h-4 w-4 transition-transform ${
									derivedOpen ? "rotate-180" : ""
								}`}
							/>
						</Button>
					</div>
					{#if derivedOpen}
						<div class="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
							<div class="md:col-span-2">
								<div class="text-xs font-semibold uppercase text-muted-foreground">
									Problem statement
								</div>
								<div class="mt-2 text-sm text-foreground">
									{linkedProblem.title}
								</div>
							</div>
							<div>
								<div class="text-xs font-semibold uppercase text-muted-foreground">Persona</div>
								<div class="mt-2 text-sm text-foreground">
									{#if derivedPersonas.length === 0}
										<span class="text-muted-foreground">No personas derived</span>
									{:else}
									{#each derivedPersonas as persona, index (persona)}
										<span>{persona}{index < derivedPersonas.length - 1 ? ", " : ""}</span>
									{/each}
									{/if}
								</div>
							</div>
							<div>
								<div class="text-xs font-semibold uppercase text-muted-foreground">Linked sources</div>
								<div class="mt-2 flex flex-col gap-2">
									{#if linkedStories.length === 0}
										<span class="text-sm text-muted-foreground">No linked stories or journeys</span>
									{:else}
									{#each linkedStories as story (story.id)}
										<div class="flex items-center justify-between gap-2 text-sm text-foreground">
											<span>{story.title}</span>
											<Button
												variant="ghost"
												size="sm"
												class="h-7 w-7 p-0"
												href={story.href}
												aria-label="Open user story"
											>
												<ExternalLink class="h-4 w-4" />
											</Button>
										</div>
									{/each}
									{/if}
								</div>
							</div>
						</div>
					{/if}
				</section>
			{/if}

			<section class="flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Idea Description</span>
					<Separator></Separator>
				</div>
				<Textarea
					id="idea-description"
					placeholder="Describe the idea at a conceptual level."
					bind:value={description}
					disabled={isReadOnly}
					class="min-h-28 text-base md:text-lg font-medium"
				/>
			</section>

			<section class="flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Idea Status</span>
					<Separator></Separator>
				</div>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<Badge class={statusBadgeClass(ideaStatus)} variant="outline">
						{ideaStatus}
					</Badge>
					<Dialog.Root bind:open={statusDialogOpen}>
						<Dialog.Trigger
							class={buttonVariants({ variant: "outline" })}
							disabled={isArchived || isStatusImmutable(ideaStatus) || statusMutationPending}
						>
							Change Status
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Change idea status</Dialog.Title>
							</Dialog.Header>
							<div class="grid gap-2">
								{#each ["Considered", "Selected", "Rejected"] as option (option)}
									<Button
										variant={(pendingStatus ?? ideaStatus) === option ? "default" : "outline"}
										disabled={statusMutationPending}
										onclick={() => (pendingStatus = option as IdeaStatus)}
									>
										{option}
									</Button>
								{/each}
							</div>
							<div class="mt-3 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
								Status changes are manual and require confirmation.
							</div>
							<Dialog.Footer>
								<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
								<Button onclick={() => requestStatusChange((pendingStatus ?? ideaStatus) as IdeaStatus)} disabled={(pendingStatus ?? ideaStatus) === ideaStatus || statusMutationPending || !canChangeIdeaStatus}>Continue</Button>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
				</div>
			</section>

			<section class="flex flex-col gap-3 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Final Idea Summary</span>
					<Separator></Separator>
				</div>
				<div class="grid gap-3">
					<Input
						id="summary-title"
						placeholder="Summary title"
						bind:value={summaryTitle}
						disabled={isSummaryReadOnly}
					/>
					<Textarea
						id="summary-description"
						placeholder="Short summary of the idea."
						bind:value={summaryDescription}
						disabled={isSummaryReadOnly}
					/>
				</div>
			</section>

			<section class="flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Add Section</span>
					<Separator></Separator>
				</div>
				<Dialog.Root bind:open={addSectionOpen}>
					<Dialog.Trigger
						class={buttonVariants({ variant: "outline" })}
						disabled={isReadOnly}
					>
						+ Add Section
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Add section</Dialog.Title>
						</Dialog.Header>
						<div class="grid gap-3">
							{#each optionalModules as moduleKey (moduleKey)}
								<div class="border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-3">
									<div class="text-sm font-medium">
										{moduleDetails[moduleKey].title}
									</div>
									<Button
										variant="outline"
										size="sm"
										onclick={() => addModule(moduleKey)}
										disabled={activeModules.includes(moduleKey) || isReadOnly}
									>
										{activeModules.includes(moduleKey) ? "Added" : "Add"}
									</Button>
								</div>
							{/each}
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</section>

			{#if activeModules.length > 0}
				<section class="flex flex-col gap-3 p-4 w-full bg-background rounded-lg">
					<div class="flex flex-row gap-2 items-center w-full">
						<span class="font-medium text-nowrap">Optional Modules</span>
						<Separator></Separator>
					</div>
					<div class="grid gap-3">
						{#each optionalModules as moduleKey (moduleKey)}
							{#if activeModules.includes(moduleKey)}
								<div class="group flex flex-col gap-3 rounded-lg border border-border px-4 py-3">
									<div class="flex items-center justify-between gap-3">
										<button
											type="button"
											class="flex items-center gap-2 text-left"
											onclick={() => toggleModule(moduleKey)}
										>
											<ChevronDown
												class={`h-4 w-4 transition-transform ${
													moduleOpen[moduleKey] ? "rotate-180" : ""
												}`}
											/>
											<span class="text-sm font-medium">
												{moduleDetails[moduleKey].title}
											</span>
										</button>
										<Button
										variant="ghost"
										size="icon"
										class="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
										onclick={() => removeModule(moduleKey)}
										disabled={isReadOnly}
									>
										<X class="h-4 w-4" />
									</Button>
									</div>
									{#if moduleOpen[moduleKey]}
										<Textarea
											placeholder={moduleDetails[moduleKey].placeholder}
											bind:value={moduleContent[moduleKey]}
											disabled={isReadOnly}
										/>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				</section>
			{/if}

			<section class="flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Notes</span>
					<Separator></Separator>
				</div>
				<Textarea
					id="idea-notes"
					placeholder="Additional notes"
					bind:value={notesText}
				/>
			</section>
		</div>
	</div>
</div>
{/key}
