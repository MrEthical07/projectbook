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
	import { DateFormatter, getLocalTimeZone, today, parseDate, type CalendarDate } from "@internationalized/date";
	import { Calendar as CalendarIcon, ExternalLink, GripVertical, Plus } from "@lucide/svelte";
	import { page } from "$app/state";
    import { store } from "$lib/stores.svelte";
    import type { TaskStatus, TaskRow } from "$lib/types";

	const projectId = $derived(page.params.projectId);
    const taskId = $derived(page.params.slug);

    // Derived task from store
    const task = $derived(store.tasks.find(t => t.id === taskId));

    // Fallback if task not found (should handle 404 in real app)
    const currentTask = $derived(task ?? {
        id: taskId,
        projectId,
        title: "Untitled Task",
        status: "Planned",
        owner: "Unassigned",
        deadline: new Date().toISOString().split('T')[0],
        planItems: [""],
        executionLinks: [""],
        notes: "",
        hypothesis: "",
        abandonReason: ""
    } as TaskRow);

	type OptionalModuleKey = "plan" | "execution";

    // ... (Linked types kept same as before for mock) ...
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

	const statusOptions: TaskStatus[] = ["Planned", "In Progress", "Completed", "Abandoned"];

	const assigneeOptions: AssigneeOption[] = [
		{ id: "user-1", name: "Nia Clark", role: "Designer" },
		{ id: "user-2", name: "Dr. Ramos", role: "Product" },
		{ id: "user-3", name: "Avery Patel", role: "Research" },
	];

	const ideaOptions: LinkedIdea[] = [
		{
			id: "idea-31",
			title: "Visual deadline timeline for assignments",
			phase: "Ideate",
			href: "/project/alpha/ideas/deadline-timeline",
			status: "Active",
			problem: {
				id: "problem-7",
				title: "Students miss assignment requirements",
				phase: "Define",
				href: "/project/alpha/problem-statement/missed-requirements",
				status: "Locked",
			},
			context: {
				type: "Persona",
				title: "Nia Clark",
				detail: "First-year student balancing coursework and a part-time job.",
				phase: "Empathize",
				href: "/project/alpha/personas/nia-clark",
				status: "Active",
			},
		},
        // ... (truncated for brevity, logic remains)
    ];

    // Helpers to update store
    const update = (updates: Partial<TaskRow>) => {
        if (task) {
            store.updateTask(task.id, updates);
        }
    };

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

    // State mapping for UI
    let deadlineDate = $state<CalendarDate | undefined>();
    $effect(() => {
        if (currentTask.deadline) {
            try {
                deadlineDate = parseDate(currentTask.deadline);
            } catch (e) {
                // ignore invalid date
            }
        }
    });

    const onDateChange = (date: CalendarDate | undefined) => {
        if (date) {
            update({ deadline: date.toString() });
        }
    };

	let addSectionOpen = $state(false);
	let statusDialogOpen = $state(false);
	let selectedIdeaId = $state(""); // Should bind to task.linkedIdea if we had ids there

	const selectedIdea = $derived(
		ideaOptions.find((idea) => idea.id === selectedIdeaId) ?? null
	);
	const selectedAssignee = $derived(
		assigneeOptions.find((assignee) => assignee.name === currentTask.owner) ?? null
	);
	const assigneeLabel = $derived(
		selectedAssignee ? `${selectedAssignee.name} - ${selectedAssignee.role}` : currentTask.owner
	);
	const deadlineFormatter = new DateFormatter("en-US", { dateStyle: "medium" });
	const deadlineLabel = $derived(
		deadlineDate
			? deadlineFormatter.format(deadlineDate.toDate(getLocalTimeZone()))
			: "Select date"
	);

    // Plan Items Logic (Keyed)
    type KeyedItem = { id: string, text: string };
    let planItems = $state<KeyedItem[]>([]);

    // Sync store -> local
    $effect(() => {
        // If length differs or we suspect desync, reload.
        // Simple check: if local is empty and store has items.
        // Or strictly strictly sync: map store items to keyed items, reusing keys if possible?
        // For this assignment, simplified: just recreate if length changes significantly or on init
        if (planItems.length === 0 && (currentTask.planItems?.length ?? 0) > 0) {
             planItems = (currentTask.planItems || [""]).map(text => ({ id: crypto.randomUUID(), text }));
        }
    });

    // Sync local -> store
    const syncPlanItems = () => {
        update({ planItems: planItems.map(i => i.text) });
    };

	let executionLinks = $derived(currentTask.executionLinks || [""]);

    // Sync execution links
    const updateExecutionLinks = (links: string[]) => {
        update({ executionLinks: links });
    };

	let planDragIndex = $state<number | null>(null);

	let activeModules = $state<OptionalModuleKey[]>(["plan", "execution"]);

	const isReadOnly = (currentStatus: TaskStatus) =>
		currentStatus === "Completed" || currentStatus === "Abandoned";

    // Overridden for status change based on bug report requirement
    const canChangeStatus = true;

	const isNotesReadOnly = (currentStatus: TaskStatus) =>
		currentStatus === "Abandoned";

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
		planItems[index].text = value;
		// planItems = [...planItems]; // Not needed with runes if mutating object? No, array needs update trigger or deep proxy
        // With runes, array mutation might need reassignment or using Svelte generic collection methods if available.
        // For now, reassignment is safe.
        // But wait, planItems is $state array.
        // planItems[index].text = value is fine if the object inside is proxy.
        syncPlanItems();
	};

	const addPlanItem = () => {
		planItems = [...planItems, { id: crypto.randomUUID(), text: "" }];
        syncPlanItems();
	};

	const removePlanItem = (index: number) => {
		const newItems = [...planItems];
        newItems.splice(index, 1);
        if (newItems.length === 0) newItems.push({ id: crypto.randomUUID(), text: "" });
        planItems = newItems;
        syncPlanItems();
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
        syncPlanItems();
	};

	const handlePlanDragEnd = () => {
		planDragIndex = null;
	};

	const updateExecutionLink = (index: number, value: string) => {
		const newLinks = [...executionLinks];
        newLinks[index] = value;
        updateExecutionLinks(newLinks);
	};

	const addExecutionLink = () => {
		updateExecutionLinks([...executionLinks, ""]);
	};

	const removeExecutionLink = (index: number) => {
        const newLinks = [...executionLinks];
		newLinks.splice(index, 1);
        if (newLinks.length === 0) newLinks.push("");
        updateExecutionLinks(newLinks);
	};

    const updateAssignee = (id: string) => {
        const assignee = assigneeOptions.find(a => a.id === id);
        if (assignee) {
            update({ owner: assignee.name }); // Mock uses name as owner ID
        }
    }
