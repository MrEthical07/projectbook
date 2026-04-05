import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { datastore } from "$lib/server/data/datastore";
import { getTrustedProjectPermissions } from "$lib/server/auth/authorization";
import {
	journeyDraftTemplateData,
	journeyEmotionsData
} from "$lib/server/data/journeys.data";
import {
	journeyDetailsByKey,
	journeyDetailKey
} from "$lib/server/data/journey-cache";

type JourneyPageInput = {
	projectId: string;
	slug: string;
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

const createJourneySchema = z.object({
	projectId: z.string().min(1),
	actorId: z.string().min(1),
	title: z.string().trim().min(1)
});

const updateJourneySchema = z.object({
	projectId: z.string().min(1),
	journeyId: z.string().min(1),
	journey: z.record(z.string(), z.unknown())
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

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");

const uniqueId = (title: string, existing: string[]): string | null => {
	const base = slugify(title);
	if (!base) return null;
	if (!existing.includes(base)) return base;
	let suffix = 2;
	while (existing.includes(`${base}-${suffix}`)) {
		suffix += 1;
	}
	return `${base}-${suffix}`;
};

const actorNameFor = (actorId: string): string | null => {
	if (datastore.workspace.user.id === actorId) {
		return datastore.workspace.user.name;
	}
	const member = datastore.team.members.find((item) => item.id === actorId);
	return member?.name ?? null;
};

const canCreateJourney = (permissions: EffectivePermissions) =>
	permissions?.story?.create === true;
const canEditJourney = (permissions: EffectivePermissions) =>
	permissions?.story?.edit === true;
const canChangeJourneyStatus = (permissions: EffectivePermissions) =>
	permissions?.story?.statusChange === true;

export const getJourneys = query("unchecked", (projectId: string): JourneyRow[] => {
	const scopedProjectId = requireProjectId(projectId);
	return datastore.journeys.filter((item) => inProjectScope(scopedProjectId, item.projectId));
});

export const getJourneyPageData = query("unchecked", (input: JourneyPageInput) => {
	const scopedProjectId = requireProjectId(input.projectId);
	const key = journeyDetailKey(scopedProjectId, input.slug);
	const cached = journeyDetailsByKey.get(key);
	const row = datastore.journeys.find(
		(item) => item.id === input.slug && inProjectScope(scopedProjectId, item.projectId)
	);
	if (!row) {
		error(404, "Journey not found.");
	}
	const baseJourney = {
		...journeyDraftTemplateData,
		title: row.title,
		status: row.status.toLowerCase(),
		persona: {
			...journeyDraftTemplateData.persona,
			name: row.linkedPersonas[0] ?? ""
		}
	};
	const journey = structuredClone(cached ?? baseJourney);
	journey.title = row.title;
	journey.status = String(row.status).toLowerCase();
	journey.persona = {
		...journey.persona,
		name: row.linkedPersonas[0] ?? ""
	};
	return {
		journey,
		emotions: journeyEmotionsData
	};
});

export const createJourney = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<JourneyRow> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canCreateJourney(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = createJourneySchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const actorName = actorNameFor(parsed.data.actorId);
		if (!actorName) {
			return { success: false, error: "Invalid actor" };
		}

		const projectId = requireProjectId(parsed.data.projectId);
		const id = uniqueId(
			parsed.data.title,
			datastore.journeys
				.filter((item) => inProjectScope(projectId, item.projectId))
				.map((item) => item.id)
		);
		if (!id) {
			return {
				success: false,
				error: "Title must include letters or numbers."
			};
		}

		const created: JourneyRow = {
			id,
			projectId,
			title: parsed.data.title.trim(),
			linkedPersonas: [],
			stagesCount: 0,
			painPointsCount: 0,
			owner: actorName,
			lastUpdated: new Date().toISOString().slice(0, 10),
			status: "Draft",
			isOrphan: true
		};

		datastore.journeys.unshift(created);
		return { success: true, data: created };
	}
);

export const updateJourney = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<JourneyRow> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canEditJourney(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateJourneySchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.journeys.find(
			(item) => item.id === parsed.data.journeyId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Journey not found" };
		}

		const candidate = parsed.data.journey;

		const persona =
			candidate.persona && typeof candidate.persona === "object"
				? (candidate.persona as Record<string, unknown>)
				: null;
		const stages = Array.isArray(candidate.stages) ? candidate.stages : [];
		const painPointsCount = stages.reduce((count, stage) => {
			if (!stage || typeof stage !== "object") return count;
			const points = (stage as { painPoints?: unknown }).painPoints;
			if (!Array.isArray(points)) return count;
			return count + points.filter((item) => String(item ?? "").trim().length > 0).length;
		}, 0);
		const personaName = String(persona?.name ?? "").trim();

		if ("title" in candidate) {
			const nextTitle = String(candidate.title).trim();
			if (!nextTitle) {
				return { success: false, error: "Title is required." };
			}
			row.title = nextTitle;
		}
		row.linkedPersonas = personaName ? [personaName] : [];
		row.stagesCount = stages.length;
		row.painPointsCount = painPointsCount;
		if ("status" in candidate) {
			const rawStatus = String(candidate.status).trim().toLowerCase();
			const currentStatus = row.status.toLowerCase();
			if (rawStatus !== currentStatus) {
				if (!canChangeJourneyStatus(permissions)) {
					return { success: false, error: "Permission denied: cannot change journey status." };
				}
				if (rawStatus !== "draft" && rawStatus !== "archived") {
					return { success: false, error: "Invalid journey status." };
				}
				row.status = rawStatus === "archived" ? "Archived" : "Draft";
			}
		}
		row.lastUpdated = new Date().toISOString().slice(0, 10);

		const templateKeys = Object.keys(journeyDraftTemplateData);
		const safeCandidate = Object.fromEntries(
			Object.entries(candidate).filter(([key]) => templateKeys.includes(key))
		);
		const normalizedJourney: typeof journeyDraftTemplateData = {
			...journeyDraftTemplateData,
			...safeCandidate,
			title: row.title,
			status: row.status.toLowerCase()
		};
		journeyDetailsByKey.set(
			journeyDetailKey(projectId, parsed.data.journeyId),
			structuredClone(normalizedJourney)
		);

		return { success: true, data: row };
	}
);
