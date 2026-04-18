import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	type MutationResult
} from "$lib/server/api/remote";

type IdeaPageInput = {
	projectId: string;
	ideaId: string;
};

type IdeaListInput = {
	projectId: string;
	status?: "Considered" | "Selected" | "Rejected" | "Archived";
	cursor?: string;
	limit?: number;
};

type IdeaListResult = {
	items: IdeaRow[];
	nextCursor: string | null;
};

type ProblemOption = {
	id: string;
	title: string;
	phase: "Define";
	href: string;
	status: "Draft" | "Locked" | "Archived";
};

type LinkedStory = {
	id: string;
	title: string;
	phase: "Empathize";
	href: string;
};

const createIdeaSchema = z.object({
	projectId: z.string().min(1),
	title: z.string().trim().min(1)
});

const selectIdeaSchema = z.object({
	projectId: z.string().min(1),
	ideaId: z.string().min(1)
});

const updateIdeaStatusSchema = z.object({
	projectId: z.string().min(1),
	ideaId: z.string().min(1),
	status: z.enum(["Considered", "Selected", "Rejected", "Archived"])
});

const updateIdeaSchema = z.object({
	projectId: z.string().min(1),
	ideaId: z.string().min(1),
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

const normalizeIdeaStatus = (value: string): IdeaStatus => {
	if (value === "Selected" || value === "Rejected" || value === "Archived") {
		return value;
	}
	return "Considered";
};

const normalizeIdeaPageStatus = (value: IdeaStatus): "Considered" | "Selected" | "Rejected" => {
	if (value === "Selected" || value === "Rejected") {
		return value;
	}
	return "Considered";
};

const mapProblemOption = (value: unknown): ProblemOption | null => {
	const row = asRecord(value);
	const id = asString(row.id);
	const title = asString(row.title);
	const href = asString(row.href);
	if (!id || !title || !href) {
		return null;
	}

	const statusRaw = asString(row.status);
	const status: ProblemOption["status"] =
		statusRaw === "Locked" || statusRaw === "Archived" ? statusRaw : "Draft";

	return {
		id,
		title,
		phase: "Define",
		href,
		status
	};
};

const mapLinkedStory = (value: unknown): LinkedStory | null => {
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

const buildIdeasPath = (input: IdeaListInput): string => {
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
	const basePath = `/projects/${encodePathSegment(input.projectId)}/ideas`;
	return query ? `${basePath}?${query}` : basePath;
};

export const getIdeas = query("unchecked", async (input: IdeaListInput): Promise<IdeaListResult> => {
	const cursor = typeof input.cursor === "string" ? input.cursor.trim() : "";
	const limit =
		typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
			? Math.trunc(input.limit)
			: 20;
	const payload = await remoteQueryRequest<{ items?: IdeaRow[]; next_cursor?: string | null }>({
		path: buildIdeasPath(input),
		method: "GET",
		cachePolicy: {
			namespace: "ideas-list",
			ttlMs: 20_000,
			keyParts: {
				project_id: input.projectId,
				status: input.status ?? null,
				cursor: cursor || null,
				limit,
				sort: "last_updated_desc"
			},
			tags: ["ideas-list", `project:${input.projectId}`]
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

export const getIdeaPageData = query("unchecked", async (input: IdeaPageInput) => {
	const payload = await remoteQueryRequest<{
		idea?: {
			id?: string;
			title?: string;
			status?: string;
			owner?: string;
			lastUpdated?: string;
		};
		detail?: Record<string, unknown>;
		reference?: {
			problemOptions?: unknown[];
			linkedStories?: unknown[];
			derivedPersonas?: unknown[];
		};
	}>({
		path: `/projects/${encodePathSegment(input.projectId)}/ideas/${encodePathSegment(input.ideaId)}`,
		method: "GET"
	});

	const idea = asRecord(payload.idea);
	const detail = asRecord(payload.detail);
	const reference = asRecord(payload.reference);
	const moduleContent = asRecord(detail.moduleContent);
	const rawStatus = normalizeIdeaStatus(asString(idea.status));
	const ideaStatus = normalizeIdeaPageStatus(rawStatus);

	return {
		problemOptions: (Array.isArray(reference.problemOptions) ? reference.problemOptions : [])
			.map(mapProblemOption)
			.filter((item): item is ProblemOption => item !== null),
		linkedStories: (Array.isArray(reference.linkedStories) ? reference.linkedStories : [])
			.map(mapLinkedStory)
			.filter((item): item is LinkedStory => item !== null),
		derivedPersonas: asStringArray(reference.derivedPersonas),
		idea: {
			title: asString(idea.title) || asString(detail.title),
			description: asString(detail.description),
			status: ideaStatus
		},
		metadata: {
			owner: asString(idea.owner),
			lastUpdated: asString(idea.lastUpdated)
		},
		selectedProblemId: asString(detail.selectedProblemId),
		activeModules: asStringArray(detail.activeModules),
		moduleContent: {
			approach: asString(moduleContent.approach),
			alternatives: asString(moduleContent.alternatives),
			tradeoffs: asString(moduleContent.tradeoffs),
			risks: asString(moduleContent.risks),
			assumptions: asString(moduleContent.assumptions)
		},
		notesText: asString(detail.notesText) || asString(detail.notes),
		isArchived: rawStatus === "Archived",
		summaryTitle: asString(detail.summaryTitle),
		summaryDescription: asString(detail.summaryDescription)
	};
});

export const createIdea = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<IdeaRow>> => {
		const parsed = createIdeaSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<IdeaRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/ideas`,
			method: "POST",
			body: {
				title: parsed.data.title
			}
		});
	}
);

export const updateIdea = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<IdeaRow>> => {
		const parsed = updateIdeaSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<IdeaRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/ideas/${encodePathSegment(parsed.data.ideaId)}`,
			method: "PATCH",
			body: {
				state: parsed.data.state
			}
		});
	}
);

export const selectIdea = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<IdeaRow>> => {
		const parsed = selectIdeaSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<IdeaRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/ideas/${encodePathSegment(parsed.data.ideaId)}/select`,
			method: "POST"
		});
	}
);

export const updateIdeaStatus = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<IdeaRow>> => {
		const parsed = updateIdeaStatusSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<IdeaRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/ideas/${encodePathSegment(parsed.data.ideaId)}/status`,
			method: "PATCH",
			body: {
				status: parsed.data.status
			}
		});
	}
);
