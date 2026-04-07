
export interface DataStore {
	workspace: {
		user: WorkspaceUser;
		projects: WorkspaceProject[];
		invites: WorkspaceInvite[];
		notifications: WorkspaceNotification[];
		activity: WorkspaceActivityItem[];
	};
	projects: ProjectInfo[];
	projectDashboard: {
		project: ProjectInfo;
		me: ProjectMemberSummary;
		events: ProjectEventItem[];
		activity: ProjectActivityItem[];
		recentEdits: Array<{ id: string; type: string; title: string; href: string; at: string }>;
	};
	stories: StoryRow[];
	journeys: JourneyRow[];
	problems: ProblemRow[];
	ideas: IdeaRow[];
	tasks: TaskRow[];
	feedback: FeedbackRow[];
	resources: ResourceRow[];
	pages: PageRow[];
	calendar: CalendarEvent[];
	activity: Array<ProjectActivityItem | WorkspaceActivityItem>;
	team: {
		members: TeamMember[];
		invites: Array<{ email: string; role: "Owner" | "Admin" | "Editor" | "Viewer" | "Limited Access"; sentDate: string; status: "pending" | "accepted"; projectId?: string }>;
		rolePermissions: Record<string, RolePermissionMaskMap>;
	};
	settings: {
		projectName: string;
		projectDescription: string;
		projectStatus: "Active" | "Archived";
		whiteboardsEnabled?: boolean;
		advancedDatabasesEnabled?: boolean;
		calendarManualEventsEnabled?: boolean;
		resourceVersioningEnabled?: boolean;
		feedbackAggregationEnabled?: boolean;
		notifyArtifactCreated?: boolean;
		notifyArtifactLocked?: boolean;
		notifyFeedbackAdded?: boolean;
		notifyResourceUpdated?: boolean;
		deliveryChannel?: "In-app" | "Email";
	};
}

export const datastore: DataStore = {
	workspace: {
		user: { id: "u-1", name: "Workspace User", email: "user@example.com" },
		projects: [],
		invites: [],
		notifications: [],
		activity: []
	},
	projects: [],
	projectDashboard: {
		project: { id: "atlas-2026", name: "Sample Project", status: "Active" },
		me: { id: "u-1", name: "Workspace User", initials: "WU" },
		events: [],
		activity: [],
		recentEdits: []
	},
	stories: [],
	journeys: [],
	problems: [],
	ideas: [],
	tasks: [],
	feedback: [],
	resources: [],
	pages: [],
	calendar: [],
	activity: [],
	team: {
		members: [],
		invites: [],
		rolePermissions: {}
	},
	settings: {
		projectName: "Sample Project",
		projectDescription: "Minimal neutral sample workspace.",
		projectStatus: "Active",
		whiteboardsEnabled: true,
		advancedDatabasesEnabled: true,
		calendarManualEventsEnabled: true,
		resourceVersioningEnabled: true,
		feedbackAggregationEnabled: true,
		notifyArtifactCreated: true,
		notifyArtifactLocked: true,
		notifyFeedbackAdded: true,
		notifyResourceUpdated: true,
		deliveryChannel: "In-app"
	}
};
