<script lang="ts">
	import { getContext, onDestroy, untrack } from "svelte";
	import { page } from "$app/state";
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
	import { updateFeedback } from "$lib/remote/feedback.remote";
	import { can } from "$lib/utils/permission";
	import { toast } from "svelte-sonner";

	type OutcomeStatus = "Validated" | "Invalidated" | "Needs Iteration";
	type PageStatus = OutcomeStatus | "Archived";
	type ArtifactType = "Task" | "Idea" | "Problem Statement";

	type LinkedArtifact = {
		id: string;
		title: string;
		type: ArtifactType;
		phase: "Prototype" | "Ideate" | "Define";
		href: string;
		status: "Active" | "Archived";
	};

	type OptionalModuleKey = "evidence" | "nextSteps";

	let { data } = $props();
	const required = <T>(value: T | null | undefined, field: string): T => {
		if (value === undefined || value === null) {
			throw new Error(`Feedback payload is missing '${field}'.`);
		}
		return value;
	};
	let projectId = $derived(page.params.projectId);
	const routeParams = page.params as Record<string, string | undefined>;
	let feedbackId = $derived(routeParams.feedbackId ?? "");
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canEditFeedback = can(permissions, "feedback", "edit");
	let taskOptions = $state<LinkedArtifact[]>([]);
	let ideaOptions = $state<LinkedArtifact[]>([]);
	let problemOptions = $state<LinkedArtifact[]>([]);

	const optionalModules: OptionalModuleKey[] = ["evidence", "nextSteps"];

	let title = $state("");
	let outcome = $state<OutcomeStatus>("Needs Iteration");
	let isArchived = $state(false);
	let observation = $state("");
	let interpretation = $state("");
	let notesText = $state("");

	let addSectionOpen = $state(false);
	let statusDialogOpen = $state(false);
	let statusConfirmOpen = $state(false);
	let pendingOutcome = $state<OutcomeStatus | null>(null);
	let statusMutationPending = $state(false);
	let archiveDialogOpen = $state(false);
	let unarchiveDialogOpen = $state(false);
	let metadataOpen = $state(false);

	let activeModules = $state<OptionalModuleKey[]>([]);
	let moduleOpen = $state<Record<OptionalModuleKey, boolean>>({
		evidence: true,
		nextSteps: true,
	});
	let evidenceText = $state("");
	let evidenceLocked = $state(false);
	let nextStepsText = $state("");

	let selectedTaskId = $state("");
	let selectedIdeaId = $state("");
	let selectedProblemId = $state("");

	let linkedArtifacts = $state<LinkedArtifact[]>([]);

	type SavePhase = "idle" | "saving" | "saved";
	let savePhase = $state<SavePhase>("idle");
	let savedSignature = $state("");
	let saveReady = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;

		
	let currentSignature = $derived(
		JSON.stringify({
			title,
			outcome,
			isArchived,
			observation,
			interpretation,
			notesText,
			linkedArtifacts,
			activeModules,
			evidenceText,
			evidenceLocked,
			nextStepsText,
		})
	);
	let pageStatus = $derived<PageStatus>(isArchived ? "Archived" : outcome);
	let isReadOnly = $derived(isArchived || !canEditFeedback);
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

	const statusBadgeClass = (currentStatus: PageStatus) => {
		if (currentStatus === "Validated") {
			return "bg-emerald-100 text-emerald-700 border-emerald-200";
		}

		if (currentStatus === "Invalidated") {
			return "bg-rose-100 text-rose-700 border-rose-200";
		}

		if (currentStatus === "Needs Iteration") {
			return "bg-amber-100 text-amber-700 border-amber-200";
		}

		return "bg-slate-100 text-slate-600 border-slate-200";
	};

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

	const addLinkedArtifact = (artifact: LinkedArtifact) => {
		if (!linkedArtifacts.some((item) => item.id === artifact.id)) {
			linkedArtifacts = [...linkedArtifacts, artifact];
		}
	};

	const addTask = () => {
		const selected = taskOptions.find((item) => item.id === selectedTaskId);
		if (!selected) {
			return;
		}

		addLinkedArtifact(selected);
		selectedTaskId = "";
	};

	const addIdea = () => {
		const selected = ideaOptions.find((item) => item.id === selectedIdeaId);
		if (!selected) {
			return;
		}

		addLinkedArtifact(selected);
		selectedIdeaId = "";
	};

	const addProblem = () => {
		const selected = problemOptions.find((item) => item.id === selectedProblemId);
		if (!selected) {
			return;
		}

		addLinkedArtifact(selected);
		selectedProblemId = "";
	};

	const removeArtifact = (id: string) => {
		if (linkedArtifacts.length <= 1) {
			return;
		}

		linkedArtifacts = linkedArtifacts.filter((item) => item.id !== id);
	};

	const requestOutcomeChange = (nextOutcome: OutcomeStatus) => {
		pendingOutcome = nextOutcome;
		statusConfirmOpen = true;
	};

	const confirmOutcomeChange = async () => {
		if (!pendingOutcome || statusMutationPending) {
			return;
		}

		const previousOutcome = outcome;
		const nextOutcome = pendingOutcome;
		statusMutationPending = true;
		outcome = nextOutcome;
		try {
			const saved = await triggerSave();
			if (!saved) {
				outcome = previousOutcome;
				statusMutationPending = false;
				return;
			}
			pendingOutcome = null;
			statusConfirmOpen = false;
			statusMutationPending = false;
		} catch (error) {
			console.error("Failed to confirm outcome change", error);
			outcome = previousOutcome;
			statusMutationPending = false;
		}
	};

	const triggerSave = async () => {
		if (!permissions || !canEditFeedback) return false;
		if (savePhase === "saving" || !isDirty) {
			return false;
		}

		if (saveTimer) {
			clearTimeout(saveTimer);
		}

		if (savedBadgeTimer) {
			clearTimeout(savedBadgeTimer);
		}

		savePhase = "saving";
		try {
			const result = await updateFeedback({
				input: {
					projectId,
					feedbackId,
					state: {
						title,
						outcome,
						status: isArchived ? "Archived" : "Active",
						isArchived,
						observation,
						interpretation,
						notesText,
						linkedArtifacts,
						activeModules,
						evidenceText,
						evidenceLocked,
						nextStepsText
					}
				}
			});
			if (!result.success) {
				savePhase = "idle";
				toast.error("Failed to save changes");
				return false;
			}
			savedSignature = currentSignature;
			savePhase = "saved";
			toast.success("Changes saved");
			savedBadgeTimer = setTimeout(() => {
				if (!isDirty) {
					savePhase = "idle";
				}
			}, 1400);
			return true;
		} catch (error) {
			console.error("Failed to save feedback", error);
			savePhase = "idle";
			toast.error("Failed to save changes");
			return false;
		}
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
			taskOptions = structuredClone(d.taskOptions) as LinkedArtifact[];
			ideaOptions = structuredClone(d.ideaOptions) as LinkedArtifact[];
			problemOptions = structuredClone(d.problemOptions) as LinkedArtifact[];

			title = required(d.feedback.title, "feedback.title");
			outcome = required(d.feedback.outcome as OutcomeStatus, "feedback.outcome");
			isArchived = Boolean(required(d.isArchived, "isArchived"));
			observation = required(d.observation, "observation");
			interpretation = required(d.interpretation, "interpretation");
			notesText = required(d.notesText, "notesText");

			activeModules = (Array.isArray(d.activeModules)
				? structuredClone(d.activeModules)
				: []) as OptionalModuleKey[];
			moduleOpen = { evidence: true, nextSteps: true };
			evidenceText = required(d.evidenceText, "evidenceText");
			evidenceLocked = Boolean(required(d.evidenceLocked, "evidenceLocked"));
			nextStepsText = required(d.nextStepsText, "nextStepsText");

			linkedArtifacts = (Array.isArray(d.linkedArtifacts)
				? structuredClone(d.linkedArtifacts)
				: []) as LinkedArtifact[];

			selectedTaskId = "";
			selectedIdeaId = "";
			selectedProblemId = "";

			savePhase = "idle";
			pendingOutcome = null;
			statusConfirmOpen = false;
			statusMutationPending = false;

			savedSignature = JSON.stringify({
				title,
				outcome,
				isArchived,
				observation,
				interpretation,
				notesText,
				linkedArtifacts,
				activeModules,
				evidenceText,
				evidenceLocked,
				nextStepsText,
			});
			saveReady = true;
		});
	});
