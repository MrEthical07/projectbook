<script lang="ts">
	import { invalidate } from "$app/navigation";
	import { page } from "$app/state";
	import { lockProblem, updateProblem, updateProblemStatus } from "$lib/remote/problem.remote";
	import { can } from "$lib/utils/permission";
	import { getContext, onDestroy, untrack } from "svelte";
	import { toast } from "svelte-sonner";
	import * as Alert from "$lib/components/ui/alert";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Textarea } from "$lib/components/ui/textarea";
	import { Check, CircleX, ExternalLink, Info, X } from "@lucide/svelte";

	type ProblemStatus = "Draft" | "Locked" | "Archived";

	type LinkedSource = {
		id: string;
		title: string;
		type: "User Story" | "User Journey";
		phase: "Empathize";
		href: string;
	};

	type SourceOption = {
		id: string;
		title: string;
		phase: "Empathize";
		href: string;
	};

	type SourcePainPoint = {
		id: string;
		text: string;
		sourceLabel: string;
	};

	type SourceInsight = {
		personas: Array<{ name: string; description: string }>;
		context: string;
		painPoints: Array<{ text: string; sourceLabel: string }>;
		journeyPainPoints: Array<{ text: string; journeyName: string; stageName: string }>;
	};

	type OptionalModuleKey = "why" | "constraints" | "success" | "assumptions";

	let { data } = $props();
	const required = <T>(value: T | null | undefined, field: string): T => {
		if (value === undefined || value === null) {
			throw new Error(`Problem payload is missing '${field}'.`);
		}
		return value;
	};
	let projectId = $derived(page.params.projectId);
	const routeParams = page.params as Record<string, string | undefined>;
	let problemId = $derived(routeParams.problemId ?? "");
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canEditProblem = can(permissions, "problem", "edit");
	const canChangeProblemStatus = can(permissions, "problem", "statusChange");
	const statusOptions: ProblemStatus[] = ["Draft", "Locked", "Archived"];

	let storyOptions = $state<SourceOption[]>([]);
	let journeyOptions = $state<SourceOption[]>([]);
	let linkedSources = $state<LinkedSource[]>([]);
	let sourcePainPoints = $state<SourcePainPoint[]>([]);
	let sourceInsights = $state<SourceInsight>({
		personas: [],
		context: "",
		painPoints: [],
		journeyPainPoints: []
	});

	const optionalModules: {
		key: OptionalModuleKey;
		title: string;
		description: string;
		placeholder: string;
	}[] = [
		{
			key: "why",
			title: "Why This Matters",
			description: "Clarify the human or business impact without metrics.",
			placeholder: "Explain why this problem needs to be solved now.",
		},
		{
			key: "constraints",
			title: "Constraints",
			description: "Call out boundaries, exclusions, or non-negotiables.",
			placeholder: "List scope limits, policy constraints, or dependencies.",
		},
		{
			key: "success",
			title: "Success Criteria",
			description: "Qualitative signals that the problem is improving.",
			placeholder: "Describe behaviors or outcomes you want to see.",
		},
		{
			key: "assumptions",
			title: "Assumptions",
			description: "State beliefs that still need validation.",
			placeholder: "List risky assumptions tied to this problem.",
		},
	];

	let status = $state<ProblemStatus>("Draft");
	let title = $state("");
	let finalStatement = $state("");
	let orphanAcknowledged = $state(false);
	let selectedPainPoints = $state<string[]>([]);
	let customPainPoints = $state<string[]>([]);
	let newCustomPainPoint = $state("");
	let addSectionOpen = $state(false);
	let linkStoryOpen = $state(false);
	let linkJourneyOpen = $state(false);
	let archiveOpen = $state(false);
	let unarchiveOpen = $state(false);
	let removeSourceOpen = $state(false);
	let statusConfirmOpen = $state(false);
	let pendingStatus = $state<ProblemStatus | null>(null);
	let statusMutationPending = $state(false);
	let sourceToRemove = $state<LinkedSource | null>(null);
	let selectedStoryId = $state("");
	let selectedJourneyId = $state("");
	let activeModules = $state<OptionalModuleKey[]>(["why"]);
	let moduleContent = $state<Record<OptionalModuleKey, string>>({
		why: "",
		constraints: "",
		success: "",
		assumptions: ""
	});
	let notesText = $state("");
	let metadataOpen = $state(false);
	type SavePhase = "idle" | "saving" | "saved";
	let savePhase = $state<SavePhase>("idle");
	let savedSignature = $state("");
	let saveReady = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;
	let linkMutationPending = $state(false);

	const isDraft = (currentStatus: ProblemStatus) => currentStatus === "Draft";
	let isLocked = $derived(status === "Locked" || status === "Archived");
	let isNotEditable = $derived(isLocked || !canEditProblem);
	let selectedSourcePainPoints = $derived.by(() => {
		const sourcePointIds = new Set(sourcePainPoints.map((point) => point.id));
		return selectedPainPoints.filter((id) => sourcePointIds.has(id));
	});

	let suggestedTitle = $derived(
		isDraft(status) && !title ? finalStatement : title
	);
	let currentSignature = $derived(
		JSON.stringify({
			title,
			finalStatement,
			orphanAcknowledged,
			selectedPainPoints: selectedSourcePainPoints,
			customPainPoints,
			linkedSources: linkedSources.map((source) => ({
				id: source.id,
				type: source.type,
			})),
			activeModules,
			moduleContent,
			notesText,
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

	const statusVariant = (currentStatus: ProblemStatus) => {
		if (currentStatus === "Locked") {
			return "secondary";
		}

		if (currentStatus === "Archived") {
			return "destructive";
		}

		return "default";
	};

	const togglePainPoint = (id: string) => {
		if (selectedPainPoints.includes(id)) {
			selectedPainPoints = selectedPainPoints.filter((pointId) => pointId !== id);
			return;
		}

		selectedPainPoints = [...selectedPainPoints, id];
	};

	const canLock = () => {
		const hasSources = linkedSources.length > 0;
		const hasPainPoints = selectedSourcePainPoints.length > 0 || customPainPoints.length > 0;
		const hasStatement = Boolean(finalStatement.trim());
		const hasOrphanApproval = hasSources || orphanAcknowledged;

		return hasPainPoints && hasStatement && hasOrphanApproval;
	};

	const addCustomPainPoint = () => {
		const text = newCustomPainPoint.trim();
		if (!text || customPainPoints.includes(text)) {
			return;
		}
		customPainPoints = [...customPainPoints, text];
		newCustomPainPoint = "";
	};

	const removeCustomPainPoint = (text: string) => {
		customPainPoints = customPainPoints.filter((item) => item !== text);
	};

	const buildProblemState = (nextLinkedSources: LinkedSource[] = linkedSources) => ({
		title,
		finalStatement,
		orphanAcknowledged,
		selectedPainPoints: selectedSourcePainPoints,
		customPainPoints,
		linkedSources: nextLinkedSources,
		activeModules,
		moduleContent,
		notesText
	});

	const setSavedBadge = () => {
		if (savedBadgeTimer) {
			clearTimeout(savedBadgeTimer);
		}
		savePhase = "saved";
		savedBadgeTimer = setTimeout(() => {
			if (!isDirty) {
				savePhase = "idle";
			}
		}, 1400);
	};

	const persistLinkedSources = async (nextLinkedSources: LinkedSource[]): Promise<boolean> => {
		if (!permissions || !canEditProblem || linkMutationPending) {
			return false;
		}

		if (savedBadgeTimer) {
			clearTimeout(savedBadgeTimer);
		}

		linkMutationPending = true;
		savePhase = "saving";
		try {
			const result = await updateProblem({
				input: {
					projectId,
					problemId,
					state: buildProblemState(nextLinkedSources)
				}
			});

			if (!result.success) {
				savePhase = "idle";
				toast.error("error" in result ? result.error : "Unable to update linked sources.");
				return false;
			}

			linkedSources = nextLinkedSources;
			savedSignature = currentSignature;
			await invalidate((url) => url.pathname === page.url.pathname);
			setSavedBadge();
			return true;
		} finally {
			linkMutationPending = false;
		}
	};

	const canSelectStatusOption = (nextStatus: ProblemStatus): boolean => {
		if (status === "Locked") {
			return nextStatus === "Archived";
		}
		if (status === "Archived") {
			return nextStatus === "Draft";
		}
		return true;
	};

	const confirmLock = async (): Promise<boolean> => {
		if (!permissions || !canChangeProblemStatus || statusMutationPending) return false;

		statusMutationPending = true;
		try {
			const result = await lockProblem({
				input: {
					projectId,
					problemId
				}
			});
			if (!result.success) {
				toast.error("error" in result ? result.error : "Lock failed.");
				return false;
			}

			status = "Locked";
			pendingStatus = null;
			statusConfirmOpen = false;
			toast.success("Problem statement locked");
			await invalidate((url) => url.pathname === page.url.pathname);
			return true;
		} finally {
			statusMutationPending = false;
		}
	};

let availableStoryOptions = $derived.by(() =>
	storyOptions.filter((story) => !linkedSources.some((source) => source.id === story.id))
);
let availableJourneyOptions = $derived.by(() =>
	journeyOptions.filter((journey) => !linkedSources.some((source) => source.id === journey.id))
);

	const requestStatusChange = (nextStatus: ProblemStatus) => {
		if (!canSelectStatusOption(nextStatus)) return;
		if (nextStatus === status) return;
		pendingStatus = nextStatus;
		statusConfirmOpen = true;
	};

	const confirmStatusChange = async () => {
		if (!pendingStatus) {
			return;
		}
		if (!permissions || !canChangeProblemStatus) {
			return;
		}

		const targetStatus = pendingStatus;
		if (targetStatus === "Locked" && !canLock()) {
			return;
		}

		if (targetStatus === "Locked") {
			await confirmLock();
			return;
		}

		if (statusMutationPending) {
			return;
		}

		statusMutationPending = true;
		try {
				const result = await updateProblemStatus({
					input: {
						projectId,
						problemId,
						status: targetStatus
					}
				});
			if (!result.success) {
				toast.error("error" in result ? result.error : "Status change failed.");
				return;
			}
			status = targetStatus;
			await invalidate((url) => url.pathname === page.url.pathname);

			pendingStatus = null;
			statusConfirmOpen = false;
		} finally {
			statusMutationPending = false;
		}
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

	const requestRemoveSource = (source: LinkedSource) => {
		sourceToRemove = source;
		removeSourceOpen = true;
	};

	const confirmRemoveSource = async () => {
		if (!sourceToRemove) {
			return;
		}

		const nextLinkedSources = linkedSources.filter((source) => source.id !== sourceToRemove?.id);
		const updated = await persistLinkedSources(nextLinkedSources);
		if (!updated) {
			return;
		}

		sourceToRemove = null;
		removeSourceOpen = false;
	};

	const linkStory = async () => {
		const selected = storyOptions.find((story) => story.id === selectedStoryId);
		if (!selected) {
			return;
		}

		if (linkedSources.some((source) => source.id === selected.id)) {
			selectedStoryId = "";
			linkStoryOpen = false;
			return;
		}

		const updated = await persistLinkedSources([
			...linkedSources,
			{ ...selected, type: "User Story" }
		]);
		if (!updated) {
			return;
		}

		selectedStoryId = "";
		linkStoryOpen = false;
	};

	const linkJourney = async () => {
		const selected = journeyOptions.find((journey) => journey.id === selectedJourneyId);
		if (!selected) {
			return;
		}

		if (linkedSources.some((source) => source.id === selected.id)) {
			selectedJourneyId = "";
			linkJourneyOpen = false;
			return;
		}

		const updated = await persistLinkedSources([
			...linkedSources,
			{ ...selected, type: "User Journey" }
		]);
		if (!updated) {
			return;
		}

		selectedJourneyId = "";
		linkJourneyOpen = false;
	};

	const triggerSave = async () => {
		if (!permissions || !canEditProblem) return;
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
		const result = await updateProblem({
			input: {
				projectId,
				problemId,
				state: buildProblemState()
			}
});
		if (!result.success) {
			savePhase = "idle";
			toast.error("error" in result ? result.error : "Save failed.");
			return;
		}
		savedSignature = currentSignature;
		toast.success("Changes saved");
		await invalidate((url) => url.pathname === page.url.pathname);
		setSavedBadge();
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
		const problemData = d.problem;
		const resolvedModuleContent = d.moduleContent as Record<OptionalModuleKey, string> | undefined;

		storyOptions = structuredClone(d.storyOptions) as SourceOption[];
		journeyOptions = structuredClone(d.journeyOptions) as SourceOption[];

		linkedSources = Array.isArray(d.linkedSources)
			? (structuredClone(d.linkedSources) as LinkedSource[])
			: [];
		sourcePainPoints = structuredClone(d.sourcePainPoints) as SourcePainPoint[];
		sourceInsights = (d.sourceInsights as SourceInsight) ?? {
			personas: [],
			context: "",
			painPoints: [],
			journeyPainPoints: []
		};

		status = problemData.status as ProblemStatus;
		title = required(problemData.title, "problem.title");
		finalStatement = problemData.finalStatement ?? problemData.title ?? "";
		orphanAcknowledged = false;
		selectedPainPoints = Array.isArray(d.selectedPainPoints)
			? (structuredClone(d.selectedPainPoints) as string[])
			: [];
		customPainPoints = Array.isArray(d.customPainPoints)
			? (structuredClone(d.customPainPoints) as string[])
			: [];
		activeModules = Array.isArray(d.activeModules) && d.activeModules.length > 0
			? (structuredClone(d.activeModules) as OptionalModuleKey[])
			: ["why"];
		moduleContent = {
			why: resolvedModuleContent?.why ?? "",
			constraints: resolvedModuleContent?.constraints ?? "",
			success: resolvedModuleContent?.success ?? "",
			assumptions: resolvedModuleContent?.assumptions ?? ""
		};
		notesText = required(d.notesText, "notesText");

		savePhase = "idle";
		pendingStatus = null;
		statusConfirmOpen = false;
		statusMutationPending = false;
		linkMutationPending = false;
		selectedStoryId = "";
		selectedJourneyId = "";
		newCustomPainPoint = "";

		savedSignature = JSON.stringify({
			title,
			finalStatement,
			orphanAcknowledged,
			selectedPainPoints: selectedSourcePainPoints,
			customPainPoints,
			linkedSources: linkedSources.map((source) => ({
				id: source.id,
				type: source.type,
			})),
			activeModules,
			moduleContent,
			notesText,
		});
		saveReady = true;
	});
});
</script>

<svelte:head>
	<title>{finalStatement || title || "Problem Statement"} • Problem Statements • ProjectBook</title>
	<meta
		name="description"
		content="View and refine this problem statement with linked evidence and context."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

{#key problemId}
<div class="flex flex-col gap-2 p-2 bg-white border rounded-lg">
	<header
		class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="../problem-statement">Problem Statements</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{suggestedTitle || "New Problem Statement"}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col md:px-20 gap-4 py-2">
		<div class="flex mt-2 flex-col bg-white rounded-lg gap-2 p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				Problem Statement - Define
			</div>
			<Input
				type="text"
				value={suggestedTitle}
				class="bg-transparent outline-0 shadow-none border-0 text-4xl! h-fit py-4 px-3"
				placeholder="Problem Statement Title"
				disabled={isNotEditable}
				oninput={(event) => {
					title = event.currentTarget.value;
				}}
			/>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-2">
					<Button variant="outline" size="icon" onclick={() => (metadataOpen = true)} aria-label="Open problem metadata">
						<Info class="h-4 w-4" />
					</Button>
					<Badge variant={statusVariant(status)}>{status}</Badge>
					{#if linkedSources.length === 0}
						<Badge variant="destructive">Orphan</Badge>
					{/if}
					{#if status === "Archived"}
						<Dialog.Root bind:open={unarchiveOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })}>
								Unarchive
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Unarchive this problem statement?</Dialog.Title>
									<Dialog.Description>
										This will make the problem statement editable again.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants()}
										onclick={() => requestStatusChange("Draft")}
										disabled={!canChangeProblemStatus || statusMutationPending}
									>
										Unarchive
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					{:else}
						<Dialog.Root bind:open={archiveOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })}>
								Archive
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Archive this problem statement?</Dialog.Title>
									<Dialog.Description>
										Archived problems are read-only and kept for history.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants()}
										onclick={() => requestStatusChange("Archived")}
										disabled={!canChangeProblemStatus || statusMutationPending}
									>
										Archive
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					{/if}
					<Button variant="ghost" size="sm">Change history</Button>
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
						disabled={!canEditProblem || savePhase === "saving" || !isDirty}
					>
						{savePhase === "saving" ? "Saving..." : "Save changes"}
					</Button>
				</div>
			</div>
		</div>

		<Separator class="mt-2 px-2"></Separator>

		<div class="py-2 w-full flex flex-col gap-4">
			<section class="flex flex-col gap-3 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Linked Sources</span>
					<Separator></Separator>
					<div class="flex gap-2">
						<Dialog.Root bind:open={linkStoryOpen}>
							<Dialog.Trigger class={buttonVariants({ size: "sm" })} disabled={isNotEditable || linkMutationPending}>
								+ Link User Story
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Link a user story</Dialog.Title>
									<Dialog.Description>
										Choose a user story to connect to this problem statement.
									</Dialog.Description>
								</Dialog.Header>
								<div class="grid gap-2">
									<Label for="link-story">User Story</Label>
									{#if availableStoryOptions.length === 0}
										<div class="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
											No user stories available to link.
										</div>
									{:else}
									<Select.Root type="single" bind:value={selectedStoryId}>
										<Select.Trigger id="link-story">
											{selectedStoryId
												? availableStoryOptions.find((story) => story.id === selectedStoryId)?.title ?? storyOptions.find((story) => story.id === selectedStoryId)?.title
												: "Select a story"}
										</Select.Trigger>
										<Select.Content>
											{#each availableStoryOptions as story (story.id)}
												<Select.Item value={story.id} label={story.title}>
													{story.title}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
									{/if}
								</div>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Button class={buttonVariants()} onclick={linkStory} disabled={!selectedStoryId || linkMutationPending}>
										{linkMutationPending ? "Linking..." : "Link story"}
									</Button>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
						<Dialog.Root bind:open={linkJourneyOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })} disabled={isNotEditable || linkMutationPending}>
								+ Link User Journey
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Link a user journey</Dialog.Title>
									<Dialog.Description>
										Choose a user journey to connect to this problem statement.
									</Dialog.Description>
								</Dialog.Header>
								<div class="grid gap-2">
									<Label for="link-journey">User Journey</Label>
									{#if availableJourneyOptions.length === 0}
										<div class="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
											No user journeys available to link.
										</div>
									{:else}
									<Select.Root type="single" bind:value={selectedJourneyId}>
										<Select.Trigger id="link-journey">
											{selectedJourneyId
												? availableJourneyOptions.find((journey) => journey.id === selectedJourneyId)?.title ?? journeyOptions.find((journey) => journey.id === selectedJourneyId)?.title
												: "Select a journey"}
										</Select.Trigger>
										<Select.Content>
											{#each availableJourneyOptions as journey (journey.id)}
												<Select.Item value={journey.id} label={journey.title}>
													{journey.title}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
									{/if}
								</div>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Button class={buttonVariants()} onclick={linkJourney} disabled={!selectedJourneyId || linkMutationPending}>
										{linkMutationPending ? "Linking..." : "Link journey"}
									</Button>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					</div>
				</div>
				{#if linkedSources.length === 0}
					<Alert.Root variant="destructive">
						<Alert.Title>Orphan problem statement</Alert.Title>
						<Alert.Description>
							This problem is not connected to any empathy artifact.
						</Alert.Description>
					</Alert.Root>
				{/if}
				<div class="grid gap-3">
					{#each linkedSources as source (source.id)}
						<div class="flex flex-col gap-3 rounded-lg border border-border p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="flex flex-col gap-1">
									<span class="text-sm font-medium text-foreground">{source.title}</span>
									<span class="text-xs text-muted-foreground">{source.type}</span>
								</div>
								<div class="flex items-center gap-2">
									<Button
										variant="ghost"
										size="sm"
										class="h-8 w-8 p-0"
										href={source.href}
										aria-label={`Open ${source.type.toLowerCase()}`}
									>
										<ExternalLink class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										class="h-7 px-2 text-destructive hover:text-destructive"
										onclick={() => requestRemoveSource(source)}
										disabled={isNotEditable || linkMutationPending}
									>
										Remove
									</Button>
								</div>
							</div>
							<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
								<Badge variant="secondary">{source.phase}</Badge>
								<span>{source.type}</span>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<section class="flex flex-col gap-3 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Source Insights</span>
					<Separator></Separator>
				</div>
				{#if sourceInsights.personas.length === 0 && !sourceInsights.context && sourceInsights.painPoints.length === 0 && sourceInsights.journeyPainPoints.length === 0}
					<div class="text-sm text-muted-foreground">No insights available. Link sources to generate insights.</div>
				{:else}
					<div class="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
						{#if sourceInsights.personas.length > 0}
							<div>
								<div class="text-xs font-semibold uppercase text-muted-foreground">Persona</div>
								{#each sourceInsights.personas as persona}
									<div class="mt-2 text-sm text-foreground">{persona.name}</div>
									{#if persona.description}
										<div class="mt-1 text-xs">{persona.description}</div>
									{/if}
								{/each}
							</div>
						{/if}
						{#if sourceInsights.context}
							<div>
								<div class="text-xs font-semibold uppercase text-muted-foreground">Context</div>
								<div class="mt-2 text-sm text-foreground">{sourceInsights.context}</div>
							</div>
						{/if}
						{#if sourceInsights.painPoints.length > 0}
							<div>
								<div class="text-xs font-semibold uppercase text-muted-foreground">Pain Points</div>
								<ul class="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">
									{#each sourceInsights.painPoints as point}
										<li>{point.text} <span class="text-xs text-muted-foreground">({point.sourceLabel})</span></li>
									{/each}
								</ul>
							</div>
						{/if}
						{#if sourceInsights.journeyPainPoints.length > 0}
							<div>
								<div class="text-xs font-semibold uppercase text-muted-foreground">Journey Pain Points</div>
								<ul class="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">
									{#each sourceInsights.journeyPainPoints as point}
										<li>{point.text} <span class="text-xs text-muted-foreground">({point.journeyName} / {point.stageName})</span></li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				{/if}
			</section>

			<section class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Source Pain Points</span>
					<Separator></Separator>
				</div>
				<div class="grid gap-3">
					{#if sourcePainPoints.length === 0}
						<div class="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
							No source-derived pain points yet. Link an empathy artifact to pull in evidence.
						</div>
					{:else}
						{#each sourcePainPoints as painPoint (painPoint.id)}
							<div class="flex items-start gap-3 rounded-lg border border-border px-4 py-3">
								<Checkbox
									checked={selectedPainPoints.includes(painPoint.id)}
									onclick={() => togglePainPoint(painPoint.id)}
									disabled={isNotEditable}
								/>
								<div class="flex flex-col gap-1">
									<div class="text-sm font-medium text-foreground">{painPoint.text}</div>
									<div class="text-xs text-muted-foreground">{painPoint.sourceLabel}</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>
				{#if linkedSources.length === 0}
					<Separator />
					<div class="grid gap-3">
						<div class="text-sm font-medium text-foreground">Custom Pain Points</div>
						<div class="flex flex-col gap-2 sm:flex-row">
							<Input
								id="custom-pain-point"
								placeholder="Describe a pain point observed outside linked sources"
								bind:value={newCustomPainPoint}
								disabled={isNotEditable}
								onkeydown={(event) => {
									if (event.key === "Enter") {
										event.preventDefault();
										addCustomPainPoint();
									}
								}}
							/>
							<Button
								variant="outline"
								onclick={addCustomPainPoint}
								disabled={!newCustomPainPoint.trim() || isNotEditable}
							>
								Add pain point
							</Button>
						</div>
						{#if customPainPoints.length === 0}
							<div class="text-xs text-muted-foreground">
								Add at least one custom pain point to support locking without linked sources.
							</div>
						{:else}
							<div class="grid gap-2">
								{#each customPainPoints as customPoint (customPoint)}
									<div class="flex items-center justify-between rounded-lg border border-border px-3 py-2">
										<span class="text-sm text-foreground">{customPoint}</span>
										<Button
											variant="ghost"
											size="icon"
											class="h-7 w-7 text-destructive hover:text-destructive"
											onclick={() => removeCustomPainPoint(customPoint)}
											disabled={isNotEditable}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</section>

			<section class="flex flex-col gap-3 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Final Problem Statement</span>
					<Separator></Separator>
				</div>
				<Textarea
					id="final-problem"
					placeholder="[User] needs a way to [need] because [insight]."
					bind:value={finalStatement}
					disabled={isNotEditable}
					class="min-h-28 text-base md:text-lg font-medium"
				/>
			</section>

			<section class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Status &amp; Locking</span>
					<Separator></Separator>
				</div>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						Current status
						<Badge variant={statusVariant(status)}>{status}</Badge>
					</div>
					<div class="flex items-center gap-2">
						{#each statusOptions as option (option)}
							<Button
								variant={status === option ? "default" : "outline"}
								onclick={() => requestStatusChange(option)}
								disabled={!canChangeProblemStatus || !canSelectStatusOption(option) || statusMutationPending}
							>
								{statusMutationPending && pendingStatus === option ? "Changing..." : option}
							</Button>
						{/each}
					</div>
				</div>
				<Separator />
				<div class="flex flex-col gap-2 text-sm text-muted-foreground">
					<span>Locking freezes the statement and references. Unlocking is not supported.</span>
					{#if linkedSources.length === 0}
						<div class="flex items-center gap-2">
							<Checkbox bind:checked={orphanAcknowledged} />
							<span class="text-xs text-muted-foreground">
								I understand this problem has no linked sources.
							</span>
						</div>
					{/if}
					<Dialog.Root>
					<Dialog.Trigger
						class={buttonVariants()}
						disabled={!isDraft(status) || !canChangeProblemStatus || statusMutationPending}
					>
						Lock Problem Statement
					</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Lock this problem statement?</Dialog.Title>
								<Dialog.Description>
									Locking will freeze the definition. This cannot be undone.
								</Dialog.Description>
							</Dialog.Header>
							<div class="grid gap-3 text-sm">
								<p class="text-xs font-semibold uppercase text-muted-foreground">Requirements to lock</p>
								<div class="flex items-center gap-2">
									{#if linkedSources.length > 0 || orphanAcknowledged}
										<Check class="h-4 w-4 text-emerald-600 shrink-0" />
										<span class="text-foreground">Linked sources or orphan acknowledgment</span>
									{:else}
										<CircleX class="h-4 w-4 text-red-500 shrink-0" />
										<span class="text-muted-foreground">Link at least one source, or acknowledge this is an orphan problem</span>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									{#if selectedSourcePainPoints.length > 0 || customPainPoints.length > 0}
										<Check class="h-4 w-4 text-emerald-600 shrink-0" />
										<span class="text-foreground">
											Pain points captured ({selectedSourcePainPoints.length + customPainPoints.length})
										</span>
									{:else}
										<CircleX class="h-4 w-4 text-red-500 shrink-0" />
										<span class="text-muted-foreground">Select a source pain point or add a custom pain point</span>
									{/if}
								</div>
								<div class="flex items-center gap-2">
									{#if finalStatement.trim()}
										<Check class="h-4 w-4 text-emerald-600 shrink-0" />
										<span class="text-foreground">Final problem statement written</span>
									{:else}
										<CircleX class="h-4 w-4 text-red-500 shrink-0" />
										<span class="text-muted-foreground">Write a final problem statement before locking</span>
									{/if}
								</div>
							</div>
							<Dialog.Footer>
								<Dialog.Close class={buttonVariants({ variant: "outline" })}>
									Cancel
								</Dialog.Close>
								<Button
									disabled={!canLock() || statusMutationPending}
									onclick={confirmLock}
								>
									{statusMutationPending ? "Locking..." : "Confirm Lock"}
								</Button>
							</Dialog.Footer>
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
					<Dialog.Trigger class={buttonVariants({ variant: "outline" })} disabled={isNotEditable}>
						+ Add Section
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Add optional module</Dialog.Title>
							<Dialog.Description>
								Choose extra context to capture without changing the main statement.
							</Dialog.Description>
						</Dialog.Header>
						<div class="grid gap-3">
							{#each optionalModules as module (module.key)}
								<div class="border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-3">
									<div>
										<div class="text-sm font-medium">{module.title}</div>
										<div class="text-xs text-muted-foreground">
											{module.description}
										</div>
									</div>
									<Button
										variant="outline"
										size="sm"
										onclick={() => addModule(module.key)}
										disabled={activeModules.includes(module.key)}
									>
										{activeModules.includes(module.key) ? "Added" : "Add"}
									</Button>
								</div>
							{/each}
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</section>

			{#if activeModules.length > 0}
				<section class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
					<div class="flex flex-row gap-2 items-center w-full">
						<span class="font-medium text-nowrap">Optional Modules</span>
						<Separator></Separator>
					</div>
					<div class="grid gap-3">
						{#each optionalModules as module (module.key)}
							{#if activeModules.includes(module.key)}
								<div class="group flex flex-col gap-3 rounded-lg border border-border px-4 py-3">
									<div class="group flex items-start justify-between gap-3">
										<div class="flex flex-col gap-1">
											<span class="text-sm font-medium">{module.title}</span>
											<span class="text-xs text-muted-foreground">
												{module.description}
											</span>
										</div>
										<Button
											variant="ghost"
											size="icon"
											class="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
											onclick={() => removeModule(module.key)}
											disabled={isNotEditable}
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
									<Textarea
										placeholder={module.placeholder}
										bind:value={moduleContent[module.key]}
										disabled={isNotEditable}
									/>
								</div>
							{/if}
						{/each}
					</div>
				</section>
			{/if}

			<section class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Additional Notes</span>
					<Separator></Separator>
				</div>
				<Textarea
					placeholder="Additional notes"
					bind:value={notesText}
					disabled={isNotEditable}
				/>
			</section>
		</div>
	</div>
</div>


<Dialog.Root bind:open={metadataOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Artifact Metadata</Dialog.Title>
			<Dialog.Description>Read-only metadata for this problem statement.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-2 text-sm">
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Created by</span><span>{data.metadata?.createdBy ?? data.metadata?.owner ?? "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Created at</span><span>{data.metadata?.createdAt ?? "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Last edited by</span><span>{data.metadata?.lastEditedBy ?? data.metadata?.owner ?? "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Last edited at</span><span>{data.metadata?.lastEditedAt ?? data.metadata?.lastUpdated ?? "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Status</span><span>{status}</span></div>
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Close</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={removeSourceOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Remove linked source?</Dialog.Title>
			<Dialog.Description>
				This will detach the source from the problem statement.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>
				Cancel
			</Dialog.Close>
			<Button class={buttonVariants()} onclick={confirmRemoveSource} disabled={linkMutationPending}>
				{linkMutationPending ? "Removing..." : "Remove"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={statusConfirmOpen} onOpenChange={(open) => { statusConfirmOpen = open; if (!open) pendingStatus = null; }}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Confirm status change</Dialog.Title>
			<Dialog.Description>
				{#if pendingStatus === "Locked"}
					Locking makes this problem statement read-only and cannot be undone.
				{:else if pendingStatus === "Archived"}
					Archiving hides this problem statement from active work. You can unarchive later.
				{:else if pendingStatus === "Draft"}
					Moving back to Draft will reopen the statement for edits.
				{:else}
					Confirm the status change.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })} disabled={statusMutationPending}>
				Cancel
			</Dialog.Close>
			<Button
				disabled={!canChangeProblemStatus || (pendingStatus === "Locked" && !canLock()) || statusMutationPending}
				onclick={confirmStatusChange}
			>
				{statusMutationPending ? "Saving..." : "Confirm"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
{/key}
