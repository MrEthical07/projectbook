import { command, query } from "$app/server";
import { z } from "zod";
import { datastore } from "$lib/server/data/datastore";
import {
	accountSettingsData,
	addProjectReferenceData,
	docsSectionsData,
	notificationsInboxData,
	workspaceActivityPageData
} from "$lib/server/data/workspace.data";
import {
	defaultProjectIconKey,
	projectIconKeys,
	type ProjectIconKey
} from "$lib/constants/project-icons";

type MutationResult<T> =
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: string;
	  };

const createProjectSchema = z.object({
	actorId: z.string().min(1),
	name: z.string().trim().min(1),
	description: z.string().optional(),
	icon: z.enum(projectIconKeys)
});

const inviteActionSchema = z.object({
	actorId: z.string().min(1),
	inviteId: z.string().min(1)
});

const workspaceInviteRoleSchema = z.enum([
	"Owner",
	"Admin",
	"Editor",
	"Viewer",
	"Limited Access"
]);

const sendWorkspaceProjectInvitesSchema = z.object({
	actorId: z.string().min(1),
	projectId: z.string().min(1),
	invites: z.array(
		z.object({
			email: z.string().email(),
			role: workspaceInviteRoleSchema
		})
	)
});

const updateAccountSettingsSchema = z.object({
	actorId: z.string().min(1),
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

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");

const uniqueId = (value: string, existing: string[]): string | null => {
	const base = slugify(value);
	if (!base) return null;
	if (!existing.includes(base)) return base;
	let suffix = 2;
	while (existing.includes(`${base}-${suffix}`)) {
		suffix += 1;
	}
	return `${base}-${suffix}`;
};

const iconForProjectName = (name: string): ProjectIconKey => {
	const normalized = name.trim().toLowerCase();
	if (!normalized) return defaultProjectIconKey;
	let hash = 0;
	for (let index = 0; index < normalized.length; index += 1) {
		hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
	}
	return projectIconKeys[hash % projectIconKeys.length] ?? defaultProjectIconKey;
};

export const getWorkspaceDashboard = query(() => {
	return {
		user: datastore.workspace.user,
		projects: datastore.workspace.projects,
		invites: datastore.workspace.invites,
		notifications: datastore.workspace.notifications,
		activity: datastore.workspace.activity
	};
});

export const getWorkspaceProjects = query(() => {
	return datastore.workspace.projects;
});

export const getWorkspaceInvitesPage = query(() => {
	return datastore.workspace.invites;
});

export const getWorkspaceNotificationsPage = query(() => {
	return notificationsInboxData;
});

export const getWorkspaceActivityPage = query(() => {
	return workspaceActivityPageData;
});

export const getAddProjectReference = query(() => {
	return addProjectReferenceData;
});

export const getDocsSections = query(() => {
	return docsSectionsData;
});

export const getAccountSettings = query(() => {
	return accountSettingsData;
});

export const createWorkspaceProject = command(
	"unchecked",
	(input: unknown): MutationResult<{ projectId: string; project: WorkspaceProject }> => {
		const parsed = createProjectSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		if (parsed.data.actorId !== datastore.workspace.user.id) {
			return { success: false, error: "Permission denied" };
		}
		const name = parsed.data.name.trim();
		const duplicate = datastore.workspace.projects.some(
			(item) => item.name.toLowerCase() === name.toLowerCase()
		);
		if (duplicate) {
			return { success: false, error: "Project already exists" };
		}
		const projectId = uniqueId(name, datastore.workspace.projects.map((item) => item.id));
		if (!projectId) {
			return {
				success: false,
				error: "Project name must include letters or numbers."
			};
		}
		const project: WorkspaceProject = {
			id: projectId,
			name,
			organization: "League Studio",
			icon: parsed.data.icon,
			description: parsed.data.description?.trim() || undefined,
			role: "Owner",
			lastVisitedAt: new Date().toISOString(),
			lastUpdatedAt: new Date().toISOString(),
			status: "Active"
		};
		datastore.workspace.projects.unshift(project);
		datastore.projects.unshift({
			id: projectId,
			name,
			status: "Active"
		});
		return { success: true, data: { projectId, project } };
	}
);

export const acceptWorkspaceInvite = command(
	"unchecked",
	(input: unknown): MutationResult<{ inviteId: string; projectId: string }> => {
		const parsed = inviteActionSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		if (parsed.data.actorId !== datastore.workspace.user.id) {
			return { success: false, error: "Permission denied" };
		}
		const inviteIndex = datastore.workspace.invites.findIndex(
			(item) => item.id === parsed.data.inviteId
		);
		if (inviteIndex < 0) {
			return { success: false, error: "Invite not found" };
		}
		const invite = datastore.workspace.invites[inviteIndex];
		if (invite.expired) {
			return { success: false, error: "Invite expired" };
		}
		if (!invite.projectId?.trim()) {
			return { success: false, error: "Invite is missing a linked project id" };
		}
		if (!invite.projectStatus) {
			return { success: false, error: "Invite is missing project status" };
		}
		datastore.workspace.invites.splice(inviteIndex, 1);
		const projectId = invite.projectId.trim();
		const exists = datastore.workspace.projects.some((item) => item.id === projectId);
		if (!exists) {
			const role =
				invite.assignedRole === "Viewer"
					? "Viewer"
					: invite.assignedRole === "Limited Access"
						? "Limited Access"
						: "Member";
			datastore.workspace.projects.unshift({
				id: projectId,
				name: invite.projectName,
				organization: invite.organizationName,
				icon: iconForProjectName(invite.projectName),
				role,
				lastUpdatedAt: new Date().toISOString(),
				lastVisitedAt: new Date().toISOString(),
				status: invite.projectStatus,
				description: invite.projectDescription
			});
		}
		return { success: true, data: { inviteId: invite.id, projectId } };
	}
);

export const declineWorkspaceInvite = command(
	"unchecked",
	(input: unknown): MutationResult<{ inviteId: string }> => {
		const parsed = inviteActionSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const inviteIndex = datastore.workspace.invites.findIndex(
			(item) => item.id === parsed.data.inviteId
		);
		if (inviteIndex < 0) {
			return { success: false, error: "Invite not found" };
		}
		datastore.workspace.invites.splice(inviteIndex, 1);
		return { success: true, data: { inviteId: parsed.data.inviteId } };
	}
);

export const updateAccountSettings = command(
	"unchecked",
	(input: unknown): MutationResult<{ updatedAt: string }> => {
		const parsed = updateAccountSettingsSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		if (parsed.data.actorId !== datastore.workspace.user.id) {
			return { success: false, error: "Permission denied" };
		}

		const nextName = parsed.data.settings.displayName.trim();
		if (!nextName) {
			return { success: false, error: "Display name is required" };
		}

		accountSettingsData.displayName = nextName;
		accountSettingsData.bio = parsed.data.settings.bio?.trim() ?? "";
		accountSettingsData.theme = parsed.data.settings.theme ?? accountSettingsData.theme;
		accountSettingsData.density =
			parsed.data.settings.density ?? accountSettingsData.density;
		accountSettingsData.landing =
			parsed.data.settings.landing ?? accountSettingsData.landing;
		accountSettingsData.timeFormat =
			parsed.data.settings.timeFormat ?? accountSettingsData.timeFormat;
		accountSettingsData.inAppNotifications =
			parsed.data.settings.inAppNotifications ?? accountSettingsData.inAppNotifications;
		accountSettingsData.emailNotifications =
			parsed.data.settings.emailNotifications ?? accountSettingsData.emailNotifications;

		datastore.workspace.user.name = nextName;
		datastore.workspace.user.email = accountSettingsData.email;

		return { success: true, data: { updatedAt: new Date().toISOString() } };
	}
);

export const sendWorkspaceProjectInvites = command(
	"unchecked",
	(
		input: unknown
	): MutationResult<{ projectId: string; invited: Array<{ email: string; role: string }> }> => {
		const parsed = sendWorkspaceProjectInvitesSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		if (parsed.data.actorId !== datastore.workspace.user.id) {
			return { success: false, error: "Permission denied" };
		}
		const hasProject = datastore.workspace.projects.some(
			(item) => item.id === parsed.data.projectId
		);
		if (!hasProject) {
			return { success: false, error: "Project not found" };
		}
		if (!parsed.data.invites.length) {
			return { success: false, error: "No invites to send" };
		}

		const invited: Array<{ email: string; role: string }> = [];
		for (const invite of parsed.data.invites) {
			const email = invite.email.trim().toLowerCase();
			const exists = datastore.team.invites.some(
				(item) => item.email.toLowerCase() === email && item.status === "pending"
			);
			if (exists) continue;
			const created = {
				email,
				role: invite.role,
				sentDate: new Date().toISOString().slice(0, 10),
				status: "pending" as const
			};
			datastore.team.invites.unshift(created);
			invited.push({ email, role: invite.role });
		}

		return {
			success: true,
			data: {
				projectId: parsed.data.projectId,
				invited
			}
		};
	}
);
