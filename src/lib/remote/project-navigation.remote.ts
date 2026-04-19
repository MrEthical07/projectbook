import { query } from "$app/server";
import { z } from "zod";
import {
	defaultProjectIconKey,
	projectIconKeys,
	type ProjectIconKey
} from "$lib/constants/project-icons";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import { encodePathSegment, remoteQueryRequest } from "$lib/server/api/remote";

const asObject = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const asTrimmedString = (value: unknown): string =>
	typeof value === "string" ? value.trim() : "";

const normalizeProjectIcon = (value: unknown): ProjectIconKey => {
	if (typeof value === "string" && projectIconKeys.includes(value as ProjectIconKey)) {
		return value as ProjectIconKey;
	}
	return defaultProjectIconKey;
};

export type ProjectNavigationCurrentProject = {
	id: string;
	name: string;
	status: string;
	role: string;
};

export type ProjectNavigationProjectListItem = {
	id: string;
	name: string;
	icon: ProjectIconKey;
};

export type ProjectNavigationData = {
	currentProject: ProjectNavigationCurrentProject;
	projectList: ProjectNavigationProjectListItem[];
};

export const getProjectNavigationData = query(
	"unchecked",
	async (projectId: string): Promise<ProjectNavigationData> => {
		const parsedProjectId = z.string().trim().min(1).parse(projectId);
		const scopedPathId = encodePathSegment(parsedProjectId);
		const homeProjectsPromise = remoteQueryRequest<unknown[]>({
			path: "/home/projects",
			method: "GET",
			cachePolicy: {
				namespace: "home-projects",
				ttlMs: 30_000,
				tags: ["home", "home-projects"]
			}
		});

		let overviewPayload: unknown;
		try {
			overviewPayload = await remoteQueryRequest<unknown>({
				path: `/projects/${scopedPathId}/overview`,
				method: "GET",
				cachePolicy: {
					namespace: "project-overview",
					ttlMs: 20_000,
					keyParts: { project_id: parsedProjectId },
					tags: [`project:${parsedProjectId}`, "project-overview", "project-dashboard"]
				}
			});
		} catch (err) {
			if (!isApiRequestError(err) || err.statusCode !== 404) {
				throw err;
			}

			overviewPayload = await remoteQueryRequest<unknown>({
				path: `/projects/${scopedPathId}/dashboard`,
				method: "GET",
				cachePolicy: {
					namespace: "project-dashboard",
					ttlMs: 20_000,
					keyParts: { project_id: parsedProjectId },
					tags: [`project:${parsedProjectId}`, "project-dashboard"]
				}
			});
		}

		const homeProjects = await homeProjectsPromise;

		const normalizedRequestedId = parsedProjectId.toLowerCase();
		const matchingHomeProject = (Array.isArray(homeProjects) ? homeProjects : [])
			.map((value) => asObject(value))
			.find((project) => asTrimmedString(project.id).toLowerCase() === normalizedRequestedId);
		const overviewProject = asObject(asObject(overviewPayload).project);

		const resolvedCurrentId =
			asTrimmedString(overviewProject.id) ||
			asTrimmedString(matchingHomeProject?.id) ||
			parsedProjectId;
		if (resolvedCurrentId.length === 0) {
			throw new Error("Current project is unavailable.");
		}

		const currentProject: ProjectNavigationCurrentProject = {
			id: resolvedCurrentId,
			name:
				asTrimmedString(overviewProject.name) ||
				asTrimmedString(matchingHomeProject?.name) ||
				"Project",
			status:
				asTrimmedString(overviewProject.status) ||
				asTrimmedString(matchingHomeProject?.status) ||
				"Active",
			role: asTrimmedString(matchingHomeProject?.role) || "Member"
		};

		const projectList = (Array.isArray(homeProjects) ? homeProjects : []).flatMap((value) => {
			const candidate = asObject(value);
			const id = asTrimmedString(candidate.id);
			if (id.length === 0) {
				return [];
			}
			return [
				{
					id,
					name: asTrimmedString(candidate.name) || "Project",
					icon: normalizeProjectIcon(candidate.icon)
				}
			];
		});

		if (!projectList.some((item) => item.id.toLowerCase() === resolvedCurrentId.toLowerCase())) {
			projectList.unshift({
				id: currentProject.id,
				name: currentProject.name,
				icon: defaultProjectIconKey
			});
		}

		return {
			currentProject,
			projectList
		};
	}
);
