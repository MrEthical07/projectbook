import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { datastore } from "$lib/server/data/datastore";
import { getTrustedProjectPermissions } from "$lib/server/auth/authorization";
import { getStoryCachedDetail } from "$lib/server/data/story-cache";
import { getJourneyCachedDetail } from "$lib/server/data/journey-cache";

type TaskPageInput = {
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

const createTaskSchema = z.object({
	projectId: z.string().min(1),
	actorId: z.string().min(1),
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

const statusTransitions: Record<TaskRow["status"], TaskRow["status"][]> = {
	Planned: ["Planned", "In Progress", "Abandoned"],
	"In Progress": ["In Progress", "Completed", "Blocked", "Abandoned"],
	Blocked: ["Blocked", "In Progress", "Abandoned"],
	Completed: ["Completed"],
	Abandoned: ["Abandoned"]
};

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

const uniqueId = (value: string, existing: string[]): string | null => {
	const base = slugify(value);
	if (!base) return null;
	if (!existing.includes(base)) return base;
	let suffix = 2;
	while (existing.includes(`${base}-${suffix}`)) {
		suffix += 1;
	}
	return `${base}-${suffix}`;
};

const actorNameFor = (actorId: string): string | null => {
	if (datastore.workspace.user.id === actorId) return datastore.workspace.user.name;
	const member = datastore.team.members.find((item) => item.id === actorId);
	return member?.name ?? null;
};

const canCreateTask = (permissions: EffectivePermissions) => permissions?.task?.create === true;
const canEditTask = (permissions: EffectivePermissions) => permissions?.task?.edit === true;
const canChangeTaskStatus = (permissions: EffectivePermissions) =>
	permissions?.task?.statusChange === true;
const canTransition = (current: TaskRow["status"], next: TaskRow["status"]) =>
	statusTransitions[current]?.includes(next) ?? false;

const taskDetailsByKey = new Map<string, Record<string, unknown>>();
const detailKey = (projectId: string, taskId: string) => `${projectId}:${taskId}`;

const sourceMatchesTitle = (
	linkedSources: string[],
	title: string,
	type: "story" | "journey"
) => {
	const normalizedTitle = title.trim().toLowerCase();
	if (!normalizedTitle) return false;
	const candidates =
		type === "story"
			? [
					normalizedTitle,
					`story: ${normalizedTitle}`,
					`user story: ${normalizedTitle}`
				]
			: [
					normalizedTitle,
					`journey: ${normalizedTitle}`,
					`user journey: ${normalizedTitle}`
				];

	return linkedSources.some((source) =>
		candidates.includes(source.trim().toLowerCase())
	);
};

export const getTasks = query("unchecked", (projectId: string): TaskRow[] => {
	const scopedProjectId = requireProjectId(projectId);
	return datastore.tasks.filter((item) => inProjectScope(scopedProjectId, item.projectId));
});

export const getTaskPageData = query("unchecked", (input: TaskPageInput) => {
	const scopedProjectId = requireProjectId(input.projectId);
	const row = datastore.tasks.find(
		(item) => item.id === input.slug && inProjectScope(scopedProjectId, item.projectId)
	);
	if (!row) {
		error(404, "Task not found.");
	}
	const key = detailKey(scopedProjectId, input.slug);
	const cached = taskDetailsByKey.get(key);
	const fallbackTask = {
		title: row.title,
		status: row.status as "Planned" | "In Progress" | "Completed" | "Abandoned" | "Blocked",
		assignedToId: "",
		selectedIdeaId: "",
		deadline: row.deadline,
		hypothesis: "",
		planItems: [""],
		executionLinks: [""],
		notesText: "",
		activeModules: ["plan", "execution"],
		abandonReason: "",
		hasFeedback: row.hasFeedback
	};
	const task = {
		...fallbackTask,
		...(cached ?? {})
	};
	task.title = row.title;
	task.deadline = row.deadline;
	task.hasFeedback = row.hasFeedback;
	task.status = row.status as "Planned" | "In Progress" | "Completed" | "Abandoned" | "Blocked";

	const assigneeOptions = datastore.team.members
		.filter((m) => inProjectScope(scopedProjectId, m.projectId))
		.map((m) => ({ id: m.id, name: m.name, role: m.role }));

	const ideaOptions = datastore.ideas
		.filter((idea) =>
			inProjectScope(scopedProjectId, idea.projectId) &&
			(idea.status === "Selected" || idea.status === "Considered")
		)
		.map((idea) => {
			const linkedProblem = idea.linkedProblemStatement
				? datastore.problems.find(
						(p) =>
							inProjectScope(scopedProjectId, p.projectId) &&
							p.statement === idea.linkedProblemStatement
					)
				: null;

			const problem = linkedProblem
				? {
						id: linkedProblem.id,
						title: linkedProblem.statement,
						phase: "Define" as const,
						href: `/project/${scopedProjectId}/problem-statement/${linkedProblem.id}`,
						status: linkedProblem.status as "Locked" | "Archived"
					}
				: {
						id: "",
						title: "No linked problem",
						phase: "Define" as const,
						href: "",
						status: "Draft" as "Locked" | "Archived"
					};

			let context: {
				type: "Persona" | "User Journey";
				title: string;
				detail: string;
				phase: "Empathize";
				href: string;
				status: "Active" | "Archived";
			} = {
				type: "Persona",
				title: idea.persona || "Unknown",
				detail: "",
				phase: "Empathize",
				href: "",
				status: "Active"
			};

			if (linkedProblem) {
				const linkedSources = linkedProblem.linkedSources ?? [];
				for (const story of datastore.stories.filter((s) => inProjectScope(scopedProjectId, s.projectId))) {
					if (sourceMatchesTitle(linkedSources, story.title, "story")) {
						const cached = getStoryCachedDetail(scopedProjectId, story.id);
						const personaName = cached?.persona?.name ?? story.personaName ?? "";
						context = {
							type: "Persona",
							title: personaName || story.title,
							detail: cached?.context ?? "",
							phase: "Empathize",
							href: `/project/${scopedProjectId}/stories/${story.id}`,
							status: story.status === "Archived" ? "Archived" : "Active"
						};
						break;
					}
				}

				if (!context.href) {
					for (const journey of datastore.journeys.filter((j) => inProjectScope(scopedProjectId, j.projectId))) {
						if (sourceMatchesTitle(linkedSources, journey.title, "journey")) {
							const cached = getJourneyCachedDetail(scopedProjectId, journey.id);
							const personaName = cached?.persona?.name ?? journey.linkedPersonas?.[0] ?? "";
							context = {
								type: "User Journey",
								title: personaName || journey.title,
								detail: cached?.context ?? "",
								phase: "Empathize",
								href: `/project/${scopedProjectId}/journeys/${journey.id}`,
								status: journey.status === "Archived" ? "Archived" : "Active"
							};
							break;
						}
					}
				}
			}

			return {
				id: idea.id,
				title: idea.title,
				phase: "Ideate" as const,
				href: `/project/${scopedProjectId}/ideas/${idea.id}`,
				status: idea.status === "Selected" ? ("Active" as const) : ("Active" as const),
				problem,
				context
			};
		});

		return {
		assigneeOptions,
		ideaOptions,
		task,
		metadata: {
			owner: row.owner,
			lastUpdated: row.lastUpdated
		}
	};
});

export const createTask = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<TaskRow> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canCreateTask(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = createTaskSchema.safeParse(input);
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
			datastore.tasks
				.filter((item) => inProjectScope(projectId, item.projectId))
				.map((item) => item.id)
		);
		if (!id) {
			return {
				success: false,
				error: "Title must include letters or numbers."
			};
		}
		const created: TaskRow = {
			id,
			projectId,
			title: parsed.data.title.trim(),
			linkedIdea: "",
			linkedProblemStatement: "",
			persona: "",
			owner: actorName,
			deadline: new Date().toISOString().slice(0, 10),
			lastUpdated: new Date().toISOString().slice(0, 10),
			status: "Planned",
			ideaRejected: false,
			hasFeedback: false,
			isOrphan: true
		};
		datastore.tasks.unshift(created);
		return { success: true, data: created };
	}
);

export const updateTaskStatus = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<TaskRow> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canChangeTaskStatus(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateTaskStatusSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.tasks.find(
			(item) => item.id === parsed.data.taskId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Task not found" };
		}
		if (!canTransition(row.status, parsed.data.status)) {
			return { success: false, error: "Invalid status transition" };
		}
		row.status = parsed.data.status;
		row.lastUpdated = new Date().toISOString().slice(0, 10);
		return { success: true, data: row };
	}
);

