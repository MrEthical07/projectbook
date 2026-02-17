import { query } from "$app/server";
import { error } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { datastore } from "$lib/server/data/datastore";

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
	if (!member) return null;
	return member.role;
};

const rolePermissionsForProject = (projectId: string): RolePermissionMap | undefined =>
	datastore.team.rolePermissions[projectId];

const clonePermissions = (permissions: EffectivePermissions): EffectivePermissions =>
	structuredClone(permissions);

const roleToPermissions = (
	role: ProjectRole,
	rolePermissions: RolePermissionMap | undefined
): EffectivePermissions => {
	if (!rolePermissions) {
		error(500, "Role permissions are not configured for this project.");
	}
	return clonePermissions(rolePermissions[role]);
};

export const getProjectAccess = query("unchecked", (projectId: string): ProjectAccess => {
	const scopedProjectId = projectId?.trim();
	if (!scopedProjectId) {
		error(400, "Project id is required.");
	}
	const projectExists =
		datastore.projects.some((item) => item.id === scopedProjectId) ||
		datastore.workspace.projects.some((item) => item.id === scopedProjectId);
	if (!projectExists) {
		error(404, "Project not found.");
	}

	const actorId = datastore.workspace.user.id;
	const actor = datastore.workspace.user;
	const resolvedRole = resolveRoleFromWorkspace(scopedProjectId) ?? resolveRoleFromTeam(actorId, scopedProjectId);
	const devAdminOverride = dev && actorId === datastore.workspace.user.id;
	const role: ProjectRole | null = devAdminOverride ? "Admin" : resolvedRole;
	if (!role) {
		error(403, "No project membership was found for the active user.");
	}
	const rolePermissions = rolePermissionsForProject(scopedProjectId);
	if (!rolePermissions) {
		error(500, "Role permissions are not configured for this project.");
	}
	const roleAccess = rolePermissions[role];
	if (!roleAccess) {
		error(500, `Role permissions are missing for role '${role}'.`);
	}

	return {
		user: {
			id: actor.id,
			name: actor.name,
			email: actor.email
		},
		role,
		permissions: roleToPermissions(role, rolePermissions)
	};
});
