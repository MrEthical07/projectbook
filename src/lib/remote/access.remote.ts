import { query } from "$app/server";
import { resolveProjectAccessForRequest } from "$lib/server/auth/authorization";

export const getProjectAccess = query("unchecked", (projectId: string): ProjectAccess => {
	return resolveProjectAccessForRequest(projectId);
});
