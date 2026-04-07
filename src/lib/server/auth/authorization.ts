import { getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { datastore } from "$lib/server/data/datastore";
import {
	defaultRolePermissionMasks,
	getDefaultRolePermissionMasks,
	projectRoleOrder
} from "$lib/server/data/default-role-permissions";
import {
	EMPTY_PERMISSION_MASK,
	maskToPermissions,
	normalizePermissionMask,
	validatePermissionMaskValue
} from "$lib/utils/permission";

const resolveRoleFromWorkspace = (actorId: string, projectId: string): ProjectRole | null => {
	if (datastore.workspace.user.id !== actorId) return null;
	const workspaceProject = datastore.workspace.projects.find((item) => item.id === projectId);
	if (!workspaceProject) return null;
	if (workspaceProject.role === "Owner") return "Owner";
	if (workspaceProject.role === "Admin") return "Admin";
	if (workspaceProject.role === "Editor") return "Editor";
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

const resolveMemberFromTeam = (actorId: string, projectId: string): TeamMember | undefined =>
	datastore.team.members.find((item) => item.id === actorId && item.projectId === projectId);

const validateStoredRoleMask = (
	projectId: string,
	role: ProjectRole,
	mask: PermissionMask
): PermissionMask => {
	const normalized = normalizePermissionMask(mask);
	const validation = validatePermissionMaskValue(normalized);
	if (!validation.valid) {
		error(
			500,
			`Invalid stored permission mask for role '${role}' in project '${projectId}': ${validation.errors.join("; ")}`
		);
	}
	return normalized;
};

export const ensureProjectRolePermissionMasks = (
	projectId: string
): RolePermissionMaskMap => {
	if (!datastore.team.rolePermissions[projectId]) {
		datastore.team.rolePermissions[projectId] = getDefaultRolePermissionMasks();
	}

	const rolePermissionMasks = datastore.team.rolePermissions[projectId];
	for (const role of projectRoleOrder) {
		if (!rolePermissionMasks[role]) {
			rolePermissionMasks[role] = defaultRolePermissionMasks[role];
		}
		rolePermissionMasks[role] = validateStoredRoleMask(
			projectId,
			role,
			rolePermissionMasks[role]
		);
	}

	return rolePermissionMasks;
};

const projectExists = (projectId: string) =>
	datastore.projects.some((item) => item.id === projectId) ||
	datastore.workspace.projects.some((item) => item.id === projectId);

export const getAuthenticatedRequestUser = (): ProjectAccess["user"] => {
	const event = getRequestEvent();
	if (!event.locals.user?.id) {
		error(401, "Authentication required.");
	}

	const authenticatedUser = {
		id: event.locals.user.id,
		name: event.locals.user.name ?? datastore.workspace.user.name,
		email: event.locals.user.email ?? datastore.workspace.user.email
	};

	datastore.workspace.user = {
		id: authenticatedUser.id,
		name: authenticatedUser.name,
		email: authenticatedUser.email ?? datastore.workspace.user.email
	};

	return authenticatedUser;
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
	const member = resolveMemberFromTeam(actor.id, scopedProjectId);
	const role =
		resolveRoleFromTeam(actor.id, scopedProjectId) ??
		resolveRoleFromWorkspace(actor.id, scopedProjectId);
	if (!role) {
		error(403, "No project membership was found for the active user.");
	}

	const rolePermissions = ensureProjectRolePermissionMasks(scopedProjectId);

	const rolePermissionMask = rolePermissions[role];
	if (!rolePermissionMask) {
		error(500, `Role permissions are missing for role '${role}'.`);
	}

	const effectivePermissionMask =
		member?.isCustom === true
			? normalizePermissionMask(member.permissionMask ?? rolePermissionMask)
			: normalizePermissionMask(rolePermissionMask);
	const effectiveValidation = validatePermissionMaskValue(effectivePermissionMask);
	if (!effectiveValidation.valid) {
		error(
			500,
			`Invalid effective permission mask for user '${actor.id}' in project '${scopedProjectId}': ${effectiveValidation.errors.join("; ")}`
		);
	}

	return {
		user: actor,
		role,
		permissionMask: effectivePermissionMask,
		permissions: maskToPermissions(effectivePermissionMask)
	};
};

export const getTrustedProjectPermissionMask = (input: unknown): PermissionMask => {
	if (!input || typeof input !== "object") {
		return EMPTY_PERMISSION_MASK;
	}

	const rawProjectId = (input as Record<string, unknown>).projectId;
	if (typeof rawProjectId !== "string" || rawProjectId.trim().length === 0) {
		return EMPTY_PERMISSION_MASK;
	}

	try {
		return resolveProjectAccessForRequest(rawProjectId.trim()).permissionMask;
	} catch {
		return EMPTY_PERMISSION_MASK;
	}
};
