import { datastore } from "./datastore";

export const workspaceProjectsData: WorkspaceProject[] = [
	{
		id: "atlas-2026",
		name: "Atlas Research",
		organization: "League Studio",
		icon: "rocket",
		description: "Prototype onboarding flows for first-time users.",
		role: "Member",
		openTasks: 3,
		lastVisitedAt: "2026-02-14T09:20:00.000Z",
		lastUpdatedAt: "2026-02-14T08:15:00.000Z",
		status: "Active"
	},
	{
		id: "northwind-revamp",
		name: "Northwind Revamp",
		organization: "Northwind Labs",
		icon: "target",
		description: "Redesign the discovery and checkout journey.",
		role: "Admin",
		openTasks: 1,
		lastVisitedAt: "2026-02-13T16:50:00.000Z",
		lastUpdatedAt: "2026-02-14T06:05:00.000Z",
		status: "Active"
	},
	{
		id: "insight-kernel",
		name: "Insight Kernel",
		organization: "Acme Corp",
		icon: "compass",
		description: "Consolidate interview insights into action themes.",
		role: "Viewer",
		lastVisitedAt: "2026-02-12T18:42:00.000Z",
		lastUpdatedAt: "2026-02-12T21:00:00.000Z",
		status: "Active"
	},
	{
		id: "delta-sprint",
		name: "Delta Sprint",
		organization: "Acme Corp",
		icon: "zap",
		role: "Member",
		lastVisitedAt: "2026-02-11T12:00:00.000Z",
		lastUpdatedAt: "2026-02-11T13:30:00.000Z",
		status: "Archived"
	},
	{
		id: "kappa-mobile",
		name: "Kappa Mobile",
		organization: "Orbit Systems",
		icon: "layoutGrid",
		role: "Member",
		lastVisitedAt: "2026-02-10T09:30:00.000Z",
		lastUpdatedAt: "2026-02-12T10:30:00.000Z",
		status: "Active"
	},
	{
		id: "zenith-labs",
		name: "Zenith Labs",
		organization: "Zenith",
		icon: "sparkles",
		role: "Owner",
		openTasks: 5,
		lastUpdatedAt: "2026-02-14T07:00:00.000Z",
		status: "Active"
	},
	{
		id: "alpha-discovery",
		name: "Alpha Discovery",
		organization: "League Studio",
		icon: "bookOpen",
		role: "Viewer",
		lastVisitedAt: "2026-02-08T14:00:00.000Z",
		lastUpdatedAt: "2026-02-08T16:00:00.000Z",
		status: "Active"
	}
];

export const workspaceInvitesData: WorkspaceInvite[] = [
	{
		id: "inv-1",
		projectName: "ProtoPilot",
		organizationName: "LaunchCraft",
		inviterName: "Maya Singh",
		assignedRole: "Member"
	},
	{
		id: "inv-2",
		projectName: "Research Loop",
		organizationName: "Northwind Labs",
		inviterName: "Jordan Lee",
		assignedRole: "Viewer",
		expiresSoon: true
	},
	{
		id: "inv-3",
		projectName: "Retail Sprint 4",
		organizationName: "Acme Corp",
		inviterName: "Sara Kim",
		assignedRole: "Member"
	},
	{
		id: "inv-4",
		projectName: "Ops Insight",
		organizationName: "Orbit Systems",
		inviterName: "Ravi Patel",
		assignedRole: "Viewer"
	}
];

export const invitesInboxData: WorkspaceInvite[] = [
	{
		id: "inv-1",
		projectName: "Atlas Research",
		projectDescription: "Prototype new onboarding flows for early-stage cohorts.",
		projectStatus: "Active",
		projectId: "atlas-2026",
		organizationName: "League Studio",
		inviterName: "Maya Singh",
		inviterRole: "Owner",
		inviterEmail: "maya@league.dev",
		assignedRole: "Member",
		sentAt: "Feb 3, 2026",
		expiresAt: "Feb 10, 2026"
	},
	{
		id: "inv-2",
		projectName: "Northwind Revamp",
		projectDescription: "Reframe the testing experience and consolidate insight reports.",
		projectStatus: "Active",
		organizationName: "Northwind Labs",
		inviterName: "Jordan Lee",
		inviterRole: "Admin",
		inviterEmail: "jordan@northwind.io",
		assignedRole: "Viewer",
		sentAt: "Jan 28, 2026",
		expired: true
	}
];

