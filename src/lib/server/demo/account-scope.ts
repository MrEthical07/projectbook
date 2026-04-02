import { DEMO_EMAIL, SUPERADMIN_EMAIL } from "$lib/server/auth/constants";
import { datastore, type DataStore } from "$lib/server/data/datastore";
import "$lib/server/data/activity.data";
import "$lib/server/data/calendar.data";
import "$lib/server/data/feedback.data";
import "$lib/server/data/ideas.data";
import "$lib/server/data/journeys.data";
import "$lib/server/data/pages.data";
import "$lib/server/data/problems.data";
import { rolePermissionsData } from "$lib/server/data/project.data";
import "$lib/server/data/resources.data";
import "$lib/server/data/stories.data";
import "$lib/server/data/tasks.data";
import "$lib/server/data/workspace.data";

type SessionUser = {
	id: string;
	name: string;
	email: string;
};

export type DemoScopeResult = {
	activeProjectId: string | null;
	removedProjects: number;
	addedReadOnlyAccess: boolean;
};

const DEMO_PROJECT_ID = "atlas-2026";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const normalizeOptionalEmail = (email?: string): string => (email ? normalizeEmail(email) : "");

const cloneValue = <T>(value: T): T => structuredClone(value);

const restoreDatastore = (source: DataStore): void => {
	datastore.workspace = cloneValue(source.workspace);
	datastore.projects = cloneValue(source.projects);
	datastore.projectDashboard = cloneValue(source.projectDashboard);
	datastore.stories = cloneValue(source.stories);
	datastore.journeys = cloneValue(source.journeys);
	datastore.problems = cloneValue(source.problems);
	datastore.ideas = cloneValue(source.ideas);
	datastore.tasks = cloneValue(source.tasks);
	datastore.feedback = cloneValue(source.feedback);
	datastore.resources = cloneValue(source.resources);
	datastore.pages = cloneValue(source.pages);
	datastore.calendar = cloneValue(source.calendar);
	datastore.activity = cloneValue(source.activity);
	datastore.team = cloneValue(source.team);
	datastore.settings = cloneValue(source.settings);
};

const baseDatasetSnapshot: DataStore = cloneValue(datastore);
const scopedDatasets = new Map<string, DataStore>();
let activeScopeKey: string | null = null;

const resolveScopeKey = (user: SessionUser, scopeKeyOverride?: string): string => {
	const explicitScope = scopeKeyOverride?.trim();
	if (explicitScope) {
		return explicitScope;
	}
	return `account:${normalizeEmail(user.email)}`;
};

const switchToScope = (scopeKey: string): void => {
	if (activeScopeKey && activeScopeKey !== scopeKey) {
		scopedDatasets.set(activeScopeKey, cloneValue(datastore));
	}

	if (activeScopeKey === scopeKey) {
		return;
	}

	const snapshot = scopedDatasets.get(scopeKey);
	if (snapshot) {
		restoreDatastore(snapshot);
	} else if (activeScopeKey === null) {
		// Keep pre-hydrated state (for example from browser cookie persistence)
		// as the initial snapshot for this scope.
		scopedDatasets.set(scopeKey, cloneValue(datastore));
	} else {
		restoreDatastore(cloneValue(baseDatasetSnapshot));
	}
	activeScopeKey = scopeKey;
};

const persistScopeSnapshot = (scopeKey: string): void => {
	scopedDatasets.set(scopeKey, cloneValue(datastore));
	activeScopeKey = scopeKey;
};

