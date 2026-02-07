export type TaskStatus = "Planned" | "In Progress" | "Completed" | "Abandoned";
export type ViewMode = "Table" | "Kanban";

export type TaskRow = {
    id: string;
    projectId: string;
    title: string;
    linkedIdea: string;
    linkedProblemStatement: string;
    persona: string;
    owner: string;
    deadline: string;
    status: TaskStatus;
    ideaRejected: boolean;
    hasFeedback: boolean;
    isOrphan: boolean;
    // Detailed fields
    hypothesis?: string;
    planItems?: string[];
    executionLinks?: string[];
    notes?: string;
    abandonReason?: string;
    description?: string; // Short description
};

export type CalendarEventSourceType = "Derived" | "Manual";
export type ArtifactType = "Task" | "Feedback" | "Manual";
export type PhaseOption = "None" | "Empathize" | "Define" | "Ideate" | "Prototype" | "Test";
export type ManualEventKind = "Workshop" | "Review" | "Testing Session" | "Meeting" | "Other";

export type CalendarEvent = {
    id: string;
    projectId: string;
    title: string;
    type: CalendarEventSourceType;
    start: string; // ISO date string YYYY-MM-DD
    end: string;   // ISO date string YYYY-MM-DD
    startTime?: string; // HH:mm
    endTime?: string;   // HH:mm
    allDay: boolean;
    owner: string;
    phase: PhaseOption;
    artifactType: ArtifactType;
    sourceTitle?: string;
    description?: string;
    location?: string;
    eventKind?: string; // Can be custom if ManualEventKind is "Other"
    linkedArtifacts?: string[];
    tags?: string[];
    createdAt: string;
    lastEdited?: string;
};

export type ArtifactKind = "story" | "journey" | "problem" | "idea" | "whiteboard" | "feedback" | "page";

export type Artifact = {
    id: string;
    projectId: string;
    kind: ArtifactKind;
    title: string;
    slug: string;
    createdAt: string;
};

export type NotificationSourceType = "Project Activity" | "Project Invitation" | "System Notification";

export type Notification = {
    id: string;
    title: string;
    description: string;
    project?: string; // Project Name
    projectId?: string; // Project ID for linking
    sourceType: NotificationSourceType;
    read: boolean;
    timestamp: string; // "2m ago", etc. In a real app this would be ISO
    inviter?: string;
    role?: string;
    dismissed?: boolean;
};

export type InviteStatus = "Active" | "Archived";
export type Invite = {
    id: string;
    projectName: string;
    projectDescription: string;
    projectStatus: InviteStatus;
    projectId?: string;
    inviterName: string;
    inviterRole: "Owner" | "Admin";
    inviterEmail?: string;
    assignedRole: "Editor" | "Viewer";
    sentAt: string;
    expiresAt?: string;
    expired?: boolean;
};

export type ProjectRole = "Owner" | "Admin" | "Editor" | "Viewer";
export type MemberStatus = "Active" | "Invited";

export type Member = {
    id: string;
    name: string;
    email: string;
    role: ProjectRole;
    status: MemberStatus;
    joinedAt: string;
};

export type Project = {
    id: string;
    name: string;
    description: string;
    status: "Active" | "Archived";
    members: Member[];
    features: {
        whiteboards: boolean;
        advancedDatabases: boolean;
        calendarManualEvents: boolean;
        resourceVersioning: boolean; // Usually locked to true
        feedbackAggregation: boolean;
    };
    notifications: {
        artifactCreated: boolean;
        artifactLocked: boolean;
        feedbackAdded: boolean;
        resourceUpdated: boolean;
        deliveryChannel: "In-app" | "Email";
    };
    permissions?: Record<string, Record<ProjectRole, boolean>>;
};

export type UserSession = {
    id: string;
    device: string;
    location: string;
    lastActive: string;
    current: boolean;
};

export type UserSettings = {
    theme: "Light" | "Dark" | "System";
    density: "Comfortable" | "Compact";
    landing: "Last Project" | "Project Selector";
    timeFormat: "12-hour" | "24-hour";
    inAppNotifications: boolean;
    emailNotifications: boolean;
};

export type User = {
    id: string;
    displayName: string;
    handle: string;
    email: string;
    bio: string;
    status: "Active" | "Inactive";
    avatarUrl?: string; // For future use
    settings: UserSettings;
    sessions: UserSession[];
};

export type GlobalState = {
    user: User;
    projects: Project[];
    tasks: TaskRow[];
    events: CalendarEvent[];
    artifacts: Artifact[];
    notifications: Notification[];
    invites: Invite[];
};
