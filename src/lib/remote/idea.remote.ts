import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { datastore } from "$lib/server/data/datastore";
import { getStoryCachedDetail } from "$lib/server/data/story-cache";
import { getJourneyCachedDetail } from "$lib/server/data/journey-cache";

type IdeaPageInput = {
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

const createIdeaSchema = z.object({
	projectId: z.string().min(1),
	actorId: z.string().min(1),
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

const statusTransitions: Record<IdeaRow["status"], IdeaRow["status"][]> = {
	Considered: ["Considered", "Selected", "Rejected", "Archived"],
	Selected: ["Selected", "Archived", "Considered"],
	Rejected: ["Rejected", "Archived", "Considered"],
	Archived: ["Archived", "Considered"]
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

const canCreateIdea = (permissions: EffectivePermissions) => permissions?.idea?.create === true;
const canEditIdea = (permissions: EffectivePermissions) => permissions?.idea?.edit === true;
const canChangeIdeaStatus = (permissions: EffectivePermissions) =>
	permissions?.idea?.statusChange === true;
const canTransition = (current: IdeaRow["status"], next: IdeaRow["status"]) =>
	statusTransitions[current]?.includes(next) ?? false;

type IdeaEditorState = {
	title: string;
	description: string;
	ideaStatus: "Considered" | "Selected" | "Rejected";
	isArchived: boolean;
	summaryTitle: string;
	summaryDescription: string;
	notesText: string;
	selectedProblemId: string;
	activeModules: string[];
	moduleContent: Record<string, string>;
};

const ideaDetailsByKey = new Map<string, IdeaEditorState>();
const detailKey = (projectId: string, ideaId: string) =>
	`${projectId}:${ideaId}`;

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

export const getIdeas = query("unchecked", (projectId: string): IdeaRow[] => {
	const scopedProjectId = requireProjectId(projectId);
	return datastore.ideas.filter((item) => inProjectScope(scopedProjectId, item.projectId));
});

export const getIdeaPageData = query("unchecked", (input: IdeaPageInput) => {
	const scopedProjectId = requireProjectId(input.projectId);
	const key = detailKey(scopedProjectId, input.slug);
	const cached = ideaDetailsByKey.get(key);
	const row = datastore.ideas.find(
		(item) => item.id === input.slug && inProjectScope(scopedProjectId, item.projectId)
	);
	if (!row) {
		error(404, "Idea not found.");
	}
	const rowStatus =
		row.status === "Archived"
			? "Considered"
			: (row.status as "Considered" | "Selected" | "Rejected");
	const resolvedTitle = row.title;
	const resolvedStatus = rowStatus;
	const resolvedDetails: IdeaEditorState = cached ?? {
		title: resolvedTitle,
		description: "",
		ideaStatus: resolvedStatus,
		isArchived: row.status === "Archived",
		summaryTitle: "",
		summaryDescription: "",
		notesText: "",
		selectedProblemId: "",
		activeModules: [],
		moduleContent: {}
	};
	const resolvedModuleContent: Record<string, string> = {
		approach: resolvedDetails.moduleContent.approach ?? "",
		alternatives: resolvedDetails.moduleContent.alternatives ?? "",
		tradeoffs: resolvedDetails.moduleContent.tradeoffs ?? "",
		risks: resolvedDetails.moduleContent.risks ?? "",
		assumptions: resolvedDetails.moduleContent.assumptions ?? ""
	};

	const problemOptions = datastore.problems
		.filter((p) => inProjectScope(scopedProjectId, p.projectId) && p.status === "Locked")
		.map((p) => ({
			id: p.id,
			title: p.statement,
			phase: "Define" as const,
			href: `/project/${scopedProjectId}/problem-statement/${p.id}`,
			status: p.status as "Locked" | "Draft"
		}));

	const selectedProblem = resolvedDetails.selectedProblemId
		? datastore.problems.find(
				(p) => p.id === resolvedDetails.selectedProblemId && inProjectScope(scopedProjectId, p.projectId)
			)
		: null;

	const linkedStories: Array<{ id: string; title: string; phase: string; href: string }> = [];
	const derivedPersonas: string[] = [];

	if (selectedProblem) {
		const linkedSources = selectedProblem.linkedSources ?? [];

		for (const story of datastore.stories.filter((s) => inProjectScope(scopedProjectId, s.projectId))) {
			if (sourceMatchesTitle(linkedSources, story.title, "story")) {
				linkedStories.push({
					id: story.id,
					title: story.title,
					phase: "Empathize",
					href: `/project/${scopedProjectId}/stories/${story.id}`
				});
				const cached = getStoryCachedDetail(scopedProjectId, story.id);
				const personaName = cached?.persona?.name ?? story.personaName ?? "";
				if (personaName && !derivedPersonas.includes(personaName)) {
					derivedPersonas.push(personaName);
				}
			}
		}

		for (const journey of datastore.journeys.filter((j) => inProjectScope(scopedProjectId, j.projectId))) {
			if (sourceMatchesTitle(linkedSources, journey.title, "journey")) {
				linkedStories.push({
					id: journey.id,
					title: journey.title,
					phase: "Empathize",
					href: `/project/${scopedProjectId}/journeys/${journey.id}`
				});
				const cached = getJourneyCachedDetail(scopedProjectId, journey.id);
				const personaName = cached?.persona?.name ?? journey.linkedPersonas?.[0] ?? "";
				if (personaName && !derivedPersonas.includes(personaName)) {
					derivedPersonas.push(personaName);
				}
			}
		}
	}

	return {
		problemOptions,
		linkedStories,
		derivedPersonas,
		idea: {
			title: resolvedTitle,
			description: resolvedDetails.description,
			status: resolvedStatus
		},
		metadata: {
			owner: row.owner,
			lastUpdated: row.lastUpdated
		},
		selectedProblemId: resolvedDetails.selectedProblemId,
		activeModules: resolvedDetails.activeModules,
		moduleContent: resolvedModuleContent,
		notesText: resolvedDetails.notesText,
		isArchived: resolvedDetails.isArchived,
		summaryTitle: resolvedDetails.summaryTitle,
		summaryDescription: resolvedDetails.summaryDescription
	};
});

export const createIdea = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<IdeaRow> => {
		if (!canCreateIdea(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = createIdeaSchema.safeParse(input);
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
			datastore.ideas
				.filter((item) => inProjectScope(projectId, item.projectId))
				.map((item) => item.id)
		);
		if (!id) {
			return {
				success: false,
				error: "Title must include letters or numbers."
			};
		}
		const created: IdeaRow = {
			id,
			projectId,
			title: parsed.data.title.trim(),
			linkedProblemStatement: "",
			persona: "",
			status: "Considered",
			tasksCount: 0,
			owner: actorName,
			lastUpdated: new Date().toISOString().slice(0, 10),
			linkedProblemLocked: false,
			isOrphan: true
		};
		datastore.ideas.unshift(created);
		return { success: true, data: created };
	}
);

export const updateIdea = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<IdeaRow> => {
		if (!canEditIdea(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateIdeaSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.ideas.find(
			(item) => item.id === parsed.data.ideaId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Idea not found" };
		}

		const state = parsed.data.state;

		const key = detailKey(projectId, parsed.data.ideaId);
		const existingDetails = ideaDetailsByKey.get(key);
		const currentIdeaStatus: "Considered" | "Selected" | "Rejected" =
			row.status === "Selected" || row.status === "Rejected" ? row.status : "Considered";
		let ideaStatus: "Considered" | "Selected" | "Rejected" = currentIdeaStatus;
		if ("ideaStatus" in state) {
			if (!canChangeIdeaStatus(permissions)) {
				return { success: false, error: "Permission denied: cannot change idea status." };
			}
			const ideaStatusRaw = String(state.ideaStatus).trim();
			if (
				ideaStatusRaw !== "Considered" &&
				ideaStatusRaw !== "Selected" &&
				ideaStatusRaw !== "Rejected"
			) {
				return { success: false, error: "Invalid idea status." };
			}
			ideaStatus = ideaStatusRaw;
		}
		let isArchived = row.status === "Archived";
		if ("isArchived" in state) {
			if (typeof state.isArchived !== "boolean") {
				return { success: false, error: "Invalid archive flag." };
			}
			if (state.isArchived !== isArchived && !canChangeIdeaStatus(permissions)) {
				return { success: false, error: "Permission denied: cannot change idea status." };
			}
			isArchived = state.isArchived;
		}
		const nextRowStatus: IdeaRow["status"] = isArchived ? "Archived" : ideaStatus;
		const hasSelectedProblem = "selectedProblemId" in state;
		const selectedProblemId = hasSelectedProblem
			? String(state.selectedProblemId).trim()
			: (existingDetails?.selectedProblemId ?? "");
		const matchedProblem = hasSelectedProblem && selectedProblemId
			? datastore.problems.find(
					(p) => p.id === selectedProblemId && inProjectScope(projectId, p.projectId) && p.status === "Locked"
				)
			: null;

		if ("title" in state) {
			const nextTitle = String(state.title).trim();
			if (!nextTitle) {
				return { success: false, error: "Title is required." };
			}
			row.title = nextTitle;
		}
		row.status = nextRowStatus;
		if (hasSelectedProblem) {
			if (!selectedProblemId) {
				row.linkedProblemStatement = "";
				row.linkedProblemLocked = false;
				row.isOrphan = true;
			} else {
				if (!matchedProblem) {
					return { success: false, error: "Linked problem statement was not found." };
				}
				row.linkedProblemStatement = matchedProblem.statement;
				row.linkedProblemLocked = matchedProblem.status === "Locked";
				row.isOrphan = false;
			}
		}
		row.lastUpdated = new Date().toISOString().slice(0, 10);

		const activeModules = Array.isArray(state.activeModules)
			? state.activeModules.map((item) => String(item))
			: (existingDetails?.activeModules ?? []);
		const moduleContent =
			state.moduleContent && typeof state.moduleContent === "object"
				? Object.fromEntries(
						Object.entries(state.moduleContent as Record<string, unknown>).map(([k, v]) => [
							k,
							String(v ?? "")
						])
					)
				: (existingDetails?.moduleContent ?? {});

		ideaDetailsByKey.set(key, {
			title: row.title,
			description:
				"description" in state
					? String(state.description)
					: (existingDetails?.description ?? ""),
			ideaStatus,
			isArchived,
			summaryTitle:
				"summaryTitle" in state
					? String(state.summaryTitle)
					: (existingDetails?.summaryTitle ?? ""),
			summaryDescription:
				"summaryDescription" in state
					? String(state.summaryDescription)
					: (existingDetails?.summaryDescription ?? ""),
			notesText:
				"notesText" in state
					? String(state.notesText)
					: (existingDetails?.notesText ?? ""),
			selectedProblemId,
			activeModules,
			moduleContent
		});

		return { success: true, data: row };
	}
);

export const selectIdea = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<IdeaRow> => {
		if (!canChangeIdeaStatus(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = selectIdeaSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.ideas.find(
			(item) => item.id === parsed.data.ideaId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Idea not found" };
		}
		if (!row.linkedProblemLocked) {
			return { success: false, error: "Only ideas linked to locked problems can be selected" };
		}
		if (!canTransition(row.status, "Selected")) {
			return { success: false, error: "Invalid status transition" };
		}
		row.status = "Selected";
		row.lastUpdated = new Date().toISOString().slice(0, 10);
		const details = ideaDetailsByKey.get(detailKey(projectId, parsed.data.ideaId));
		if (details) {
			ideaDetailsByKey.set(detailKey(projectId, parsed.data.ideaId), {
				...details,
				ideaStatus: "Selected",
				isArchived: false
			});
		}
		return { success: true, data: row };
	}
);

export const updateIdeaStatus = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<IdeaRow> => {
		if (!canChangeIdeaStatus(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateIdeaStatusSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.ideas.find(
			(item) => item.id === parsed.data.ideaId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Idea not found" };
		}
		if (parsed.data.status === "Selected" && !row.linkedProblemLocked) {
			return { success: false, error: "Only ideas linked to locked problems can be selected" };
		}
		if (!canTransition(row.status, parsed.data.status)) {
			return { success: false, error: "Invalid status transition" };
		}
		row.status = parsed.data.status;
		row.lastUpdated = new Date().toISOString().slice(0, 10);
		const details = ideaDetailsByKey.get(detailKey(projectId, parsed.data.ideaId));
		if (details) {
			const isArchived = parsed.data.status === "Archived";
			ideaDetailsByKey.set(detailKey(projectId, parsed.data.ideaId), {
				...details,
				ideaStatus: isArchived ? details.ideaStatus : (parsed.data.status as "Considered" | "Selected" | "Rejected"),
				isArchived
			});
		}
		return { success: true, data: row };
	}
);
