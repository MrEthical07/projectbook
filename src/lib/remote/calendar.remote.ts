import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { permissionActionIndex, permissionDomainIndex } from "$lib/constants/permissions";
import { datastore } from "$lib/server/data/datastore";
import { getTrustedProjectPermissionMask } from "$lib/server/auth/authorization";
import {
	calendarEventDetailData,
	calendarReferenceData
} from "$lib/server/data/calendar.data";
import { hasPerm } from "$lib/utils/permission";

type CalendarEventInput = {
	projectId: string;
	eventId: string;
};

type MutationResult<T> =
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: string;
	  };

const createEventSchema = z.object({
	projectId: z.string().min(1),
	actorId: z.string().min(1),
	title: z.string().min(1),
	start: z.string().min(1),
	end: z.string().min(1),
	allDay: z.boolean(),
	startTime: z.string().optional(),
	endTime: z.string().optional(),
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

const inProjectScope = (projectId: string, itemProjectId?: string) =>
	itemProjectId === projectId;

const projectExists = (projectId: string) =>
	datastore.projects.some((item) => item.id === projectId) ||
	datastore.workspace.projects.some((item) => item.id === projectId);

const requireProjectId = (projectId: string): string => {
	const scopedProjectId = projectId.trim();
	if (!scopedProjectId) {
		error(400, "Project id is required.");
	}
	if (!projectExists(scopedProjectId)) {
		error(404, "Project not found.");
	}
	return scopedProjectId;
};

const actorNameFor = (actorId: string): string | null => {
	if (datastore.workspace.user.id === actorId) return datastore.workspace.user.name;
	const member = datastore.team.members.find((item) => item.id === actorId);
	return member?.name ?? null;
};

const requiredString = (value: unknown, path: string): string => {
	if (typeof value !== "string") {
		error(500, `Calendar payload is missing '${path}'.`);
	}
	return value;
};

const requiredStringArray = (value: unknown, path: string): string[] => {
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
		error(500, `Calendar payload has invalid '${path}'.`);
	}
	return value;
};

const canCreateEvent = (permissionMask: PermissionMask) =>
	hasPerm(permissionMask, permissionDomainIndex.calendar, permissionActionIndex.create);
const canEditEvent = (permissionMask: PermissionMask) =>
	hasPerm(permissionMask, permissionDomainIndex.calendar, permissionActionIndex.edit);
const canDeleteEvent = (permissionMask: PermissionMask) =>
	hasPerm(permissionMask, permissionDomainIndex.calendar, permissionActionIndex.delete);

export const getCalendarData = query("unchecked", (projectId: string) => {
	const scopedProjectId = requireProjectId(projectId);
	return {
		events: datastore.calendar.filter((item) => inProjectScope(scopedProjectId, item.projectId)),
		reference: calendarReferenceData
	};
});

export const getCalendarEventData = query("unchecked", (input: CalendarEventInput) => {
	const scopedProjectId = requireProjectId(input.projectId);
	const event = datastore.calendar.find(
		(item) => item.id === input.eventId && inProjectScope(scopedProjectId, item.projectId)
	);
	if (!event) {
		error(404, "Calendar event not found.");
	}
	return {
		event: {
			...calendarEventDetailData,
			id: event.id,
			title: event.title,
			type: event.type,
			date: event.start,
			allDay: event.allDay,
			eventKind: typeof event.eventKind === "string" ? event.eventKind : "",
			description: typeof event.description === "string" ? event.description : "",
			location: typeof event.location === "string" ? event.location : "",
			linkedArtifacts: Array.isArray(event.linkedArtifacts) ? event.linkedArtifacts : [],
			tags: Array.isArray(event.tags) ? event.tags : [],
			owner: event.owner,
			createdAt: event.createdAt,
			lastEdited: event.lastEdited ?? event.createdAt
		},
		reference: calendarReferenceData
	};
});

export const createCalendarEvent = command(
	"unchecked",
	({ input }: { input: unknown }): MutationResult<CalendarEvent> => {
		const permissionMask = getTrustedProjectPermissionMask(input);
		if (!canCreateEvent(permissionMask)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = createEventSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const actorName = actorNameFor(parsed.data.actorId);
		if (!actorName) {
			return { success: false, error: "Invalid actor" };
		}
		const projectId = requireProjectId(parsed.data.projectId);
		const created: CalendarEvent = {
			id: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
			projectId,
			title: parsed.data.title.trim(),
			type: "Manual",
			start: parsed.data.start,
			end: parsed.data.end,
			startTime: parsed.data.allDay ? undefined : parsed.data.startTime,
			endTime: parsed.data.allDay ? undefined : parsed.data.endTime,
			allDay: parsed.data.allDay,
			owner: parsed.data.owner.trim(),
			phase: parsed.data.phase,
			artifactType: "Manual",
			description: parsed.data.description,
			location: parsed.data.location,
			eventKind: parsed.data.eventKind,
			linkedArtifacts: parsed.data.linkedArtifacts,
			tags: parsed.data.tags,
			createdAt: new Date().toISOString().slice(0, 10)
		};
		datastore.calendar.unshift(created);
		return { success: true, data: created };
	}
);

export const updateCalendarEvent = command(
	"unchecked",
	({ input }: { input: unknown }): MutationResult<CalendarEvent> => {
		const permissionMask = getTrustedProjectPermissionMask(input);
		if (!canEditEvent(permissionMask)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateEventSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const projectId = requireProjectId(parsed.data.projectId);
		const event = datastore.calendar.find(
			(item) => item.id === parsed.data.eventId && inProjectScope(projectId, item.projectId)
		);
		if (!event) {
			return { success: false, error: "Event not found" };
		}
		if (event.type === "Derived") {
			return { success: false, error: "Derived events are read-only" };
		}

		const state = parsed.data.state;

		if ("title" in state) {
			const title = String(state.title).trim();
			if (!title) {
				return { success: false, error: "Event title is required." };
			}
			event.title = title;
		}
		if ("date" in state) {
			const date = String(state.date).trim();
			if (!date) {
				return { success: false, error: "Event date is required." };
			}
			event.start = date;
			event.end = date;
		}
		if ("allDay" in state) {
			if (typeof state.allDay !== "boolean") {
				return { success: false, error: "Invalid all-day flag." };
			}
			event.allDay = state.allDay;
		}
		if ("startTime" in state && !event.allDay) {
			event.startTime = String(state.startTime).trim();
		}
		if ("endTime" in state && !event.allDay) {
			event.endTime = String(state.endTime).trim();
		}
		if ("owner" in state) {
			const owner = String(state.owner).trim();
			if (!owner) {
				return { success: false, error: "Event owner is required." };
			}
			event.owner = owner;
		}
		if ("phase" in state) {
			const phase = String(state.phase).trim();
			if (
				phase !== "Empathize" &&
				phase !== "Define" &&
				phase !== "Ideate" &&
				phase !== "Prototype" &&
				phase !== "Test" &&
				phase !== "None"
			) {
				return { success: false, error: "Invalid event phase." };
			}
			event.phase = phase;
		}
		if ("description" in state) {
			event.description = String(state.description);
		}
		if ("location" in state) {
			event.location = String(state.location);
		}
		if ("eventKind" in state) {
			const eventKind = String(state.eventKind).trim();
			if (!eventKind) {
				return { success: false, error: "Event type is required." };
			}
			event.eventKind = eventKind;
		}
		if ("linkedArtifacts" in state) {
			if (!Array.isArray(state.linkedArtifacts)) {
				return { success: false, error: "Linked artifacts must be an array." };
			}
			const linkedArtifacts = state.linkedArtifacts.map((item) => String(item));
			event.linkedArtifacts = linkedArtifacts;
		}
		if ("tags" in state) {
			if (!Array.isArray(state.tags)) {
				return { success: false, error: "Tags must be an array." };
			}
			const tags = state.tags.map((item) => String(item));
			event.tags = tags;
		}
		event.lastEdited = new Date().toISOString().slice(0, 10);

		return { success: true, data: event };
	}
);

export const deleteCalendarEvent = command(
	"unchecked",
	({ input }: { input: unknown }): MutationResult<{ eventId: string }> => {
		const permissionMask = getTrustedProjectPermissionMask(input);
		if (!canDeleteEvent(permissionMask)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = deleteEventSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const projectId = requireProjectId(parsed.data.projectId);
		const index = datastore.calendar.findIndex(
			(item) => item.id === parsed.data.eventId && inProjectScope(projectId, item.projectId)
		);
		if (index < 0) {
			return { success: false, error: "Event not found" };
		}
		if (datastore.calendar[index].type === "Derived") {
			return { success: false, error: "Derived events cannot be deleted" };
		}
		datastore.calendar.splice(index, 1);
		return { success: true, data: { eventId: parsed.data.eventId } };
	}
);
