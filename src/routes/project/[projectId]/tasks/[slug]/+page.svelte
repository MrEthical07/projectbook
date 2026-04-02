<script lang="ts">
	import * as Alert from "$lib/components/ui/alert";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import { Calendar } from "$lib/components/ui/calendar";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Popover from "$lib/components/ui/popover";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Textarea } from "$lib/components/ui/textarea";
	import {
		DateFormatter,
		getLocalTimeZone,
		parseDate,
		today,
		type CalendarDate
	} from "@internationalized/date";
	import { Calendar as CalendarIcon, ExternalLink, GripVertical, Info, Plus, X } from "@lucide/svelte";
	import { updateTask as updateTaskRemote, updateTaskStatus as updateTaskStatusRemote } from "$lib/remote/task.remote";
	import { can } from "$lib/utils/permission";
	import { page } from "$app/state";
	import { getContext, onDestroy, untrack } from "svelte";
	import { toast } from "svelte-sonner";

	let { data } = $props();
	const required = <T>(value: T | null | undefined, field: string): T => {
		if (value === undefined || value === null) {
			throw new Error(`Task payload is missing '${field}'.`);
		}
		return value;
	};
	let projectId = $derived(page.params.projectId);
	let taskId = $derived(page.params.slug);
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canChangeTaskStatus = can(permissions, "task", "statusChange");
	const canEditTask = can(permissions, "task", "edit");

	type TaskStatus = "Planned" | "In Progress" | "Completed" | "Abandoned" | "Blocked";
	type OptionalModuleKey = "plan" | "execution";

	type LinkedProblem = {
		id: string;
		title: string;
		phase: "Define";
		href: string;
		status: "Locked" | "Archived";
	};

	type LinkedContext = {
		type: "Persona" | "User Journey";
		title: string;
		detail: string;
		phase: "Empathize";
		href: string;
		status: "Active" | "Archived";
	};

	type LinkedIdea = {
		id: string;
		title: string;
		phase: "Ideate";
		href: string;
		status: "Active" | "Rejected";
		problem: LinkedProblem;
		context: LinkedContext;
	};

	type AssigneeOption = {
		id: string;
		name: string;
		role: string;
	};

	const statusOptions: TaskStatus[] = ["Planned", "In Progress", "Blocked", "Completed", "Abandoned"];

	let assigneeOptions = $state<AssigneeOption[]>([]);
	let ideaOptions = $state<LinkedIdea[]>([]);

	const moduleDetails: Record<OptionalModuleKey, { title: string; placeholder?: string }> = {
		plan: {
			title: "Task Plan",
			placeholder:
				"What will we do? Who will be involved? What will we create? How long will it take?",
		},
		execution: {
			title: "Execution Meta",
			placeholder: "Add links to external resources, docs, or prototypes.",
		},
	};

	const optionalModules: OptionalModuleKey[] = ["plan", "execution"];

	let status = $state<TaskStatus>("Planned");
	let title = $state("");
	let assignedToId = $state("");
	let deadlineDate = $state<CalendarDate | undefined>(undefined);
	let hypothesis = $state("");
	let addSectionOpen = $state(false);
	let statusDialogOpen = $state(false);
	let metadataOpen = $state(false);
	let selectedIdeaId = $state("");

	let selectedIdea = $derived(
		ideaOptions.find((idea) => idea.id === selectedIdeaId) ?? null
	);
	let selectedAssignee = $derived(
		assigneeOptions.find((assignee) => assignee.id === assignedToId) ?? null
	);
	let assigneeLabel = $derived(
		selectedAssignee ? `${selectedAssignee.name} - ${selectedAssignee.role}` : "Unassigned"
	);
	const deadlineFormatter = new DateFormatter("en-US", { dateStyle: "medium" });
	let deadlineLabel = $derived(
		deadlineDate
			? deadlineFormatter.format(deadlineDate.toDate(getLocalTimeZone()))
			: "Select date"
	);

	let planItems = $state<string[]>([""]);
	let executionLinks = $state<string[]>([""]);
	let notesText = $state("");

	let planDragIndex = $state<number | null>(null);

	let activeModules = $state<OptionalModuleKey[]>(["plan", "execution"]);
	let abandonReason = $state("");
	let hasFeedback = $state(false);

	let savePhase = $state<"idle" | "saving" | "saved">("idle");
	let saveReady = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;

	const normalizedDeadline = (value: CalendarDate | undefined) => (value ? value.toString() : "");
	let currentSignature = $derived(
		JSON.stringify({
			title,
			status,
			assignedToId,
			selectedIdeaId,
			deadline: normalizedDeadline(deadlineDate),
			hypothesis,
			planItems,
			executionLinks,
			notesText,
			activeModules,
			abandonReason,
			hasFeedback
		})
	);
	let savedSignature = $state("");
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

	const isReadOnly = (currentStatus: TaskStatus) =>
		!canEditTask || currentStatus === "Completed" || currentStatus === "Abandoned";

	const isNotesReadOnly = (currentStatus: TaskStatus) =>
		!canEditTask || currentStatus === "Abandoned";

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

	const updatePlanItem = (index: number, value: string) => {
		planItems[index] = value;
		planItems = [...planItems];
	};

	const addPlanItem = () => {
		planItems = [...planItems, ""];
	};

	const removePlanItem = (index: number) => {
		planItems.splice(index, 1);
		planItems = planItems.length ? planItems : [""];
	};

	const handlePlanDragStart = (index: number) => {
		planDragIndex = index;
	};

	const handlePlanDragOver = (event: DragEvent) => {
		event.preventDefault();
	};

	const handlePlanDrop = (index: number) => {
		if (planDragIndex === null || planDragIndex === index) {
			return;
		}

		const updated = [...planItems];
		const [moved] = updated.splice(planDragIndex, 1);
		updated.splice(index, 0, moved);
		planItems = updated;
		planDragIndex = null;
	};

	const handlePlanDragEnd = () => {
		planDragIndex = null;
	};

	const updateExecutionLink = (index: number, value: string) => {
		executionLinks[index] = value;
		executionLinks = [...executionLinks];
	};

	const addExecutionLink = () => {
		executionLinks = [...executionLinks, ""];
	};

	const removeExecutionLink = (index: number) => {
		executionLinks.splice(index, 1);
		executionLinks = executionLinks.length ? executionLinks : [""];
	};

	const changeStatus = async (nextStatus: TaskStatus) => {
		if (!permissions || !canChangeTaskStatus) return;
		if (nextStatus === status) return;
		const result = await updateTaskStatusRemote({
			input: {
				projectId,
				taskId,
				status: nextStatus
			},
			permissions
		});
		if (!result.success) {
			toast.error("error" in result ? result.error : "Status change failed.");
			return;
		}
		status = nextStatus;
		savedSignature = currentSignature;
		statusDialogOpen = false;
		toast.success("Status changed");
	};

	const triggerSave = async () => {
		if (!permissions || !canEditTask) return;
		if (savePhase === "saving" || !isDirty) return;
		if (saveTimer) {
			clearTimeout(saveTimer);
		}
		if (savedBadgeTimer) {
			clearTimeout(savedBadgeTimer);
		}

		savePhase = "saving";
		const result = await updateTaskRemote({
			input: {
				projectId,
				taskId,
				state: {
					title,
					status,
					assignedToId,
					selectedIdeaId,
					deadline: normalizedDeadline(deadlineDate),
					hypothesis,
					planItems,
					executionLinks,
					notesText,
					activeModules,
					abandonReason,
					hasFeedback
				}
			},
			permissions
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

	$effect(() => {
		const d = data;
		untrack(() => {
			const task = required(d.task as Record<string, unknown> | undefined, "task");
			assigneeOptions = structuredClone(d.assigneeOptions) as AssigneeOption[];
			ideaOptions = structuredClone(d.ideaOptions) as LinkedIdea[];

			status = required(task.status as TaskStatus | undefined, "task.status");
			title = required(task.title as string | undefined, "task.title");
			assignedToId = "assignedToId" in task ? String(task.assignedToId) : "";
			deadlineDate = (() => {
				const raw = String(required(task.deadline as string | undefined, "task.deadline")).trim();
				if (!raw) return undefined;
				try {
					return parseDate(raw);
				} catch {
					return undefined;
				}
			})();
			hypothesis = "hypothesis" in task ? String(task.hypothesis) : "";
			selectedIdeaId = "selectedIdeaId" in task ? String(task.selectedIdeaId) : "";
			planItems = Array.isArray(task.planItems) && task.planItems.length
				? (structuredClone(task.planItems) as unknown[]).map((item) => String(item))
				: [""];
			executionLinks = Array.isArray(task.executionLinks) && task.executionLinks.length
				? (structuredClone(task.executionLinks) as unknown[]).map((item) => String(item))
				: [""];
			notesText = "notesText" in task ? String(task.notesText) : "";
			activeModules = Array.isArray(task.activeModules) && task.activeModules.length
				? (structuredClone(task.activeModules) as OptionalModuleKey[])
				: ["plan", "execution"];
			abandonReason = "abandonReason" in task ? String(task.abandonReason) : "";
			hasFeedback = Boolean(required(task.hasFeedback as boolean | undefined, "task.hasFeedback"));

			addSectionOpen = false;
			statusDialogOpen = false;
			metadataOpen = false;
			planDragIndex = null;
			savePhase = "idle";

			savedSignature = JSON.stringify({
				title,
				status,
				assignedToId,
				selectedIdeaId,
				deadline: normalizedDeadline(deadlineDate),
				hypothesis,
				planItems,
				executionLinks,
				notesText,
				activeModules,
				abandonReason,
				hasFeedback
			});
			saveReady = true;
		});
	});

	onDestroy(() => {
		if (saveTimer) {
			clearTimeout(saveTimer);
		}
		if (savedBadgeTimer) {
			clearTimeout(savedBadgeTimer);
		}
	});
</script>

{#key page.params.slug}
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
						<Breadcrumb.Link href="/project/{projectId}/tasks">Prototype</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="/project/{projectId}/tasks">Taskboard</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{title || "New Task"}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col md:px-20 gap-4 py-2">
		<div class="flex mt-2 flex-col bg-white rounded-lg gap-2 p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				Task - Prototype
			</div>
			<Input
				type="text"
				bind:value={title}
				class="bg-transparent outline-0 shadow-none border-0 text-4xl! h-fit py-4 px-3"
				placeholder="Task Title"
				disabled={isReadOnly(status)}
			/>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-3">
					<div class="flex flex-col gap-2 min-w-55">
						<Label class="text-muted-foreground" for="assigned-to">Assigned to</Label>
						{#if assigneeOptions.length === 0}
							<div class="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-3 text-center">
								No team members available.
							</div>
						{:else}
						<Select.Root
							type="single"
							bind:value={assignedToId}
							disabled={isReadOnly(status)}
						>
							<Select.Trigger class="w-full" id="assigned-to">
								{assigneeLabel}
							</Select.Trigger>
							<Select.Content>
								{#each assigneeOptions as assignee (assignee.id)}
									<Select.Item value={assignee.id} label={assignee.name}>
										{assignee.name} - {assignee.role}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						{/if}
					</div>
					<div class="flex flex-col gap-2 min-w-55">
						<Label class="text-muted-foreground" for="task-deadline">Deadline</Label>
						<Popover.Root>
							<Popover.Trigger
								id="task-deadline"
								class={buttonVariants({ variant: "outline" })}
								disabled={isReadOnly(status)}
							>
								<CalendarIcon class="h-4 w-4" />
								<span class={!deadlineDate ? "text-muted-foreground" : ""}>
									{deadlineLabel}
								</span>
							</Popover.Trigger>
							<Popover.Content class="w-auto p-0" align="start">
								<Calendar
									type="single"
									bind:value={deadlineDate}
									captionLayout="dropdown"
									minValue={today(getLocalTimeZone())}
								/>
							</Popover.Content>
						</Popover.Root>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-3">
					<Button variant="outline" size="icon" onclick={() => (metadataOpen = true)} aria-label="Open task metadata">
						<Info class="h-4 w-4" />
					</Button>
					<div class="bg-accent px-2 py-1 w-fit rounded-lg text-sm font-medium">
						{status.toUpperCase()}
					</div>
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
						variant="outline"
						size="sm"
						onclick={triggerSave}
						disabled={!canEditTask || savePhase === "saving" || !isDirty}
					>
						{savePhase === "saving" ? "Saving..." : "Save changes"}
					</Button>
				</div>
			</div>
		</div>

		<Separator class="mt-2 px-2"></Separator>

		<div class="py-2 w-full flex flex-col gap-4">
			<div class="flex flex-col gap-3 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Linked Idea &amp; Context</span>
					<Separator></Separator>
				</div>
				<div class="flex flex-col gap-2 max-w-xl">
					<Label class="text-muted-foreground" for="linked-idea">Linked idea</Label>
					{#if ideaOptions.length === 0}
						<div class="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4 text-center">
							No ideas available to link.
						</div>
					{:else}
					<Select.Root
						type="single"
						bind:value={selectedIdeaId}
						disabled={status !== "Planned"}
					>
						<Select.Trigger id="linked-idea">
							{selectedIdea ? selectedIdea.title : "Select an idea"}
						</Select.Trigger>
						<Select.Content>
							{#each ideaOptions as idea (idea.id)}
								<Select.Item value={idea.id} label={idea.title}>
									{idea.title}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{/if}
				</div>
				{#if selectedIdea}
					{#if selectedIdea.status === "Rejected"}
						<Alert.Root class="border border-orange-200 bg-orange-50 text-orange-700">
							<Alert.Title>Linked idea rejected</Alert.Title>
							<Alert.Description>
								This task remains valid for historical learning.
							</Alert.Description>
						</Alert.Root>
					{/if}
					{#if selectedIdea.problem.status === "Archived"}
						<Alert.Root class="border border-orange-200 bg-orange-50 text-orange-700">
							<Alert.Title>Problem statement archived</Alert.Title>
							<Alert.Description>
								Upstream context is archived.
							</Alert.Description>
						</Alert.Root>
					{/if}
					<ol class="flex flex-col gap-3">
						<li class="flex flex-col gap-2 md:flex-row md:gap-4">
							<div class="pt-1 text-xs font-semibold uppercase text-muted-foreground md:w-28">
								Idea
							</div>
							<div class="flex-1 border border-border rounded-lg p-3 flex flex-col gap-2">
								<div class="flex items-start justify-between gap-3">
									<div class="text-sm font-medium">{selectedIdea.title}</div>
									<Button
										variant="ghost"
										size="sm"
										class="h-8 w-8 p-0"
										href={selectedIdea.href}
										aria-label="Open idea"
									>
										<ExternalLink class="h-4 w-4" />
									</Button>
								</div>
								<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
									<div class="bg-accent px-2 py-1 rounded-lg text-xs font-medium">
										{selectedIdea.phase}
									</div>
									{#if selectedIdea.status === "Rejected"}
										<div class="bg-destructive/5 px-2 py-1 rounded-lg text-xs text-destructive">
											Rejected
										</div>
									{/if}
								</div>
							</div>
						</li>

						<li class="flex flex-col gap-2 md:flex-row md:gap-4">
							<div class="pt-1 text-xs font-semibold uppercase text-muted-foreground md:w-28">
								Problem
							</div>
							<div class="flex-1 border border-border rounded-lg p-3 flex flex-col gap-2">
								<div class="flex items-start justify-between gap-3">
									<div class="text-sm font-medium">{selectedIdea.problem.title}</div>
									<Button
										variant="ghost"
										size="sm"
										class="h-8 w-8 p-0"
										href={selectedIdea.problem.href}
										aria-label="Open problem statement"
									>
										<ExternalLink class="h-4 w-4" />
									</Button>
								</div>
								<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
									<div class="bg-accent px-2 py-1 rounded-lg text-xs font-medium">
										{selectedIdea.problem.phase}
									</div>
									<div class="bg-muted px-2 py-1 rounded-lg text-xs">
										{selectedIdea.problem.status}
									</div>
								</div>
							</div>
						</li>

						<li class="flex flex-col gap-2 md:flex-row md:gap-4">
							<div class="pt-1 text-xs font-semibold uppercase text-muted-foreground md:w-28">
								{selectedIdea.context.type === "User Journey" ? "Journey" : "Persona"}
							</div>
							<div class="flex-1 border border-border rounded-lg p-3 flex flex-col gap-2">
								<div class="flex items-start justify-between gap-3">
									<div class="text-sm font-medium">{selectedIdea.context.title}</div>
									<Button
										variant="ghost"
										size="sm"
										class="h-8 w-8 p-0"
										href={selectedIdea.context.href}
										aria-label={`Open ${selectedIdea.context.type.toLowerCase()}`}
									>
										<ExternalLink class="h-4 w-4" />
									</Button>
								</div>
								<div class="text-xs text-muted-foreground">
									{selectedIdea.context.detail}
								</div>
								<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
									<div class="bg-accent px-2 py-1 rounded-lg text-xs font-medium">
										{selectedIdea.context.phase}
									</div>
									{#if selectedIdea.context.status === "Archived"}
										<div class="bg-muted px-2 py-1 rounded-lg text-xs">
											Archived
										</div>
									{/if}
								</div>
							</div>
						</li>
					</ol>
				{/if}
			</div>

			<div class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Task Hypothesis</span>
					<Separator></Separator>
				</div>
				<Textarea
					id="task-hypothesis"
					placeholder="We believe that [doing X] for [user] will result in [expected outcome] because [reasoning]."
					bind:value={hypothesis}
					disabled={isReadOnly(status)}
					class="min-h-28 text-base md:text-lg font-medium"
				/>
			</div>

			{#if activeModules.includes("plan")}
				<div class="group flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
					<div class="flex flex-row gap-2 items-center w-full">
						<span class="font-medium text-nowrap">{moduleDetails.plan.title}</span>
						<Separator></Separator>
						<Button
							variant="ghost"
							size="icon"
							class="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
							onclick={() => removeModule("plan")}
							disabled={isReadOnly(status)}
						>
							<X class="h-4 w-4" />
						</Button>
					</div>
					<div class="flex flex-col gap-3" role="list">
						{#each planItems as item, index (index)}
							<div
								class="flex flex-wrap items-center gap-3 rounded-md border border-border/60 px-3 py-2"
								role="listitem"
							>
								<div class="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
									<button
										type="button"
										class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition hover:text-foreground"
										aria-label={`Reorder plan item ${index + 1}`}
										draggable={!isReadOnly(status)}
										ondragstart={() => handlePlanDragStart(index)}
										ondragover={handlePlanDragOver}
										ondrop={() => handlePlanDrop(index)}
										ondragend={handlePlanDragEnd}
										disabled={isReadOnly(status)}
									>
										<GripVertical class="h-4 w-4" />
									</button>
									<span class="w-5 text-right">{index + 1}.</span>
								</div>
								<Input
									class="flex-1 min-w-50"
									value={item}
									placeholder={`Plan item ${index + 1}`}
									disabled={isReadOnly(status)}
									oninput={(event) =>
										updatePlanItem(
											index,
											(event.currentTarget as HTMLInputElement).value
										)
									}
								/>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2 text-destructive hover:text-destructive"
									onclick={() => removePlanItem(index)}
									disabled={isReadOnly(status)}
								>
									Remove
								</Button>
							</div>
						{/each}
						<Button
							variant="outline"
							size="sm"
							class="w-fit"
							onclick={addPlanItem}
							disabled={isReadOnly(status)}
						>
							<Plus class="mr-2 h-4 w-4" />
							Add item
						</Button>
					</div>
				</div>
			{/if}

			{#if activeModules.includes("execution")}
				<div class="group flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
					<div class="flex flex-row gap-2 items-center w-full">
						<span class="font-medium text-nowrap">{moduleDetails.execution.title}</span>
						<Separator></Separator>
						<Button
							variant="ghost"
							size="icon"
							class="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
							onclick={() => removeModule("execution")}
							disabled={isReadOnly(status)}
						>
							<X class="h-4 w-4" />
						</Button>
					</div>
					<div class="flex flex-col gap-3">
						{#each executionLinks as link, index (index)}
							<div class="flex flex-wrap items-center gap-3 rounded-md border border-border/60 px-3 py-2">
								<div class="text-xs font-semibold text-muted-foreground min-w-13">
									Link {index + 1}
								</div>
								<Input
									class="flex-1 min-w-50"
									value={link}
									placeholder="Paste a link"
									disabled={isReadOnly(status)}
									oninput={(event) =>
										updateExecutionLink(
											index,
											(event.currentTarget as HTMLInputElement).value
										)
									}
								/>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 w-7 p-0"
									href={link}
									aria-label={`Open execution link ${index + 1}`}
									disabled={!link}
								>
									<ExternalLink class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									class="h-7 px-2 text-destructive hover:text-destructive"
									onclick={() => removeExecutionLink(index)}
									disabled={isReadOnly(status)}
								>
									Remove
								</Button>
							</div>
						{/each}
						<Button
							variant="outline"
							size="sm"
							class="w-fit"
							onclick={addExecutionLink}
							disabled={isReadOnly(status)}
						>
							<Plus class="mr-2 h-4 w-4" />
							Add link
						</Button>
					</div>
				</div>
			{/if}

			<div class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Status</span>
					<Separator></Separator>
				</div>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="bg-accent px-2 py-1 w-fit rounded-lg text-sm font-medium">
						{status.toUpperCase()}
					</div>
					<Dialog.Root bind:open={statusDialogOpen}>
						<Dialog.Trigger
							class={buttonVariants({ variant: "outline" })}
							disabled={isReadOnly(status) || !canChangeTaskStatus}
						>
							Change Status
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Change task status</Dialog.Title>
							</Dialog.Header>
							<div class="grid gap-2">
								{#each statusOptions as option (option)}
									<Button
										class={buttonVariants({
											variant: status === option ? "default" : "outline",
										})}
										disabled={!canChangeTaskStatus}
										onclick={() => changeStatus(option)}
									>
										{option}
									</Button>
								{/each}
							</div>
						</Dialog.Content>
					</Dialog.Root>
				</div>
				{#if status === "Abandoned"}
					<div class="mt-4 grid gap-2">
						<Label for="abandon-reason">Reason</Label>
						<Textarea
							id="abandon-reason"
							placeholder="Why was the hypothesis dropped?"
							bind:value={abandonReason}
						/>
					</div>
				{/if}
				{#if status === "Completed" && !hasFeedback}
					<Alert.Root class="mt-4">
						<Alert.Title>No feedback captured yet</Alert.Title>
						<Alert.Description>
							This task is complete, but no feedback exists yet.
						</Alert.Description>
					</Alert.Root>
				{/if}
			</div>

			<div class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Add Section</span>
					<Separator></Separator>
				</div>
				<Dialog.Root bind:open={addSectionOpen}>
					<Dialog.Trigger
						class={buttonVariants({ variant: "outline" })}
						disabled={isReadOnly(status)}
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
										disabled={activeModules.includes(moduleKey) || isReadOnly(status)}
									>
										{activeModules.includes(moduleKey) ? "Added" : "Add"}
									</Button>
								</div>
							{/each}
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</div>

			<div class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Additional Notes</span>
					<Separator></Separator>
				</div>
				<div class="flex flex-col gap-6">
					<div class="flex flex-col gap-2">
						<Textarea
							id="notes"
							placeholder="Additional Notes"
							bind:value={notesText}
							disabled={isNotesReadOnly(status)}
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>


<Dialog.Root bind:open={metadataOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Artifact Metadata</Dialog.Title>
			<Dialog.Description>Read-only metadata for this task.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-2 text-sm">
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Owner</span><span>{data.metadata?.owner ?? "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Deadline</span><span>{normalizedDeadline(deadlineDate) || "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Last updated</span><span>{data.metadata?.lastUpdated ?? "Unknown"}</span></div>
			<div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Status</span><span>{status}</span></div>
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Close</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
{/key}
