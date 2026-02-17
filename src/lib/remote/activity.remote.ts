import { query } from "$app/server";
import { error } from "@sveltejs/kit";
import { datastore } from "$lib/server/data/datastore";

type WorkspaceActivityInput = {
	limit?: number;
};

type ProjectActivityInput = {
	projectId: string;
	limit?: number;
};

type LoggedActivity = ProjectActivityItem | WorkspaceActivityItem;

const sortByDateDesc = (a: LoggedActivity, b: LoggedActivity) => {
	const aDate = "at" in a ? Date.parse(a.at) : Date.parse(a.occurredAt);
	const bDate = "at" in b ? Date.parse(b.at) : Date.parse(b.occurredAt);
	return bDate - aDate;
};

const inProjectScope = (projectId: string, itemProjectId?: string) =>
	itemProjectId === projectId;

export const getWorkspaceActivity = query("unchecked", (input: WorkspaceActivityInput) => {
	const limit = input.limit ?? 50;
	return datastore.activity
		.filter((item): item is WorkspaceActivityItem => "projectName" in item && "occurredAt" in item)
		.slice()
		.sort(sortByDateDesc)
		.slice(0, limit);
});

export const getWorkspaceDashboardActivity = query("unchecked", (input: WorkspaceActivityInput) => {
	const limit = input.limit ?? 10;
	const involved = datastore.workspace.activity
		.filter((item) => item.involved)
		.slice()
		.sort(sortByDateDesc);
	const global = datastore.workspace.activity
		.filter((item) => !item.involved)
		.slice()
		.sort(sortByDateDesc);
	return [...involved, ...global].slice(0, limit);
});

export const getProjectActivity = query("unchecked", (input: ProjectActivityInput) => {
	const projectId = input.projectId?.trim();
	if (!projectId) {
		error(400, "Project id is required.");
	}
	const projectExists =
		datastore.projects.some((item) => item.id === projectId) ||
		datastore.workspace.projects.some((item) => item.id === projectId);
	if (!projectExists) {
		error(404, "Project not found.");
	}

	const limit = input.limit ?? 20;
	return datastore.projectDashboard.activity
		.filter((item) => inProjectScope(projectId, item.projectId))
		.slice()
		.sort(sortByDateDesc)
		.slice(0, limit);
});