export const updateTask = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<TaskRow> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canEditTask(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateTaskSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.tasks.find(
			(item) => item.id === parsed.data.taskId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Task not found" };
		}

		const candidate = parsed.data.state;

		if ("title" in candidate) {
			const title = String(candidate.title).trim();
			if (!title) {
				return { success: false, error: "Title is required." };
			}
			row.title = title;
		}

		if ("selectedIdeaId" in candidate) {
			const selectedIdeaId = String(candidate.selectedIdeaId).trim();
			if (!selectedIdeaId) {
				row.linkedIdea = "";
				row.linkedProblemStatement = "";
				row.persona = "";
				row.isOrphan = true;
			} else {
				const linkedIdeaRow = datastore.ideas.find(
					(item) => item.id === selectedIdeaId && inProjectScope(projectId, item.projectId) &&
						(item.status === "Selected" || item.status === "Considered")
				);
				if (!linkedIdeaRow) {
					return { success: false, error: "Selected idea was not found." };
				}
				const linkedProblem = linkedIdeaRow.linkedProblemStatement
					? datastore.problems.find(
							(p) => inProjectScope(projectId, p.projectId) && p.statement === linkedIdeaRow.linkedProblemStatement
						)
					: null;
				row.linkedIdea = linkedIdeaRow.title;
				row.linkedProblemStatement = linkedProblem?.statement ?? "";
				row.persona = linkedIdeaRow.persona || "";
				row.isOrphan = false;
			}
		}

		if ("deadline" in candidate) {
			const deadline = String(candidate.deadline).trim();
			if (!deadline) {
				return { success: false, error: "Deadline is required." };
			}
			row.deadline = deadline;
		}

		if ("hasFeedback" in candidate) {
			if (typeof candidate.hasFeedback !== "boolean") {
				return { success: false, error: "Invalid feedback status value." };
			}
			row.hasFeedback = candidate.hasFeedback;
		}
		row.lastUpdated = new Date().toISOString().slice(0, 10);

		taskDetailsByKey.set(
			detailKey(projectId, parsed.data.taskId),
			structuredClone({
				...candidate,
				title: row.title,
				deadline: row.deadline,
				hasFeedback: row.hasFeedback
			})
		);

		return { success: true, data: row };
	}
);
