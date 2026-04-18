<script lang="ts">
	import { getContext, onMount } from "svelte";
	import { page } from "$app/state";
	import { Calendar as CalendarPicker } from "$lib/components/ui/calendar";
	import { SvelteDate } from "svelte/reactivity";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Popover from "$lib/components/ui/popover";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { Textarea } from "$lib/components/ui/textarea";
	import { parseDate, type CalendarDate } from "@internationalized/date";
	import {
		Calendar as CalendarIcon,
		CalendarDays,
		CalendarRange,
		ChevronLeft,
		ChevronRight,
		Plus,
	} from "@lucide/svelte";
	import { createCalendarEvent, getCalendarData } from "$lib/remote/calendar.remote";
	import { can } from "$lib/utils/permission";

	let { data } = $props();
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canCreateEvent = can(permissions, "calendar", "create");

	type CalendarView = "Month" | "Week";
	type EventSourceType = "Derived" | "Manual";
	type ArtifactType = "Task" | "Feedback" | "Manual";
	type Phase = "Empathize" | "Define" | "Ideate" | "Prototype" | "Test";
	type PhaseOption = Phase | "None";
	type ManualEventKind = "Workshop" | "Review" | "Testing Session" | "Meeting" | "Other";

	type CalendarEvent = {
		id: string;
		title: string;
		type: EventSourceType;
		start: string;
		end: string;
		startTime?: string;
		endTime?: string;
		allDay: boolean;
		owner: string;
		phase: PhaseOption;
		artifactType: ArtifactType;
		sourceTitle?: string;
		description?: string;
		location?: string;
		eventKind?: string;
		linkedArtifacts?: string[];
		tags?: string[];
		createdAt: string;
	};

	let phaseChoices = $derived.by(
		() => structuredClone(data.reference.phaseChoices) as PhaseOption[]
	);
	let manualKinds = $derived.by(
		() => structuredClone(data.reference.manualKinds) as ManualEventKind[]
	);
	let linkedArtifactOptions = $derived.by(
		() => structuredClone(data.reference.linkedArtifactOptions) as string[]
	);

	const today = new Date().toISOString().split("T")[0];
	const addDays = (date: string, amount: number) => {
		const base = new SvelteDate(date);
		base.setDate(base.getDate() + amount);
		return base.toISOString().slice(0, 10);
	};
	let view = $state<CalendarView>("Month");
	let currentMonth = $state(today);
	let selectedDay = $state(today);
	let weekStart = $state(today);
	let filterArtifact = $state<ArtifactType | "All">("All");
	let filterOwner = $state<string | "All">("All");
	let filterPhase = $state<PhaseOption | "All">("All");
	let nextCursor = $state<string | null>(null);
	let isLoadingMore = $state(false);
	let loadMoreError = $state("");

	let events = $state<CalendarEvent[]>([]);

	$effect(() => {
		events = structuredClone(data.events) as CalendarEvent[];
		const initialCursor = (data as { nextCursor?: string | null }).nextCursor;
		nextCursor = typeof initialCursor === "string" && initialCursor.trim().length > 0
			? initialCursor
			: null;
		isLoadingMore = false;
		loadMoreError = "";
	});

	let addEventOpen = $state(false);
	let eventDetailsOpen = $state(false);
	let selectedEventId = $state<string | null>(null);

	let newTitle = $state("");
	let newDateValue = $state<CalendarDate>(parseDate(today));
	let newStartTime = $state("10:00");
	let newEndTime = $state("11:00");
	let newAllDay = $state(false);
	let newOwner = $state("Unassigned");
	let newPhase = $state<PhaseOption>("None");
	let newKind = $state<ManualEventKind>("Meeting");
	let newCustomKind = $state("");
	let newDescription = $state("");
	let newLocation = $state("");
	let newLinked = $state<string[]>([]);
	let newTags = $state("");
	let createError = $state("");
	let isCreatingEvent = $state(false);

	let filteredEvents = $derived(
		events.filter((event) => {
			if (filterArtifact !== "All" && event.artifactType !== filterArtifact) {
				return false;
			}
			if (filterOwner !== "All" && event.owner !== filterOwner) {
				return false;
			}
			if (filterPhase !== "All" && event.phase !== filterPhase) {
				return false;
			}
			return true;
		})
	);
	let projectId = $derived(
		(page.params.projectId ?? (data as { projectId?: string }).projectId ?? "").trim()
	);
	let ownerOptions = $derived.by(() => {
		const list = Array.from(new Set(events.map((event) => event.owner))).filter(Boolean);
		if (access?.user.name && !list.includes(access.user.name)) {
			list.unshift(access.user.name);
		}
		return list;
	});
	let artifactOptions = $derived(
		Array.from(new Set(events.map((event) => event.artifactType))).filter(Boolean)
	);
	let phaseOptions = $derived(
		Array.from(new Set(events.map((event) => event.phase))).filter(Boolean)
	);
	let selectedEvent = $derived(
		selectedEventId ? events.find((event) => event.id === selectedEventId) ?? null : null
	);
	let newDateLabel = $derived.by(() => {
		if (!newDateValue) return "";
		const date = new SvelteDate(newDateValue.toString());
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	});

	let startOfMonth = $derived.by(() => {
		const date = new SvelteDate(currentMonth);
		date.setDate(1);
		return date.toISOString().slice(0, 10);
	});

	let monthLabel = $derived.by(() => {
		const date = new SvelteDate(currentMonth);
		return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
	});

	let monthDays = $derived.by(() => {
		const first = new SvelteDate(startOfMonth);
		const dayOfWeek = first.getDay() === 0 ? 7 : first.getDay();
		const gridStart = new SvelteDate(first);
		gridStart.setDate(first.getDate() - (dayOfWeek - 1));
		return Array.from({ length: 42 }, (_, index) => {
			const date = new SvelteDate(gridStart);
			date.setDate(gridStart.getDate() + index);
			return {
				label: String(date.getDate()),
				date: date.toISOString().slice(0, 10),
				inMonth: date.getMonth() === first.getMonth(),
			};
		});
	});

	let weekDates = $derived(
		Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
	);

	let weekLabel = $derived.by(() => {
		const start = new SvelteDate(weekStart);
		const end = new SvelteDate(addDays(weekStart, 6));
		const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
		const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
		return `${startLabel} - ${endLabel}`;
	});

	const timeSlots = Array.from({ length: 9 }, (_, index) => `${9 + index}:00`);

	let eventsByDay = $derived(
		filteredEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
			const key = event.start;
			if (!acc[key]) acc[key] = [];
			acc[key].push(event);
			return acc;
		}, {})
	);

	let eventsToday = $derived(
		filteredEvents.filter((event) => event.start === today).length
	);
	let eventsLate = $derived(
		filteredEvents.filter((event) => event.start < today && event.type === "Manual").length
	);
	let upcomingDeadlines = $derived(
		filteredEvents.filter((event) => event.start > today && event.type === "Derived").length
	);

	const eventTypeBadge = (value: EventSourceType) =>
		value === "Derived"
			? "bg-slate-100 text-slate-700 border-slate-200"
			: "bg-emerald-100 text-emerald-700 border-emerald-200";
	const phaseLabel = (value: PhaseOption) => (value === "None" ? "No phase" : value);
	const parseTags = (value: string) =>
		value
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean);

	const openAddEvent = () => {
		createError = "";
		newTitle = "";
		newDateValue = parseDate(today);
		newStartTime = "10:00";
		newEndTime = "11:00";
		newAllDay = false;
		newOwner = ownerOptions[0] ?? "";
		newPhase = "None";
		newKind = "Meeting";
		newCustomKind = "";
		newDescription = "";
		newLocation = "";
		newLinked = [];
		newTags = "";
		addEventOpen = true;
	};

	const openEventDetails = (event: CalendarEvent) => {
		selectedEventId = event.id;
		eventDetailsOpen = true;
	};

	const addLinkedArtifact = (value: string) => {
		if (!newLinked.includes(value)) {
			newLinked = [...newLinked, value];
		}
	};

	const removeLinkedArtifact = (value: string) => {
		newLinked = newLinked.filter((item) => item !== value);
	};

	const createEvent = async () => {
		if (isCreatingEvent) return;
		createError = "";
		if (!projectId) {
			createError = "Project id is missing.";
			return;
		}
		if (!permissions || !canCreateEvent) {
			createError = "You do not have permission to create events.";
			return;
		}
		const actorId = access?.user.id;
		if (!actorId) {
			createError = "Active user id is missing.";
			return;
		}
		if (!newTitle.trim()) {
			createError = "Event title is required.";
			return;
		}
		if (!newOwner.trim()) {
			createError = "Event owner is required.";
			return;
		}
		if (newKind === "Other" && !newCustomKind.trim()) {
			createError = "Custom event type is required when selecting Other.";
			return;
		}
		const eventKind = newKind === "Other" ? newCustomKind.trim() : newKind;
		const tags = parseTags(newTags);
		isCreatingEvent = true;
		const result = await createCalendarEvent({
			input: {
				projectId,
				actorId,
				title: newTitle.trim(),
				start: newDateValue.toString(),
				end: newDateValue.toString(),
				allDay: newAllDay,
				startTime: newStartTime,
				endTime: newEndTime,
				owner: newOwner,
				phase: newPhase,
				description: newDescription,
				location: newLocation,
				eventKind,
				linkedArtifacts: newLinked,
				tags
			}
});
		isCreatingEvent = false;
		if (!result.success) {
			createError = result.error;
			return;
		}
		const created = result.data as CalendarEvent;
		events = [...events, created];
		addEventOpen = false;
	};

	const loadMoreEvents = async () => {
		if (!projectId || !nextCursor || isLoadingMore) {
			return;
		}

		isLoadingMore = true;
		loadMoreError = "";
		try {
			const result = await getCalendarData({
				projectId,
				limit: 20,
				cursor: nextCursor
			});
			const deduped = new Map<string, CalendarEvent>();
			for (const event of [...events, ...result.events]) {
				deduped.set(event.id, event);
			}
			events = [...deduped.values()];
			nextCursor = result.nextCursor;
		} catch {
			loadMoreError = "Failed to load more calendar events. Please try again.";
		} finally {
			isLoadingMore = false;
		}
	};

	const goPrevMonth = () => {
		const date = new SvelteDate(currentMonth);
		date.setMonth(date.getMonth() - 1);
		currentMonth = date.toISOString().slice(0, 10);
	};

	const goNextMonth = () => {
		const date = new SvelteDate(currentMonth);
		date.setMonth(date.getMonth() + 1);
		currentMonth = date.toISOString().slice(0, 10);
	};

	const goPrevWeek = () => {
		weekStart = addDays(weekStart, -7);
	};

	const goNextWeek = () => {
		weekStart = addDays(weekStart, 7);
	};

	const goToday = () => {
		const date = new SvelteDate(today);
		date.setDate(1);
		currentMonth = date.toISOString().slice(0, 10);
		selectedDay = today;
		setWeekFromDay(today);
	};

	const setWeekFromDay = (date: string) => {
		const base = new SvelteDate(date);
		const weekday = base.getDay() === 0 ? 7 : base.getDay();
		base.setDate(base.getDate() - (weekday - 1));
		weekStart = base.toISOString().slice(0, 10);
	};

	onMount(() => {
		setWeekFromDay(selectedDay);
	});