const pruneUnavailableProjects = (): void => {
	const existingProjectIds = new Set(datastore.projects.map((project) => project.id));
	datastore.workspace.projects = datastore.workspace.projects.filter((project) =>
		existingProjectIds.has(project.id)
	);

	const visibleProjectIds = new Set(datastore.workspace.projects.map((project) => project.id));
	const visibleProjectNames = new Set(datastore.workspace.projects.map((project) => project.name));

	datastore.workspace.invites = datastore.workspace.invites.filter(
		(invite) =>
			!invite.projectId ||
			visibleProjectIds.has(invite.projectId) ||
			visibleProjectNames.has(invite.projectName)
	);
	datastore.workspace.notifications = datastore.workspace.notifications.filter(
		(notification) => !notification.project || visibleProjectNames.has(notification.project)
	);
	datastore.workspace.activity = datastore.workspace.activity.filter((item) => {
		if (item.projectId) {
			return visibleProjectIds.has(item.projectId);
		}
		return visibleProjectNames.has(item.projectName);
	});

	datastore.team.members = datastore.team.members.filter(
		(member) => !member.projectId || visibleProjectIds.has(member.projectId)
	);
	datastore.team.invites = datastore.team.invites.filter(
		(invite) => !invite.projectId || visibleProjectIds.has(invite.projectId)
	);
	datastore.team.rolePermissions = Object.fromEntries(
		Object.entries(datastore.team.rolePermissions).filter(([projectId]) =>
			visibleProjectIds.has(projectId)
		)
	);

	if (!datastore.projects.some((project) => project.id === datastore.projectDashboard.project.id)) {
		const fallbackProject = datastore.projects[0];
		if (fallbackProject) {
			datastore.projectDashboard.project = {
				id: fallbackProject.id,
				name: fallbackProject.name,
				status: fallbackProject.status
			};
		}
	}
};

const toScopedWorkspaceProject = (
	projectId: string,
	forceReadOnly: boolean
): WorkspaceProject | null => {
	const nowIso = new Date().toISOString();
	const existing = datastore.workspace.projects.find((item) => item.id === projectId);
	if (existing) {
		return {
			...existing,
			role: forceReadOnly ? "Viewer" : existing.role,
			status: existing.status ?? "Active",
			lastUpdatedAt: existing.lastUpdatedAt || nowIso
		};
	}

	const fromProjectInfo = datastore.projects.find((item) => item.id === projectId);
	if (!fromProjectInfo) {
		return null;
	}

	return {
		id: fromProjectInfo.id,
		name: fromProjectInfo.name,
		organization: "ProjectBook",
		icon: "bookOpen",
		role: forceReadOnly ? "Viewer" : "Member",
		lastUpdatedAt: nowIso,
		status: fromProjectInfo.status
	};
};

const keepRowsInProject = <T extends { projectId?: string }>(rows: T[], projectId: string): T[] =>
	rows.filter((row) => row.projectId === projectId);

const keepRowsInProjectWithoutOrphans = <T extends { projectId?: string; isOrphan?: boolean }>(
	rows: T[],
	projectId: string
): T[] => rows.filter((row) => row.projectId === projectId && row.isOrphan !== true);

const resetCollections = (): void => {
	datastore.workspace.projects = [];
	datastore.projects = [];
	datastore.stories = [];
	datastore.journeys = [];
	datastore.problems = [];
	datastore.ideas = [];
	datastore.tasks = [];
	datastore.feedback = [];
	datastore.resources = [];
	datastore.pages = [];
	datastore.calendar = [];
	datastore.activity = [];
	datastore.workspace.invites = [];
	datastore.workspace.notifications = [];
	datastore.workspace.activity = [];
	datastore.team.members = [];
	datastore.team.invites = [];
	datastore.team.rolePermissions = {};
	datastore.projectDashboard.events = [];
	datastore.projectDashboard.activity = [];
	datastore.projectDashboard.recentEdits = [];
};

const hasViewerAccess = (rolePermissions: RolePermissionMap): boolean =>
	rolePermissions.Viewer?.project?.view === true;

const rolePermissionTemplate = (): RolePermissionMap => {
	const existingTemplate = Object.values(datastore.team.rolePermissions)[0];
	if (existingTemplate) {
		return cloneValue(existingTemplate);
	}
	return cloneValue(rolePermissionsData);
};

const ensureRolePermissionsForProject = (
	projectId: string,
	template: RolePermissionMap
): void => {
	if (!datastore.team.rolePermissions[projectId]) {
		datastore.team.rolePermissions[projectId] = cloneValue(template);
	}
};

