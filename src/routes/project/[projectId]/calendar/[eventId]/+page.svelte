<script lang="ts">
	import { getContext, onDestroy, untrack } from "svelte";
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
	import { Textarea } from "$lib/components/ui/textarea";
	import { parseDate, type DateValue } from "@internationalized/date";
	import { ArrowUpRight, Calendar, Trash2 } from "@lucide/svelte";
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { updateCalendarEvent, deleteCalendarEvent } from "$lib/remote/calendar.remote";
	import { can } from "$lib/utils/permission";

	type EventSourceType = "Derived" | "Manual";
	type ManualEventKind = "Workshop" | "Review" | "Testing Session" | "Meeting" | "Other";

	type CalendarEvent = {
		id: string;
		title: string;
		type: EventSourceType;
		date: string;
		allDay: boolean;
		owner: string;
		eventKind?: string;
		tags?: string[];
		description?: string;
		location?: string;
		linkedArtifacts?: string[];
		createdAt: string;
		lastEdited: string;
		sourceTitle?: string;
	};

	let { data } = $props();
	const required = <T>(value: T | null | undefined, field: string): T => {
		if (value === undefined || value === null) {
			throw new Error(`Calendar event payload is missing '${field}'.`);
		}
		return value;
	};
	const projectId = page.params.projectId;
	const eventId = page.params.eventId;
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canEditCalendar = can(permissions, "calendar", "edit");
	const canDeleteCalendar = can(permissions, "calendar", "delete");
	let manualKinds = $state<ManualEventKind[]>([]);
	let linkedArtifactOptions = $state<string[]>([]);

	const today = new Date().toISOString().split("T")[0];
	let event = $state<CalendarEvent>({
		id: "",
		title: "",
		type: "Manual",
		date: today,
		allDay: true,
		owner: "",
		eventKind: "Meeting",
		tags: [],
		description: "",
		location: "",
		linkedArtifacts: [],
		createdAt: today,
		lastEdited: today,
		sourceTitle: ""
	});

	let deleteOpen = $state(false);
	let eventDateValue = $state<DateValue>(parseDate(today));
	let tagsInput = $state("");
	let eventKindSelection = $state<ManualEventKind>("Meeting");
	let customEventKind = $state("");

	type SavePhase = "idle" | "saving" | "saved";
	let savePhase = $state<SavePhase>("idle");
	let savedSignature = $state("");
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;
	let saveReady = $state(false);

	let eventDateString = $derived.by(() => eventDateValue.toString());
	let parsedTags = $derived.by(() => parseTags(tagsInput));
	let currentEventKind = $derived.by(() =>
		eventKindSelection === "Other" ? customEventKind.trim() : eventKindSelection
	);
	let currentSignature = $derived(
		JSON.stringify({
			...event,
			date: eventDateString,
			eventKind: currentEventKind,
			tags: parsedTags,
		})
	);
	let isDirty = $derived(saveReady && currentSignature !== savedSignature);
	let isReadOnly = $derived(event.type === "Derived" || !canEditCalendar);
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

	const eventTypeBadge = (value: EventSourceType) =>
		value === "Derived"
			? "bg-slate-100 text-slate-700 border-slate-200"
			: "bg-emerald-100 text-emerald-700 border-emerald-200";
	const parseTags = (value: string) =>
		value
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean);

	const addLinkedArtifact = (value: string) => {
		if (!event.linkedArtifacts?.includes(value)) {
			event = { ...event, linkedArtifacts: [...(event.linkedArtifacts ?? []), value] };
		}
	};

	const removeLinkedArtifact = (value: string) => {
		event = {
			...event,
			linkedArtifacts: (event.linkedArtifacts ?? []).filter((item) => item !== value),
		};
	};

	const triggerSave = async () => {
		if (!permissions || !canEditCalendar) return;
		if (savePhase === "saving" || !isDirty) {
			return;
		}
		event = {
			...event,
			date: eventDateString,
			eventKind: currentEventKind,
			tags: parsedTags,
		};
		if (saveTimer) {
			clearTimeout(saveTimer);
		}
		if (savedBadgeTimer) {
			clearTimeout(savedBadgeTimer);
		}
		savePhase = "saving";
		try {
			const result = await updateCalendarEvent({
				input: {
					projectId,
					eventId,
					state: event
				}
			});
			if (!result.success) {
				savePhase = "idle";
				return;
			}
			savedSignature = currentSignature;
			savePhase = "saved";
			savedBadgeTimer = setTimeout(() => {
				if (!isDirty) {
					savePhase = "idle";
				}
			}, 1400);
		} catch (error) {
			console.error("Failed to save calendar event", error);
			savePhase = "idle";
		}
	};

	const deleteEvent = async () => {
		if (!permissions || !canDeleteCalendar) return;
		try {
			const result = await deleteCalendarEvent({
				input: {
					projectId,
					eventId
				}
			});
			if (!result.success) return;
			await goto(`/project/${projectId}/calendar`);
		} catch (error) {
			console.error("Failed to delete calendar event", error);
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

	const applyKindFromEvent = () => {
		const current = event.eventKind?.trim() ?? "";
		if (manualKinds.includes(current as ManualEventKind)) {
			eventKindSelection = current as ManualEventKind;
			customEventKind = "";
		} else {
			eventKindSelection = "Other";
			customEventKind = current;
		}
	};

	$effect(() => {
		const d = data;
		untrack(() => {
			manualKinds = structuredClone(d.eventData.reference.manualKinds) as ManualEventKind[];
			linkedArtifactOptions = structuredClone(d.eventData.reference.linkedArtifactOptions) as string[];
			const incomingEvent = required(d.eventData.event as CalendarEvent | undefined, "eventData.event");
			event = {
				...structuredClone(incomingEvent),
				date: required(incomingEvent.date, "event.date"),
				createdAt: required(incomingEvent.createdAt, "event.createdAt"),
				lastEdited: required(incomingEvent.lastEdited, "event.lastEdited")
			} as CalendarEvent;
			eventDateValue = parseDate(event.date);
			tagsInput = (event.tags ?? []).join(", ");
			applyKindFromEvent();
			deleteOpen = false;
			savePhase = "idle";
			savedSignature = JSON.stringify({
				...event,
				date: event.date,
				eventKind: event.eventKind?.trim() ?? "",
				tags: event.tags ?? []
			});
			saveReady = true;
		});
	});
</script>

<svelte:head>
	<title>{event.title || "Event"} • Calendar • ProjectBook</title>
	<meta
		name="description"
		content="View and manage this calendar event and related artifacts."
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
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="../calendar">Calendar</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{event.title}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-4 py-2 md:px-20">
		<div class="flex flex-col gap-2 rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				Calendar Event - {event.type}
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-3">
					<h1 class="text-3xl font-semibold">{event.title}</h1>
					<Badge variant="outline" class={eventTypeBadge(event.type)}>{event.type}</Badge>
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
					<Button size="sm" onclick={triggerSave} disabled={!canEditCalendar || savePhase === "saving" || !isDirty}>
						{savePhase === "saving" ? "Saving..." : "Save changes"}
					</Button>
					{#if event.type === "Derived"}
						<Button variant="outline" size="sm">
							<ArrowUpRight class="mr-2 h-4 w-4" />
							Go to source
						</Button>
					{:else}
						<Dialog.Root bind:open={deleteOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })} disabled={!canDeleteCalendar}>
								<Trash2 class="mr-2 h-4 w-4" />
								Delete
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Delete this event?</Dialog.Title>
									<Dialog.Description>
										This removes the manual event from the calendar.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close class={buttonVariants()} onclick={deleteEvent}>
										Delete
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					{/if}
				</div>
			</div>
		</div>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="flex items-center gap-2">
				<Calendar class="h-4 w-4 text-muted-foreground" />
				<span class="text-sm font-medium">Event details</span>
			</div>
			<div class="grid gap-4 md:grid-cols-2">
				<div class="grid gap-2">
					<Label>Title</Label>
					<Input bind:value={event.title} disabled={isReadOnly} />
				</div>
				<div class="grid gap-2">
					<Label>Date</Label>
					{#if isReadOnly}
						<Input value={eventDateString} disabled />
					{:else}
						<Popover.Root>
							<Popover.Trigger class={buttonVariants({ variant: "outline" })}>
								{eventDateString}
							</Popover.Trigger>
							<Popover.Content class="p-0">
								<CalendarPicker type="single" bind:value={eventDateValue} />
							</Popover.Content>
						</Popover.Root>
					{/if}
				</div>
				<div class="grid gap-2">
					<Label>Event type</Label>
					<Select.Root type="single" bind:value={eventKindSelection} disabled={isReadOnly}>
						<Select.Trigger>{eventKindSelection}</Select.Trigger>
						<Select.Content>
							{#each manualKinds as kind (kind)}
								<Select.Item value={kind} label={kind}>{kind}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if !isReadOnly && eventKindSelection === "Other"}
						<Input bind:value={customEventKind} placeholder="Custom event type" />
					{/if}
				</div>
				<div class="grid gap-2">
					<Label>Location / Link</Label>
					<Input bind:value={event.location} disabled={isReadOnly} />
				</div>
			</div>
			<div class="grid gap-2">
				<Label>Description</Label>
				<Textarea rows={4} bind:value={event.description} disabled={isReadOnly} />
			</div>
			<div class="grid gap-2">
				<Label>Tags</Label>
				<Input bind:value={tagsInput} disabled={isReadOnly} placeholder="Research, prototype, synthesis" />
			</div>
			<div class="grid gap-2">
				<Label>Linked artifacts</Label>
				<div class="flex flex-wrap items-center gap-2">
					{#each event.linkedArtifacts ?? [] as item (item)}
						<Badge variant="outline">
							{item}
							{#if !isReadOnly}
								<Button
									variant="ghost"
									size="sm"
									class="h-6 px-2 text-destructive hover:text-destructive"
									onclick={() => removeLinkedArtifact(item)}
								>
									Remove
								</Button>
							{/if}
						</Badge>
					{/each}
				</div>
				{#if !isReadOnly}
					<Select.Root type="single" onValueChange={(value) => addLinkedArtifact(value)}>
						<Select.Trigger class="w-64">
							{event.linkedArtifacts?.length
								? event.linkedArtifacts[event.linkedArtifacts.length - 1]
								: "Link artifact"}
						</Select.Trigger>
						<Select.Content>
							{#each linkedArtifactOptions as option (option)}
								<Select.Item value={option} label={option}>{option}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				{/if}
			</div>
			<Separator />
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<Avatar.Root class="h-6 w-6">
					<Avatar.Fallback class="text-[10px]">
						{event.owner
							.split(" ")
							.map((part) => part[0])
							.join("")
							.slice(0, 2)}
					</Avatar.Fallback>
				</Avatar.Root>
				<span>Created by {event.owner}</span>
				<span>- Created at {event.createdAt}</span>
				<span>- Last edited {event.lastEdited}</span>
			</div>
		</section>
	</div>
</div>
