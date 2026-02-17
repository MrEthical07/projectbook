import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { datastore } from "$lib/server/data/datastore";
import { pageDetailData } from "$lib/server/data/pages.data";

type PageEditorInput = {
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

const createPageSchema = z.object({
	projectId: z.string().min(1),
	actorId: z.string().min(1),
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

const canCreatePage = (permissions: EffectivePermissions) => permissions?.page?.create === true;
const canEditPage = (permissions: EffectivePermissions) => permissions?.page?.edit === true;

type PageEditorState = {
	status: "Draft" | "Archived";
	title: string;
	owner: string;
	description: string;
	tags: string[];
	linkedArtifacts: string[];
	docHeading: string;
	docBody: string;
	views: unknown[];
	activeViewId: string;
	tableColumns: unknown[];
	tableRows: unknown[];
	databaseItems: unknown[];
};

const pageEditorByKey = new Map<string, PageEditorState>();
const detailKey = (projectId: string, pageId: string) =>
	`${projectId}:${pageId}`;

export const getPages = query("unchecked", (projectId: string) => {
	const scopedProjectId = requireProjectId(projectId);
	return datastore.pages.filter((item) => inProjectScope(scopedProjectId, item.projectId));
});

export const getPageEditorData = query("unchecked", (input: PageEditorInput) => {
	const scopedProjectId = requireProjectId(input.projectId);
	const key = detailKey(scopedProjectId, input.slug);
	const cached = pageEditorByKey.get(key);
	const row = datastore.pages.find(
		(item) => item.id === input.slug && inProjectScope(scopedProjectId, item.projectId)
	);
	if (!row) {
		error(404, "Page not found.");
	}
	const resolvedTitle = row.title;
	const resolvedStatus = row.status;
	const resolvedOwner = row.owner;
	const defaultActiveViewId = pageDetailData.defaultViews[0]?.id;
	if (!defaultActiveViewId) {
		error(500, "Page default views are not configured.");
	}
	return {
		...pageDetailData,
		defaultValues: {
			...pageDetailData.defaultValues,
			title: resolvedTitle,
			owner: resolvedOwner,
			status: resolvedStatus,
			description: cached?.description ?? ""
		},
		defaultViews: cached?.views
			? structuredClone(cached.views)
			: structuredClone(pageDetailData.defaultViews),
		databaseItems: cached?.databaseItems
			? structuredClone(cached.databaseItems)
			: structuredClone(pageDetailData.databaseItems),
		docHeading: cached?.docHeading ?? "",
		docBody: cached?.docBody ?? "",
		tags: cached?.tags ? structuredClone(cached.tags) : [],
		linkedArtifacts: cached?.linkedArtifacts
			? structuredClone(cached.linkedArtifacts)
			: [],
		tableColumns: cached?.tableColumns
			? structuredClone(cached.tableColumns)
			: [],
		tableRows: cached?.tableRows
			? structuredClone(cached.tableRows)
			: [],
		activeViewId: cached?.activeViewId ?? defaultActiveViewId
	};
});

export const createPage = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<PageRow> => {
		if (!canCreatePage(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = createPageSchema.safeParse(input);
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
			datastore.pages
				.filter((item) => inProjectScope(projectId, item.projectId))
				.map((item) => item.id)
		);
		if (!id) {
			return {
				success: false,
				error: "Title must include letters or numbers."
			};
		}
		const created: PageRow = {
			id,
			projectId,
			title: parsed.data.title.trim(),
			owner: actorName,
			lastEdited: new Date().toISOString().slice(0, 10),
			linkedArtifactsCount: 0,
			status: "Draft",
			isOrphan: true
		};
		datastore.pages.unshift(created);
		return { success: true, data: created };
	}
);

export const updatePageEditor = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<PageRow> => {
		if (!canEditPage(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updatePageEditorSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.pages.find(
			(item) => item.id === parsed.data.pageId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Page not found" };
		}

		const state =
			parsed.data.state && typeof parsed.data.state === "object"
				? (parsed.data.state as Record<string, unknown>)
				: null;
		if (!state) {
			return { success: false, error: "Invalid input" };
		}

		const key = detailKey(projectId, parsed.data.pageId);
		const existingState = pageEditorByKey.get(key);
		let nextStatus: PageRow["status"] = row.status;
		if ("status" in state) {
			const nextStatusRaw = String(state.status).trim();
			if (nextStatusRaw !== "Draft" && nextStatusRaw !== "Archived") {
				return { success: false, error: "Invalid page status." };
			}
			nextStatus = nextStatusRaw;
		}
		const linkedArtifacts = Array.isArray(state.linkedArtifacts)
			? state.linkedArtifacts.map((value) => String(value))
			: (existingState?.linkedArtifacts ?? []);
		const tags = Array.isArray(state.tags)
			? state.tags.map((value) => String(value))
			: (existingState?.tags ?? []);

		if ("title" in state) {
			const nextTitle = String(state.title).trim();
			if (!nextTitle) {
				return { success: false, error: "Title is required." };
			}
			row.title = nextTitle;
		}
		row.status = nextStatus;
		row.lastEdited = new Date().toISOString().slice(0, 10);
		row.linkedArtifactsCount = linkedArtifacts.length;
		row.isOrphan = linkedArtifacts.length === 0;

		pageEditorByKey.set(key, {
			status: nextStatus,
			title: row.title,
			owner: "owner" in state ? String(state.owner) : (existingState?.owner ?? row.owner),
			description:
				"description" in state
					? String(state.description)
					: (existingState?.description ?? ""),
			tags,
			linkedArtifacts,
			docHeading:
				"docHeading" in state
					? String(state.docHeading)
					: (existingState?.docHeading ?? ""),
			docBody:
				"docBody" in state
					? String(state.docBody)
					: (existingState?.docBody ?? ""),
			views: Array.isArray(state.views)
				? structuredClone(state.views)
				: structuredClone(existingState?.views ?? []),
			activeViewId:
				"activeViewId" in state
					? String(state.activeViewId)
					: (existingState?.activeViewId ?? ""),
			tableColumns: Array.isArray(state.tableColumns)
				? structuredClone(state.tableColumns)
				: structuredClone(existingState?.tableColumns ?? []),
			tableRows: Array.isArray(state.tableRows)
				? structuredClone(state.tableRows)
				: structuredClone(existingState?.tableRows ?? []),
			databaseItems: Array.isArray(state.databaseItems)
				? structuredClone(state.databaseItems)
				: structuredClone(existingState?.databaseItems ?? [])
		});

		return { success: true, data: row };
	}
);

export const renamePage = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<PageRow> => {
		if (!canEditPage(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = renamePageSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.pages.find(
			(item) => item.id === parsed.data.pageId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Page not found" };
		}
		row.title = parsed.data.title;
		row.lastEdited = new Date().toISOString().slice(0, 10);
		const existing = pageEditorByKey.get(detailKey(projectId, parsed.data.pageId));
		if (existing) {
			pageEditorByKey.set(detailKey(projectId, parsed.data.pageId), {
				...existing,
				title: row.title
			});
		}
		return { success: true, data: row };
	}
);