const ensureTeamMembership = (
	projectId: string,
	user: SessionUser,
	role: ProjectRole
): void => {
	const normalizedUserEmail = normalizeEmail(user.email);
	const member = datastore.team.members.find(
		(item) =>
			item.projectId === projectId &&
			(item.id === user.id || normalizeOptionalEmail(item.email) === normalizedUserEmail)
	);
	const today = new Date().toISOString().slice(0, 10);

	if (member) {
		member.id = user.id;
		member.name = user.name;
		member.email = user.email;
		member.role = role;
		member.status = "Active";
		member.updatedAt = today;
		member.joinedAt = member.joinedAt || today;
		return;
	}

	datastore.team.members.unshift({
		id: user.id,
		projectId,
		name: user.name,
		email: user.email,
		role,
		status: "Active",
		joinedAt: today,
		updatedAt: today
	});
};

export const isDemoAccount = (email?: string): boolean =>
	normalizeOptionalEmail(email) === normalizeEmail(DEMO_EMAIL);

export const isSuperAdminAccount = (email?: string): boolean =>
	normalizeOptionalEmail(email) === normalizeEmail(SUPERADMIN_EMAIL);

export const syncWorkspaceUserFromSession = (user: SessionUser): void => {
	datastore.workspace.user = {
		id: user.id,
		name: user.name,
		email: user.email
	};
};

const enforceDemoWorkspaceScope = (user: SessionUser): DemoScopeResult => {
	syncWorkspaceUserFromSession(user);
	pruneUnavailableProjects();

	const originalProjectCount = datastore.workspace.projects.length;
	const selectedProjectId = DEMO_PROJECT_ID;
	const atlasExists =
		datastore.projects.some((project) => project.id === selectedProjectId) ||
		datastore.workspace.projects.some((project) => project.id === selectedProjectId);

	if (!atlasExists) {
		resetCollections();
		return {
			activeProjectId: null,
			removedProjects: originalProjectCount,
			addedReadOnlyAccess: false
		};
	}

	const viewerProject = toScopedWorkspaceProject(selectedProjectId, true);
	if (!viewerProject) {
		resetCollections();
		return {
			activeProjectId: null,
			removedProjects: originalProjectCount,
			addedReadOnlyAccess: false
		};
	}

	datastore.workspace.projects = [viewerProject];
	datastore.projects = datastore.projects.filter((project) => project.id === selectedProjectId);
	if (datastore.projects.length === 0) {
		datastore.projects = [
			{
				id: viewerProject.id,
				name: viewerProject.name,
				status: viewerProject.status ?? "Active"
			}
		];
	}

	datastore.stories = keepRowsInProjectWithoutOrphans(datastore.stories, selectedProjectId);
	datastore.journeys = keepRowsInProjectWithoutOrphans(datastore.journeys, selectedProjectId);
	datastore.problems = keepRowsInProjectWithoutOrphans(datastore.problems, selectedProjectId);
	datastore.ideas = keepRowsInProjectWithoutOrphans(datastore.ideas, selectedProjectId);
	datastore.tasks = keepRowsInProjectWithoutOrphans(datastore.tasks, selectedProjectId);
	datastore.feedback = keepRowsInProjectWithoutOrphans(datastore.feedback, selectedProjectId);
	datastore.pages = keepRowsInProjectWithoutOrphans(datastore.pages, selectedProjectId);
	datastore.resources = keepRowsInProject(datastore.resources, selectedProjectId);
	datastore.calendar = keepRowsInProject(datastore.calendar, selectedProjectId);

	datastore.workspace.invites = datastore.workspace.invites.filter(
		(invite) => invite.projectId === selectedProjectId || invite.projectName === viewerProject.name
	);
	datastore.workspace.notifications = datastore.workspace.notifications.filter(
		(notification) => !notification.project || notification.project === viewerProject.name
	);
	datastore.workspace.activity = datastore.workspace.activity.filter((item) => {
		if (item.projectId) return item.projectId === selectedProjectId;
		return item.projectName === viewerProject.name;
	});

	datastore.activity = datastore.activity.filter((item) => {
		if (!item.projectId) return true;
		return item.projectId === selectedProjectId;
	});

	datastore.team.invites = datastore.team.invites.filter(
		(invite) => invite.projectId === selectedProjectId
	);
	datastore.team.members = datastore.team.members.filter(
		(member) => member.projectId === selectedProjectId
	);

	const normalizedEmail = normalizeEmail(user.email);
	const existingMember = datastore.team.members.find(
		(member) => member.id === user.id || normalizeOptionalEmail(member.email) === normalizedEmail
	);

	let addedReadOnlyAccess = false;
	if (existingMember) {
		const wasViewer = existingMember.role === "Viewer";
		existingMember.id = user.id;
		existingMember.name = user.name;
		existingMember.email = user.email;
		existingMember.projectId = selectedProjectId;
		if (!wasViewer) {
			addedReadOnlyAccess = true;
		}
		existingMember.role = "Viewer";
		existingMember.status = "Active";
		existingMember.updatedAt = new Date().toISOString().slice(0, 10);
	} else {
		addedReadOnlyAccess = true;
		datastore.team.members.unshift({
			id: user.id,
			projectId: selectedProjectId,
			name: user.name,
			email: user.email,
			role: "Viewer",
			status: "Active",
			joinedAt: new Date().toISOString().slice(0, 10),
			updatedAt: new Date().toISOString().slice(0, 10)
		});
	}

	const existingRolePermissions =
		datastore.team.rolePermissions[selectedProjectId] ??
		Object.values(datastore.team.rolePermissions).find(hasViewerAccess) ??
		rolePermissionTemplate();

	if (existingRolePermissions) {
		datastore.team.rolePermissions = {
			[selectedProjectId]: cloneValue(existingRolePermissions)
		};
	} else {
		datastore.team.rolePermissions = {};
	}

	const selectedProjectInfo = datastore.projects.find((project) => project.id === selectedProjectId);
	datastore.projectDashboard.project = {
		id: selectedProjectId,
		name: selectedProjectInfo?.name ?? viewerProject.name,
		status: selectedProjectInfo?.status ?? viewerProject.status ?? "Active"
	};
	datastore.projectDashboard.events = datastore.projectDashboard.events.filter(
		(item) => !item.projectId || item.projectId === selectedProjectId
	);
	datastore.projectDashboard.activity = datastore.projectDashboard.activity.filter(
		(item) => !item.projectId || item.projectId === selectedProjectId
	);
	datastore.projectDashboard.recentEdits = datastore.projectDashboard.recentEdits.filter((item) =>
		item.href.includes(`/project/${selectedProjectId}/`)
	);

	datastore.settings.projectName = datastore.projectDashboard.project.name;
	datastore.settings.projectStatus = datastore.projectDashboard.project.status;

	return {
		activeProjectId: selectedProjectId,
		removedProjects: Math.max(originalProjectCount - 1, 0),
		addedReadOnlyAccess
	};
};

