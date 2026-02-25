import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { datastore } from "$lib/server/data/datastore";
import { feedbackDetailData } from "$lib/server/data/feedback.data";

type FeedbackPageInput = {
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

const createFeedbackSchema = z.object({
	projectId: z.string().min(1),
	actorId: z.string().min(1),
	title: z.string().trim().min(1)
});

const updateFeedbackSchema = z.object({
	projectId: z.string().min(1),
	feedbackId: z.string().min(1),
	state: z.record(z.string(), z.unknown())
});

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

const canCreateFeedback = (permissions: EffectivePermissions) =>
	permissions?.feedback?.create === true;
const canEditFeedback = (permissions: EffectivePermissions) =>
	permissions?.feedback?.edit === true;

type FeedbackEditorState = {
	title: string;
	outcome: "Validated" | "Invalidated" | "Needs Iteration";
	isArchived: boolean;
	observation: string;
	interpretation: string;
	notesText: string;
	linkedArtifacts: Array<{
		id: string;
		title: string;
		type: "Task" | "Idea" | "Problem Statement";
		phase: "Prototype" | "Ideate" | "Define";
		href: string;
		status: "Active" | "Archived";
	}>;
	activeModules: string[];
	evidenceText: string;
	evidenceLocked: boolean;
	nextStepsText: string;
};

const feedbackDetailsByKey = new Map<string, FeedbackEditorState>();
const detailKey = (projectId: string, feedbackId: string) =>
	`${projectId}:${feedbackId}`;

export const getFeedback = query("unchecked", (projectId: string): FeedbackRow[] => {
	const scopedProjectId = requireProjectId(projectId);
	return datastore.feedback.filter((item) => inProjectScope(scopedProjectId, item.projectId));
});

export const getFeedbackPageData = query("unchecked", (input: FeedbackPageInput) => {
	const scopedProjectId = requireProjectId(input.projectId);
	const key = detailKey(scopedProjectId, input.slug);
	const cached = feedbackDetailsByKey.get(key);
	const row = datastore.feedback.find(
		(item) => item.id === input.slug && inProjectScope(scopedProjectId, item.projectId)
	);
	if (!row) {
		error(404, "Feedback not found.");
	}
	const feedback = {
		title: row.title,
		outcome: row.outcome
	};
	const resolvedDetails: FeedbackEditorState = cached ?? {
		title: row.title,
		outcome: row.outcome,
		isArchived: false,
		observation: "",
		interpretation: "",
		notesText: "",
		linkedArtifacts: [],
		activeModules: [],
		evidenceText: "",
		evidenceLocked: true,
		nextStepsText: ""
	};
	return {
		...feedbackDetailData,
		feedback,
		linkedArtifacts: resolvedDetails.linkedArtifacts,
		observation: resolvedDetails.observation,
		interpretation: resolvedDetails.interpretation,
		notesText: resolvedDetails.notesText,
		activeModules: resolvedDetails.activeModules,
		evidenceText: resolvedDetails.evidenceText,
		evidenceLocked: resolvedDetails.evidenceLocked,
		nextStepsText: resolvedDetails.nextStepsText,
		isArchived: resolvedDetails.isArchived
	};
});

export const createFeedback = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<FeedbackRow> => {
		if (!canCreateFeedback(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = createFeedbackSchema.safeParse(input);
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
			datastore.feedback
				.filter((item) => inProjectScope(projectId, item.projectId))
				.map((item) => item.id)
		);
		if (!id) {
			return {
				success: false,
				error: "Title must include letters or numbers."
			};
		}
		const created: FeedbackRow = {
			id,
			projectId,
			title: parsed.data.title.trim(),
			linkedArtifacts: [],
			outcome: "Needs Iteration",
			linkedTaskOrIdea: "",
			owner: actorName,
			createdDate: new Date().toISOString().slice(0, 10),
			hasTaskLink: false,
			isOrphan: true
		};
		datastore.feedback.unshift(created);
		return { success: true, data: created };
	}
);

export const updateFeedback = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<FeedbackRow> => {
		if (!canEditFeedback(permissions)) {
			return { success: false, error: "Permission denied" };
		}

		const parsed = updateFeedbackSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.feedback.find(
			(item) => item.id === parsed.data.feedbackId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Feedback not found" };
		}

		const state = parsed.data.state;

		let outcome: FeedbackOutcome = row.outcome;
		if ("outcome" in state) {
			const outcomeRaw = String(state.outcome).trim();
			if (
				outcomeRaw !== "Validated" &&
				outcomeRaw !== "Invalidated" &&
				outcomeRaw !== "Needs Iteration"
			) {
				return { success: false, error: "Invalid feedback outcome." };
			}
			outcome = outcomeRaw;
		}
		const linkedArtifacts: Array<{
			id: string;
			title: string;
			type: "Task" | "Idea" | "Problem Statement";
			phase: "Prototype" | "Ideate" | "Define";
			href: string;
			status: "Active" | "Archived";
		}> = [];
		if (Array.isArray(state.linkedArtifacts)) {
			for (const item of state.linkedArtifacts) {
				if (!item || typeof item !== "object") {
					return { success: false, error: "Invalid linked artifact payload." };
				}
				const value = item as Record<string, unknown>;
				const id = String(value.id ?? "").trim();
				const title = String(value.title ?? "").trim();
				const type = String(value.type ?? "").trim();
				const phase = String(value.phase ?? "").trim();
				const href = String(value.href ?? "").trim();
				const status = String(value.status ?? "").trim();
				if (!id || !title || !type || !phase || !href || !status) {
					return { success: false, error: "Linked artifact fields are required." };
				}
				if (type !== "Task" && type !== "Idea" && type !== "Problem Statement") {
					return { success: false, error: "Invalid linked artifact type." };
				}
				if (phase !== "Prototype" && phase !== "Ideate" && phase !== "Define") {
					return { success: false, error: "Invalid linked artifact phase." };
				}
				if (status !== "Active" && status !== "Archived") {
					return { success: false, error: "Invalid linked artifact status." };
				}
				linkedArtifacts.push({ id, title, type, phase, href, status });
			}
		}
		const linkedPrimary = linkedArtifacts.find(
			(item) => item.type === "Task" || item.type === "Idea"
		);

		if ("title" in state) {
			const nextTitle = String(state.title).trim();
			if (!nextTitle) {
				return { success: false, error: "Title is required." };
			}
			row.title = nextTitle;
		}
		row.outcome = outcome;
		row.linkedArtifacts = linkedArtifacts.map((item) => `${item.type}: ${item.title}`);
		row.linkedTaskOrIdea = linkedPrimary ? `${linkedPrimary.type}: ${linkedPrimary.title}` : "";
		row.hasTaskLink = linkedArtifacts.some((item) => item.type === "Task");

		const activeModules = Array.isArray(state.activeModules)
			? state.activeModules.map((item) => String(item))
			: (feedbackDetailsByKey.get(detailKey(projectId, parsed.data.feedbackId))?.activeModules ?? []);
		const key = detailKey(projectId, parsed.data.feedbackId);
		const existingDetails = feedbackDetailsByKey.get(key);
		feedbackDetailsByKey.set(key, {
			title: row.title,
			outcome,
			isArchived:
				"isArchived" in state ? Boolean(state.isArchived) : (existingDetails?.isArchived ?? false),
			observation:
				"observation" in state
					? String(state.observation)
					: (existingDetails?.observation ?? ""),
			interpretation:
				"interpretation" in state
					? String(state.interpretation)
					: (existingDetails?.interpretation ?? ""),
			notesText:
				"notesText" in state
					? String(state.notesText)
					: (existingDetails?.notesText ?? ""),
			linkedArtifacts,
			activeModules,
			evidenceText:
				"evidenceText" in state
					? String(state.evidenceText)
					: (existingDetails?.evidenceText ?? ""),
			evidenceLocked:
				"evidenceLocked" in state
					? Boolean(state.evidenceLocked)
					: (existingDetails?.evidenceLocked ?? true),
			nextStepsText:
				"nextStepsText" in state
					? String(state.nextStepsText)
					: (existingDetails?.nextStepsText ?? "")
		});

		return { success: true, data: row };
	}
);
