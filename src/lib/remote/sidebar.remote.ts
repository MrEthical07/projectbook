import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	type MutationResult
} from "$lib/server/api/remote";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import {
	defaultProjectIconKey,
	projectIconKeys,
	type ProjectIconKey
} from "$lib/constants/project-icons";

type SidebarPrefix =
	| "stories"
	| "journeys"
	| "problem-statement"
	| "ideas"
	| "tasks"
	| "feedback"
	| "pages";

export type SidebarNode = {
	id: string;
	title: string;
};

export type SidebarRemoteData = {
	user: {
		name: string;
		email: string;
		avatar: string;
	};
	projects: Array<{
		id: string;
		name: string;
		icon: ProjectIconKey;
		status?: string;
	}>;
	artifacts: {
		stories: SidebarNode[];
		journeys: SidebarNode[];
		problems: SidebarNode[];
		ideas: SidebarNode[];
		tasks: SidebarNode[];
		feedback: SidebarNode[];
		pages: SidebarNode[];
	};
};

export type SidebarQueryResult =
	| {
			success: true;
			data: SidebarRemoteData;
	  }
	| {
			success: false;
			error: string;
	  };

const prefixSchema = z.enum([
	"stories",
	"journeys",
	"problem-statement",
	"ideas",
	"tasks",
	"feedback",
	"pages"
]);

const createSidebarArtifactSchema = z.object({
	projectId: z.string().min(1),
	prefix: prefixSchema,
	title: z.string().trim().min(1)
});

const renameSidebarArtifactSchema = z.object({
	projectId: z.string().min(1),
	prefix: prefixSchema,
	artifactId: z.string().min(1),
	title: z.string().trim().min(1)
});

const deleteSidebarArtifactSchema = z.object({
	projectId: z.string().min(1),
	prefix: prefixSchema,
	artifactId: z.string().min(1)
});

const asObject = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const asTrimmedString = (value: unknown): string =>
	typeof value === "string" ? value.trim() : "";

const toSidebarNodes = (
	items: unknown
): SidebarNode[] => {
	if (!Array.isArray(items)) {
		return [];
	}
	return items
		.map((item) => {
			const candidate = asObject(item);
			return {
				id: asTrimmedString(candidate.id),
				title: asTrimmedString(candidate.title)
			};
		})
		.filter((item) => item.id.length > 0 && item.title.length > 0);
};

const normalizeProjectIcon = (value: unknown): ProjectIconKey => {
	if (typeof value === "string" && projectIconKeys.includes(value as ProjectIconKey)) {
		return value as ProjectIconKey;
	}
	return defaultProjectIconKey;
};

const sidebarMutationTags = (projectId: string): string[] => [
	`project:${projectId}`,
	"project-sidebar",
	"project-dashboard",
	"project-dashboard-summary",
	"project-dashboard-my-work",
	"project-dashboard-activity"
];

const resolveArtifactTitle = (
	prefix: SidebarPrefix,
	payload: Record<string, unknown>,
	fallback: string
): string => {
	if (prefix === "problem-statement") {
		const statement = asTrimmedString(payload.statement);
		if (statement.length > 0) {
			return statement;
		}
	}
	const title = asTrimmedString(payload.title);
	if (title.length > 0) {
		return title;
	}
	return fallback;
};

export const getProjectSidebarData = query(
	"unchecked",
	async (projectId: string): Promise<SidebarQueryResult> => {
		const parsedProjectId = z.string().min(1).safeParse(projectId);
		if (!parsedProjectId.success) {
			return { success: false, error: "Missing project id for sidebar data." };
		}

		try {
			const response = await remoteQueryRequest<unknown>({
				path: `/projects/${encodePathSegment(parsedProjectId.data)}/sidebar`,
				method: "GET",
				cachePolicy: {
					namespace: "project-sidebar",
					ttlMs: 30_000,
					keyParts: { project_id: parsedProjectId.data },
					tags: [`project:${parsedProjectId.data}`, "project-sidebar"]
				}
			});
			const payload = asObject(response);
			const userPayload = asObject(payload.user);
			const artifactsPayload = asObject(payload.artifacts);
			const projectsPayload = Array.isArray(payload.projects) ? payload.projects : [];
			const projects: SidebarRemoteData["projects"] = projectsPayload.flatMap((project) => {
					const candidate = asObject(project);
					const id = asTrimmedString(candidate.id);
					if (id.length === 0) {
						return [];
					}

					const status = asTrimmedString(candidate.status);

					return [
						{
							id,
							name: asTrimmedString(candidate.name) || "Project",
							icon: normalizeProjectIcon(candidate.icon),
							...(status.length > 0 ? { status } : {})
						}
					];
				});

			return {
				success: true,
				data: {
					user: {
						name: asTrimmedString(userPayload.name) || "User",
						email: asTrimmedString(userPayload.email),
						avatar: "/avatars/shadcn.jpg"
					},
					projects,
					artifacts: {
						stories: toSidebarNodes(artifactsPayload.stories),
						journeys: toSidebarNodes(artifactsPayload.journeys),
						problems: toSidebarNodes(artifactsPayload.problems),
						ideas: toSidebarNodes(artifactsPayload.ideas),
						tasks: toSidebarNodes(artifactsPayload.tasks),
						feedback: toSidebarNodes(artifactsPayload.feedback),
						pages: toSidebarNodes(artifactsPayload.pages)
					}
				}
			};
		} catch (err) {
			if (isApiRequestError(err)) {
				return { success: false, error: err.userMessage };
			}
			return { success: false, error: "Unable to load sidebar data." };
		}
	}
);

