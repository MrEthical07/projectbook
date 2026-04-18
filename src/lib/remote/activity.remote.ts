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
	cursor?: string;
	limit?: number;
};

type PaginatedProjectActivity = {
	items: ProjectActivityItem[];
	nextCursor: string | null;
};

const appendPaginationQuery = (path: string, limit?: number, cursor?: string): string => {
	const params = new URLSearchParams();
	if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
		params.set("limit", String(Math.trunc(limit)));
	}
	if (typeof cursor === "string" && cursor.trim().length > 0) {
		params.set("cursor", cursor.trim());
	}
	const queryString = params.toString();
	return queryString.length > 0 ? `${path}?${queryString}` : path;
};

export const getUserActivity = query("unchecked", (input: HomeActivityInput) => {
	return remoteQueryRequest<HomeActivityItem[]>({
		path: appendPaginationQuery("/home/activity", input.limit),
		method: "GET",
		cachePolicy: {
			namespace: "home-activity",
			ttlMs: 15_000,
			keyParts: {
				limit: typeof input.limit === "number" ? Math.trunc(input.limit) : undefined
			},
			tags: ["home-activity"]
		}
	});
});

export const getUserDashboardActivity = query("unchecked", (input: HomeActivityInput) => {
	return remoteQueryRequest<HomeActivityItem[]>({
		path: appendPaginationQuery("/home/dashboard-activity", input.limit),
		method: "GET",
		cachePolicy: {
			namespace: "home-dashboard-activity",
			ttlMs: 15_000,
			keyParts: {
				limit: typeof input.limit === "number" ? Math.trunc(input.limit) : undefined
			},
			tags: ["home-dashboard", "home-activity"]
		}
	});
});

export const getProjectActivity = query("unchecked", (input: ProjectActivityInput) => {
	return remoteQueryRequest<{ items?: ProjectActivityItem[]; next_cursor?: string | null }>({
		path: appendPaginationQuery(
			`/projects/${encodePathSegment(input.projectId)}/activity`,
			input.limit,
			input.cursor
		),
		method: "GET",
		cachePolicy: {
			namespace: "project-activity",
			ttlMs: 15_000,
			keyParts: {
				project_id: input.projectId,
				cursor: typeof input.cursor === "string" ? input.cursor : undefined,
				limit: typeof input.limit === "number" ? Math.trunc(input.limit) : undefined
			},
			tags: [`project:${input.projectId}`, "project-activity"]
		}
	}).then((payload): PaginatedProjectActivity => {
		const items = Array.isArray(payload.items) ? payload.items : [];
		const nextCursor =
			typeof payload.next_cursor === "string" && payload.next_cursor.trim().length > 0
				? payload.next_cursor
				: null;
		return { items, nextCursor };
	});
});
