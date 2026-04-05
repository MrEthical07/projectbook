import { getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { datastore } from "$lib/server/data/datastore";

const emptyActionPermission: ActionPermission = {
	view: false,
	create: false,
	edit: false,
	delete: false,
	archive: false,
	statusChange: false
};

const createEmptyPermissions = (): EffectivePermissions => ({
	project: { ...emptyActionPermission },
	story: { ...emptyActionPermission },
	problem: { ...emptyActionPermission },
	idea: { ...emptyActionPermission },
	task: { ...emptyActionPermission },
	feedback: { ...emptyActionPermission },
	resource: { ...emptyActionPermission },
	page: { ...emptyActionPermission },
	calendar: { ...emptyActionPermission },
	member: { ...emptyActionPermission }
});

const resolveRoleFromWorkspace = (projectId: string): ProjectRole | null => {
	const workspaceProject = datastore.workspace.projects.find((item) => item.id === projectId);
	if (!workspaceProject) return null;
	if (workspaceProject.role === "Owner") return "Owner";
	if (workspaceProject.role === "Admin") return "Admin";
	if (workspaceProject.role === "Viewer") return "Viewer";
	if (workspaceProject.role === "Limited Access") return "Limited Access";
	if (workspaceProject.role === "Member") return "Member";
	return null;
};

const resolveRoleFromTeam = (actorId: string, projectId: string): ProjectRole | null => {
	const member = datastore.team.members.find(
		(item) => item.id === actorId && item.projectId === projectId
	);
	return member?.role ?? null;
};

const rolePermissionsForProject = (projectId: string): RolePermissionMap | undefined =>
	datastore.team.rolePermissions[projectId];

const projectExists = (projectId: string) =>
	datastore.projects.some((item) => item.id === projectId) ||
	datastore.workspace.projects.some((item) => item.id === projectId);

export const getAuthenticatedRequestUser = (): ProjectAccess["user"] => {
	const event = getRequestEvent();
	if (!event.locals.user?.id) {
		error(401, "Authentication required.");
	}

	return {
		id: event.locals.user.id,
		name: event.locals.user.name ?? datastore.workspace.user.name,
		email: event.locals.user.email ?? datastore.workspace.user.email
	};
};

export const resolveProjectAccessForRequest = (projectId: string): ProjectAccess => {
	const scopedProjectId = projectId?.trim();
	if (!scopedProjectId) {
		error(400, "Project id is required.");
	}

	if (!projectExists(scopedProjectId)) {
		error(404, "Project not found.");
	}

	const actor = getAuthenticatedRequestUser();
	const role =
		resolveRoleFromTeam(actor.id, scopedProjectId) ?? resolveRoleFromWorkspace(scopedProjectId);
	if (!role) {
		error(403, "No project membership was found for the active user.");
	}

	const rolePermissions = rolePermissionsForProject(scopedProjectId);
	if (!rolePermissions) {
		error(500, "Role permissions are not configured for this project.");
	}

	const permissions = rolePermissions[role];
	if (!permissions) {
		error(500, `Role permissions are missing for role '${role}'.`);
	}

	return {
		user: actor,
		role,
		permissions: structuredClone(permissions)
	};
};

export const getTrustedProjectPermissions = (input: unknown): EffectivePermissions => {
	if (!input || typeof input !== "object") {
		return createEmptyPermissions();
	}

	const rawProjectId = (input as Record<string, unknown>).projectId;
	if (typeof rawProjectId !== "string" || rawProjectId.trim().length === 0) {
		return createEmptyPermissions();
	}

	try {
		return resolveProjectAccessForRequest(rawProjectId.trim()).permissions;
	} catch {
		return createEmptyPermissions();
	}
};
