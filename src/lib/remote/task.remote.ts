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
	slug: string;
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
	status: z.enum(["Planned", "In Progress", "Completed", "Abandoned", "Blocked"])
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
	if (
		value === "In Progress" ||
		value === "Completed" ||
		value === "Abandoned" ||
		value === "Blocked"
	) {
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

export const getTasks = query("unchecked", async (projectId: string): Promise<TaskRow[]> => {
	const payload = await remoteQueryRequest<{ items?: TaskRow[] }>({
		path: `/projects/${encodePathSegment(projectId)}/tasks`,
		method: "GET"
	});
	return Array.isArray(payload.items) ? payload.items : [];
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
		path: `/projects/${encodePathSegment(input.projectId)}/tasks/${encodePathSegment(input.slug)}`,
		method: "GET"
	});

	const task = asRecord(payload.task);
	const detail = asRecord(payload.detail);
	const reference = asRecord(payload.reference);

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
			assignedToId: asString(detail.assignedToId),
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
			method: "PUT",
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
			method: "PUT",
			body: {
				state: parsed.data.state
			}
		});
	}
);
