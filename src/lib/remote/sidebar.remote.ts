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
	slug: string;
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

const toSidebarNodes = (
	items: Array<{ id?: string; title?: string }> | undefined
): SidebarNode[] => {
	if (!Array.isArray(items)) {
		return [];
	}
	return items
		.map((item) => ({
			slug: (item.id ?? "").trim(),
			title: (item.title ?? "").trim()
		}))
		.filter((item) => item.slug.length > 0 && item.title.length > 0);
};

const normalizeProjectIcon = (value: unknown): ProjectIconKey => {
	if (typeof value === "string" && projectIconKeys.includes(value as ProjectIconKey)) {
		return value as ProjectIconKey;
	}
	return defaultProjectIconKey;
};

export const getProjectSidebarData = query(
	"unchecked",
	async (projectId: string): Promise<SidebarQueryResult> => {
		const parsedProjectId = z.string().min(1).safeParse(projectId);
		if (!parsedProjectId.success) {
			return { success: false, error: "Missing project id for sidebar data." };
		}

		try {
			const response = await remoteQueryRequest<{
				user: { name: string; email: string };
				projects: Array<{ id: string; name: string; icon?: string; status?: string }>;
				artifacts: {
					stories: Array<{ id?: string; title?: string }>;
					journeys: Array<{ id?: string; title?: string }>;
					problems: Array<{ id?: string; title?: string }>;
					ideas: Array<{ id?: string; title?: string }>;
					tasks: Array<{ id?: string; title?: string }>;
					feedback: Array<{ id?: string; title?: string }>;
					pages: Array<{ id?: string; title?: string }>;
				};
			}>({
				path: `/projects/${encodePathSegment(parsedProjectId.data)}/sidebar`,
				method: "GET"
			});

			return {
				success: true,
				data: {
					user: {
						name: response.user.name,
						email: response.user.email,
						avatar: "/avatars/shadcn.jpg"
					},
					projects: response.projects.map((project) => ({
						id: project.id,
						name: project.name,
						icon: normalizeProjectIcon(project.icon),
						status: project.status
					})),
					artifacts: {
						stories: toSidebarNodes(response.artifacts.stories),
						journeys: toSidebarNodes(response.artifacts.journeys),
						problems: toSidebarNodes(response.artifacts.problems),
						ideas: toSidebarNodes(response.artifacts.ideas),
						tasks: toSidebarNodes(response.artifacts.tasks),
						feedback: toSidebarNodes(response.artifacts.feedback),
						pages: toSidebarNodes(response.artifacts.pages)
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

		return remoteMutationRequest<{ id: string; title: string }>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/sidebar/artifacts`,
			method: "POST",
			body: {
				prefix: parsed.data.prefix,
				title: parsed.data.title
			}
		});
	}
);

export const renameSidebarArtifact = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ id: string; title: string }>> => {
		const parsed = renameSidebarArtifactSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ id: string; title: string }>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/sidebar/artifacts/${encodePathSegment(parsed.data.artifactId)}/rename`,
			method: "PUT",
			body: {
				prefix: parsed.data.prefix,
				title: parsed.data.title
			}
		});
	}
);

export const deleteSidebarArtifact = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ id: string }>> => {
		const parsed = deleteSidebarArtifactSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ id: string }>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/sidebar/artifacts/${encodePathSegment(parsed.data.artifactId)}`,
			method: "DELETE",
			body: {
				prefix: parsed.data.prefix
			}
		});
	}
);
