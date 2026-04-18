import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	type MutationResult
} from "$lib/server/api/remote";

type TaskPageInput = {
	projectId: string;
	taskId: string;
};

type TaskListInput = {
	projectId: string;
	status?: "Planned" | "In Progress" | "Completed" | "Abandoned";
	cursor?: string;
	limit?: number;
};

type TaskListResult = {
	items: TaskRow[];
	nextCursor: string | null;
};

type LinkedProblem = {
	id: string;
	title: string;
	phase: "Define";
	href: string;
	status: "Locked" | "Archived";
};

type LinkedContext = {
	type: "Persona" | "User Journey";
	title: string;
	detail: string;
	phase: "Empathize";
	href: string;
	status: "Active" | "Archived";
};

type LinkedIdeaOption = {
	id: string;
	title: string;
	phase: "Ideate";
	href: string;
	status: "Active" | "Rejected";
	problem: LinkedProblem;
	context: LinkedContext;
};

type AssigneeOption = {
	id: string;
	name: string;
	role: string;
};

const createTaskSchema = z.object({
	projectId: z.string().min(1),
	title: z.string().trim().min(1)
});

const updateTaskStatusSchema = z.object({
	projectId: z.string().min(1),
	taskId: z.string().min(1),
	status: z.enum(["Planned", "In Progress", "Completed", "Abandoned"])
});