const enforceFullWorkspaceScope = (user: SessionUser): void => {
	syncWorkspaceUserFromSession(user);
	pruneUnavailableProjects();

	if (!isSuperAdminAccount(user.email)) {
		return;
	}

	const template = rolePermissionTemplate();
	for (const project of datastore.workspace.projects) {
		project.role = "Owner";
		project.lastUpdatedAt = project.lastUpdatedAt || new Date().toISOString();

		if (!datastore.projects.some((item) => item.id === project.id)) {
			datastore.projects.push({
				id: project.id,
				name: project.name,
				status: project.status ?? "Active"
			});
		}

		ensureRolePermissionsForProject(project.id, template);
		ensureTeamMembership(project.id, user, "Owner");
	}
};

export const applyAccountWorkspaceScope = (
	user: SessionUser,
	scopeKeyOverride?: string
): DemoScopeResult | null => {
	const scopeKey = resolveScopeKey(user, scopeKeyOverride);
	switchToScope(scopeKey);

	const result = isDemoAccount(user.email)
		? enforceDemoWorkspaceScope(user)
		: (enforceFullWorkspaceScope(user), null);

	persistScopeSnapshot(scopeKey);
	return result;
};

export const hydrateWorkspaceSnapshot = (snapshot: DataStore): void => {
	restoreDatastore(snapshot);
	activeScopeKey = null;
};

export const captureWorkspaceSnapshot = (): DataStore => cloneValue(datastore);
