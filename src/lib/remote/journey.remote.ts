import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	type MutationResult
} from "$lib/server/api/remote";

type JourneyPageInput = {
	projectId: string;
	journeyId: string;
};

type JourneyListInput = {
	projectId: string;
	status?: "Draft" | "Locked" | "Archived";
	cursor?: string;
	limit?: number;
};

type JourneyListResult = {
	items: JourneyRow[];
	nextCursor: string | null;
};

type ArtifactMetadata = {
	owner: string;
	createdBy: string;
	createdAt: string;
	lastEditedBy: string;
	lastEditedAt: string;
	lastUpdated: string;
};

const createJourneySchema = z.object({
	projectId: z.string().min(1),
	title: z.string().trim().min(1)
});

const updateJourneySchema = z.object({
	projectId: z.string().min(1),
	journeyId: z.string().min(1),
	journey: z.record(z.string(), z.unknown())
});

const defaultJourneyDraft = {
	title: "",
	description: "",
	status: "draft",
	persona: {
		name: "",
		bio: "",
		role: "",
		age: 0,
		job: "",
		edu: ""
	},
	context: "",
	stages: [],
	notes: ""
};

const asString = (value: unknown): string =>
	typeof value === "string" ? value.trim() : "";

const normalizeJourneyStatus = (value: unknown): "draft" | "locked" | "archived" => {
	const normalized = asString(value).toLowerCase();
	if (normalized === "locked") {
		return "locked";
	}
	if (normalized === "archived") {
		return "archived";
	}
	return "draft";
};

const toApiJourneyStatus = (value: unknown): "Draft" | "Locked" | "Archived" | null => {
	const normalized = asString(value).toLowerCase();
	if (normalized === "draft") {
		return "Draft";
	}
	if (normalized === "locked") {
		return "Locked";
	}
	if (normalized === "archived") {
		return "Archived";
	}
	return null;
};

const mapJourneyMetadata = (
	payload: Record<string, unknown>,
	journeyPayload: { owner?: unknown; lastUpdated?: unknown }
): ArtifactMetadata => {
	const owner = asString(payload.owner) || asString(journeyPayload.owner);
	const createdBy = asString(payload.createdBy) || owner;
	const createdAt = asString(payload.createdAt);
	const lastEditedBy = asString(payload.lastEditedBy) || owner;
	const lastEditedAt =
		asString(payload.lastEditedAt) || asString(journeyPayload.lastUpdated);
	const lastUpdated =
		asString(payload.lastUpdated) || asString(journeyPayload.lastUpdated);

	return {
		owner,
		createdBy,
		createdAt,
		lastEditedBy,
		lastEditedAt,
		lastUpdated
	};
};

const buildJourneysPath = (input: JourneyListInput): string => {
	const search = new URLSearchParams();
	if (input.status) {
		search.set("status", input.status);
	}
	const cursor = typeof input.cursor === "string" ? input.cursor.trim() : "";
	if (cursor) {
		search.set("cursor", cursor);
	}
	if (typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0) {
		search.set("limit", String(Math.trunc(input.limit)));
	}
	const query = search.toString();
	const basePath = `/projects/${encodePathSegment(input.projectId)}/journeys`;
	return query ? `${basePath}?${query}` : basePath;
};

export const getJourneys = query("unchecked", async (input: JourneyListInput): Promise<JourneyListResult> => {
	const cursor = typeof input.cursor === "string" ? input.cursor.trim() : "";
	const limit =
		typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
			? Math.trunc(input.limit)
			: 20;
	const payload = await remoteQueryRequest<{ items?: JourneyRow[]; next_cursor?: string | null }>({
		path: buildJourneysPath(input),
		method: "GET",
		cachePolicy: {
			namespace: "journeys-list",
			ttlMs: 20_000,
			keyParts: {
				project_id: input.projectId,
				status: input.status ?? null,
				cursor: cursor || null,
				limit,
				sort: "last_updated_desc"
			},
			tags: ["journeys-list", `project:${input.projectId}`]
		}
	});
	return {
		items: Array.isArray(payload.items) ? payload.items : [],
		nextCursor:
			typeof payload.next_cursor === "string" && payload.next_cursor.trim().length > 0
				? payload.next_cursor
				: null
	};
});

export const getJourneyPageData = query("unchecked", async (input: JourneyPageInput) => {
	const payload = await remoteQueryRequest<{
		journey?: { title?: string; status?: string; owner?: string; lastUpdated?: string };
		metadata?: Record<string, unknown>;
		detail?: Record<string, unknown>;
		emotionOptions?: string[];
	}>({
		path: `/projects/${encodePathSegment(input.projectId)}/journeys/${encodePathSegment(input.journeyId)}`,
		method: "GET"
	});

	const detail = payload.detail ?? {};
	const metadataPayload =
		payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
	const journey = {
		...defaultJourneyDraft,
		...detail,
		title:
			typeof payload.journey?.title === "string"
				? payload.journey.title
				: (detail.title as string | undefined) ?? defaultJourneyDraft.title,
		status: normalizeJourneyStatus(
			(detail.status as string | undefined) ?? payload.journey?.status ?? "Draft"
		)
	};

	return {
		journey,
		metadata: mapJourneyMetadata(metadataPayload, payload.journey ?? {}),
		emotions: Array.isArray(payload.emotionOptions) ? payload.emotionOptions : []
	};
});

export const createJourney = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<JourneyRow>> => {
		const parsed = createJourneySchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<JourneyRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/journeys`,
			method: "POST",
			body: {
				title: parsed.data.title
			}
		});
	}
);

export const updateJourney = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<JourneyRow>> => {
		const parsed = updateJourneySchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const journeyPayload = structuredClone(parsed.data.journey) as Record<string, unknown>;
		const canonicalStatus = toApiJourneyStatus(journeyPayload.status);
		if (canonicalStatus) {
			journeyPayload.status = canonicalStatus;
		}

		return remoteMutationRequest<JourneyRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/journeys/${encodePathSegment(parsed.data.journeyId)}`,
			method: "PATCH",
			body: {
				journey: journeyPayload
			}
		});
	}
);
