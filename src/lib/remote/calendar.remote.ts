import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	type MutationResult
} from "$lib/server/api/remote";

type CalendarEventInput = {
	projectId: string;
	eventId: string;
};

type CalendarEventDetail = {
	id: string;
	title: string;
	type: "Derived" | "Manual";
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
	startTime?: string;
	endTime?: string;
};

const createEventSchema = z.object({
	projectId: z.string().min(1),
	title: z.string().trim().min(1),
	start: z.string().trim().min(1),
	end: z.string().trim().min(1),
	allDay: z.boolean(),
	startTime: z.string().trim().optional(),
	endTime: z.string().trim().optional(),
	owner: z.string().trim().min(1),
	phase: z.enum(["Empathize", "Define", "Ideate", "Prototype", "Test", "None"]),
	description: z.string(),
	location: z.string(),
	eventKind: z.string().trim().min(1),
	linkedArtifacts: z.array(z.string()),
	tags: z.array(z.string())
});

const updateEventSchema = z.object({
	projectId: z.string().min(1),
	eventId: z.string().min(1),
	state: z.record(z.string(), z.unknown())
});

const deleteEventSchema = z.object({
	projectId: z.string().min(1),
	eventId: z.string().min(1)
});

const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asStringArray = (value: unknown): string[] =>
	asArray(value)
		.map((item) => asString(item))
		.filter((item) => item.length > 0);

const normalizeEventType = (value: string): CalendarEventType =>
	value === "Derived" ? "Derived" : "Manual";

const normalizeArtifactType = (value: string): CalendarEvent["artifactType"] => {
	if (value === "Task" || value === "Feedback") {
		return value;
	}
	return "Manual";
};

const normalizePhase = (value: string): CalendarEvent["phase"] => {
	if (value === "Empathize" || value === "Define" || value === "Ideate" || value === "Prototype" || value === "Test") {
		return value;
	}
	return "None";
};

const mapListEvent = (value: unknown): CalendarEvent | null => {
	const row = asRecord(value);
	const id = asString(row.id);
	const title = asString(row.title);
	const start = asString(row.start);
	if (!id || !title || !start) {
		return null;
	}

	const createdAt = asString(row.createdAt) || start;
	const allDay = typeof row.allDay === "boolean" ? row.allDay : true;

	const event: CalendarEvent = {
		id,
		title,
		type: normalizeEventType(asString(row.type)),
		start,
		end: asString(row.end) || start,
		allDay,
		owner: asString(row.owner),
		phase: normalizePhase(asString(row.phase)),
		artifactType: normalizeArtifactType(asString(row.artifactType)),
		createdAt,
		sourceTitle: asString(row.sourceTitle) || undefined,
		description: asString(row.description) || undefined,
		location: asString(row.location) || undefined,
		eventKind: asString(row.eventKind) || undefined,
		linkedArtifacts: asStringArray(row.linkedArtifacts),
		tags: asStringArray(row.tags)
	};

	if (!allDay) {
		event.startTime = asString(row.startTime) || undefined;
		event.endTime = asString(row.endTime) || undefined;
	}

	return event;
};

const mapDetailEvent = (value: unknown): CalendarEventDetail | null => {
	const row = asRecord(value);
	const id = asString(row.id);
	const title = asString(row.title);
	const date = asString(row.date) || asString(row.start);
	if (!id || !title || !date) {
		return null;
	}

	const allDay = typeof row.allDay === "boolean" ? row.allDay : true;
	const event: CalendarEventDetail = {
		id,
		title,
		type: normalizeEventType(asString(row.type)),
		date,
		allDay,
		owner: asString(row.owner),
		eventKind: asString(row.eventKind) || undefined,
		tags: asStringArray(row.tags),
		description: asString(row.description) || undefined,
		location: asString(row.location) || undefined,
		linkedArtifacts: asStringArray(row.linkedArtifacts),
		createdAt: asString(row.createdAt) || date,
		lastEdited: asString(row.lastEdited) || asString(row.createdAt) || date,
		sourceTitle: asString(row.sourceTitle) || undefined
	};

	if (!allDay) {
		event.startTime = asString(row.startTime) || undefined;
		event.endTime = asString(row.endTime) || undefined;
	}

	return event;
};

const mapPhaseChoices = (value: unknown): CalendarEvent["phase"][] => {
	const output: CalendarEvent["phase"][] = [];
	for (const item of asArray(value)) {
		const phase = normalizePhase(asString(item));
		if (!output.includes(phase)) {
			output.push(phase);
		}
	}
	if (output.length === 0) {
		return ["None", "Empathize", "Define", "Ideate", "Prototype", "Test"];
	}
	return output;
};

