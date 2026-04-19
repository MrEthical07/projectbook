import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	type MutationResult
} from "$lib/server/api/remote";

type ProblemPageInput = {
	projectId: string;
	problemId: string;
};

type ProblemListInput = {
	projectId: string;
	status?: "Draft" | "Locked" | "Archived";
	cursor?: string;
	limit?: number;
};

type ProblemListResult = {
	items: ProblemRow[];
	nextCursor: string | null;
};

type ProblemSourceOption = {
	id: string;
	title: string;
	phase: "Empathize";
	href: string;
};

type LinkedSource = {
	id: string;
	title: string;
	type: "User Story" | "User Journey";
	phase: "Empathize";
	href: string;
};

type SourcePainPoint = {
	id: string;
	text: string;
	sourceLabel: string;
};

const createProblemSchema = z.object({
	projectId: z.string().min(1),
	statement: z.string().trim().min(1)
});

const lockProblemSchema = z.object({
	projectId: z.string().min(1),
	problemId: z.string().min(1)
});

const updateProblemStatusSchema = z.object({
	projectId: z.string().min(1),
	problemId: z.string().min(1),
	status: z.enum(["Draft", "Locked", "Archived"])
});

const updateProblemSchema = z.object({
	projectId: z.string().min(1),
	problemId: z.string().min(1),
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

const normalizeProblemStatus = (value: string): ProblemStatus => {
	if (value === "Locked" || value === "Archived") {
		return value;
	}
	return "Draft";
};

const mapSourceOption = (value: unknown): ProblemSourceOption | null => {
	const row = asRecord(value);
	const id = asString(row.id);
	const title = asString(row.title);
	const href = asString(row.href);
	if (!id || !title || !href) {
		return null;
	}
	return {
		id,
		title,
		phase: "Empathize",
		href
	};
};

const mapLinkedSource = (value: unknown): LinkedSource | null => {
	const row = asRecord(value);
	const id = asString(row.id);
	const title = asString(row.title);
	const href = asString(row.href);
	if (!id || !title || !href) {
		return null;
	}

	const typeRaw = asString(row.type).toLowerCase();
	const type: LinkedSource["type"] =
		typeRaw.includes("journey") ? "User Journey" : "User Story";

	return {
		id,
		title,
		type,
		phase: "Empathize",
		href
	};
};

const mapSourcePainPoint = (value: unknown, index: number): SourcePainPoint | null => {
	const row = asRecord(value);
	const text = asString(row.text);
	const sourceLabel = asString(row.sourceLabel);
	if (!text || !sourceLabel) {
		return null;
	}

	const id = asString(row.id) || `pain-${index + 1}`;
	return { id, text, sourceLabel };
};

const mapSourcePersona = (
	value: unknown
): { name: string; description: string } | null => {
	const row = asRecord(value);
	const name = asString(row.name);
	if (!name) {
		return null;
	}
	return {
		name,
		description: asString(row.description)
	};
};

const mapPainInsight = (
	value: unknown
): { text: string; sourceLabel: string } | null => {
	const row = asRecord(value);
	const text = asString(row.text);
	const sourceLabel = asString(row.sourceLabel);
	if (!text || !sourceLabel) {
		return null;
	}
	return { text, sourceLabel };
};

const mapJourneyPainInsight = (
	value: unknown
): { text: string; journeyName: string; stageName: string } | null => {
	const row = asRecord(value);
	const text = asString(row.text);
	const journeyName = asString(row.journeyName);
	const stageName = asString(row.stageName);
	if (!text || !journeyName || !stageName) {
		return null;
	}
	return { text, journeyName, stageName };
};

const buildProblemsPath = (input: ProblemListInput): string => {
	const search = new URLSearchParams();
	if (input.status) {
		search.set("filter.status", input.status);
	}
	const cursor = typeof input.cursor === "string" ? input.cursor.trim() : "";
	if (cursor) {
		search.set("pagination.cursor", cursor);
	}
	if (typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0) {
		search.set("pagination.limit", String(Math.trunc(input.limit)));
	}
	const query = search.toString();
	const basePath = `/projects/${encodePathSegment(input.projectId)}/problems`;
	return query ? `${basePath}?${query}` : basePath;
};

export const getProblems = query("unchecked", async (input: ProblemListInput): Promise<ProblemListResult> => {
	const cursor = typeof input.cursor === "string" ? input.cursor.trim() : "";
	const limit =
		typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
			? Math.trunc(input.limit)
			: 20;
	const payload = await remoteQueryRequest<{ items?: ProblemRow[]; next_cursor?: string | null }>({
		path: buildProblemsPath(input),
		method: "GET",
		cachePolicy: {
			namespace: "problems-list",
			ttlMs: 20_000,
			keyParts: {
				project_id: input.projectId,
				status: input.status ?? null,
				cursor_present: cursor.length > 0,
				limit,
				sort: "last_updated_desc"
			},
			tags: ["problems-list", `problems-list:${input.projectId}`]
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

export const getProblemPageData = query("unchecked", async (input: ProblemPageInput) => {
	const payload = await remoteQueryRequest<{
		problem?: {
			id?: string;
			statement?: string;
			title?: string;
			status?: string;
			owner?: string;
			lastUpdated?: string;
		};
		metadata?: Record<string, unknown>;
		detail?: Record<string, unknown>;
		reference?: {
			storyOptions?: unknown[];
			journeyOptions?: unknown[];
			sourcePainPoints?: unknown[];
			sourceInsights?: {
				personas?: unknown[];
				context?: unknown;
				painPoints?: unknown[];
				journeyPainPoints?: unknown[];
			};
		};
	}>({
		path: `/projects/${encodePathSegment(input.projectId)}/problems/${encodePathSegment(input.problemId)}`,
		method: "GET"
	});

	const problem = asRecord(payload.problem);
	const metadata = asRecord(payload.metadata);
	const detail = asRecord(payload.detail);
	const reference = asRecord(payload.reference);
	const sourceInsights = asRecord(reference.sourceInsights);

	const title =
		asString(problem.statement) ||
		asString(problem.title) ||
		asString(detail.finalStatement) ||
		asString(detail.title);

	const moduleContent = asRecord(detail.moduleContent);

	return {
		storyOptions: (Array.isArray(reference.storyOptions) ? reference.storyOptions : [])
			.map(mapSourceOption)
			.filter((item): item is ProblemSourceOption => item !== null),
		journeyOptions: (Array.isArray(reference.journeyOptions) ? reference.journeyOptions : [])
			.map(mapSourceOption)
			.filter((item): item is ProblemSourceOption => item !== null),
		sourcePainPoints: (Array.isArray(reference.sourcePainPoints) ? reference.sourcePainPoints : [])
			.map(mapSourcePainPoint)
			.filter((item): item is SourcePainPoint => item !== null),
		sourceInsights: {
			personas: (Array.isArray(sourceInsights.personas) ? sourceInsights.personas : [])
				.map(mapSourcePersona)
				.filter((item): item is { name: string; description: string } => item !== null),
			context: asString(sourceInsights.context),
			painPoints: (Array.isArray(sourceInsights.painPoints) ? sourceInsights.painPoints : [])
				.map(mapPainInsight)
				.filter((item): item is { text: string; sourceLabel: string } => item !== null),
			journeyPainPoints: (
				Array.isArray(sourceInsights.journeyPainPoints)
					? sourceInsights.journeyPainPoints
					: []
			)
				.map(mapJourneyPainInsight)
				.filter(
					(item): item is { text: string; journeyName: string; stageName: string } =>
						item !== null
				)
		},
		linkedSources: (Array.isArray(detail.linkedSources) ? detail.linkedSources : [])
			.map(mapLinkedSource)
			.filter((item): item is LinkedSource => item !== null),
		selectedPainPoints: asStringArray(detail.selectedPainPoints),
		customPainPoints: asStringArray(detail.customPainPoints),
		activeModules: asStringArray(detail.activeModules),
		moduleContent: {
			why: asString(moduleContent.why),
			constraints: asString(moduleContent.constraints),
			success: asString(moduleContent.success),
			assumptions: asString(moduleContent.assumptions)
		},
		notesText: asString(detail.notesText) || asString(detail.notes),
		metadata: {
			owner: asString(metadata.owner) || asString(problem.owner),
			createdBy: asString(metadata.createdBy) || asString(problem.owner),
			createdAt: asString(metadata.createdAt),
			lastEditedBy: asString(metadata.lastEditedBy) || asString(problem.owner),
			lastEditedAt: asString(metadata.lastEditedAt) || asString(problem.lastUpdated),
			lastUpdated: asString(metadata.lastUpdated) || asString(problem.lastUpdated)
		},
		problem: {
			title,
			status: normalizeProblemStatus(asString(problem.status)),
			finalStatement: asString(detail.finalStatement) || title
		}
	};
});

export const createProblem = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<ProblemRow>> => {
		const parsed = createProblemSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<ProblemRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/problems`,
			method: "POST",
			body: {
				statement: parsed.data.statement
			}
		});
	}
);

export const updateProblem = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<ProblemRow>> => {
		const parsed = updateProblemSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<ProblemRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/problems/${encodePathSegment(parsed.data.problemId)}`,
			method: "PATCH",
			body: {
				state: parsed.data.state
			}
		});
	}
);

export const lockProblem = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<ProblemRow>> => {
		const parsed = lockProblemSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<ProblemRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/problems/${encodePathSegment(parsed.data.problemId)}`,
			method: "PATCH",
			body: {
				state: {
					status: "Locked"
				}
			}
		});
	}
);

export const updateProblemStatus = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<ProblemRow>> => {
		const parsed = updateProblemStatusSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<ProblemRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/problems/${encodePathSegment(parsed.data.problemId)}`,
			method: "PATCH",
			body: {
				state: {
					status: parsed.data.status
				}
			}
		});
	}
);
