import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { datastore } from "$lib/server/data/datastore";
import {
	resourceDetailData,
	resourcesReferenceData
} from "$lib/server/data/resources.data";

type ResourcePageInput = {
	projectId: string;
	resourceId: string;
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

const createResourceSchema = z.object({
	projectId: z.string().min(1),
	actorId: z.string().min(1),
	name: z.string().trim().min(1),
	docType: z.string().trim().min(1)
});

const updateResourceSchema = z.object({
	projectId: z.string().min(1),
	resourceId: z.string().min(1),
	state: z.record(z.string(), z.unknown())
});

const updateResourceStatusSchema = z.object({
	projectId: z.string().min(1),
	resourceId: z.string().min(1),
	status: z.enum(["Active", "Archived"])
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

const canCreateResource = (permissions: EffectivePermissions) =>
	permissions?.resource?.create === true;
const canEditResource = (permissions: EffectivePermissions) =>
	permissions?.resource?.edit === true;

type ResourceEditorState = {
	name: string;
	docType: string;
	status: "Active" | "Archived";
	description: string;
	notesText: string;
	linkedArtifacts: Array<{
		id: string;
		title: string;
		type: "User Story" | "Problem Statement" | "Idea" | "Task";
		phase: "Empathize" | "Define" | "Ideate" | "Prototype";
		href: string;
	}>;
	versions: Array<{
		version: string;
		uploadedBy: string;
		uploadDate: string;
		description: string;
	}>;
};

const resourceDetailsByKey = new Map<string, ResourceEditorState>();
const detailKey = (projectId: string, resourceId: string) =>
	`${projectId}:${resourceId}`;

export const getResources = query("unchecked", (projectId: string) => {
	const scopedProjectId = requireProjectId(projectId);
	return {
		rows: datastore.resources.filter((item) => inProjectScope(scopedProjectId, item.projectId)),
		reference: resourcesReferenceData
	};
});

export const getResourcePageData = query("unchecked", (input: ResourcePageInput) => {
	const scopedProjectId = requireProjectId(input.projectId);
	const key = detailKey(scopedProjectId, input.resourceId);
	const cached = resourceDetailsByKey.get(key);
	const row = datastore.resources.find(
		(item) => item.id === input.resourceId && inProjectScope(scopedProjectId, item.projectId)
	);
	if (!row) {
		error(404, "Resource not found.");
	}
	return {
		...resourceDetailData,
		name: cached?.name ?? row.name,
		fileType: row.fileType,
		docType: cached?.docType ?? row.docType,
		status: cached?.status ?? row.status,
		description: cached?.description ?? "",
		owner: row.owner,
		updatedAt: row.lastUpdated,
		linkedArtifacts: cached?.linkedArtifacts ?? [],
		versions: cached?.versions ?? [],
		notesText: cached?.notesText ?? ""
	};
});

export const createResource = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<ResourceRow> => {
		if (!canCreateResource(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = createResourceSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const actorName = actorNameFor(parsed.data.actorId);
		if (!actorName) {
			return { success: false, error: "Invalid actor" };
		}
		const projectId = requireProjectId(parsed.data.projectId);
		const id = uniqueId(
			parsed.data.name,
			datastore.resources
				.filter((item) => inProjectScope(projectId, item.projectId))
				.map((item) => item.id)
		);
		if (!id) {
			return {
				success: false,
				error: "Resource name must include letters or numbers."
			};
		}
		const created: ResourceRow = {
			id,
			projectId,
			name: parsed.data.name.trim(),
			fileType: "PDF",
			docType: parsed.data.docType.trim(),
			owner: actorName,
			version: "v1",
			lastUpdated: new Date().toISOString().slice(0, 10),
			linkedCount: 0,
			status: "Active"
		};
		datastore.resources.unshift(created);
		return { success: true, data: created };
	}
);

export const updateResource = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<ResourceRow> => {
		if (!canEditResource(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateResourceSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.resources.find(
			(item) => item.id === parsed.data.resourceId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Resource not found" };
		}

		const state = parsed.data.state;

		const key = detailKey(projectId, parsed.data.resourceId);
		const existingState = resourceDetailsByKey.get(key);
		let nextStatus: ResourceRow["status"] = row.status;
		if ("status" in state) {
			const nextStatusRaw = String(state.status).trim();
			if (nextStatusRaw !== "Active" && nextStatusRaw !== "Archived") {
				return { success: false, error: "Invalid resource status." };
			}
			nextStatus = nextStatusRaw;
		}

		const linkedArtifacts: Array<{
			id: string;
			title: string;
			type: "User Story" | "Problem Statement" | "Idea" | "Task";
			phase: "Empathize" | "Define" | "Ideate" | "Prototype";
			href: string;
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
				if (!id || !title || !type || !phase || !href) {
					return { success: false, error: "Linked artifact fields are required." };
				}
				if (
					type !== "User Story" &&
					type !== "Problem Statement" &&
					type !== "Idea" &&
					type !== "Task"
				) {
					return { success: false, error: "Invalid linked artifact type." };
				}
				if (
					phase !== "Empathize" &&
					phase !== "Define" &&
					phase !== "Ideate" &&
					phase !== "Prototype"
				) {
					return { success: false, error: "Invalid linked artifact phase." };
				}
				linkedArtifacts.push({ id, title, type, phase, href });
			}
		} else if (existingState?.linkedArtifacts) {
			linkedArtifacts.push(...structuredClone(existingState.linkedArtifacts));
		}
		const versions: Array<{
			version: string;
			uploadedBy: string;
			uploadDate: string;
			description: string;
		}> = [];
		if (Array.isArray(state.versions)) {
			for (const item of state.versions) {
				if (!item || typeof item !== "object") {
					return { success: false, error: "Invalid version payload." };
				}
				const value = item as Record<string, unknown>;
				const version = String(value.version ?? "").trim();
				const uploadedBy = String(value.uploadedBy ?? "").trim();
				const uploadDate = String(value.uploadDate ?? "").trim();
				const description = String(value.description ?? "");
				if (!version || !uploadedBy || !uploadDate) {
					return { success: false, error: "Version fields are required." };
				}
				versions.push({ version, uploadedBy, uploadDate, description });
			}
		} else if (existingState?.versions) {
			versions.push(...structuredClone(existingState.versions));
		}

		if ("name" in state) {
			const nextName = String(state.name).trim();
			if (!nextName) {
				return { success: false, error: "Resource name is required." };
			}
			row.name = nextName;
		}
		if ("docType" in state) {
			const nextDocType = String(state.docType).trim();
			if (!nextDocType) {
				return { success: false, error: "Document type is required." };
			}
			row.docType = nextDocType;
		}
		row.status = nextStatus;
		row.linkedCount = linkedArtifacts.length;
		row.lastUpdated = new Date().toISOString().slice(0, 10);

		resourceDetailsByKey.set(key, {
			name: row.name,
			docType: row.docType,
			status: nextStatus,
			description:
				"description" in state
					? String(state.description)
					: (existingState?.description ?? ""),
			notesText:
				"notesText" in state
					? String(state.notesText)
					: (existingState?.notesText ?? ""),
			linkedArtifacts,
			versions
		});

		return { success: true, data: row };
	}
);

const canChangeResourceStatus = (permissions: EffectivePermissions) =>
	permissions?.resource?.statusChange === true;

export const updateResourceStatus = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<ResourceRow> => {
		if (!canChangeResourceStatus(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateResourceStatusSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		const projectId = requireProjectId(parsed.data.projectId);
		const row = datastore.resources.find(
			(item) => item.id === parsed.data.resourceId && inProjectScope(projectId, item.projectId)
		);
		if (!row) {
			return { success: false, error: "Resource not found" };
		}

		row.status = parsed.data.status;
		row.lastUpdated = new Date().toISOString().slice(0, 10);

		const existing = resourceDetailsByKey.get(detailKey(projectId, parsed.data.resourceId));
		if (existing) {
			resourceDetailsByKey.set(detailKey(projectId, parsed.data.resourceId), {
				...existing,
				status: parsed.data.status
			});
		}

		return { success: true, data: row };
	}
);
