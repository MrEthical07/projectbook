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
	slug: string;
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

export const getProblems = query("unchecked", async (projectId: string): Promise<ProblemRow[]> => {
	const payload = await remoteQueryRequest<{ items?: ProblemRow[] }>({
		path: `/projects/${encodePathSegment(projectId)}/problems`,
		method: "GET"
	});
	return Array.isArray(payload.items) ? payload.items : [];
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
		};
	}>({
		path: `/projects/${encodePathSegment(input.projectId)}/problems/${encodePathSegment(input.slug)}`,
		method: "GET"
	});

	const problem = asRecord(payload.problem);
	const metadata = asRecord(payload.metadata);
	const detail = asRecord(payload.detail);
	const reference = asRecord(payload.reference);

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
			personas: [],
			context: "",
			painPoints: [],
			journeyPainPoints: []
		},
		linkedSources: (Array.isArray(detail.linkedSources) ? detail.linkedSources : [])
			.map(mapLinkedSource)
			.filter((item): item is LinkedSource => item !== null),
		selectedPainPoints: asStringArray(detail.selectedPainPoints),
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
			method: "PUT",
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
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/problems/${encodePathSegment(parsed.data.problemId)}/lock`,
			method: "POST"
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
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/problems/${encodePathSegment(parsed.data.problemId)}/status`,
			method: "PUT",
			body: {
				status: parsed.data.status
			}
		});
	}
);
