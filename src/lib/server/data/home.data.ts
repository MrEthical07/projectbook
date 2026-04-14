import { datastore } from "./datastore";

export const homeProjectsData: HomeProject[] = [
	{
		id: "atlas-2026",
		name: "Sample Project",
		organization: "ProjectBook contributors",
		icon: "rocket",
		description: "Minimal neutral sample project.",
		role: "Owner",
		openTasks: 1,
		lastVisitedAt: "2026-02-14T09:20:00.000Z",
		lastUpdatedAt: "2026-02-14T09:20:00.000Z",
		status: "Active"
	}
];

export const homeInvitesData: HomeInvite[] = [
	{
		id: "inv-1",
		projectName: "Sample Project",
		organizationName: "ProjectBook contributors",
		inviterName: "Project Admin",
		assignedRole: "Member"
	}
];

export const invitesInboxData: HomeInvite[] = [
	{
		id: "inv-1",
		projectName: "Sample Project",
		projectDescription: "Minimal neutral sample project.",
		projectStatus: "Active",
		projectId: "atlas-2026",
		organizationName: "ProjectBook contributors",
		inviterName: "Project Admin",
		inviterRole: "Owner",
		inviterEmail: "admin@example.com",
		assignedRole: "Member",
		sentAt: "Feb 10, 2026",
		expiresAt: "Feb 20, 2026"
	}
];

export const homeNotificationsData: HomeNotification[] = [
	{
		id: "n-1",
		text: "Welcome to Sample Project",
		timestamp: "Just now",
		url: "/notifications",
		read: false
	}
];

export const notificationsInboxData: HomeNotification[] = [
	{
		id: "n-1",
		title: "Welcome",
		description: "Your home is ready.",
		project: "Sample Project",
		sourceType: "System Notification",
		read: false,
		timestamp: "Just now"
	}
];

export const homeActivityData: HomeActivityItem[] = [
	{
		id: "a-1",
		userName: "ProjectBook User",
		userInitials: "PU",
		action: "created Sample Project",
		projectName: "Sample Project",
		timestamp: "Just now",
		involved: true,
		occurredAt: "2026-02-14T09:30:00.000Z"
	}
];

export const homeActivityPageData: HomeActivityItem[] = [
	{
		id: "a-1",
		userName: "ProjectBook User",
		userInitials: "PU",
		action: "updated",
		artifactName: "Sample Story",
		artifactUrl: "/project/atlas-2026/stories/sample-story-1",
		projectId: "atlas-2026",
		projectName: "Sample Project",
		type: "Artifacts",
		timestamp: "Just now",
		occurredAt: "2026-02-14T09:30:00.000Z"
	}
];

export const addProjectReferenceData = {
	existingProjects: ["Sample Project"],
	existingUsers: ["user@example.com"]
};

export const docsSectionsData = [
	{ id: "getting-started", title: "Getting Started" },
	{ id: "design-thinking-flow", title: "Design Thinking Flow" },
	{ id: "artifact-guide", title: "Artifact Guide" },
	{ id: "faq", title: "FAQ" }
] as const;

export const accountSettingsData = {
	displayName: "ProjectBook User",
	handle: "projectbook-user",
	email: "user@example.com",
	accountStatus: "Active",
	bio: "Sample account for local development.",
	theme: "System",
	density: "Comfortable",
	landing: "Last Project",
	timeFormat: "24-hour",
	inAppNotifications: true,
	emailNotifications: true,
	sessions: [
		{
			id: "sess-1",
			device: "Desktop Browser",
			location: "Local",
			lastActive: "Active now",
			current: true
		}
	]
};

datastore.home.projects = homeProjectsData;
datastore.home.invites = invitesInboxData;
datastore.home.notifications = homeNotificationsData;
datastore.home.activity = homeActivityData;
