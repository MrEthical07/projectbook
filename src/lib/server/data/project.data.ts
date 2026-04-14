import { datastore } from "./datastore";
import { getDefaultRolePermissionMasks } from "./default-role-permissions";

export const projectInfoData: ProjectInfo = {
	id: "atlas-2026",
	name: "Sample Project",
	status: "Active"
};

export const projectMembersData: TeamMember[] = [
	{
		id: "u-1",
		name: "ProjectBook User",
		email: "user@example.com",
		role: "Owner",
		status: "Active",
		joinedAt: "2026-02-14"
	}
];

export const teamMembersPageData: TeamMember[] = [
	{
		id: "u-1",
		name: "ProjectBook User",
		email: "user@example.com",
		role: "Owner",
		status: "Active",
		joinedDate: "Feb 14, 2026",
		team: "Product",
		location: "Remote"
	}
];

export const teamInvitesPageData = [];

export const rolePermissionsData: RolePermissionMaskMap =
	getDefaultRolePermissionMasks();

export const dashboardEventsData: ProjectEventItem[] = [
	{
		id: "event-1",
		title: "Sample planning session",
		type: "Workshop",
		startAt: "2026-02-14T16:00:00.000Z",
		creator: "ProjectBook User",
		initials: "WU"
	}
];

export const dashboardActivityData: ProjectActivityItem[] = [
	{
		id: "a-1",
		user: "ProjectBook User",
		initials: "WU",
		action: "updated Story",
		artifact: "Sample Story",
		href: "/project/atlas-2026/stories/sample-story-1",
		at: "2026-02-14T15:10:00.000Z"
	}
];

export const dashboardRecentEditsData = [
	{
		id: "e-1",
		type: "Story",
		title: "Sample Story",
		href: "/project/atlas-2026/stories/sample-story-1",
		at: "2026-02-14T15:10:00.000Z"
	}
];

export const projectSettingsData = {
	projectName: "Sample Project",
	projectDescription: "Minimal neutral sample project.",
	projectStatus: "Active" as const,
	whiteboardsEnabled: true,
	advancedDatabasesEnabled: true,
	calendarManualEventsEnabled: true,
	resourceVersioningEnabled: true,
	feedbackAggregationEnabled: true,
	notifyArtifactCreated: true,
	notifyArtifactLocked: true,
	notifyFeedbackAdded: true,
	notifyResourceUpdated: true,
	deliveryChannel: "In-app" as const
};

const PROJECT_ID = projectInfoData.id;

for (const member of projectMembersData) {
	member.projectId ??= PROJECT_ID;
	member.isCustom = false;
	member.permissionMask = rolePermissionsData[member.role];
}

for (const member of teamMembersPageData) {
	member.projectId ??= PROJECT_ID;
	member.isCustom = false;
	member.permissionMask = rolePermissionsData[member.role];
}

for (const event of dashboardEventsData) {
	event.projectId ??= PROJECT_ID;
}

for (const item of dashboardActivityData) {
	item.projectId ??= PROJECT_ID;
}

datastore.projects = [projectInfoData];
datastore.projectDashboard.project = projectInfoData;
datastore.projectDashboard.events = dashboardEventsData;
datastore.projectDashboard.activity = dashboardActivityData;
datastore.projectDashboard.recentEdits = dashboardRecentEditsData;
datastore.team.members = projectMembersData;
datastore.team.invites = teamInvitesPageData;
datastore.team.rolePermissions[PROJECT_ID] = structuredClone(rolePermissionsData);
datastore.settings = projectSettingsData;