export const workspaceNotificationsData: WorkspaceNotification[] = [
	{
		id: "n-1",
		text: "Alex mentioned you on Northwind Revamp",
		timestamp: "10m ago",
		url: "/notifications",
		read: false
	},
	{
		id: "n-2",
		text: "New invite from LaunchCraft",
		timestamp: "30m ago",
		url: "/invites",
		read: false
	},
	{
		id: "n-3",
		text: "Atlas Research was updated",
		timestamp: "2h ago",
		url: "/notifications"
	},
	{
		id: "n-4",
		text: "Insight Kernel has a new comment",
		timestamp: "Yesterday",
		url: "/notifications"
	},
	{
		id: "n-5",
		text: "Security reminder: review connected sessions",
		timestamp: "2d ago",
		url: "/notifications"
	},
	{
		id: "n-6",
		text: "Kappa Mobile shared a resource",
		timestamp: "3d ago",
		url: "/notifications"
	}
];

export const notificationsInboxData: WorkspaceNotification[] = [
	{
		id: "n-1",
		title: "Task assigned",
		description: "You were assigned to “Prototype onboarding flow”.",
		project: "Atlas Research",
		sourceType: "Project Activity",
		read: false,
		timestamp: "2m ago"
	},
	{
		id: "n-2",
		title: "Invitation to project",
		description: "Join “Northwind revamp” as a Contributor.",
		project: "Northwind revamp",
		sourceType: "Project Invitation",
		read: false,
		timestamp: "1h ago",
		inviter: "Maya Singh",
		role: "Member"
	},
	{
		id: "n-3",
		title: "Problem statement locked",
		description: "“Checkout anxiety in students” is now locked.",
		project: "Atlas Research",
		sourceType: "Project Activity",
		read: true,
		timestamp: "Yesterday"
	},
	{
		id: "n-4",
		title: "Security notice",
		description: "New login detected on MacBook Pro · Chrome.",
		sourceType: "System Notification",
		read: false,
		timestamp: "2 days ago"
	}
];

export const workspaceActivityData: WorkspaceActivityItem[] = [
	{
		id: "a-1",
		userName: "Alex",
		userInitials: "AL",
		action: "commented on Onboarding Flow",
		projectName: "Atlas Research",
		timestamp: "12m ago",
		involved: true,
		occurredAt: "2026-02-14T09:30:00.000Z"
	},
	{
		id: "a-2",
		userName: "Maya",
		userInitials: "MS",
		action: "created a new invite",
		projectName: "ProtoPilot",
		timestamp: "28m ago",
		involved: true,
		occurredAt: "2026-02-14T09:14:00.000Z"
	},
	{
		id: "a-3",
		userName: "Jordan",
		userInitials: "JL",
		action: "uploaded a resource",
		projectName: "Northwind Revamp",
		timestamp: "1h ago",
		involved: false,
		occurredAt: "2026-02-14T08:45:00.000Z"
	},
	{
		id: "a-4",
		userName: "Sara",
		userInitials: "SK",
		action: "updated problem statement",
		projectName: "Retail Sprint 4",
		timestamp: "2h ago",
		involved: false,
		occurredAt: "2026-02-14T07:10:00.000Z"
	},
	{
		id: "a-5",
		userName: "Ravi",
		userInitials: "RP",
		action: "added feedback",
		projectName: "Ops Insight",
		timestamp: "4h ago",
		involved: true,
		occurredAt: "2026-02-14T05:15:00.000Z"
	},
	{
		id: "a-6",
		userName: "Nina",
		userInitials: "NM",
		action: "locked an idea",
		projectName: "Zenith Labs",
		timestamp: "Yesterday",
		involved: false,
		occurredAt: "2026-02-13T16:20:00.000Z"
	},
	{
		id: "a-7",
		userName: "Omar",
		userInitials: "OK",
		action: "created a task",
		projectName: "Delta Sprint",
		timestamp: "Yesterday",
		involved: false,
		occurredAt: "2026-02-13T13:05:00.000Z"
	},
	{
		id: "a-8",
		userName: "Priya",
		userInitials: "PS",
		action: "updated timeline item",
		projectName: "Kappa Mobile",
		timestamp: "2d ago",
		involved: false,
		occurredAt: "2026-02-12T12:05:00.000Z"
	},
	{
		id: "a-9",
		userName: "Alex",
		userInitials: "AL",
		action: "edited your shared page",
		projectName: "Insight Kernel",
		timestamp: "2d ago",
		involved: true,
		occurredAt: "2026-02-12T10:15:00.000Z"
	},
	{
		id: "a-10",
		userName: "Maya",
		userInitials: "MS",
		action: "created an event",
		projectName: "Atlas Research",
		timestamp: "3d ago",
		involved: false,
		occurredAt: "2026-02-11T14:15:00.000Z"
	},
	{
		id: "a-11",
		userName: "Jordan",
		userInitials: "JL",
		action: "updated research notes",
		projectName: "Northwind Revamp",
		timestamp: "4d ago",
		involved: false,
		occurredAt: "2026-02-10T10:45:00.000Z"
	}
];

