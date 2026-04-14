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
	slug: string;
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

export const getFeedback = query("unchecked", async (projectId: string): Promise<FeedbackRow[]> => {
	const payload = await remoteQueryRequest<{ items?: FeedbackRow[] }>({
		path: `/projects/${encodePathSegment(projectId)}/feedback`,
		method: "GET"
	});
	return Array.isArray(payload.items) ? payload.items : [];
});

export const getFeedbackPageData = query("unchecked", async (input: FeedbackPageInput) => {
	const payload = await remoteQueryRequest<{
		feedback?: {
			id?: string;
			title?: string;
			outcome?: string;
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
		path: `/projects/${encodePathSegment(input.projectId)}/feedback/${encodePathSegment(input.slug)}`,
		method: "GET"
	});

	const feedback = asRecord(payload.feedback);
	const metadata = asRecord(payload.metadata);
	const detail = asRecord(payload.detail);
	const reference = asRecord(payload.reference);

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
		isArchived: false,
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
			method: "PUT",
			body: {
				state: parsed.data.state
			}
		});
	}
);
