import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	type MutationResult
} from "$lib/server/api/remote";

type FeedbackPageInput = {
	projectId: string;
	feedbackId: string;
};

type FeedbackListInput = {
	projectId: string;
	status?: "Active" | "Archived";
	outcome?: "Validated" | "Invalidated" | "Needs Iteration";
	cursor?: string;
	limit?: number;
};

type FeedbackListResult = {
	items: FeedbackRow[];
	nextCursor: string | null;
};

type LinkedArtifact = {
	id: string;
	title: string;
	type: "Task" | "Idea" | "Problem Statement";
	phase: "Prototype" | "Ideate" | "Define";
	href: string;
	status: "Active" | "Archived";
};

const createFeedbackSchema = z.object({
	projectId: z.string().min(1),
	title: z.string().trim().min(1)
});

const updateFeedbackSchema = z.object({
	projectId: z.string().min(1),
	feedbackId: z.string().min(1),
	state: z.record(z.string(), z.unknown())
});

const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const asStringArray = (value: unknown): string[] => {
	if (!Array.isArray(value)) {
		return [];
	}
	return value
		.map((item) => (typeof item === "string" ? item.trim() : ""))
		.filter((item) => item.length > 0);
};

const normalizeOutcome = (value: string): FeedbackOutcome => {
	if (value === "Validated" || value === "Invalidated") {
		return value;
	}
	return "Needs Iteration";
};

const mapLinkedArtifact = (value: unknown): LinkedArtifact | null => {
	const row = asRecord(value);
	const id = asString(row.id);
	const title = asString(row.title);
	const href = asString(row.href);
	if (!id || !title || !href) {
		return null;
	}

	const typeRaw = asString(row.type);
	const type: LinkedArtifact["type"] =
		typeRaw === "Task" || typeRaw === "Idea" || typeRaw === "Problem Statement"
			? typeRaw
			: "Task";

	const phaseRaw = asString(row.phase);
	const phase: LinkedArtifact["phase"] =
		phaseRaw === "Ideate" || phaseRaw === "Define" ? phaseRaw : "Prototype";

	const statusRaw = asString(row.status);
	const status: LinkedArtifact["status"] = statusRaw === "Archived" ? "Archived" : "Active";

	return {
		id,
		title,
		type,
		phase,
		href,
		status
	};
};

const buildFeedbackPath = (input: FeedbackListInput): string => {
	const search = new URLSearchParams();
	if (input.status) {
		search.set("status", input.status);
	}
	if (input.outcome) {
		search.set("outcome", input.outcome);
	}
	const cursor = typeof input.cursor === "string" ? input.cursor.trim() : "";
	if (cursor) {
		search.set("cursor", cursor);
	}
	if (typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0) {
		search.set("limit", String(Math.trunc(input.limit)));
	}
	const query = search.toString();
	const basePath = `/projects/${encodePathSegment(input.projectId)}/feedback`;
	return query ? `${basePath}?${query}` : basePath;
};

export const getFeedback = query("unchecked", async (input: FeedbackListInput): Promise<FeedbackListResult> => {
	const cursor = typeof input.cursor === "string" ? input.cursor.trim() : "";
	const limit =
		typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
			? Math.trunc(input.limit)
			: 20;
	const payload = await remoteQueryRequest<{ items?: FeedbackRow[]; next_cursor?: string | null }>({
		path: buildFeedbackPath(input),
		method: "GET",
		cachePolicy: {
			namespace: "feedback-list",
			ttlMs: 20_000,
			keyParts: {
				project_id: input.projectId,
				status: input.status ?? null,
				outcome: input.outcome ?? null,
				cursor: cursor || null,
				limit,
				sort: "created_date_desc"
			},
			tags: ["feedback-list", `feedback-list:${input.projectId}`]
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

export const getFeedbackPageData = query("unchecked", async (input: FeedbackPageInput) => {
	const payload = await remoteQueryRequest<{
		feedback?: {
			id?: string;
			title?: string;
			outcome?: string;
			status?: string;
			owner?: string;
			createdDate?: string;
			lastUpdated?: string;
		};
		metadata?: Record<string, unknown>;
		detail?: Record<string, unknown>;
		reference?: {
			taskOptions?: unknown[];
			ideaOptions?: unknown[];
			problemOptions?: unknown[];
		};
	}>({
		path: `/projects/${encodePathSegment(input.projectId)}/feedback/${encodePathSegment(input.feedbackId)}`,
		method: "GET"
	});

	const feedback = asRecord(payload.feedback);
	const metadata = asRecord(payload.metadata);
	const detail = asRecord(payload.detail);
	const reference = asRecord(payload.reference);
	const feedbackStatus = asString(feedback.status) || asString(detail.status);

	return {
		taskOptions: (Array.isArray(reference.taskOptions) ? reference.taskOptions : [])
			.map(mapLinkedArtifact)
			.filter((item): item is LinkedArtifact => item !== null),
		ideaOptions: (Array.isArray(reference.ideaOptions) ? reference.ideaOptions : [])
			.map(mapLinkedArtifact)
			.filter((item): item is LinkedArtifact => item !== null),
		problemOptions: (Array.isArray(reference.problemOptions) ? reference.problemOptions : [])
			.map(mapLinkedArtifact)
			.filter((item): item is LinkedArtifact => item !== null),
		feedback: {
			title: asString(feedback.title) || asString(detail.title),
			outcome: normalizeOutcome(asString(feedback.outcome) || asString(detail.outcome))
		},
		linkedArtifacts: (Array.isArray(detail.linkedArtifacts) ? detail.linkedArtifacts : [])
			.map(mapLinkedArtifact)
			.filter((item): item is LinkedArtifact => item !== null),
		observation: asString(detail.observation),
		interpretation: asString(detail.interpretation),
		notesText: asString(detail.notesText) || asString(detail.notes),
		activeModules: asStringArray(detail.activeModules),
		evidenceText: asString(detail.evidenceText),
		evidenceLocked: detail.evidenceLocked !== false,
		nextStepsText: asString(detail.nextStepsText),
		isArchived: feedbackStatus === "Archived",
		metadata: {
			owner: asString(metadata.owner) || asString(feedback.owner),
			createdBy: asString(metadata.createdBy) || asString(feedback.owner),
			createdAt: asString(metadata.createdAt) || asString(feedback.createdDate),
			lastEditedBy: asString(metadata.lastEditedBy) || asString(feedback.owner),
			lastEditedAt: asString(metadata.lastEditedAt) || asString(feedback.lastUpdated),
			lastUpdated: asString(metadata.lastUpdated) || asString(feedback.lastUpdated),
			createdDate: asString(feedback.createdDate)
		}
	};
});

export const createFeedback = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<FeedbackRow>> => {
		const parsed = createFeedbackSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<FeedbackRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/feedback`,
			method: "POST",
			body: {
				title: parsed.data.title
			}
		});
	}
);

export const updateFeedback = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<FeedbackRow>> => {
		const parsed = updateFeedbackSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<FeedbackRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/feedback/${encodePathSegment(parsed.data.feedbackId)}`,
			method: "PATCH",
			body: {
				state: parsed.data.state
			}
		});
	}
);
