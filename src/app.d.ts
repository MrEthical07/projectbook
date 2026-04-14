// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces.
declare global {
	// Shared primitives.
	type TimestampString = string;
	type ProjectStatus = "Active" | "Archived";

	// Shared role and permission types.
	type ActionPermission = {
		view: boolean;
		create: boolean;
		edit: boolean;
		delete: boolean;
		archive: boolean;
		statusChange: boolean;
	};

	type EffectivePermissions = {
		project: ActionPermission;
		story: ActionPermission;
		problem: ActionPermission;
		idea: ActionPermission;
		task: ActionPermission;
		feedback: ActionPermission;
		resource: ActionPermission;
		page: ActionPermission;
		calendar: ActionPermission;
		member: ActionPermission;
	};

	type PermissionMask = string;

	type PermissionDomain = keyof EffectivePermissions;
	type PermissionAction = keyof ActionPermission;

	type ProjectRole =
		| "Owner"
		| "Admin"
		| "Editor"
		| "Member"
		| "Viewer"
		| "Limited Access";

	type RolePermissionMap = Record<ProjectRole, EffectivePermissions>;
	type RolePermissionMaskMap = Record<ProjectRole, PermissionMask>;

	type ProjectAccess = {
		user: {
			id: string;
			name: string;
			email?: string;
		};
		role: ProjectRole;
		permissionMask: PermissionMask;
		permissions: EffectivePermissions;
	};

	type MemberRole = Exclude<ProjectRole, "Member">;

	// Shared icon identifiers.
	type ProjectIconKey =
		| "folderKanban"
		| "rocket"
		| "lightbulb"
		| "flaskConical"
		| "compass"
		| "target"
		| "briefcase"
		| "layoutGrid"
		| "notebookPen"
		| "sparkles"
		| "code"
		| "palette"
		| "zap"
		| "shieldCheck"
		| "chartLine"
		| "database"
		| "globe"
		| "megaphone"
		| "users"
		| "graduationCap"
		| "handshake"
		| "wrench"
		| "cpu"
		| "bookOpen"
		| "flag";

	// Shared artifact/domain model types.
	type StoryStatus = "Draft" | "Locked" | "Archived";
	type JourneyStatus = "Draft" | "Archived";
	type ProblemStatus = "Draft" | "Locked" | "Archived";
	type IdeaStatus = "Considered" | "Selected" | "Rejected" | "Archived";
	type TaskStatus = "Planned" | "In Progress" | "Completed" | "Abandoned" | "Blocked";
	type FeedbackOutcome = "Validated" | "Invalidated" | "Needs Iteration";
	type PageStatus = "Draft" | "Archived";
	type ResourceStatus = "Active" | "Archived";
	type CalendarEventType = "Derived" | "Manual";

	interface StoryRow {
		id: string;
		projectId?: string;
		title: string;
		personaName: string;
		painPointsCount: number;
		problemHypothesesCount: number;
		owner: string;
		lastUpdated: string;
		status: StoryStatus;
		isOrphan: boolean;
	}

	interface JourneyRow {
		id: string;
		projectId?: string;
		title: string;
		linkedPersonas: string[];
		stagesCount: number;
		painPointsCount: number;
		owner: string;
		lastUpdated: string;
		status: JourneyStatus;
		isOrphan: boolean;
	}

	interface ProblemRow {
		id: string;
		projectId?: string;
		statement: string;
		linkedSources: string[];
		painPointsCount: number;
		ideasCount: number;
		status: ProblemStatus;
		owner: string;
		lastUpdated: string;
		isOrphan: boolean;
	}

	interface IdeaRow {
		id: string;
		projectId?: string;
		title: string;
		linkedProblemStatement: string;
		persona: string;
		status: IdeaStatus;
		tasksCount: number;
		owner: string;
		lastUpdated: string;
		linkedProblemLocked: boolean;
		isOrphan: boolean;
	}

	interface TaskRow {
		id: string;
		projectId?: string;
		title: string;
		linkedIdea: string;
		linkedProblemStatement: string;
		persona: string;
		owner: string;
		deadline: string;
		lastUpdated: string;
		status: TaskStatus;
		ideaRejected: boolean;
		hasFeedback: boolean;
		isOrphan: boolean;
	}

	interface FeedbackRow {
		id: string;
		projectId?: string;
		title: string;
		linkedArtifacts: string[];
		outcome: FeedbackOutcome;
		linkedTaskOrIdea: string;
		owner: string;
		createdDate: string;
		hasTaskLink: boolean;
		isOrphan: boolean;
	}

	interface ResourceRow {
		id: string;
		projectId?: string;
		name: string;
		fileType: string;
		docType: string;
		owner: string;
		version: string;
		lastUpdated: string;
		linkedCount: number;
		status: ResourceStatus;
	}

	interface PageRow {
		id: string;
		projectId?: string;
		title: string;
		owner: string;
		lastEdited: string;
		linkedArtifactsCount: number;
		status: PageStatus;
		isOrphan: boolean;
	}

	interface CalendarEvent {
		id: string;
		projectId?: string;
		title: string;
		type: CalendarEventType;
		start: string;
		end: string;
		startTime?: string;
		endTime?: string;
		allDay: boolean;
		owner: string;
		phase: "Empathize" | "Define" | "Ideate" | "Prototype" | "Test" | "None";
		artifactType: "Task" | "Feedback" | "Manual";
		sourceTitle?: string;
		description?: string;
		location?: string;
		eventKind?: string;
		linkedArtifacts?: string[];
		tags?: string[];
		createdAt: string;
		lastEdited?: string;
	}

	// Shared project model types.
	interface ProjectInfo {
		id: string;
		name: string;
		status: ProjectStatus;
	}

	interface ProjectMemberSummary {
		id: string;
		name: string;
		initials: string;
		role?: "Owner" | "Admin" | "Editor" | "Member" | "Viewer" | "Limited Access";
		email?: string;
	}

	interface ProjectActivityItem {
		id: string;
		projectId?: string;
		user: string;
		initials: string;
		action: string;
		artifact: string;
		href: string;
		at: string;
	}

	interface ProjectEventItem {
		id: string;
		projectId?: string;
		title: string;
		type: string;
		startAt: string;
		creator: string;
		initials: string;
	}

	interface TeamMember {
		id: string;
		projectId?: string;
		name: string;
		email: string;
		role: ProjectRole;
		isCustom?: boolean;
		permissionMask?: PermissionMask;
		status: "Active" | "Invited";
		joinedAt?: string;
		updatedAt?: string;
		joinedDate?: string;
		team?: string;
		location?: string;
	}

	interface PendingInvite {
		projectId?: string;
		email: string;
		role: "Owner" | "Admin" | "Editor" | "Viewer" | "Limited Access";
		sentDate: string;
		status: "pending" | "accepted";
	}

	// Shared home model types.
	interface HomeUser {
		id: string;
		name: string;
		email: string;
	}

	interface HomeProject {
		id: string;
		name: string;
		organization: string;
		icon: ProjectIconKey;
		description?: string;
		role: "Owner" | "Admin" | "Editor" | "Member" | "Viewer" | "Limited Access";
		openTasks?: number;
		lastVisitedAt?: string;
		lastUpdatedAt: string;
		status?: ProjectStatus;
	}

	interface HomeInvite {
		id: string;
		projectName: string;
		organizationName: string;
		inviterName: string;
		assignedRole: "Member" | "Viewer" | "Limited Access";
		expiresSoon?: boolean;
		expired?: boolean;
		projectDescription?: string;
		projectStatus?: ProjectStatus;
		projectId?: string;
		inviterRole?: "Owner" | "Admin";
		inviterEmail?: string;
		sentAt?: string;
		expiresAt?: string;
	}

	interface HomeNotification {
		id: string;
		title?: string;
		text?: string;
		description?: string;
		project?: string;
		sourceType?: "Project Activity" | "Project Invitation" | "System Notification";
		read?: boolean;
		timestamp: string;
		url?: string;
		inviter?: string;
		role?: string;
		dismissed?: boolean;
	}

	interface HomeActivityItem {
		id: string;
		userName: string;
		userInitials: string;
		action: string;
		projectName: string;
		timestamp: string;
		occurredAt: string;
		involved?: boolean;
		artifactName?: string;
		artifactUrl?: string;
		projectId?: string;
		type?: "Artifacts" | "Tasks" | "Feedback" | "Comments";
	}

	// Unified app/web error and page data contracts.
	type WebErrorSource =
		| "app"
		| "client"
		| "server"
		| "network"
		| "validation"
		| "authorization"
		| "not-found"
		| "unknown";

	interface ValidationIssue {
		path?: string;
		code?: string;
		message: string;
		received?: unknown;
		expected?: unknown;
	}

	interface WebError {
		message: string;
		status?: number;
		code?: string;
		source?: WebErrorSource;
		details?: unknown;
		issues?: ValidationIssue[];
		requestId?: string;
		retryable?: boolean;
		cause?: unknown;
		stack?: string;
		timestamp?: TimestampString;
	}

	interface BasePageData {
		title?: string;
		description?: string;
		meta?: Record<string, unknown>;
		form?: Record<string, unknown> | null;
		error?: WebError | null;
		status?: number;
		code?: string;
		message?: string;
		requestId?: string;
		user?: HomeUser | ProjectAccess["user"] | null;
		project?: ProjectInfo | null;
		projectId?: string;
		data?: Record<string, unknown>;
		[key: string]: unknown;
	}

	interface NavigationPageState {
		from?: string;
		to?: string;
		pending?: boolean;
		scrollY?: number;
		updatedAt?: TimestampString;
		[key: string]: unknown;
	}

	namespace App {
		interface Error extends WebError {}

		interface Locals {
			requestId?: string;
			user?: {
				id: string;
				name?: string;
				email?: string;
				role?: ProjectRole;
				authenticated?: boolean;
			};
			project?: {
				id: string;
				role?: ProjectRole;
				permissionMask?: PermissionMask;
				permissions?: EffectivePermissions;
			};
			projectPermissionMask?: PermissionMask;
			session?: {
				id?: string;
				expiresAt?: TimestampString;
				csrfToken?: string;
				[key: string]: unknown;
			};
			[key: string]: unknown;
		}

		interface PageData extends BasePageData {}
		interface PageState extends NavigationPageState {}

		interface Platform {
			env?: Record<string, unknown>;
			context?: Record<string, unknown>;
			cf?: Record<string, unknown>;
			[key: string]: unknown;
		}
	}
}

export {};
