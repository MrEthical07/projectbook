import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	runMutation,
	type MutationResult
} from "$lib/server/api/remote";
import {
	defaultProjectIconKey,
	projectIconKeys,
	type ProjectIconKey
} from "$lib/constants/project-icons";

const createProjectSchema = z.object({
	name: z.string().trim().min(1),
	description: z.string().optional(),
	icon: z.enum(projectIconKeys)
});

const inviteActionSchema = z.object({
	inviteId: z.string().min(1)
});

const projectInviteRoleSchema = z.enum([
	"Owner",
	"Admin",
	"Editor",
	"Viewer",
	"Limited Access"
]);

const sendProjectInvitesSchema = z.object({
	projectId: z.string().min(1),
	invites: z.array(
		z.object({
			email: z.string().email(),
			role: projectInviteRoleSchema
		})
	)
});

const updateAccountSettingsSchema = z.object({
	settings: z.object({
		displayName: z.string().min(1),
		bio: z.string().optional(),
		theme: z.enum(["Light", "Dark", "System"]).optional(),
		density: z.enum(["Comfortable", "Compact"]).optional(),
		landing: z.enum(["Last Project", "Project Selector"]).optional(),
		timeFormat: z.enum(["12-hour", "24-hour"]).optional(),
		inAppNotifications: z.boolean().optional(),
		emailNotifications: z.boolean().optional()
	})
});

const docsFallbackSections = [
	"Getting Started",
	"Design Thinking Flow",
	"Artifact Guide",
	"FAQ"
] as const;

type ApiHomeNotification = {
	id: string;
	text?: string;
	timestamp?: string;
	url?: string;
	read?: boolean;
	sourceType?: string;
	dismissed?: boolean;
};

const normalizeNotificationSource = (
	sourceType?: string
): "Project Activity" | "Project Invitation" | "System Notification" => {
	const normalized = (sourceType ?? "").trim().toLowerCase();
	if (normalized.includes("invite")) {
		return "Project Invitation";
	}
	if (normalized.includes("activity")) {
		return "Project Activity";
	}
	return "System Notification";
};

const notificationTitle = (notification: ApiHomeNotification): string => {
	const source = normalizeNotificationSource(notification.sourceType);
	if (source === "Project Invitation") {
		return "Project invitation";
	}
	if (source === "Project Activity") {
		return "Project activity";
	}
	return "Notification";
};

const mapDashboardNotification = (notification: ApiHomeNotification) => ({
	id: notification.id,
	text: notification.text ?? "",
	timestamp: notification.timestamp ?? "",
	url: notification.url ?? "/notifications",
	unread: notification.read === true ? false : true
});

const mapInboxNotification = (notification: ApiHomeNotification) => ({
	id: notification.id,
	title: notificationTitle(notification),
	description: notification.text ?? "",
	sourceType: normalizeNotificationSource(notification.sourceType),
	read: notification.read === true,
	timestamp: notification.timestamp ?? "",
	dismissed: notification.dismissed === true
});

const slugifySectionId = (value: string): string =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");

const normalizeProjectIcon = (value: unknown): ProjectIconKey => {
	if (typeof value === "string" && projectIconKeys.includes(value as ProjectIconKey)) {
		return value as ProjectIconKey;
	}
	return defaultProjectIconKey;
};

const resolveHandle = (email: string, displayName: string): string => {
	const emailPrefix = email.split("@")[0]?.trim();
	if (emailPrefix) {
		return emailPrefix;
	}
	const normalizedName = displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
	return normalizedName || "user";
};

export type HomeSidebarData = {
	user: {
		name: string;
		email: string;
		avatar: string;
	};
};

export const getHomeSidebarData = query(async (): Promise<HomeSidebarData> => {
	const dashboard = await remoteQueryRequest<{
		user: HomeUser;
	}>({
		path: "/home/dashboard",
		method: "GET"
	});

	return {
		user: {
			name: dashboard.user.name,
			email: dashboard.user.email,
			avatar: "/avatars/shadcn.jpg"
		}
	};
});

export const getUserDashboard = query(async () => {
	const dashboard = await remoteQueryRequest<{
		user: HomeUser;
		projects: Array<HomeProject & { icon?: string }>;
		invites: HomeInvite[];
		notifications: ApiHomeNotification[];
		activity: HomeActivityItem[];
	}>({
		path: "/home/dashboard",
		method: "GET"
	});

	return {
		user: dashboard.user,
		projects: dashboard.projects.map((project) => ({
			...project,
			icon: normalizeProjectIcon(project.icon)
		})),
		invites: dashboard.invites,
		notifications: dashboard.notifications.map(mapDashboardNotification),
		activity: dashboard.activity
	};
});

