<script lang="ts">
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { Calendar as CalendarPicker } from "$lib/components/ui/calendar";
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
	import { parseDate, getLocalTimeZone, today, type CalendarDate, startOfMonth, startOfWeek } from "@internationalized/date";
	import {
		Calendar as CalendarIcon,
		CalendarDays,
		CalendarRange,
		ChevronLeft,
		ChevronRight,
		Plus,
	} from "@lucide/svelte";
    import { store } from "$lib/stores.svelte";
    import type { CalendarEvent, ArtifactType, PhaseOption, ManualEventKind, CalendarEventSourceType } from "$lib/types";

	type CalendarView = "Month" | "Week";

	const phaseChoices: PhaseOption[] = [
		"None",
		"Empathize",
		"Define",
		"Ideate",
		"Prototype",
		"Test",
	];
	const manualKinds: ManualEventKind[] = [
		"Workshop",
		"Review",
		"Testing Session",
		"Meeting",
		"Other",
	];
	const linkedArtifactOptions = [
		"User Story - Streamline checkout",
		"Problem Statement - Reduce abandonment",
		"Idea - Timeline reminders",
		"Task - Prototype timeline",
		"Feedback - Reminder test",
		"Resource - Survey synthesis",
		"Page - Opportunity notes",
	];

    const localTimeZone = getLocalTimeZone();
	const todayDate = today(localTimeZone);
    const todayStr = todayDate.toString();

	const addDays = (dateStr: string, amount: number) => {
        try {
            return parseDate(dateStr).add({ days: amount }).toString();
        } catch (e) {
            return dateStr;
        }
	};

	let view = $state<CalendarView>("Month");
	let currentMonth = $state(todayDate);
	let selectedDay = $state(todayStr);
	let weekStart = $state(startOfWeek(todayDate, "en-US"));

	let filterArtifact = $state<ArtifactType | "All">("All");
	let filterOwner = $state<string | "All">("All");
	let filterPhase = $state<PhaseOption | "All">("All");

	const projectId = $derived(page.params.projectId ?? "");

    // Derived from store
    const events = $derived(store.events.filter(e => e.projectId === projectId));

	let addEventOpen = $state(false);
	let eventDetailsOpen = $state(false);
	let selectedEventId = $state<string | null>(null);

	let newTitle = $state("");
	let newDateValue = $state<CalendarDate>(todayDate);
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

    let timeError = $state("");

	const filteredEvents = $derived(
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

	const ownerOptions = $derived.by(() => {
		const list = Array.from(new Set(events.map((event) => event.owner))).filter(Boolean);
		return list.length ? list : ["Unassigned"];
	});
	const artifactOptions = $derived(
		Array.from(new Set(events.map((event) => event.artifactType))).filter(Boolean)
	);
	const phaseOptions = $derived(
		Array.from(new Set(events.map((event) => event.phase))).filter(Boolean)
	);
	const selectedEvent = $derived(
		selectedEventId ? events.find((event) => event.id === selectedEventId) ?? null : null
	);
	const newDateLabel = $derived.by(() => {
		if (!newDateValue) return "";
		return newDateValue.toDate(localTimeZone).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	});

	const startOfMonthDate = $derived(startOfMonth(currentMonth));
    const startOfMonthStr = $derived(startOfMonthDate.toString());

	const monthLabel = $derived(
        currentMonth.toDate(localTimeZone).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    );

	const monthDays = $derived.by(() => {
		// Calculate grid start (Sunday based)
        // In @internationalized/date, day of week is 0-6? No, getDay() depends on calendar.
        // Let's use startOfWeek
        const gridStart = startOfWeek(startOfMonthDate, "en-US");

		return Array.from({ length: 42 }, (_, index) => {
			const date = gridStart.add({ days: index });
			return {
				label: String(date.day),
				date: date.toString(),
				inMonth: date.month === currentMonth.month,
			};
		});
	});

	const weekDates = $derived(
		Array.from({ length: 7 }, (_, index) => weekStart.add({ days: index }).toString())
	);

	const weekLabel = $derived.by(() => {
		const end = weekStart.add({ days: 6 });
		const startLabel = weekStart.toDate(localTimeZone).toLocaleDateString("en-US", { month: "short", day: "numeric" });
		const endLabel = end.toDate(localTimeZone).toLocaleDateString("en-US", { month: "short", day: "numeric" });
		return `${startLabel} - ${endLabel}`;
	});

	const timeSlots = Array.from({ length: 9 }, (_, index) => `${9 + index}:00`);

	const eventsByDay = $derived(
		filteredEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
			const key = event.start;
			if (!acc[key]) acc[key] = [];
			acc[key].push(event);
			return acc;
		}, {})
	);

	const eventsToday = $derived(
		filteredEvents.filter((event) => event.start === todayStr).length
	);
	const eventsLate = $derived(
		filteredEvents.filter((event) => event.start < todayStr && event.type === "Manual").length
	);
	const upcomingDeadlines = $derived(
		filteredEvents.filter((event) => event.start > todayStr && event.type === "Derived").length
	);

	const eventTypeBadge = (value: CalendarEventSourceType) =>
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
		newTitle = "";
		newDateValue = todayDate;
		newStartTime = "10:00";
		newEndTime = "11:00";
		newAllDay = false;
		newOwner = ownerOptions[0] ?? "Unassigned";
		newPhase = "None";
		newKind = "Meeting";
		newCustomKind = "";
		newDescription = "";
		newLocation = "";
		newLinked = [];
		newTags = "";
        timeError = "";
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

	const createEvent = () => {
        timeError = "";
		if (!newTitle.trim()) {
			return;
		}
        if (!newAllDay && newEndTime <= newStartTime) {
            timeError = "End time must be after start time.";
            return;
        }

		const nextId = `evt-${crypto.randomUUID()}`;
		const eventKind =
			newKind === "Other" ? newCustomKind.trim() || "Other" : newKind;
		const tags = parseTags(newTags);

        const dateStr = newDateValue.toString();

        store.addEvent({
				id: nextId,
                projectId,
				title: newTitle.trim(),
				type: "Manual",
				start: dateStr,
				end: dateStr,
				startTime: newAllDay ? undefined : newStartTime,
				endTime: newAllDay ? undefined : newEndTime,
				allDay: newAllDay,
				owner: newOwner,
				phase: newPhase,
				artifactType: "Manual",
				description: newDescription,
				location: newLocation,
				eventKind,
				linkedArtifacts: newLinked,
				tags,
				createdAt: todayStr,
        });

		addEventOpen = false;
	};

	const goPrevMonth = () => {
        currentMonth = currentMonth.subtract({ months: 1 });
	};

	const goNextMonth = () => {
        currentMonth = currentMonth.add({ months: 1 });
	};

	const goPrevWeek = () => {
        weekStart = weekStart.subtract({ weeks: 1 });
	};

	const goNextWeek = () => {
        weekStart = weekStart.add({ weeks: 1 });
	};

	const goToday = () => {
        currentMonth = todayDate;
		selectedDay = todayStr;
        weekStart = startOfWeek(todayDate, "en-US");
	};

	onMount(() => {
        // Init logic if needed
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
					<Button size="sm" onclick={openAddEvent}>
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
											day.date === todayStr ? "border-primary/40 bg-primary/5" : ""
										}`}
										onclick={() => {
											selectedDay = day.date;
											// If we wanted to jump week view to this day:
                                            // weekStart = startOfWeek(parseDate(day.date), "en-US");
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
									<span class={`text-muted-foreground ${date === todayStr ? "bg-primary/5 rounded-md px-1" : ""}`}>
										{date}
									</span>
								{/each}
								<div class="text-muted-foreground border-b border-border/60 py-2">All day</div>
								{#each weekDates as date (date)}
									<div class={`min-h-12 border-b border-border/60 p-2 text-left ${date === todayStr ? "bg-primary/5" : ""}`}>
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
										<div class={`min-h-16 border-b border-border/60 p-2 text-left ${date === todayStr ? "bg-primary/5" : ""}`}>
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
                {#if timeError}
                    <div class="text-xs text-destructive">{timeError}</div>
                {/if}
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
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Button class={buttonVariants()} onclick={createEvent} disabled={!newTitle.trim()}>
				Add event
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
