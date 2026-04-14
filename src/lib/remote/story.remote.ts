import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	type MutationResult
} from "$lib/server/api/remote";

type StoryPageInput = {
	projectId: string;
	slug: string;
};

type ArtifactMetadata = {
	owner: string;
	createdBy: string;
	createdAt: string;
	lastEditedBy: string;
	lastEditedAt: string;
	lastUpdated: string;
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

const defaultStoryDraft = {
	title: "",
	description: "",
	status: "draft",
	persona: {
		name: "",
		bio: "",
		role: "",
		age: 0,
		job: "",
		edu: ""
	},
	context: "",
	empathyMap: {
		says: "",
		thinks: "",
		does: "",
		feels: ""
	},
	painPoints: [""],
	hypothesis: [""],
	notes: ""
};

const fallbackStoryAddOnCatalog = [
	{
		type: "goals_success",
		name: "Goals & Success Criteria",
		description: "Define what success looks like from the user's perspective.",
		tag: "Recommended"
	},
	{
		type: "jtbd",
		name: "Jobs To Be Done (JTBD)",
		description: "Capture functional, supporting, and emotional jobs.",
		tag: "Recommended"
	},
	{
		type: "assumptions",
		name: "Assumptions",
		description: "Make hidden assumptions explicit.",
		tag: "Optional"
	},
	{
		type: "constraints",
		name: "Constraints",
		description: "Capture environmental, technical, or behavioral limits.",
		tag: "Optional"
	},
	{
		type: "risks_unknowns",
		name: "Risks & Unknowns",
		description: "Identify uncertainty early.",
		tag: "Recommended"
	},
	{
		type: "evidence",
		name: "Evidence / Research References",
		description: "Ground the story in data and references.",
		tag: "Optional"
	},
	{
		type: "scenarios",
		name: "Scenarios / Edge Cases",
		description: "Capture non-happy paths and expectations.",
		tag: "Optional"
	}
];

const asString = (value: unknown): string =>
	typeof value === "string" ? value.trim() : "";

const normalizeStoryStatus = (value: unknown): "draft" | "locked" | "archived" => {
	const normalized = asString(value).toLowerCase();
	if (normalized === "locked") {
		return "locked";
	}
	if (normalized === "archived") {
		return "archived";
	}
	return "draft";
};

const toApiStoryStatus = (value: unknown): "Draft" | "Locked" | "Archived" | null => {
	const normalized = asString(value).toLowerCase();
	if (normalized === "draft") {
		return "Draft";
	}
	if (normalized === "locked") {
		return "Locked";
	}
	if (normalized === "archived") {
		return "Archived";
	}
	return null;
};

const mapStoryMetadata = (
	payload: Record<string, unknown>,
	storyPayload: { owner?: unknown; lastUpdated?: unknown }
): ArtifactMetadata => {
	const owner = asString(payload.owner) || asString(storyPayload.owner);
	const createdBy = asString(payload.createdBy) || owner;
	const createdAt = asString(payload.createdAt);
	const lastEditedBy = asString(payload.lastEditedBy) || owner;
	const lastEditedAt = asString(payload.lastEditedAt) || asString(storyPayload.lastUpdated);
	const lastUpdated = asString(payload.lastUpdated) || asString(storyPayload.lastUpdated);

	return {
		owner,
		createdBy,
		createdAt,
		lastEditedBy,
		lastEditedAt,
		lastUpdated
	};
};

export const getStories = query("unchecked", async (projectId: string): Promise<StoryRow[]> => {
	const payload = await remoteQueryRequest<{ items?: StoryRow[] }>({
		path: `/projects/${encodePathSegment(projectId)}/stories`,
		method: "GET"
	});
	return Array.isArray(payload.items) ? payload.items : [];
});

export const getStoryPageData = query("unchecked", async (input: StoryPageInput) => {
	const payload = await remoteQueryRequest<{
		story?: { title?: string; status?: string; owner?: string; lastUpdated?: string };
		metadata?: Record<string, unknown>;
		detail?: Record<string, unknown>;
		addOnCatalog?: unknown[];
		addOnSections?: unknown[];
	}>({
		path: `/projects/${encodePathSegment(input.projectId)}/stories/${encodePathSegment(input.slug)}`,
		method: "GET"
	});

	const detail = payload.detail ?? {};
	const metadataPayload =
		payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
	const addOnSections = Array.isArray(payload.addOnSections)
		? payload.addOnSections
		: Array.isArray((detail as Record<string, unknown>).addOnSections)
			? ((detail as Record<string, unknown>).addOnSections as unknown[])
			: [];
	const story = {
		...defaultStoryDraft,
		...detail,
		title:
			typeof payload.story?.title === "string"
				? payload.story.title
				: (detail.title as string | undefined) ?? defaultStoryDraft.title,
		status: normalizeStoryStatus((detail.status as string | undefined) ?? payload.story?.status ?? "Draft")
	};

	return {
		story,
		metadata: mapStoryMetadata(metadataPayload, payload.story ?? {}),
		addOnCatalog:
			Array.isArray(payload.addOnCatalog) && payload.addOnCatalog.length > 0
				? payload.addOnCatalog
				: fallbackStoryAddOnCatalog,
		addOnSections
	};
});

export const createStory = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<StoryRow>> => {
		const parsed = createStorySchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<StoryRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/stories`,
			method: "POST",
			body: {
				title: parsed.data.title
			}
		});
	}
);

export const updateStory = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<StoryRow>> => {
		const parsed = updateStorySchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const storyPayload = structuredClone(parsed.data.story) as Record<string, unknown>;
		const canonicalStatus = toApiStoryStatus(storyPayload.status);
		if (canonicalStatus) {
			storyPayload.status = canonicalStatus;
		}

		return remoteMutationRequest<StoryRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/stories/${encodePathSegment(parsed.data.storyId)}`,
			method: "PUT",
			body: {
				story: storyPayload
			}
		});
	}
);