export const getUserProjects = query(async () => {
	const projects = await remoteQueryRequest<Array<HomeProject & { icon?: string }>>({
		path: "/home/projects",
		method: "GET"
	});
	return projects.map((project) => ({
		...project,
		icon: normalizeProjectIcon(project.icon)
	}));
});

export const getUserInvitesPage = query(async () => {
	return remoteQueryRequest<HomeInvite[]>({
		path: "/home/invites",
		method: "GET"
	});
});

export const getUserNotificationsPage = query(async () => {
	const notifications = await remoteQueryRequest<ApiHomeNotification[]>({
		path: "/home/notifications",
		method: "GET"
	});
	return notifications.map(mapInboxNotification);
});

export const getUserActivityPage = query(async () => {
	return remoteQueryRequest<HomeActivityItem[]>({
		path: "/home/activity",
		method: "GET"
	});
});

export const getProjectCreationReference = query(async () => {
	return remoteQueryRequest<{ existingProjects: string[]; existingUsers: string[] }>({
		path: "/home/projects/reference",
		method: "GET"
	});
});

export const getUserDocsSections = query(async () => {
	const docs = await remoteQueryRequest<{ sections?: string[] }>({
		path: "/home/docs",
		method: "GET"
	});
	const sections = Array.isArray(docs.sections) && docs.sections.length > 0
		? docs.sections
		: [...docsFallbackSections];

	return sections.map((section) => ({
		id: slugifySectionId(section),
		title: section
	}));
});

export const getUserAccountSettings = query(async () => {
	const account = await remoteQueryRequest<{
		displayName: string;
		email: string;
		bio: string;
		theme: "Light" | "Dark" | "System";
		density: "Comfortable" | "Compact";
		landing: "Last Project" | "Project Selector";
		timeFormat: "12-hour" | "24-hour";
		inAppNotifications: boolean;
		emailNotifications: boolean;
	}>({
		path: "/home/account",
		method: "GET"
	});

	return {
		...account,
		handle: resolveHandle(account.email, account.displayName),
		accountStatus: "Active",
		sessions: [
			{
				id: "current-session",
				device: "Current Browser",
				location: "Current Location",
				lastActive: "Active now",
				current: true
			}
		]
	};
});

export const createProject = command(
	"unchecked",
	async (input: unknown): Promise<MutationResult<{ projectId: string; project: HomeProject }>> => {
		const parsed = createProjectSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ projectId: string; project: HomeProject }>({
			path: "/home/projects",
			method: "POST",
			body: parsed.data
		});
	}
);

export const acceptProjectInvite = command(
	"unchecked",
	async (input: unknown): Promise<MutationResult<{ inviteId: string; projectId: string }>> => {
		const parsed = inviteActionSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ inviteId: string; projectId: string }>({
			path: `/home/invites/${encodePathSegment(parsed.data.inviteId)}/accept`,
			method: "POST"
		});
	}
);

export const declineProjectInvite = command(
	"unchecked",
	async (input: unknown): Promise<MutationResult<{ inviteId: string }>> => {
		const parsed = inviteActionSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ inviteId: string }>({
			path: `/home/invites/${encodePathSegment(parsed.data.inviteId)}/decline`,
			method: "POST"
		});
	}
);

export const updateUserAccountSettings = command(
	"unchecked",
	async (input: unknown): Promise<MutationResult<{ updatedAt: string }>> => {
		const parsed = updateAccountSettingsSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ updatedAt: string }, { settings: z.infer<typeof updateAccountSettingsSchema>["settings"] }>({
			path: "/home/account",
			method: "PUT",
			body: parsed.data
		});
	}
);

export const sendProjectInvites = command(
	"unchecked",
	async (
		input: unknown
	): Promise<MutationResult<{ projectId: string; invited: Array<{ email: string; role: string }> }>> => {
		const parsed = sendProjectInvitesSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		if (parsed.data.invites.length === 0) {
			return {
				success: true,
				data: { projectId: parsed.data.projectId, invited: [] }
			};
		}

		return runMutation(async () => {
			const response = await remoteQueryRequest<{
				projectId: string;
				invited: Array<{ email: string; role: string }>;
				failed?: Array<{ message?: string }>;
			}>({
				path: `/projects/${encodePathSegment(parsed.data.projectId)}/team/invites/batch`,
				method: "POST",
				body: {
					invites: parsed.data.invites
				}
			});

			const invited = Array.isArray(response.invited) ? response.invited : [];
			if (invited.length === 0 && Array.isArray(response.failed) && response.failed.length > 0) {
				throw new Error(response.failed[0]?.message ?? "No invites were sent.");
			}

			return {
				projectId: response.projectId ?? parsed.data.projectId,
				invited
			};
		}, "Unable to send project invites.");
	}
);