</script>

<svelte:head>
	<title>Calendar • {((data as Record<string, unknown>).project as { name?: string } | undefined)?.name ?? "Project"} • ProjectBook</title>
	<meta
		name="description"
		content="Plan project milestones, deadlines, and validation events."
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
						<Breadcrumb.Page>Calendar</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-4 py-2 md:px-20">
		<div class="flex flex-col gap-2 rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				Calendar - Project reminders and key dates
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex items-center gap-2">
					<h1 class="text-3xl font-semibold">Calendar</h1>
				</div>
				<div class="flex items-center gap-2">
					<Button size="sm" onclick={openAddEvent} disabled={!canCreateEvent}>
						<Plus class="mr-2 h-4 w-4" />
						Add Event
					</Button>
				</div>
			</div>
		</div>

		<section class="flex flex-col gap-3 rounded-lg bg-white p-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onclick={() => (view === "Month" ? goPrevMonth() : goPrevWeek())}
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<div class="flex items-center gap-2 text-sm font-medium">
						<CalendarIcon class="h-4 w-4 text-muted-foreground" />
						<span>{view === "Month" ? monthLabel : weekLabel}</span>
					</div>
					<Button
						variant="outline"
						size="icon"
						onclick={() => (view === "Month" ? goNextMonth() : goNextWeek())}
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
					<Button variant="outline" size="sm" onclick={goToday}>
						Today
					</Button>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<Tooltip.Root>
						<Tooltip.Trigger class={buttonVariants({ variant: view === "Month" ? "default" : "outline", size: "icon" })} onclick={() => (view = "Month")}>
							<CalendarDays class="h-4 w-4" />
						</Tooltip.Trigger>
						<Tooltip.Content>Change to calendar view</Tooltip.Content>
					</Tooltip.Root>
					<Tooltip.Root>
						<Tooltip.Trigger class={buttonVariants({ variant: view === "Week" ? "default" : "outline", size: "icon" })} onclick={() => (view = "Week")}>
							<CalendarRange class="h-4 w-4" />
						</Tooltip.Trigger>
						<Tooltip.Content>Change to week view</Tooltip.Content>
					</Tooltip.Root>
					<Select.Root type="single" bind:value={filterArtifact}>
						<Select.Trigger class="w-32">Artifacts</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							{#each artifactOptions as option (option)}
								<Select.Item value={option} label={option}>{option}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Select.Root type="single" bind:value={filterOwner}>
						<Select.Trigger class="w-32">Owner</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							{#each ownerOptions as option (option)}
								<Select.Item value={option} label={option}>{option}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Select.Root type="single" bind:value={filterPhase}>
						<Select.Trigger class="w-32">Phase</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							{#each phaseOptions as phase (phase)}
								<Select.Item value={phase} label={phaseLabel(phase)}>{phaseLabel(phase)}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div class="grid gap-3 md:grid-cols-3">
				<div class="rounded-lg border border-border p-4">
					<div class="text-xs text-muted-foreground">Events today</div>
					<div class="mt-2 text-2xl font-semibold">{eventsToday}</div>
				</div>
				<div class="rounded-lg border border-border p-4">
					<div class="text-xs text-muted-foreground">Events late</div>
					<div class="mt-2 text-2xl font-semibold">{eventsLate}</div>
				</div>
				<div class="rounded-lg border border-border p-4">
					<div class="text-xs text-muted-foreground">Upcoming deadlines</div>
					<div class="mt-2 text-2xl font-semibold">{upcomingDeadlines}</div>
				</div>
			</div>

			<div class="grid gap-3">
				<div class="rounded-lg border border-border p-4">
					<div class="text-sm font-medium">Calendar view - {view}</div>
					{#if view === "Month"}
						<div class="mt-4 grid grid-cols-7 gap-2 text-sm text-muted-foreground">
							<span>Mon</span>
							<span>Tue</span>
							<span>Wed</span>
							<span>Thu</span>
							<span>Fri</span>
							<span>Sat</span>
							<span>Sun</span>
						</div>
						<div class="mt-2 grid grid-cols-7 gap-2">
							{#each monthDays as day (day.date)}
								<Popover.Root>
									<Popover.Trigger
										class={`flex h-28 flex-col gap-2 rounded-md border border-border p-2 text-left hover:bg-muted/40 ${
											selectedDay === day.date ? "bg-muted/50" : ""
										} ${day.inMonth ? "" : "text-muted-foreground/60"} ${
											day.date === today ? "border-primary/40 bg-primary/5" : ""
										}`}
										onclick={() => {
											selectedDay = day.date;
											setWeekFromDay(day.date);
										}}
									>
										<div class="text-sm font-medium">{day.label}</div>
										<div class="flex flex-col gap-1">
											{#each eventsByDay[day.date] ?? [] as event (event.id)}
												<div class="truncate rounded-sm bg-muted/50 px-1 py-0.5 text-[10px] text-muted-foreground">
													{event.title}
												</div>
											{/each}
										</div>
									</Popover.Trigger>
									<Popover.Content align="start" class="w-72">
										<div class="text-sm font-medium">Events on {day.date}</div>
										<div class="mt-3 flex flex-col gap-2">
											{#each eventsByDay[day.date] ?? [] as event (event.id)}
												<Tooltip.Root>
													<Tooltip.Trigger
														class="flex w-full items-center justify-between rounded-md border border-border px-2 py-1 text-left text-xs hover:bg-muted/40"
														onclick={() => openEventDetails(event)}
													>
														<div class="flex flex-col gap-1">
															<span class="font-medium">{event.title}</span>
															<span class="text-[10px] text-muted-foreground">
																{event.allDay ? "All day" : `${event.startTime ?? ""} - ${event.endTime ?? ""}`}
															</span>
														</div>
														<div class="flex items-center gap-2 text-[10px] text-muted-foreground">
															<Avatar.Root class="h-5 w-5">
																<Avatar.Fallback class="text-[10px]">
																	{event.owner
																		.split(" ")
																		.map((part) => part[0])
																		.join("")
																		.slice(0, 2)}
																</Avatar.Fallback>
															</Avatar.Root>
															<span>{event.owner}</span>
														</div>
													</Tooltip.Trigger>
													<Tooltip.Content>Click to know more</Tooltip.Content>
												</Tooltip.Root>
											{:else}
												<div class="text-xs text-muted-foreground">No events scheduled.</div>
											{/each}
										</div>
									</Popover.Content>
								</Popover.Root>
							{/each}
						</div>
					{:else}
						<div class="mt-4 max-h-130 overflow-auto">
							<div class="min-w-245 grid grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-x-3 gap-y-0 text-xs">
								<span></span>
								{#each weekDates as date (date)}
									<span class={`text-muted-foreground ${date === today ? "bg-primary/5 rounded-md px-1" : ""}`}>
										{date}
									</span>
								{/each}
								<div class="text-muted-foreground border-b border-border/60 py-2">All day</div>
								{#each weekDates as date (date)}
									<div class={`min-h-12 border-b border-border/60 p-2 text-left ${date === today ? "bg-primary/5" : ""}`}>
										{#each filteredEvents.filter((event) => event.start === date && event.allDay) as event (event.id)}
											<button
												type="button"
												class="mb-2 w-full rounded-md border border-border bg-muted/50 px-2 py-1 text-left text-[11px]"
												onclick={() => openEventDetails(event)}
											>
												<div class="font-medium">{event.title}</div>
												<div class="text-[10px] text-muted-foreground">All day</div>
											</button>
										{/each}
									</div>
								{/each}
								{#each timeSlots as slot (slot)}
									<div class="text-muted-foreground border-b border-border/60 py-3">{slot}</div>
									{#each weekDates as date (date)}
										<div class={`min-h-16 border-b border-border/60 p-2 text-left ${date === today ? "bg-primary/5" : ""}`}>
											{#each filteredEvents.filter((event) => event.start === date && event.startTime === slot) as event (event.id)}
												<button
													type="button"
													class="mb-2 w-full rounded-md border border-border bg-muted/50 px-2 py-1 text-left text-[11px]"
													onclick={() => openEventDetails(event)}
												>
													<div class="font-medium">{event.title}</div>
													<div class="text-[10px] text-muted-foreground">
														{event.startTime} - {event.endTime}
													</div>
												</button>
											{/each}
										</div>
									{/each}
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>

			{#if nextCursor || loadMoreError}
				<div class="flex flex-col items-start gap-2">
					{#if nextCursor}
						<Button variant="outline" size="sm" onclick={loadMoreEvents} disabled={isLoadingMore}>
							{isLoadingMore ? "Loading..." : "Load more events"}
						</Button>
					{/if}
					{#if loadMoreError}
						<p class="text-xs text-destructive">{loadMoreError}</p>
					{/if}
				</div>
			{/if}
		</section>
	</div>
</div>

<Dialog.Root bind:open={addEventOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create event</Dialog.Title>
			<Dialog.Description>Manual events are editable in the calendar.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-3">
			<div class="grid gap-2">
				<Label for="event-title">Event title</Label>
				<Input id="event-title" bind:value={newTitle} />
			</div>
			<div class="grid gap-2">
				<Label>Date</Label>
				<Popover.Root>
					<Popover.Trigger class={buttonVariants({ variant: "outline" })}>
						{newDateLabel}
					</Popover.Trigger>
					<Popover.Content class="p-0">
						<CalendarPicker type="single" bind:value={newDateValue} />
					</Popover.Content>
				</Popover.Root>
			</div>
			<div class="grid gap-2">
				<Label>Time</Label>
				<div class="flex items-center gap-2">
					<Input type="time" bind:value={newStartTime} disabled={newAllDay} />
					<span class="text-xs text-muted-foreground">to</span>
					<Input type="time" bind:value={newEndTime} disabled={newAllDay} />
				</div>
				<label class="flex items-center gap-2 text-xs text-muted-foreground">
					<input type="checkbox" bind:checked={newAllDay} />
					All day
				</label>
			</div>
			<div class="grid gap-2">
				<Label for="event-owner">Owner</Label>
				<Select.Root type="single" bind:value={newOwner}>
					<Select.Trigger id="event-owner">{newOwner}</Select.Trigger>
					<Select.Content>
						{#each ownerOptions as option (option)}
							<Select.Item value={option} label={option}>{option}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="grid gap-2">
				<Label for="event-phase">Phase</Label>
				<Select.Root type="single" bind:value={newPhase}>
					<Select.Trigger id="event-phase">{phaseLabel(newPhase)}</Select.Trigger>
					<Select.Content>
						{#each phaseChoices as phase (phase)}
							<Select.Item value={phase} label={phaseLabel(phase)}>{phaseLabel(phase)}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="grid gap-2">
				<Label for="event-kind">Event type</Label>
				<Select.Root type="single" bind:value={newKind}>
					<Select.Trigger id="event-kind">{newKind}</Select.Trigger>
					<Select.Content>
						{#each manualKinds as kind (kind)}
							<Select.Item value={kind} label={kind}>{kind}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if newKind === "Other"}
					<Input bind:value={newCustomKind} placeholder="Custom event type" />
				{/if}
			</div>
			<div class="grid gap-2">
				<Label>Description</Label>
				<Textarea rows={3} bind:value={newDescription} />
			</div>
			<div class="grid gap-2">
				<Label>Location / Link</Label>
				<Input bind:value={newLocation} placeholder="Room or URL" />
			</div>
			<div class="grid gap-2">
				<Label>Tags</Label>
				<Input bind:value={newTags} placeholder="Research, prototype, synthesis" />
			</div>
			<div class="grid gap-2">
				<Label>Linked artifacts</Label>
				<div class="flex flex-wrap items-center gap-2">
					{#each newLinked as item (item)}
						<Badge variant="outline">
							{item}
							<Button
								variant="ghost"
								size="sm"
								class="h-6 px-2 text-destructive hover:text-destructive"
								onclick={() => removeLinkedArtifact(item)}
							>
								Remove
							</Button>
						</Badge>
					{/each}
				</div>
				<Select.Root type="multiple" bind:value={newLinked}>
					<Select.Trigger class="w-64">
						{newLinked.length ? newLinked[newLinked.length - 1] : "Link artifact"}
					</Select.Trigger>
					<Select.Content>
						{#each linkedArtifactOptions as option (option)}
							<Select.Item value={option} label={option}>{option}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			{#if createError}
				<p class="text-xs text-destructive">{createError}</p>
			{/if}
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Button class={buttonVariants()} onclick={createEvent} disabled={!canCreateEvent || !newTitle.trim() || isCreatingEvent}>
				{isCreatingEvent ? "Creating..." : "Add event"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={eventDetailsOpen}>
	<Dialog.Content class="max-w-lg py-8">
		{#if selectedEvent}
			<div class="grid gap-3 text-sm">
				<div class="flex items-center justify-between gap-2">
					<span class="text-lg font-semibold">{selectedEvent.title}</span>
					<Badge variant="outline" class={eventTypeBadge(selectedEvent.type)}>
						{selectedEvent.type}
					</Badge>
				</div>
				<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<span>{selectedEvent.start}</span>
					<span>
						{selectedEvent.allDay
							? "All day"
							: `${selectedEvent.startTime ?? ""} - ${selectedEvent.endTime ?? ""}`}
					</span>
				</div>
				<div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
					<Badge variant="outline">{phaseLabel(selectedEvent.phase)}</Badge>
					{#if selectedEvent.eventKind}
						<Badge variant="outline">{selectedEvent.eventKind}</Badge>
					{/if}
					<Badge variant="outline">{selectedEvent.artifactType}</Badge>
				</div>
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<Avatar.Root class="h-6 w-6">
						<Avatar.Fallback class="text-[10px]">
							{selectedEvent.owner
								.split(" ")
								.map((part) => part[0])
								.join("")
								.slice(0, 2)}
						</Avatar.Fallback>
					</Avatar.Root>
					<span>{selectedEvent.owner}</span>
				</div>
				{#if selectedEvent.sourceTitle}
					<div class="text-xs text-muted-foreground">
						Source: <span class="text-foreground">{selectedEvent.sourceTitle}</span>
					</div>
				{/if}
				{#if selectedEvent.location}
					<div class="text-xs text-muted-foreground">
						Location/Link: <span class="text-foreground">{selectedEvent.location}</span>
					</div>
				{/if}
				{#if selectedEvent.description}
					<div class="text-xs text-muted-foreground">{selectedEvent.description}</div>
				{/if}
				<div class="grid gap-2">
					<div class="text-xs font-medium text-muted-foreground">Linked artifacts</div>
					{#if selectedEvent.linkedArtifacts?.length}
						<div class="flex flex-wrap gap-2">
							{#each selectedEvent.linkedArtifacts as item (item)}
								<Badge variant="outline">{item}</Badge>
							{/each}
						</div>
					{:else}
						<div class="text-xs text-muted-foreground">None linked.</div>
					{/if}
				</div>
				<div class="grid gap-2">
					<div class="text-xs font-medium text-muted-foreground">Tags</div>
					{#if selectedEvent.tags?.length}
						<div class="flex flex-wrap gap-2">
							{#each selectedEvent.tags as tag (tag)}
								<Badge variant="outline">{tag}</Badge>
							{/each}
						</div>
					{:else}
						<div class="text-xs text-muted-foreground">No tags.</div>
					{/if}
				</div>
				<div class="text-[11px] text-muted-foreground">
					Created: {selectedEvent.createdAt}
				</div>
			</div>
		{/if}
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Close</Dialog.Close>
			{#if selectedEvent}
				<a
					class={buttonVariants()}
					href={`/project/${projectId}/calendar/${selectedEvent.id}`}
				>
					Open event page
				</a>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
