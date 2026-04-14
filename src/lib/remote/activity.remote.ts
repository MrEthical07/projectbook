import { query } from "$app/server";
import {
	encodePathSegment,
	remoteQueryRequest
} from "$lib/server/api/remote";

type HomeActivityInput = {
	limit?: number;
};

type ProjectActivityInput = {
	projectId: string;
	limit?: number;
};

const appendLimit = (path: string, limit?: number): string => {
	if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
		return path;
	}
	return `${path}?limit=${Math.trunc(limit)}`;
};

export const getUserActivity = query("unchecked", (input: HomeActivityInput) => {
	return remoteQueryRequest<HomeActivityItem[]>({
		path: appendLimit("/home/activity", input.limit),
		method: "GET"
	});
});

export const getUserDashboardActivity = query("unchecked", (input: HomeActivityInput) => {
	return remoteQueryRequest<HomeActivityItem[]>({
		path: appendLimit("/home/dashboard-activity", input.limit),
		method: "GET"
	});
});

export const getProjectActivity = query("unchecked", (input: ProjectActivityInput) => {
	return remoteQueryRequest<ProjectActivityItem[]>({
		path: appendLimit(
			`/projects/${encodePathSegment(input.projectId)}/activity`,
			input.limit
		),
		method: "GET"
	});
});
