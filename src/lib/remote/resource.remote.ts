import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	type MutationResult
} from "$lib/server/api/remote";

type ResourcePageInput = {
	projectId: string;
	resourceId: string;
};

type LinkedArtifact = {
	id: string;
	title: string;
	type: "User Story" | "Problem Statement" | "Idea" | "Task";
	phase: "Empathize" | "Define" | "Ideate" | "Prototype";
	href: string;
};

type VersionRow = {
	version: string;
	uploadedBy: string;
	uploadDate: string;
	description: string;
};

const createResourceSchema = z.object({
	projectId: z.string().min(1),
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

const asRecord = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const normalizeResourceStatus = (value: string): ResourceStatus =>
	value === "Archived" ? "Archived" : "Active";

const mapLinkedArtifact = (value: unknown): LinkedArtifact | null => {
	const row = asRecord(value);
	const id = asString(row.id);
	const title = asString(row.title);
	const href = asString(row.href);
	if (!id || !title || !href) {
		return null;
	}

	const typeRaw = asString(row.type);
	const type: LinkedArtifact["type"] =
		typeRaw === "Problem Statement" || typeRaw === "Idea" || typeRaw === "Task"
			? typeRaw
			: "User Story";

	const phaseRaw = asString(row.phase);
	const phase: LinkedArtifact["phase"] =
		phaseRaw === "Define" || phaseRaw === "Ideate" || phaseRaw === "Prototype"
			? phaseRaw
			: "Empathize";

	return { id, title, type, phase, href };
};

const mapVersion = (value: unknown): VersionRow | null => {
	const row = asRecord(value);
	const version = asString(row.version);
	const uploadedBy = asString(row.uploadedBy);
	const uploadDate = asString(row.uploadDate);
	if (!version || !uploadedBy || !uploadDate) {
		return null;
	}
	return {
		version,
		uploadedBy,
		uploadDate,
		description: asString(row.description)
	};
};

export const getResources = query("unchecked", async (projectId: string) => {
	const payload = await remoteQueryRequest<{
		rows?: ResourceRow[];
		reference?: {
			docTypes?: string[];
			fileTypes?: string[];
			owners?: string[];
			sortOptions?: string[];
			storyOptions?: string[];
			problemOptions?: string[];
			ideaOptions?: string[];
			taskOptions?: string[];
		};
	}>({
		path: `/projects/${encodePathSegment(projectId)}/resources`,
		method: "GET"
	});

	const rows = Array.isArray(payload.rows) ? payload.rows : [];
	const reference = asRecord(payload.reference);

	return {
		rows,
		reference: {
			docTypes: asArray(reference.docTypes).map((item) => asString(item)).filter((item) => item.length > 0),
			fileTypes: asArray(reference.fileTypes).map((item) => asString(item)).filter((item) => item.length > 0),
			owners: asArray(reference.owners).map((item) => asString(item)).filter((item) => item.length > 0),
			sortOptions: asArray(reference.sortOptions)
				.map((item) => asString(item))
				.filter((item) => item.length > 0),
			storyOptions: asArray(reference.storyOptions).map((item) => asString(item)).filter((item) => item.length > 0),
			problemOptions: asArray(reference.problemOptions)
				.map((item) => asString(item))
				.filter((item) => item.length > 0),
			ideaOptions: asArray(reference.ideaOptions).map((item) => asString(item)).filter((item) => item.length > 0),
			taskOptions: asArray(reference.taskOptions).map((item) => asString(item)).filter((item) => item.length > 0)
		}
	};
});

export const getResourcePageData = query("unchecked", async (input: ResourcePageInput) => {
	const payload = await remoteQueryRequest<{
		resource?: {
			id?: string;
			name?: string;
			fileType?: string;
			docType?: string;
			status?: string;
			owner?: string;
		};
		detail?: Record<string, unknown>;
		reference?: {
			storyOptions?: unknown[];
			problemOptions?: unknown[];
			ideaOptions?: unknown[];
			taskOptions?: unknown[];
		};
		meta?: {
			createdAt?: string;
			updatedAt?: string;
		};
	}>({
		path: `/projects/${encodePathSegment(input.projectId)}/resources/${encodePathSegment(input.resourceId)}`,
		method: "GET"
	});

	const resource = asRecord(payload.resource);
	const detail = asRecord(payload.detail);
	const meta = asRecord(payload.meta);
	const reference = asRecord(payload.reference);

	const linkedArtifacts = asArray(detail.linkedArtifacts)
		.map(mapLinkedArtifact)
		.filter((item): item is LinkedArtifact => item !== null);

	const versions = asArray(detail.versions)
		.map(mapVersion)
		.filter((item): item is VersionRow => item !== null);

	return {
		name: asString(resource.name),
		fileType: asString(resource.fileType),
		docType: asString(resource.docType),
		status: normalizeResourceStatus(asString(resource.status)),
		description: asString(detail.description),
		owner: asString(resource.owner),
		createdAt: asString(meta.createdAt),
		updatedAt: asString(meta.updatedAt),
		fileSize: asString(detail.fileSize) || "",
		linkedArtifacts,
		versions,
		notesText: asString(detail.notesText) || asString(detail.notes),
		storyOptions: asArray(reference.storyOptions),
		problemOptions: asArray(reference.problemOptions),
		ideaOptions: asArray(reference.ideaOptions),
		taskOptions: asArray(reference.taskOptions)
	};
});

export const createResource = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<ResourceRow>> => {
		const parsed = createResourceSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<ResourceRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/resources`,
			method: "POST",
			body: {
				name: parsed.data.name,
				docType: parsed.data.docType
			}
		});
	}
);

export const updateResource = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<ResourceRow>> => {
		const parsed = updateResourceSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<ResourceRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/resources/${encodePathSegment(parsed.data.resourceId)}`,
			method: "PUT",
			body: {
				state: parsed.data.state
			}
		});
	}
);

export const updateResourceStatus = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<ResourceRow>> => {
		const parsed = updateResourceStatusSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<ResourceRow>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/resources/${encodePathSegment(parsed.data.resourceId)}/status`,
			method: "PUT",
			body: {
				status: parsed.data.status
			}
		});
	}
);
