import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { datastore } from "$lib/server/data/datastore";
import { getTrustedProjectPermissions } from "$lib/server/auth/authorization";
import { getStoryCachedDetail } from "$lib/server/data/story-cache";
import { storyDraftTemplateData } from "$lib/server/data/stories.data";
import { getJourneyCachedDetail } from "$lib/server/data/journey-cache";
import { journeyDraftTemplateData } from "$lib/server/data/journeys.data";

type ProblemPageInput = {
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

const createProblemSchema = z.object({
	projectId: z.string().min(1),
	actorId: z.string().min(1),
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

const statusTransitions: Record<ProblemRow["status"], ProblemRow["status"][]> = {
	Draft: ["Draft", "Locked", "Archived"],
	Locked: ["Locked", "Archived"],
	Archived: ["Archived", "Draft"]
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

const canCreateProblem = (permissions: EffectivePermissions) =>
	permissions?.problem?.create === true;
const canEditProblem = (permissions: EffectivePermissions) =>
	permissions?.problem?.edit === true;
const canChangeProblemStatus = (permissions: EffectivePermissions) =>
	permissions?.problem?.statusChange === true;

const canTransition = (current: ProblemRow["status"], next: ProblemRow["status"]) =>
	statusTransitions[current]?.includes(next) ?? false;

type ProblemEditorState = {
	title: string;
	finalStatement: string;
	selectedPainPoints: string[];
	linkedSources: Array<{ id: string; title: string; type: string; phase: string; href: string }>;
	activeModules: string[];
	moduleContent: Record<string, string>;
	notesText: string;
	status: ProblemRow["status"];
};

const problemDetailsByKey = new Map<string, ProblemEditorState>();
const detailKey = (projectId: string, problemId: string) =>
	`${projectId}:${problemId}`;

export const getProblems = query("unchecked", (projectId: string): ProblemRow[] => {
	const scopedProjectId = requireProjectId(projectId);
	return datastore.problems.filter((item) => inProjectScope(scopedProjectId, item.projectId));
});

export const getProblemPageData = query("unchecked", (input: ProblemPageInput) => {
	const scopedProjectId = requireProjectId(input.projectId);
	const key = detailKey(scopedProjectId, input.slug);
	const cached = problemDetailsByKey.get(key);
	const row = datastore.problems.find(
		(item) => item.id === input.slug && inProjectScope(scopedProjectId, item.projectId)
	);
	if (!row) {
		error(404, "Problem statement not found.");
	}
	const resolvedProblemTitle = row.statement;
	const resolvedDetails: ProblemEditorState = cached ?? {
		title: resolvedProblemTitle,
		finalStatement: resolvedProblemTitle,
		selectedPainPoints: [],
		linkedSources: [],
		activeModules: [],
		moduleContent: {},
		notesText: "",
		status: row.status
	};
	const resolvedModuleContent: Record<string, string> = {
		why: resolvedDetails.moduleContent.why ?? "",
		constraints: resolvedDetails.moduleContent.constraints ?? "",
		success: resolvedDetails.moduleContent.success ?? "",
		assumptions: resolvedDetails.moduleContent.assumptions ?? ""
	};

	// Dynamic story options from the datastore
	const storyOptions = datastore.stories
		.filter((s) => inProjectScope(scopedProjectId, s.projectId))
		.map((s) => ({
			id: s.id,
			title: s.title,
			phase: "Empathize" as const,
			href: `/project/${scopedProjectId}/stories/${s.id}`
		}));

	// Dynamic journey options from the datastore
	const journeyOptions = datastore.journeys
		.filter((j) => inProjectScope(scopedProjectId, j.projectId))
		.map((j) => ({
			id: j.id,
			title: j.title,
			phase: "Empathize" as const,
			href: `/project/${scopedProjectId}/journeys/${j.id}`
		}));

	// Compute source insights and pain points from linked sources
	// When no cached linked sources exist, use defaults matching the page's default linking logic
	let linkedSourcesForInsights = resolvedDetails.linkedSources;
	if (linkedSourcesForInsights.length === 0) {
		const defaults: typeof linkedSourcesForInsights = [];
		if (storyOptions[0]) {
			defaults.push({
				id: storyOptions[0].id,
				title: storyOptions[0].title,
				type: "User Story",
				phase: "Empathize",
				href: storyOptions[0].href
			});
		}
		if (journeyOptions[0]) {
			defaults.push({
				id: journeyOptions[0].id,
				title: journeyOptions[0].title,
				type: "User Journey",
				phase: "Empathize",
				href: journeyOptions[0].href
			});
		}
		linkedSourcesForInsights = defaults;
	}
	const sourceInsights: {
		personas: Array<{ name: string; description: string }>;
		context: string;
		painPoints: Array<{ text: string; sourceLabel: string }>;
		journeyPainPoints: Array<{ text: string; journeyName: string; stageName: string }>;
	} = {
		personas: [],
		context: "",
		painPoints: [],
		journeyPainPoints: []
	};

	const computedSourcePainPoints: Array<{ id: string; text: string; sourceLabel: string }> = [];
	let painPointCounter = 0;
	const contextParts: string[] = [];

	for (const source of linkedSourcesForInsights) {
		if (source.type === "User Story") {
			const storyRow = datastore.stories.find(
				(s) => s.id === source.id && inProjectScope(scopedProjectId, s.projectId)
			);
			if (storyRow) {
				const cachedStory = getStoryCachedDetail(scopedProjectId, storyRow.id);
				const detail = cachedStory ?? {
					...storyDraftTemplateData,
					title: storyRow.title,
					persona: { ...storyDraftTemplateData.persona, name: storyRow.personaName }
				};
				if (detail.persona.name) {
					sourceInsights.personas.push({
						name: detail.persona.name,
						description: detail.persona.bio || detail.persona.role || ""
					});
				}
				if (detail.context) {
					contextParts.push(detail.context);
				}
				for (const point of detail.painPoints) {
					const text = String(point ?? "").trim();
					if (text) {
						painPointCounter++;
						computedSourcePainPoints.push({
							id: `pain-${painPointCounter}`,
							text,
							sourceLabel: `User Story - ${detail.persona.name || storyRow.title}`
						});
						sourceInsights.painPoints.push({
							text,
							sourceLabel: `User Story - ${detail.persona.name || storyRow.title}`
						});
					}
				}
			}
		} else if (source.type === "User Journey") {
			const journeyRow = datastore.journeys.find(
				(j) => j.id === source.id && inProjectScope(scopedProjectId, j.projectId)
			);
			if (journeyRow) {
				const cachedJourney = getJourneyCachedDetail(scopedProjectId, journeyRow.id);
				const detail = cachedJourney ?? {
					...journeyDraftTemplateData,
					title: journeyRow.title,
					persona: { ...journeyDraftTemplateData.persona, name: journeyRow.linkedPersonas[0] ?? "" }
				};
				if (detail.persona.name) {
					const existing = sourceInsights.personas.find((p) => p.name === detail.persona.name);
					if (!existing) {
						sourceInsights.personas.push({
							name: detail.persona.name,
							description: detail.persona.bio || detail.persona.role || ""
						});
					}
				}
				if (detail.context) {
					contextParts.push(detail.context);
				}
				for (const stage of detail.stages) {
					for (const point of stage.painPoints) {
						const text = String(point ?? "").trim();
						if (text) {
							painPointCounter++;
							computedSourcePainPoints.push({
								id: `pain-${painPointCounter}`,
								text,
								sourceLabel: `User Journey - ${detail.title || journeyRow.title} / ${stage.name}`
							});
							sourceInsights.journeyPainPoints.push({
								text,
								journeyName: detail.title || journeyRow.title,
								stageName: stage.name
							});
						}
					}
				}
			}
		}
	}
	sourceInsights.context = contextParts.join(" ");

	return {
		storyOptions,
		journeyOptions,
		sourcePainPoints: computedSourcePainPoints,
		sourceInsights,
		linkedSources: resolvedDetails.linkedSources,
		selectedPainPoints: resolvedDetails.selectedPainPoints,
		activeModules: resolvedDetails.activeModules,
		moduleContent: resolvedModuleContent,
		notesText: resolvedDetails.notesText,
		metadata: {
			owner: row.owner,
			lastUpdated: row.lastUpdated
		},
		problem: {
			title: resolvedProblemTitle,
			status: row.status,
			finalStatement: resolvedDetails.finalStatement
		}
	};
});

export const createProblem = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<ProblemRow> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canCreateProblem(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = createProblemSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const actorName = actorNameFor(parsed.data.actorId);
		if (!actorName) {
			return { success: false, error: "Invalid actor" };
		}
		const projectId = requireProjectId(parsed.data.projectId);
		const id = uniqueId(
			parsed.data.statement,
			datastore.problems
				.filter((item) => inProjectScope(projectId, item.projectId))
				.map((item) => item.id)
		);
		if (!id) {
			return {
				success: false,
				error: "Problem statement must include letters or numbers."
			};
		}
		const created: ProblemRow = {
			id,
			projectId,
			statement: parsed.data.statement.trim(),
			linkedSources: [],
			painPointsCount: 0,
			ideasCount: 0,
			status: "Draft",
			owner: actorName,
			lastUpdated: new Date().toISOString().slice(0, 10),
			isOrphan: true
		};
		datastore.problems.unshift(created);
		return { success: true, data: created };
	}
);

export const updateProblem = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<ProblemRow> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canEditProblem(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateProblemSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.problems.find(
			(item) => item.id === parsed.data.problemId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Problem not found" };
		}

		const state = parsed.data.state;

		const linkedSources: Array<{
			id: string;
			title: string;
			type: string;
			phase: string;
			href: string;
		}> = [];
		if (Array.isArray(state.linkedSources)) {
			for (const entry of state.linkedSources) {
				if (!entry || typeof entry !== "object") {
					return { success: false, error: "Invalid linked source payload." };
				}
				const value = entry as Record<string, unknown>;
				const id = String(value.id ?? "").trim();
				const title = String(value.title ?? "").trim();
				const type = String(value.type ?? "").trim();
				const phase = String(value.phase ?? "").trim();
				const href = String(value.href ?? "").trim();
				if (!id || !title || !type || !phase || !href) {
					return { success: false, error: "Linked source fields are required." };
				}
				linkedSources.push({ id, title, type, phase, href });
			}
		}
		const selectedPainPoints = Array.isArray(state.selectedPainPoints)
			? state.selectedPainPoints.map((item) => String(item))
			: [];
		const activeModules = Array.isArray(state.activeModules)
			? state.activeModules.map((item) => String(item))
			: [];
		const moduleContent =
			state.moduleContent && typeof state.moduleContent === "object"
				? Object.fromEntries(
						Object.entries(state.moduleContent as Record<string, unknown>).map(([k, v]) => [
							k,
							String(v ?? "")
						])
					)
				: {};
		let nextStatus: ProblemRow["status"] = row.status;
		if ("status" in state) {
			if (!canChangeProblemStatus(permissions)) {
				return { success: false, error: "Permission denied: cannot change problem status." };
			}
			const nextStatusRaw = String(state.status).trim();
			if (nextStatusRaw !== "Draft" && nextStatusRaw !== "Locked" && nextStatusRaw !== "Archived") {
				return { success: false, error: "Invalid problem status." };
			}
			nextStatus = nextStatusRaw;
		}
		const statementSource =
			"finalStatement" in state ? state.finalStatement : ("title" in state ? state.title : row.statement);
		const finalStatement = String(statementSource).trim();
		if (!finalStatement) {
			return { success: false, error: "Final problem statement is required." };
		}

		row.statement = finalStatement;
		row.linkedSources = linkedSources.map((source) => source.title).filter(Boolean);
		row.painPointsCount = selectedPainPoints.length;
		row.status = nextStatus;
		row.lastUpdated = new Date().toISOString().slice(0, 10);

		problemDetailsByKey.set(detailKey(projectId, parsed.data.problemId), {
			title: String(state.title ?? row.statement),
			finalStatement,
			selectedPainPoints,
			linkedSources,
			activeModules,
			moduleContent,
			notesText: String(state.notesText ?? ""),
			status: row.status
		});

		return { success: true, data: row };
	}
);

export const lockProblem = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<ProblemRow> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canChangeProblemStatus(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = lockProblemSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.problems.find(
			(item) => item.id === parsed.data.problemId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Problem not found" };
		}
		if (!canTransition(row.status, "Locked")) {
			return { success: false, error: "Invalid status transition" };
		}
		row.status = "Locked";
		row.lastUpdated = new Date().toISOString().slice(0, 10);
		const details = problemDetailsByKey.get(detailKey(projectId, parsed.data.problemId));
		if (details) {
			problemDetailsByKey.set(detailKey(projectId, parsed.data.problemId), {
				...details,
				status: "Locked"
			});
		}
		return { success: true, data: row };
	}
);

export const updateProblemStatus = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<ProblemRow> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canChangeProblemStatus(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateProblemStatusSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.problems.find(
			(item) => item.id === parsed.data.problemId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Problem not found" };
		}
		if (!canTransition(row.status, parsed.data.status)) {
			return { success: false, error: "Invalid status transition" };
		}
		row.status = parsed.data.status;
		row.lastUpdated = new Date().toISOString().slice(0, 10);
		const details = problemDetailsByKey.get(detailKey(projectId, parsed.data.problemId));
		if (details) {
			problemDetailsByKey.set(detailKey(projectId, parsed.data.problemId), {
				...details,
				status: parsed.data.status
			});
		}
		return { success: true, data: row };
	}
);
