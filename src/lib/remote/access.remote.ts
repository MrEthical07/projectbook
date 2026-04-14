import { query } from "$app/server";
import { encodePathSegment, remoteQueryRequest } from "$lib/server/api/remote";
import { permissionsToMask } from "$lib/utils/permission";

export const getProjectAccess = query("unchecked", async (projectId: string): Promise<ProjectAccess> => {
	const data = await remoteQueryRequest<{
		user: ProjectAccess["user"];
		role: ProjectRole;
		permissions: EffectivePermissions;
	}>({
		path: `/projects/${encodePathSegment(projectId)}/access`,
		method: "GET"
	});

	return {
		user: data.user,
		role: data.role,
		permissions: data.permissions,
		permissionMask: permissionsToMask(data.permissions)
	};
});