export const workspaceActivityPageData: WorkspaceActivityItem[] = [
	{
		id: "a-1",
		userName: "Alex",
		userInitials: "AL",
		action: "commented on",
		artifactName: "Onboarding Flow",
		artifactUrl: "/project/atlas-2026/stories/user-1",
		projectId: "atlas-2026",
		projectName: "Atlas Research",
		type: "Comments",
		timestamp: "12m ago",
		occurredAt: "2026-02-14T09:30:00.000Z"
	},
	{
		id: "a-2",
		userName: "Maya",
		userInitials: "MS",
		action: "updated",
		artifactName: "Interview Insight Summary",
		artifactUrl: "/project/atlas-2026/resources/insights",
		projectId: "atlas-2026",
		projectName: "Atlas Research",
		type: "Artifacts",
		timestamp: "28m ago",
		occurredAt: "2026-02-14T09:14:00.000Z"
	},
	{
		id: "a-3",
		userName: "Jordan",
		userInitials: "JL",
		action: "changed status for",
		artifactName: "Prototype task #14",
		artifactUrl: "/project/northwind-revamp/tasks/14",
		projectId: "northwind-revamp",
		projectName: "Northwind Revamp",
		type: "Tasks",
		timestamp: "1h ago",
		occurredAt: "2026-02-14T08:45:00.000Z"
	},
	{
		id: "a-4",
		userName: "Sara",
		userInitials: "SK",
		action: "added feedback to",
		artifactName: "Checkout concept",
		artifactUrl: "/project/retail-sprint-4/feedback/checkout-concept",
		projectId: "retail-sprint-4",
		projectName: "Retail Sprint 4",
		type: "Feedback",
		timestamp: "2h ago",
		occurredAt: "2026-02-14T07:10:00.000Z"
	}
];

export const addProjectReferenceData = {
	existingProjects: ["Project Atlas", "Research Hub", "Delta Sprint"],
	existingUsers: ["avery@league.dev", "nia@league.dev", "jordan@league.dev", "mira@league.dev"]
};

export const docsSectionsData = [
	{ id: "getting-started", title: "Getting Started" },
	{ id: "design-thinking-flow", title: "Design Thinking Flow" },
	{ id: "artifact-guide", title: "Artifact Guide" },
	{ id: "faq", title: "FAQ" }
] as const;

export const accountSettingsData = {
	displayName: "Avery Patel",
	handle: "avery",
	email: "avery@league.dev",
	accountStatus: "Active",
	bio: "Product design lead exploring new workflow systems.",
	theme: "System",
	density: "Comfortable",
	landing: "Last Project",
	timeFormat: "24-hour",
	inAppNotifications: true,
	emailNotifications: true,
	sessions: [
		{
			id: "sess-1",
			device: "MacBook Pro · Chrome",
			location: "San Francisco, CA",
			lastActive: "Active now",
			current: true
		},
		{
			id: "sess-2",
			device: "iPhone 15 · Safari",
			location: "San Francisco, CA",
			lastActive: "2 hours ago",
			current: false
		},
		{
			id: "sess-3",
			device: "Windows PC · Edge",
			location: "Austin, TX",
			lastActive: "2 days ago",
			current: false
		}
	]
};

datastore.workspace.projects = workspaceProjectsData;
datastore.workspace.invites = invitesInboxData;
datastore.workspace.notifications = workspaceNotificationsData;
datastore.workspace.activity = workspaceActivityData;
