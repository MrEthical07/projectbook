import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { permissionActionIndex, permissionDomainIndex } from "$lib/constants/permissions";
import { datastore } from "$lib/server/data/datastore";
import {
	getAuthenticatedRequestUser,
	getTrustedProjectPermissionMask
} from "$lib/server/auth/authorization";
import {
	storyAddOnCatalogData,
	storyDraftTemplateData
} from "$lib/server/data/stories.data";
import {
	storyDetailsByKey,
	storyDetailKey
} from "$lib/server/data/story-cache";
import { hasPerm } from "$lib/utils/permission";

type StoryPageInput = {
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

const createStorySchema = z.object({
	projectId: z.string().min(1),
	title: z.string().trim().min(1)
});

const updateStorySchema = z.object({
	projectId: z.string().min(1),
	storyId: z.string().min(1),
	story: z.record(z.string(), z.unknown())
});

const inProjectScope = (projectId: string, itemProjectId?: string) =>
	itemProjectId === projectId;

const projectExists = (projectId: string) =>
	datastore.projects.some((item) => item.id === projectId);

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

const uniqueId = (title: string, existing: string[]): string | null => {
	const base = slugify(title);
	if (!base) return null;
	if (!existing.includes(base)) return base;
	let suffix = 2;
	while (existing.includes(`${base}-${suffix}`)) {
		suffix += 1;
	}
	return `${base}-${suffix}`;
};

const actorNameFor = (): string | null => {
	try {
		return getAuthenticatedRequestUser().name;
	} catch {
		return null;
	}
};

const initialsFor = (name: string) =>
	name
		.split(" ")
		.map((part) => part[0] ?? "")
		.join("")
		.slice(0, 2)
		.toUpperCase();

const logProjectActivity = (
	projectId: string,
	userName: string,
	action: string,
	artifact: string,
	href: string
) => {
	const at = new Date().toISOString();
	const item = {
		id: `activity-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
		projectId,
		user: userName,
		initials: initialsFor(userName),
		action,
		artifact,
		href,
		at
	};
	datastore.projectDashboard.activity.unshift(item);
	datastore.activity.unshift(item);
};

const canCreateStory = (permissionMask: PermissionMask) =>
	hasPerm(permissionMask, permissionDomainIndex.story, permissionActionIndex.create);
const canEditStory = (permissionMask: PermissionMask) =>
	hasPerm(permissionMask, permissionDomainIndex.story, permissionActionIndex.edit);
const canChangeStoryStatus = (permissionMask: PermissionMask) =>
	hasPerm(permissionMask, permissionDomainIndex.story, permissionActionIndex.statusChange);

export const getStories = query("unchecked", (projectId: string): StoryRow[] => {
	const scopedProjectId = requireProjectId(projectId);
	return datastore.stories.filter((item) => inProjectScope(scopedProjectId, item.projectId));
});

export const getStoryPageData = query("unchecked", (input: StoryPageInput) => {
	const scopedProjectId = requireProjectId(input.projectId);
	const key = storyDetailKey(scopedProjectId, input.slug);
	const cached = storyDetailsByKey.get(key);
	const row = datastore.stories.find(
		(item) => item.id === input.slug && inProjectScope(scopedProjectId, item.projectId)
	);
	if (!row) {
		error(404, "Story not found.");
	}
	const baseStory = {
		...storyDraftTemplateData,
		title: row.title,
		status: row.status.toLowerCase(),
		persona: {
			...storyDraftTemplateData.persona,
			name: row.personaName
		}
	};
	const story = structuredClone(cached ?? baseStory);
	story.title = row.title;
	story.status = String(row.status).toLowerCase();
	story.persona = {
		...story.persona,
		name: row.personaName
	};
	return {
		story,
		addOnCatalog: storyAddOnCatalogData,
		addOnSections:
			cached && Array.isArray((cached as Record<string, unknown>).addOnSections)
				? structuredClone(
						(cached as Record<string, unknown>).addOnSections as unknown[]
					)
				: []
	};
});

export const createStory = command(
	"unchecked",
	({ input }: { input: unknown }): MutationResult<StoryRow> => {
		const permissionMask = getTrustedProjectPermissionMask(input);
		if (!canCreateStory(permissionMask)) {
			return { success: false, error: "Permission denied" };
		}

		const parsed = createStorySchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const actorName = actorNameFor();
		if (!actorName) {
			return { success: false, error: "Invalid actor" };
		}

		const projectId = requireProjectId(parsed.data.projectId);
		const existingIds = datastore.stories
			.filter((item) => inProjectScope(projectId, item.projectId))
			.map((item) => item.id);
		const id = uniqueId(parsed.data.title, existingIds);
		if (!id) {
			return {
				success: false,
				error: "Title must include letters or numbers."
			};
		}
		const created: StoryRow = {
			id,
			projectId,
			title: parsed.data.title.trim(),
			personaName: "",
			painPointsCount: 0,
			problemHypothesesCount: 0,
			owner: actorName,
			lastUpdated: new Date().toISOString().slice(0, 10),
			status: "Draft",
			isOrphan: true
		};

		datastore.stories.unshift(created);
		logProjectActivity(
			projectId,
			actorName,
			"created Story",
			created.title,
			`/project/${projectId}/stories/${id}`
		);
		return { success: true, data: created };
	}
);

export const updateStory = command(
	"unchecked",
	({ input }: { input: unknown }): MutationResult<StoryRow> => {
		const permissionMask = getTrustedProjectPermissionMask(input);
		if (!canEditStory(permissionMask)) {
			return { success: false, error: "Permission denied" };
		}

		const parsed = updateStorySchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.stories.find(
			(item) => item.id === parsed.data.storyId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Story not found" };
		}

		const candidate = parsed.data.story;

		const persona =
			candidate.persona && typeof candidate.persona === "object"
				? (candidate.persona as Record<string, unknown>)
				: null;
		const painPoints = Array.isArray(candidate.painPoints) ? candidate.painPoints : [];
		const hypothesis = Array.isArray(candidate.hypothesis) ? candidate.hypothesis : [];
		if ("title" in candidate) {
			const normalizedTitle = String(candidate.title).trim();
			if (!normalizedTitle) {
				return { success: false, error: "Title is required." };
			}
			row.title = normalizedTitle;
		}
		row.personaName = String(persona?.name ?? row.personaName).trim();
		row.painPointsCount = painPoints.filter((item) => String(item ?? "").trim().length > 0).length;
		row.problemHypothesesCount = hypothesis.filter((item) => String(item ?? "").trim().length > 0).length;
		if ("status" in candidate) {
			const rawStatus = String(candidate.status).trim().toLowerCase();
			const currentStatus = row.status.toLowerCase();
			if (rawStatus !== currentStatus) {
				if (!canChangeStoryStatus(permissionMask)) {
					return { success: false, error: "Permission denied: cannot change story status." };
				}
				if (rawStatus !== "draft" && rawStatus !== "locked" && rawStatus !== "archived") {
					return { success: false, error: "Invalid story status." };
				}
				row.status =
					rawStatus === "locked" ? "Locked" : rawStatus === "archived" ? "Archived" : "Draft";
			}
		}
		row.lastUpdated = new Date().toISOString().slice(0, 10);

		const templateKeys = Object.keys(storyDraftTemplateData);
		const safeCandidate = Object.fromEntries(
			Object.entries(candidate).filter(([key]) => templateKeys.includes(key))
		);
		const normalizedStory: typeof storyDraftTemplateData = {
			...storyDraftTemplateData,
			...safeCandidate,
			title: row.title,
			status: row.status.toLowerCase()
		};
		const addOnSections = Array.isArray(candidate.addOnSections)
			? structuredClone(candidate.addOnSections)
			: [];
		const cacheEntry = { ...normalizedStory, addOnSections } as typeof storyDraftTemplateData & { addOnSections: unknown[] };
		storyDetailsByKey.set(storyDetailKey(projectId, parsed.data.storyId), structuredClone(cacheEntry) as typeof storyDraftTemplateData);

		return { success: true, data: row };
	}
);