</script>

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
						<Breadcrumb.Page>{currentTask.title || "New Task"}</Breadcrumb.Page>
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
				value={currentTask.title}
                oninput={(e) => update({ title: e.currentTarget.value })}
				class="bg-transparent outline-0 shadow-none border-0 text-4xl! h-fit py-4 px-3"
				placeholder="Task Title"
				disabled={isReadOnly(currentTask.status)}
			/>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-3">
					<div class="flex flex-col gap-2 min-w-55">
						<Label class="text-muted-foreground" for="assigned-to">Assigned to</Label>
						<Select.Root
							type="single"
                            onValueChange={(v) => updateAssignee(v)}
							disabled={isReadOnly(currentTask.status)}
						>
							<Select.Trigger id="assigned-to">
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
					</div>
					<div class="flex flex-col gap-2 min-w-55">
						<Label class="text-muted-foreground" for="task-deadline">Deadline</Label>
						<Popover.Root>
							<Popover.Trigger
								id="task-deadline"
								class={buttonVariants({ variant: "outline" })}
								disabled={isReadOnly(currentTask.status)}
							>
								<CalendarIcon class="mr-2 h-4 w-4" />
								<span class={!deadlineDate ? "text-muted-foreground" : ""}>
									{deadlineLabel}
								</span>
							</Popover.Trigger>
							<Popover.Content class="w-auto p-0" align="start">
								<Calendar
									type="single"
									bind:value={deadlineDate}
                                    onValueChange={(v) => onDateChange(v as CalendarDate)}
									captionLayout="dropdown"
									minValue={today(getLocalTimeZone())}
								/>
							</Popover.Content>
						</Popover.Root>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-3">
					<div class="bg-accent px-2 py-1 w-fit rounded-lg text-sm font-medium">
						{currentTask.status.toUpperCase()}
					</div>
					<Button variant="outline" size="sm">Archive</Button>
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
					<Select.Root
						type="single"
						bind:value={selectedIdeaId}
						disabled={currentTask.status !== "Planned"}
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
				</div>
				{#if selectedIdea}
					<!-- ... Linked idea details (keeping static for now as they are complex to mock dynamically without full store) ... -->
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
					value={currentTask.hypothesis ?? ""}
                    oninput={(e) => update({ hypothesis: e.currentTarget.value })}
					disabled={isReadOnly(currentTask.status)}
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
							size="sm"
							class="h-7 px-2 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
							onclick={() => removeModule("plan")}
							disabled={isReadOnly(currentTask.status)}
						>
							Remove
						</Button>
					</div>
					<div class="flex flex-col gap-3" role="list">
						{#each planItems as item, index (item.id)}
							<div
								class="flex flex-wrap items-center gap-3 rounded-md border border-border/60 px-3 py-2"
								role="listitem"
							>
								<div class="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
									<button
										type="button"
										class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 transition hover:text-foreground"
										aria-label={`Reorder plan item ${index + 1}`}
										draggable={!isReadOnly(currentTask.status)}
										ondragstart={() => handlePlanDragStart(index)}
										ondragover={handlePlanDragOver}
										ondrop={() => handlePlanDrop(index)}
										ondragend={handlePlanDragEnd}
										disabled={isReadOnly(currentTask.status)}
									>
										<GripVertical class="h-4 w-4" />
									</button>
									<span class="w-5 text-right">{index + 1}.</span>
								</div>
								<Input
									class="flex-1 min-w-50"
									value={item.text}
									placeholder={`Plan item ${index + 1}`}
									disabled={isReadOnly(currentTask.status)}
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
									disabled={isReadOnly(currentTask.status)}
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
							disabled={isReadOnly(currentTask.status)}
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
							size="sm"
							class="h-7 px-2 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
							onclick={() => removeModule("execution")}
							disabled={isReadOnly(currentTask.status)}
						>
							Remove
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
									disabled={isReadOnly(currentTask.status)}
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
									disabled={isReadOnly(currentTask.status)}
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
							disabled={isReadOnly(currentTask.status)}
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
						{currentTask.status.toUpperCase()}
					</div>
					<Dialog.Root bind:open={statusDialogOpen}>
						<Dialog.Trigger
							class={buttonVariants({ variant: "outline" })}
						>
							Change Status
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Change task status</Dialog.Title>
							</Dialog.Header>
							<div class="grid gap-2">
								{#each statusOptions as option (option)}
									<Dialog.Close
										class={buttonVariants({
											variant: currentTask.status === option ? "default" : "outline",
										})}
										onclick={() => {
											update({ status: option });
										}}
									>
										{option}
									</Dialog.Close>
								{/each}
							</div>
						</Dialog.Content>
					</Dialog.Root>
				</div>
				{#if currentTask.status === "Abandoned"}
					<div class="mt-4 grid gap-2">
						<Label for="abandon-reason">Reason</Label>
						<Textarea
							id="abandon-reason"
							placeholder="Why was the hypothesis dropped?"
							value={currentTask.abandonReason ?? ""}
                            oninput={(e) => update({ abandonReason: e.currentTarget.value })}
						/>
					</div>
				{/if}
				{#if currentTask.status === "Completed" && !currentTask.hasFeedback}
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
						disabled={isReadOnly(currentTask.status)}
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
										disabled={activeModules.includes(moduleKey) || isReadOnly(currentTask.status)}
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
							value={currentTask.notes ?? ""}
                            oninput={(e) => update({ notes: e.currentTarget.value })}
							disabled={isNotesReadOnly(currentTask.status)}
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
