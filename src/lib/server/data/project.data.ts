import { datastore } from "./datastore";

export const projectInfoData: ProjectInfo = {
	id: "atlas-2026",
	name: "Sample Project",
	status: "Active"
};

export const projectMembersData: TeamMember[] = [
	{
		id: "u-1",
		name: "Workspace User",
		email: "user@example.com",
		role: "Owner",
		status: "Active",
		joinedAt: "2026-02-14"
	}
];

export const teamMembersPageData: TeamMember[] = [
	{
		id: "u-1",
		name: "Workspace User",
		email: "user@example.com",
		role: "Owner",
		status: "Active",
		joinedDate: "Feb 14, 2026",
		team: "Product",
		location: "Remote"
	}
];

export const teamInvitesPageData = [];

export const rolePermissionsData: RolePermissionMap = {
	Owner: {
		project: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		story: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		problem: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		idea: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		task: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		feedback: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		resource: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		page: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		calendar: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		member: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true }
	},
	Admin: {
		project: { view: true, create: false, edit: true, delete: false, archive: true, statusChange: true },
		story: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		problem: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		idea: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		task: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		feedback: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		resource: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		page: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		calendar: { view: true, create: true, edit: true, delete: true, archive: true, statusChange: true },
		member: { view: true, create: true, edit: true, delete: true, archive: false, statusChange: true }
	},
	Editor: {
		project: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		story: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		problem: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		idea: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		task: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		feedback: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		resource: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		page: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		calendar: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		member: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false }
	},
	Member: {
		project: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		story: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		problem: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		idea: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		task: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		feedback: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: true },
		resource: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		page: { view: true, create: true, edit: true, delete: false, archive: false, statusChange: false },
		calendar: { view: true, create: true, edit: false, delete: false, archive: false, statusChange: false },
		member: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false }
	},
	Viewer: {
		project: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		story: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		problem: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		idea: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		task: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		feedback: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		resource: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		page: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		calendar: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false },
		member: { view: true, create: false, edit: false, delete: false, archive: false, statusChange: false }
	},
	"Limited Access": {
		project: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		story: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		problem: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		idea: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		task: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		feedback: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		resource: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		page: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		calendar: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false },
		member: { view: false, create: false, edit: false, delete: false, archive: false, statusChange: false }
	}
};

export const dashboardEventsData: ProjectEventItem[] = [
	{
		id: "event-1",
		title: "Sample planning session",
		type: "Workshop",
		startAt: "2026-02-14T16:00:00.000Z",
		creator: "Workspace User",
		initials: "WU"
	}
];

export const dashboardActivityData: ProjectActivityItem[] = [
	{
		id: "a-1",
		user: "Workspace User",
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
	projectDescription: "Minimal neutral sample workspace.",
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
}

for (const member of teamMembersPageData) {
	member.projectId ??= PROJECT_ID;
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
