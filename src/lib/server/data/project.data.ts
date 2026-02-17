import { datastore } from "./datastore";

export const projectInfoData: ProjectInfo = {
	id: "atlas-2026",
	name: "Northstar Checkout Revamp",
	status: "Active"
};

export const projectMembersData: TeamMember[] = [
	{
		id: "mem-1",
		name: "Avery Patel",
		email: "avery@league.dev",
		role: "Owner",
		status: "Active",
		joinedAt: "2026-02-04"
	},
	{
		id: "mem-2",
		name: "Nia Clark",
		email: "nia@league.dev",
		role: "Admin",
		status: "Active",
		joinedAt: "2026-02-05"
	},
	{
		id: "mem-3",
		name: "Jordan Lee",
		email: "jordan@league.dev",
		role: "Viewer",
		status: "Invited",
		joinedAt: "2026-02-06"
	}
];

export const teamMembersPageData: TeamMember[] = [
	{
		id: "tm-1",
		name: "Sophia Lee",
		email: "sophia.lee@projectbook.io",
		role: "Owner",
		status: "active",
		joinedDate: "Jan 12, 2024",
		team: "Product",
		location: "San Francisco, CA"
	},
	{
		id: "tm-2",
		name: "Marcus Reid",
		email: "marcus.reid@projectbook.io",
		role: "Admin",
		status: "active",
		joinedDate: "Feb 3, 2024",
		team: "Design",
		location: "New York, NY"
	},
	{
		id: "tm-3",
		name: "Priya Nair",
		email: "priya.nair@projectbook.io",
		role: "Editor",
		status: "active",
		joinedDate: "Mar 22, 2024",
		team: "Research",
		location: "Toronto, CA"
	},
	{
		id: "tm-4",
		name: "Diego Santos",
		email: "diego.santos@projectbook.io",
		role: "Viewer",
		status: "invited",
		joinedDate: "Apr 10, 2024",
		team: "Operations",
		location: "Lisbon, PT"
	}
];

export const teamInvitesPageData = [
	{
		email: "melissa.chen@projectbook.io",
		role: "Editor" as const,
		sentDate: "Apr 18, 2024",
		status: "pending" as const
	},
	{
		email: "ashton.clark@projectbook.io",
		role: "Viewer" as const,
		sentDate: "Apr 20, 2024",
		status: "pending" as const
	}
];

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
		title: "Prototype critique",
		type: "Review",
		startAt: "2026-02-10T16:00:00.000Z",
		creator: "Priya Shah",
		initials: "PS"
	},
	{
		id: "event-2",
		title: "Interview synthesis",
		type: "Workshop",
		startAt: "2026-02-11T18:00:00.000Z",
		creator: "Alex Morgan",
		initials: "AM"
	},
	{
		id: "event-3",
		title: "Design standup",
		type: "Standup",
		startAt: "2026-02-12T15:30:00.000Z",
		creator: "Jules Kim",
		initials: "JK"
	},
	{
		id: "event-4",
		title: "Usability playback",
		type: "Review",
		startAt: "2026-02-14T17:00:00.000Z",
		creator: "Rae Chen",
		initials: "RC"
	},
	{
		id: "event-5",
		title: "Payment retry spike",
		type: "Workshop",
		startAt: "2026-02-15T19:00:00.000Z",
		creator: "Noah Diaz",
		initials: "ND"
	}
];

export const dashboardActivityData: ProjectActivityItem[] = [
	{
		id: "a-1",
		user: "Alex Morgan",
		initials: "AM",
		action: "locked Problem Statement",
		artifact: "Checkout fields are too dense on mobile",
		href: "/project/atlas-2026/problem-statement/problem-1",
		at: "2026-02-09T15:10:00.000Z"
	},
	{
		id: "a-2",
		user: "Priya Shah",
		initials: "PS",
		action: "updated Task",
		artifact: "Implement mobile progressive form",
		href: "/project/atlas-2026/tasks/task-1",
		at: "2026-02-09T14:40:00.000Z"
	},
	{
		id: "a-3",
		user: "Rae Chen",
		initials: "RC",
		action: "added Feedback",
		artifact: "Trust panel copy unclear",
		href: "/project/atlas-2026/feedback/feedback-2",
		at: "2026-02-09T13:55:00.000Z"
	}
];

export const dashboardRecentEditsData = [
	{
		id: "e-1",
		type: "Story",
		title: "First-time buyers need payment confidence",
		href: "/project/atlas-2026/stories/story-2",
		at: "2026-02-09T10:30:00.000Z"
	},
	{
		id: "e-2",
		type: "Problem Statement",
		title: "Checkout fields are too dense on mobile",
		href: "/project/atlas-2026/problem-statement/problem-1",
		at: "2026-02-09T15:10:00.000Z"
	}
];

export const projectSettingsData = {
	projectName: "Project Atlas",
	projectDescription: "Core product research and prototype delivery.",
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