</script>

<svelte:head>
	<title>{title || "Feedback"} • Feedback • ProjectBook</title>
	<meta
		name="description"
		content="View and analyze this feedback entry and linked artifacts."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

{#key feedbackId}
<div class="flex flex-col gap-2 p-2 bg-white border rounded-lg w-full">
	<header
		class="flex h-12 shrink-0 w-full items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex items-center gap-2 px-4 w-full">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="../feedback">Feedback</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{title || "New Feedback"}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col md:px-20 gap-4 py-2">
		<div class="flex mt-2 flex-col bg-white rounded-lg gap-2 p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				Feedback - Test
			</div>
			<Input
				type="text"
				bind:value={title}
				class="bg-transparent outline-0 shadow-none border-0 text-4xl! h-fit py-4 px-3"
				placeholder="Feedback Title"
				disabled={isReadOnly}
			/>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-2">
					<Button variant="outline" size="icon" onclick={() => (metadataOpen = true)} aria-label="Open feedback metadata">
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
									<Dialog.Title>Unarchive this feedback?</Dialog.Title>
									<Dialog.Description>
										This will make the feedback editable again.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants()}
										onclick={() => {
											isArchived = false;
											triggerSave();
										}}
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
									<Dialog.Title>Archive this feedback?</Dialog.Title>
									<Dialog.Description>
										Archived feedback is read-only and kept for history.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants()}
										onclick={() => {
											isArchived = true;
											triggerSave();
										}}
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
					<Button size="sm" onclick={triggerSave} disabled={!canEditFeedback || savePhase === "saving" || !isDirty}>
						{savePhase === "saving" ? "Saving..." : "Save changes"}
					</Button>
				</div>
			</div>
		</div>

		<Separator class="mt-2 px-2"></Separator>

		<div class="py-2 w-full flex flex-col gap-4">
			<section class="flex flex-col gap-3 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Linked Artifacts</span>
					<Separator></Separator>
				</div>
				<div class="grid gap-3">
					<div class="grid gap-3 md:grid-cols-3">
						<div class="flex flex-col gap-2 min-w-0">
							<Label class="text-muted-foreground" for="link-task">Link Task</Label>
							<div class="flex items-center gap-2 min-w-0">
								<div class="min-w-0 flex-1">
								<Select.Root type="single" bind:value={selectedTaskId}>
									<Select.Trigger class="w-full truncate" id="link-task">
										{selectedTaskId
											? taskOptions.find((item) => item.id === selectedTaskId)?.title
											: "Select task"}
									</Select.Trigger>
									<Select.Content>
										{#each taskOptions as task (task.id)}
											<Select.Item value={task.id} label={task.title}>
												{task.title}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								</div>
								<Button variant="outline" size="sm" onclick={addTask} disabled={!selectedTaskId}>
									Add
								</Button>
							</div>
						</div>
						<div class="flex flex-col gap-2 min-w-0">
							<Label class="text-muted-foreground" for="link-idea">Link Idea</Label>
							<div class="flex items-center gap-2 min-w-0">
								<div class="min-w-0 flex-1">
								<Select.Root type="single" bind:value={selectedIdeaId}>
									<Select.Trigger class="w-full truncate" id="link-idea">
										{selectedIdeaId
											? ideaOptions.find((item) => item.id === selectedIdeaId)?.title
											: "Select idea"}
									</Select.Trigger>
									<Select.Content>
										{#each ideaOptions as idea (idea.id)}
											<Select.Item value={idea.id} label={idea.title}>
												{idea.title}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								</div>
								<Button variant="outline" size="sm" onclick={addIdea} disabled={!selectedIdeaId}>
									Add
								</Button>
							</div>
						</div>
						<div class="flex flex-col gap-2 min-w-0">
							<Label class="text-muted-foreground" for="link-problem">Link Problem</Label>
							<div class="flex items-center gap-2 min-w-0">
								<div class="min-w-0 flex-1">
								<Select.Root type="single" bind:value={selectedProblemId}>
									<Select.Trigger class="w-full truncate" id="link-problem">
										{selectedProblemId
											? problemOptions.find((item) => item.id === selectedProblemId)?.title
											: "Select problem"}
									</Select.Trigger>
									<Select.Content>
										{#each problemOptions as problem (problem.id)}
											<Select.Item value={problem.id} label={problem.title}>
												{problem.title}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								</div>
								<Button
									variant="outline"
									size="sm"
									onclick={addProblem}
									disabled={!selectedProblemId}
								>
									Add
								</Button>
							</div>
						</div>
					</div>

					{#if linkedArtifacts.length === 0}
						<Alert.Root variant="destructive">
							<Alert.Title>No linked artifacts</Alert.Title>
							<Alert.Description>
								At least one artifact must be linked.
							</Alert.Description>
						</Alert.Root>
					{/if}

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
											onclick={() => removeArtifact(artifact.id)}
											disabled={linkedArtifacts.length <= 1}
										>
											Remove
										</Button>
									</div>
								</div>
								<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
									<div class="bg-accent px-2 py-1 rounded-lg text-xs font-medium">
										{artifact.phase}
									</div>
									{#if artifact.status === "Archived"}
										<div class="bg-muted px-2 py-1 rounded-lg text-xs">
											Archived
										</div>
									{/if}
								</div>
								{#if artifact.status === "Archived"}
									<Alert.Root class="border border-orange-200 bg-orange-50 text-orange-700">
										<Alert.Title>Linked artifact archived</Alert.Title>
										<Alert.Description>
											This reference is archived but kept for learning context.
										</Alert.Description>
									</Alert.Root>
								{/if}
							</div>
						{/each}
					</div>
					{#if linkedArtifacts.length <= 1}
						<div class="text-xs text-muted-foreground">
							At least one linked artifact is required.
						</div>
					{/if}
				</div>
			</section>

			<section class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Observation</span>
					<Separator></Separator>
				</div>
				<Textarea
					id="observation"
					placeholder="Capture exactly what happened without interpretation."
					bind:value={observation}
					disabled={isReadOnly}
					class="min-h-28 text-base md:text-lg font-medium"
				/>
			</section>

			<section class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Interpretation</span>
					<Separator></Separator>
				</div>
				<Textarea
					id="interpretation"
					placeholder="Explain what the observation means."
					bind:value={interpretation}
					disabled={isReadOnly}
					class="min-h-28 text-base md:text-lg font-medium"
				/>
			</section>

			<section class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Outcome</span>
					<Separator></Separator>
				</div>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<Badge class={statusBadgeClass(outcome)} variant="outline">
						{outcome}
					</Badge>
					<Dialog.Root bind:open={statusDialogOpen}>
						<Dialog.Trigger class={buttonVariants({ variant: "outline" })} disabled={isReadOnly}>
							Change Outcome
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Set outcome</Dialog.Title>
							</Dialog.Header>
							<div class="grid gap-2">
								{#each ["Validated", "Invalidated", "Needs Iteration"] as option (option)}
									<Button
										variant={outcome === option ? "default" : "outline"}
										onclick={() => requestOutcomeChange(option as OutcomeStatus)}
									>
										{option}
									</Button>
								{/each}
							</div>
							<div class="mt-3 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
								Outcome selection is required and can be updated at any time.
							</div>
						</Dialog.Content>
					</Dialog.Root>
				</div>
			</section>

			<section class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Add Section</span>
					<Separator></Separator>
				</div>
				<Dialog.Root bind:open={addSectionOpen}>
					<Dialog.Trigger class={buttonVariants({ variant: "outline" })} disabled={isReadOnly}>
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
										{moduleKey === "evidence" ? "Evidence" : "Next Steps"}
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
				<section class="flex flex-col gap-3 p-4 w-full bg-white rounded-lg">
					<div class="flex flex-row gap-2 items-center w-full">
						<span class="font-medium text-nowrap">Optional Modules</span>
						<Separator></Separator>
					</div>
					<div class="grid gap-3">
						{#if activeModules.includes("evidence")}
							<div class="group flex flex-col gap-3 rounded-lg border border-border px-4 py-3">
								<div class="flex items-center justify-between gap-3">
									<button
										type="button"
										class="flex items-center gap-2 text-left"
										onclick={() => toggleModule("evidence")}
									>
										<ChevronDown
											class={`h-4 w-4 transition-transform ${
												moduleOpen.evidence ? "rotate-180" : ""
											}`}
										/>
										<span class="text-sm font-medium">Evidence</span>
									</button>
									<div class="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onclick={() => {
												evidenceLocked = !evidenceLocked;
											}}
											disabled={isReadOnly}
										>
											{evidenceLocked ? "Unlock" : "Lock"}
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
											onclick={() => removeModule("evidence")}
											disabled={isReadOnly}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								</div>
								{#if moduleOpen.evidence}
									<Textarea
										placeholder="Add quotes, data points, links, or attachments."
										bind:value={evidenceText}
										disabled={isReadOnly || evidenceLocked}
									/>
									{#if evidenceLocked}
										<div class="text-xs text-muted-foreground">
											Evidence is read-only by default. Unlock to edit.
										</div>
									{/if}
								{/if}
							</div>
						{/if}

						{#if activeModules.includes("nextSteps")}
							<div class="group flex flex-col gap-3 rounded-lg border border-border px-4 py-3">
								<div class="flex items-center justify-between gap-3">
									<button
										type="button"
										class="flex items-center gap-2 text-left"
										onclick={() => toggleModule("nextSteps")}
									>
										<ChevronDown
											class={`h-4 w-4 transition-transform ${
												moduleOpen.nextSteps ? "rotate-180" : ""
											}`}
										/>
										<span class="text-sm font-medium">Next Steps</span>
									</button>
									<Button
										variant="ghost"
										size="icon"
										class="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
										onclick={() => removeModule("nextSteps")}
										disabled={isReadOnly}
									>
										<X class="h-4 w-4" />
									</Button>
								</div>
								{#if moduleOpen.nextSteps}
									<Textarea
										placeholder="Capture advisory next steps. No task creation here."
										bind:value={nextStepsText}
										disabled={isReadOnly}
									/>
								{/if}
							</div>
						{/if}
					</div>
				</section>
			{/if}

			<section class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Notes</span>
					<Separator></Separator>
				</div>
				<Textarea
					id="feedback-notes"
					placeholder="Additional notes"
					bind:value={notesText}
					disabled={isReadOnly}
				/>
			</section>
		</div>
	</div>
</div>


<Dialog.Root bind:open={metadataOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Artifact Metadata</Dialog.Title>
			<Dialog.Description>Read-only metadata for this feedback artifact.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-2 text-sm">
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Created by</span><span>{data.metadata?.createdBy ?? data.metadata?.owner ?? "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Created at</span><span>{data.metadata?.createdAt ?? data.metadata?.createdDate ?? "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Last edited by</span><span>{data.metadata?.lastEditedBy ?? data.metadata?.owner ?? "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Last edited at</span><span>{data.metadata?.lastEditedAt ?? data.metadata?.lastUpdated ?? "Unknown"}</span></div>
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
			<Dialog.Title>Confirm outcome change</Dialog.Title>
			<Dialog.Description>
				Outcome changes will propagate as learning signals upstream.
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-lg border border-border px-3 py-2 text-sm">
			New outcome: {pendingOutcome ?? "None"}
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })} disabled={statusMutationPending}>
				Cancel
			</Dialog.Close>
			<Button onclick={confirmOutcomeChange} disabled={statusMutationPending}>
				{statusMutationPending ? "Saving..." : "Confirm outcome"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
{/key}
