import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	type MutationResult
} from "$lib/server/api/remote";

const createPageSchema = z.object({
	projectId: z.string().min(1),
	title: z.string().trim().min(1)
});

const updatePageEditorSchema = z.object({
	projectId: z.string().min(1),
	pageId: z.string().min(1),
	state: z.unknown()
});

const renamePageSchema = z.object({
	projectId: z.string().min(1),
	pageId: z.string().min(1),
	title: z.string().trim().min(1)
});

type PageEditorInput = {
	projectId: string;
	slug: string;
};

const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const normalizePageStatus = (value: string): PageStatus => {
	if (value === "Archived") {
		return "Archived";
	}
	return "Draft";
};

const defaultViews = [
	{ id: "view-doc", name: "Document", type: "Document" },
	{ id: "view-table", name: "Table", type: "Table" },
	{ id: "view-board", name: "Board", type: "Board" },
	{ id: "view-list", name: "List", type: "List" },
	{ id: "view-calendar", name: "Calendar", type: "Calendar" },
	{ id: "view-gallery", name: "Gallery", type: "Gallery" },
	{ id: "view-timeline", name: "Timeline", type: "Timeline" }
];

const defaultTagOptions = ["Research", "Alignment", "Notes", "Strategy"];

const defaultLinkedArtifactOptions = [
	"User Story - Sample Story",
	"Problem Statement - Sample Problem",
	"Idea - Sample Idea",
	"Task - Sample Task",
	"Feedback - Sample Feedback",
	"Resource - Sample Resource"
];

export const getPages = query("unchecked", async (projectId: string): Promise<PageRow[]> => {
	const payload = await remoteQueryRequest<PageRow[]>({
		path: `/projects/${encodePathSegment(projectId)}/pages`,
		method: "GET"
	});
	return Array.isArray(payload) ? payload : [];
});

export const getPageEditorData = query("unchecked", async (input: PageEditorInput) => {
	const payload = await remoteQueryRequest<{
		page?: {
			id?: string;
			title?: string;
			status?: string;
			owner?: string;
			lastEdited?: string;
		};
		detail?: Record<string, unknown>;
		reference?: {
			tagOptions?: unknown[];
			linkedArtifactOptions?: unknown[];
		};
	}>({
		path: `/projects/${encodePathSegment(input.projectId)}/pages/${encodePathSegment(input.slug)}`,
		method: "GET"
	});

	const page = asRecord(payload.page);
	const detail = asRecord(payload.detail);
	const reference = asRecord(payload.reference);

	const pageViews = asArray(detail.views);
	const views = pageViews.length > 0 ? pageViews : defaultViews;
	const activeViewId = asString(detail.activeViewId) || asString((views[0] as Record<string, unknown>).id);

	return {
		tagOptions:
			asArray(reference.tagOptions)
				.map((item) => asString(item))
				.filter((item) => item.length > 0) || defaultTagOptions,
		linkedArtifactOptions:
			asArray(reference.linkedArtifactOptions)
				.map((item) => asString(item))
				.filter((item) => item.length > 0) || defaultLinkedArtifactOptions,
		defaultValues: {
			status: normalizePageStatus(asString(page.status)),
			title: asString(page.title),
			owner: asString(page.owner),
			createdAt: asString(detail.createdAt) || asString(page.lastEdited),
			lastEdited: asString(page.lastEdited),
			description: asString(detail.description)
		},
		defaultViews: structuredClone(views),
		databaseItems: structuredClone(asArray(detail.databaseItems)),
		docHeading: asString(detail.docHeading),
		docBody: asString(detail.docBody),
		tags: asArray(detail.tags).map((item) => asString(item)).filter((item) => item.length > 0),
		linkedArtifacts: asArray(detail.linkedArtifacts)
			.map((item) => asString(item))
			.filter((item) => item.length > 0),
		tableColumns: structuredClone(asArray(detail.tableColumns)),
		tableRows: structuredClone(asArray(detail.tableRows)),
		activeViewId
	};
});

export const createPage = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<PageRow>> => {
		const parsed = createPageSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<PageRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/pages`,
			method: "POST",
			body: {
				title: parsed.data.title
			}
		});
	}
);

export const updatePageEditor = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<PageRow>> => {
		const parsed = updatePageEditorSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<PageRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/pages/${encodePathSegment(parsed.data.pageId)}`,
			method: "PUT",
			body: {
				state: parsed.data.state
			}
		});
	}
);

export const renamePage = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ id: string; title: string; lastEdited: string }>> => {
		const parsed = renamePageSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ id: string; title: string; lastEdited: string }>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/pages/${encodePathSegment(parsed.data.pageId)}/rename`,
			method: "PUT",
			body: {
				title: parsed.data.title
			}
		});
	}
);