const normalizeUpdateState = (value: unknown): Record<string, unknown> => {
	const state = { ...asRecord(value) };
	const date = asString(state.date);
	if (date) {
		state.start = date;
		state.end = date;
	}
	delete state.date;

	if (typeof state.title === "string") {
		state.title = state.title.trim();
	}
	if (typeof state.eventKind === "string") {
		state.eventKind = state.eventKind.trim();
	}
	if (typeof state.location === "string") {
		state.location = state.location.trim();
	}
	if (typeof state.startTime === "string") {
		state.startTime = state.startTime.trim();
	}
	if (typeof state.endTime === "string") {
		state.endTime = state.endTime.trim();
	}
	if (Array.isArray(state.linkedArtifacts)) {
		state.linkedArtifacts = asStringArray(state.linkedArtifacts);
	}
	if (Array.isArray(state.tags)) {
		state.tags = asStringArray(state.tags);
	}

	return state;
};

export const getCalendarData = query("unchecked", async (projectId: string) => {
	const payload = await remoteQueryRequest<{
		events?: unknown[];
		reference?: {
			phaseChoices?: unknown[];
			manualKinds?: unknown[];
			linkedArtifactOptions?: unknown[];
		};
	}>({
		path: `/projects/${encodePathSegment(projectId)}/calendar`,
		method: "GET"
	});

	const reference = asRecord(payload.reference);

	return {
		events: asArray(payload.events)
			.map(mapListEvent)
			.filter((item): item is CalendarEvent => item !== null),
		reference: {
			phaseChoices: mapPhaseChoices(reference.phaseChoices),
			manualKinds: asStringArray(reference.manualKinds),
			linkedArtifactOptions: asStringArray(reference.linkedArtifactOptions)
		}
	};
});

export const getCalendarEventData = query("unchecked", async (input: CalendarEventInput) => {
	const payload = await remoteQueryRequest<{
		event?: unknown;
		reference?: {
			phaseChoices?: unknown[];
			manualKinds?: unknown[];
			linkedArtifactOptions?: unknown[];
		};
	}>({
		path: `/projects/${encodePathSegment(input.projectId)}/calendar/${encodePathSegment(input.eventId)}`,
		method: "GET"
	});

	const reference = asRecord(payload.reference);
	const event = mapDetailEvent(payload.event);
	if (!event) {
		throw new Error("Calendar event payload is invalid");
	}

	return {
		event,
		reference: {
			phaseChoices: mapPhaseChoices(reference.phaseChoices),
			manualKinds: asStringArray(reference.manualKinds),
			linkedArtifactOptions: asStringArray(reference.linkedArtifactOptions)
		}
	};
});

export const createCalendarEvent = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<CalendarEvent>> => {
		const parsed = createEventSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const result = await remoteMutationRequest<Record<string, unknown>>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/calendar`,
			method: "POST",
			body: {
				title: parsed.data.title,
				start: parsed.data.start,
				end: parsed.data.end,
				allDay: parsed.data.allDay,
				startTime: parsed.data.startTime,
				endTime: parsed.data.endTime,
				owner: parsed.data.owner,
				phase: parsed.data.phase,
				description: parsed.data.description,
				location: parsed.data.location,
				eventKind: parsed.data.eventKind,
				linkedArtifacts: parsed.data.linkedArtifacts,
				tags: parsed.data.tags
			}
		});

		if (!result.success) {
			return result;
		}

		const merged = {
			id: asString(result.data.id),
			title: asString(result.data.title) || parsed.data.title,
			type: asString(result.data.type) || "Manual",
			start: asString(result.data.start) || parsed.data.start,
			end: asString(result.data.end) || parsed.data.end,
			allDay: typeof result.data.allDay === "boolean" ? result.data.allDay : parsed.data.allDay,
			startTime: asString(result.data.startTime) || parsed.data.startTime,
			endTime: asString(result.data.endTime) || parsed.data.endTime,
			owner: asString(result.data.owner) || parsed.data.owner,
			phase: asString(result.data.phase) || parsed.data.phase,
			artifactType: asString(result.data.artifactType) || "Manual",
			description: asString(result.data.description) || parsed.data.description,
			location: asString(result.data.location) || parsed.data.location,
			eventKind: asString(result.data.eventKind) || parsed.data.eventKind,
			linkedArtifacts: result.data.linkedArtifacts ?? parsed.data.linkedArtifacts,
			tags: result.data.tags ?? parsed.data.tags,
			createdAt: asString(result.data.createdAt) || parsed.data.start
		};

		const mapped = mapListEvent(merged);
		if (!mapped) {
			return { success: false, error: "Invalid event payload" };
		}
		return { success: true, data: mapped };
	}
);

export const updateCalendarEvent = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ id: string; title: string; lastEdited: string }>> => {
		const parsed = updateEventSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const state = normalizeUpdateState(parsed.data.state);
		return remoteMutationRequest<{ id: string; title: string; lastEdited: string }>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/calendar/${encodePathSegment(parsed.data.eventId)}`,
			method: "PUT",
			body: {
				state
			}
		});
	}
);

export const deleteCalendarEvent = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ eventId: string }>> => {
		const parsed = deleteEventSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ eventId: string }>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/calendar/${encodePathSegment(parsed.data.eventId)}`,
			method: "DELETE"
		});
	}
);