export const createSidebarArtifact = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ id: string; title: string }>> => {
		const parsed = createSidebarArtifactSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		let result: MutationResult<Record<string, unknown>>;
		switch (parsed.data.prefix) {
			case "stories":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/stories`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "journeys":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/journeys`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "problem-statement":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/problems`,
					method: "POST",
					body: { statement: parsed.data.title }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "ideas":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/ideas`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "tasks":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/tasks`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "feedback":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/feedback`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "pages":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/pages`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			default:
				return { success: false, error: "Unsupported sidebar prefix" };
		}

		if (!result.success) {
			return result;
		}

		const payload = asObject(result.data);
		const id = asTrimmedString(payload.id);
		if (id.length === 0) {
			return { success: false, error: "Created artifact payload is missing id." };
		}

		return {
			success: true,
			data: {
				id,
				title: resolveArtifactTitle(parsed.data.prefix, payload, parsed.data.title)
			}
		};
	}
);

export const renameSidebarArtifact = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ id: string; title: string }>> => {
		const parsed = renameSidebarArtifactSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		let result: MutationResult<Record<string, unknown>>;
		switch (parsed.data.prefix) {
			case "stories":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/stories/${encodePathSegment(parsed.data.artifactId)}`,
					method: "PATCH",
					body: { story: { title: parsed.data.title } }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "journeys":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/journeys/${encodePathSegment(parsed.data.artifactId)}`,
					method: "PATCH",
					body: { journey: { title: parsed.data.title } }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "problem-statement":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/problems/${encodePathSegment(parsed.data.artifactId)}`,
					method: "PATCH",
					body: { state: { title: parsed.data.title } }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "ideas":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/ideas/${encodePathSegment(parsed.data.artifactId)}`,
					method: "PATCH",
					body: { state: { title: parsed.data.title } }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "tasks":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/tasks/${encodePathSegment(parsed.data.artifactId)}`,
					method: "PATCH",
					body: { state: { title: parsed.data.title } }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "feedback":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/feedback/${encodePathSegment(parsed.data.artifactId)}`,
					method: "PATCH",
					body: { state: { title: parsed.data.title } }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "pages":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/pages/${encodePathSegment(parsed.data.artifactId)}/rename`,
					method: "PATCH",
					body: { title: parsed.data.title }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			default:
				return { success: false, error: "Unsupported sidebar prefix" };
		}

		if (!result.success) {
			return result;
		}

		const payload = asObject(result.data);
		const id = asTrimmedString(payload.id) || parsed.data.artifactId;
		return {
			success: true,
			data: {
				id,
				title: resolveArtifactTitle(parsed.data.prefix, payload, parsed.data.title)
			}
		};
	}
);

export const deleteSidebarArtifact = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ id: string }>> => {
		const parsed = deleteSidebarArtifactSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		let result: MutationResult<Record<string, unknown>>;
		switch (parsed.data.prefix) {
			case "stories":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/stories/${encodePathSegment(parsed.data.artifactId)}`,
					method: "PATCH",
					body: { story: { status: "Archived" } }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "journeys":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/journeys/${encodePathSegment(parsed.data.artifactId)}`,
					method: "PATCH",
					body: { journey: { status: "Archived" } }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "problem-statement":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/problems/${encodePathSegment(parsed.data.artifactId)}/status`,
					method: "PATCH",
					body: { status: "Archived" }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "ideas":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/ideas/${encodePathSegment(parsed.data.artifactId)}/status`,
					method: "PATCH",
					body: { status: "Archived" }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "tasks":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/tasks/${encodePathSegment(parsed.data.artifactId)}/status`,
					method: "PATCH",
					body: { status: "Abandoned" }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "feedback":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/feedback/${encodePathSegment(parsed.data.artifactId)}`,
					method: "PATCH",
					body: { state: { status: "Archived", isArchived: true } }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			case "pages":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/pages/${encodePathSegment(parsed.data.artifactId)}`,
					method: "PATCH",
					body: { state: { status: "Archived" } }
				}, undefined, { tags: sidebarMutationTags(parsed.data.projectId) });
				break;
			default:
				return { success: false, error: "Unsupported sidebar prefix" };
		}

		if (!result.success) {
			return result;
		}

		return {
			success: true,
			data: {
				id: parsed.data.artifactId
			}
		};
	}
);
