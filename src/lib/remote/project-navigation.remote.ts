import { query } from "$app/server";
import { z } from "zod";
import {
	defaultProjectIconKey,
	projectIconKeys,
	type ProjectIconKey
} from "$lib/constants/project-icons";
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
		const payload = asObject(
			await remoteQueryRequest<unknown>({
				path: `/projects/${encodePathSegment(parsedProjectId)}/navigation`,
				method: "GET",
				cachePolicy: {
					namespace: "project-navigation",
					ttlMs: 1,
					sessionPersistent: true,
					keyParts: { project_id: parsedProjectId },
					tags: [
						`project-navigation:${parsedProjectId}`,
						"project-navigation",
						"home-projects"
					]
				}
			})
		);

		const currentProjectPayload = asObject(payload.current_project);
		const currentProject: ProjectNavigationCurrentProject = {
			id: asTrimmedString(currentProjectPayload.id),
			name: asTrimmedString(currentProjectPayload.name) || "Project",
			status: asTrimmedString(currentProjectPayload.status) || "Active",
			role: asTrimmedString(currentProjectPayload.role) || "Member"
		};
		if (currentProject.id.length === 0) {
			throw new Error("Current project is unavailable.");
		}

		const projectListPayload = Array.isArray(payload.project_list) ? payload.project_list : [];
		const projectList = projectListPayload.flatMap((value) => {
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

		return {
			currentProject,
			projectList
		};
	}
);