const updateTaskSchema = z.object({
	projectId: z.string().min(1),
	taskId: z.string().min(1),
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

const normalizeTaskStatus = (value: string): TaskStatus => {
	if (value === "In Progress" || value === "Completed" || value === "Abandoned") {
		return value;
	}
	return "Planned";
};

const mapAssigneeOption = (value: unknown): AssigneeOption | null => {
	const row = asRecord(value);
	const id = asString(row.id);
	const name = asString(row.name);
	const role = asString(row.role);
	if (!id || !name || !role) {
		return null;
	}
	return { id, name, role };
};

const mapIdeaOption = (value: unknown): LinkedIdeaOption | null => {
	const row = asRecord(value);
	const id = asString(row.id);
	const title = asString(row.title);
	const href = asString(row.href);
	if (!id || !title || !href) {
		return null;
	}

	const problemRow = asRecord(row.problem);
	const contextRow = asRecord(row.context);
	const problemId = asString(problemRow.id);
	const problemTitle = asString(problemRow.title);
	const problemHref = asString(problemRow.href);
	if (!problemId || !problemTitle || !problemHref) {
		return null;
	}

	const problemStatusRaw = asString(problemRow.status);
	const problemStatus: LinkedProblem["status"] =
		problemStatusRaw === "Archived" ? "Archived" : "Locked";

	const contextTypeRaw = asString(contextRow.type);
	const contextType: LinkedContext["type"] =
		contextTypeRaw === "User Journey" ? "User Journey" : "Persona";

	const contextStatusRaw = asString(contextRow.status);
	const contextStatus: LinkedContext["status"] =
		contextStatusRaw === "Archived" ? "Archived" : "Active";

	const contextTitle = asString(contextRow.title);
	const contextHref = asString(contextRow.href);
	if (!contextTitle || !contextHref) {
		return null;
	}

	const statusRaw = asString(row.status);
	const status: LinkedIdeaOption["status"] = statusRaw === "Rejected" ? "Rejected" : "Active";

	return {
		id,
		title,
		phase: "Ideate",
		href,
		status,
		problem: {
			id: problemId,
			title: problemTitle,
			phase: "Define",
			href: problemHref,
			status: problemStatus
		},
		context: {
			type: contextType,
			title: contextTitle,
			detail: asString(contextRow.detail),
			phase: "Empathize",
			href: contextHref,
			status: contextStatus
		}
	};
};

const buildTasksPath = (input: TaskListInput): string => {
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
	const basePath = `/projects/${encodePathSegment(input.projectId)}/tasks`;
	return query ? `${basePath}?${query}` : basePath;
};

export const getTasks = query("unchecked", async (input: TaskListInput): Promise<TaskListResult> => {
	const cursor = typeof input.cursor === "string" ? input.cursor.trim() : "";
	const limit =
		typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
			? Math.trunc(input.limit)
			: 20;
	const payload = await remoteQueryRequest<{ items?: TaskRow[]; next_cursor?: string | null }>({
		path: buildTasksPath(input),
		method: "GET",
		cachePolicy: {
			namespace: "tasks-list",
			ttlMs: 20_000,
			keyParts: {
				project_id: input.projectId,
				status: input.status ?? null,
				cursor: cursor || null,
				limit,
				sort: "last_updated_desc"
			},
			tags: ["tasks-list", `tasks-list:${input.projectId}`]
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

export const getTaskPageData = query("unchecked", async (input: TaskPageInput) => {
	const payload = await remoteQueryRequest<{
		task?: {
			id?: string;
			title?: string;
			status?: string;
			owner?: string;
			deadline?: string;
		};
		detail?: Record<string, unknown>;
		reference?: {
			assigneeOptions?: unknown[];
			ideaOptions?: unknown[];
		};
	}>({
		path: `/projects/${encodePathSegment(input.projectId)}/tasks/${encodePathSegment(input.taskId)}`,
		method: "GET"
	});

	const task = asRecord(payload.task);
	const detail = asRecord(payload.detail);
	const reference = asRecord(payload.reference);
	const legacyAssignedToId = asString(detail.assignedToId);
	const assignedToIds = asStringArray(detail.assignedToIds);
	const normalizedAssignedToIds =
		assignedToIds.length > 0
			? assignedToIds
			: legacyAssignedToId
				? [legacyAssignedToId]
				: [];

	return {
		assigneeOptions: (Array.isArray(reference.assigneeOptions) ? reference.assigneeOptions : [])
			.map(mapAssigneeOption)
			.filter((item): item is AssigneeOption => item !== null),
		ideaOptions: (Array.isArray(reference.ideaOptions) ? reference.ideaOptions : [])
			.map(mapIdeaOption)
			.filter((item): item is LinkedIdeaOption => item !== null),
		task: {
			title: asString(task.title) || asString(detail.title),
			status: normalizeTaskStatus(asString(task.status)),
			assignedToIds: normalizedAssignedToIds,
			assignedToId: legacyAssignedToId || normalizedAssignedToIds[0] || "",
			selectedIdeaId: asString(detail.selectedIdeaId),
			deadline: asString(detail.deadline) || asString(task.deadline),
			hypothesis: asString(detail.hypothesis),
			planItems: asStringArray(detail.planItems),
			executionLinks: asStringArray(detail.executionLinks),
			notesText: asString(detail.notesText) || asString(detail.notes),
			activeModules: asStringArray(detail.activeModules),
			abandonReason: asString(detail.abandonReason),
			hasFeedback: Boolean(detail.hasFeedback)
		},
		metadata: {
			owner: asString(task.owner),
			lastUpdated: asString(task.lastUpdated)
		}
	};
});

export const createTask = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<TaskRow>> => {
		const parsed = createTaskSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<TaskRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/tasks`,
			method: "POST",
			body: {
				title: parsed.data.title
			}
		});
	}
);

export const updateTaskStatus = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<TaskRow>> => {
		const parsed = updateTaskStatusSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<TaskRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/tasks/${encodePathSegment(parsed.data.taskId)}/status`,
			method: "PATCH",
			body: {
				status: parsed.data.status
			}
		});
	}
);

export const updateTask = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<TaskRow>> => {
		const parsed = updateTaskSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<TaskRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/tasks/${encodePathSegment(parsed.data.taskId)}`,
			method: "PATCH",
			body: {
				state: parsed.data.state
			}
		});
	}
);
