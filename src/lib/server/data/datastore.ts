
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
		rolePermissions: Record<string, RolePermissionMap>;
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
		user: { id: "u-1", name: "Ayush", email: "ayush@projectbook.dev" },
		projects: [],
		invites: [],
		notifications: [],
		activity: []
	},
	projects: [],
	// NOTE: workspace.user.name is "Ayush" while projectDashboard.me.name is "Alex Morgan".
	// These represent different contexts (workspace identity vs. project member display name)
	// but in a real system they should be consistent or clearly differentiated.
	projectDashboard: {
		project: { id: "atlas-2026", name: "Northstar Checkout Revamp", status: "Active" },
		me: { id: "u-1", name: "Alex Morgan", initials: "AM" },
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
		projectName: "Project Atlas",
		projectDescription: "Core product research and prototype delivery.",
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
