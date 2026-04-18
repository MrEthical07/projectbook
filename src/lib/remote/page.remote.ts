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
	pageId: string;
};

type PageListInput = {
	projectId: string;
	status?: "Draft" | "Archived";
	cursor?: string;
	limit?: number;
};

type PageListResult = {
	items: PageRow[];
	nextCursor: string | null;
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

const buildPagesPath = (input: PageListInput): string => {
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
	const basePath = `/projects/${encodePathSegment(input.projectId)}/pages`;
	return query ? `${basePath}?${query}` : basePath;
};

export const getPages = query("unchecked", async (input: PageListInput): Promise<PageListResult> => {
	const cursor = typeof input.cursor === "string" ? input.cursor.trim() : "";
	const limit =
		typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
			? Math.trunc(input.limit)
			: 20;
	const payload = await remoteQueryRequest<{ items?: PageRow[]; next_cursor?: string | null }>({
		path: buildPagesPath(input),
		method: "GET",
		cachePolicy: {
			namespace: "pages-list",
			ttlMs: 20_000,
			keyParts: {
				project_id: input.projectId,
				status: input.status ?? null,
				cursor: cursor || null,
				limit,
				sort: "last_edited_desc"
			},
			tags: ["pages-list", `project:${input.projectId}`]
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
		path: `/projects/${encodePathSegment(input.projectId)}/pages/${encodePathSegment(input.pageId)}`,
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
			method: "PATCH",
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
			method: "PATCH",
			body: {
				title: parsed.data.title
			}
		});
	}
);
