import { command, query } from "$app/server";
import { error } from "@sveltejs/kit";
import { z } from "zod";
import { datastore } from "$lib/server/data/datastore";
import { getTrustedProjectPermissions } from "$lib/server/auth/authorization";
import "$lib/server/data/project.data";
import "$lib/server/data/feedback.data";
import "$lib/server/data/ideas.data";
import "$lib/server/data/journeys.data";
import "$lib/server/data/problems.data";
import "$lib/server/data/stories.data";
import "$lib/server/data/tasks.data";

type MutationResult<T> =
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: string;
	  };

const inviteRoleSchema = z.enum(["Owner", "Admin", "Editor", "Viewer", "Limited Access"]);
const roleSchema = z.enum(["Owner", "Admin", "Editor", "Member", "Viewer", "Limited Access"]);

const actionPermissionSchema = z.object({
	view: z.boolean(),
	create: z.boolean(),
	edit: z.boolean(),
	delete: z.boolean(),
	archive: z.boolean(),
	statusChange: z.boolean()
});

const effectivePermissionsSchema = z.object({
	project: actionPermissionSchema,
	story: actionPermissionSchema,
	problem: actionPermissionSchema,
	idea: actionPermissionSchema,
	task: actionPermissionSchema,
	feedback: actionPermissionSchema,
	resource: actionPermissionSchema,
	page: actionPermissionSchema,
	calendar: actionPermissionSchema,
	member: actionPermissionSchema
});

const createInviteSchema = z.object({
	projectId: z.string().min(1),
	email: z.string().email(),
	role: inviteRoleSchema
});

const cancelInviteSchema = z.object({
	projectId: z.string().min(1),
	email: z.string().email()
});

const updateRolePermissionsSchema = z.object({
	projectId: z.string().min(1),
	role: roleSchema,
	permissions: effectivePermissionsSchema
});

const updateMemberRoleSchema = z.object({
	projectId: z.string().min(1),
	memberId: z.string().min(1),
	role: roleSchema
});

const updateProjectSettingsSchema = z.object({
	projectId: z.string().min(1),
	settings: z.object({
		projectName: z.string().min(1),
		projectDescription: z.string().optional(),
		projectStatus: z.enum(["Active", "Archived"]),
		whiteboardsEnabled: z.boolean().optional(),
		advancedDatabasesEnabled: z.boolean().optional(),
		calendarManualEventsEnabled: z.boolean().optional(),
		resourceVersioningEnabled: z.boolean().optional(),
		feedbackAggregationEnabled: z.boolean().optional(),
		notifyArtifactCreated: z.boolean().optional(),
		notifyArtifactLocked: z.boolean().optional(),
		notifyFeedbackAdded: z.boolean().optional(),
		notifyResourceUpdated: z.boolean().optional(),
		deliveryChannel: z.enum(["In-app", "Email"]).optional()
	})
});

const projectActionSchema = z.object({
	projectId: z.string().min(1)
});

const inProjectScope = (projectId: string, itemProjectId?: string) =>
	itemProjectId === projectId;

const projectExists = (projectId: string) =>
	datastore.projects.some((item) => item.id === projectId) ||
	datastore.workspace.projects.some((item) => item.id === projectId);

const requireProjectId = (projectId: string): string => {
	const scopedProjectId = projectId.trim();
	if (!scopedProjectId) {
		error(400, "Project id is required.");
	}
	if (!projectExists(scopedProjectId)) {
		error(404, "Project not found.");
	}
	return scopedProjectId;
};

const canMemberCreate = (permissions: EffectivePermissions) => permissions?.member?.create === true;
const canMemberEdit = (permissions: EffectivePermissions) => permissions?.member?.edit === true;
const canMemberDelete = (permissions: EffectivePermissions) => permissions?.member?.delete === true;
const canProjectArchive = (permissions: EffectivePermissions) => permissions?.project?.archive === true;
const canProjectDelete = (permissions: EffectivePermissions) => permissions?.project?.delete === true;
const canProjectEdit = (permissions: EffectivePermissions) => permissions?.project?.edit === true;

export const getProjectDashboard = query("unchecked", (projectId: string) => {
	const scopedProjectId = requireProjectId(projectId);
	const project = datastore.projects.find((item) => item.id === scopedProjectId)
		?? datastore.workspace.projects.find((item) => item.id === scopedProjectId);
	if (!project) {
		error(404, "Project not found.");
	}
	const stories = datastore.stories.filter((item) =>
		inProjectScope(scopedProjectId, item.projectId)
	);
	const journeys = datastore.journeys.filter((item) =>
		inProjectScope(scopedProjectId, item.projectId)
	);
	const problems = datastore.problems.filter((item) =>
		inProjectScope(scopedProjectId, item.projectId)
	);
	const ideas = datastore.ideas.filter((item) =>
		inProjectScope(scopedProjectId, item.projectId)
	);
	const tasks = datastore.tasks.filter((item) =>
		inProjectScope(scopedProjectId, item.projectId)
	);
	const feedback = datastore.feedback.filter((item) =>
		inProjectScope(scopedProjectId, item.projectId)
	);
	const events = datastore.projectDashboard.events.filter((event) =>
		inProjectScope(scopedProjectId, event.projectId)
	);
	const activity = datastore.projectDashboard.activity.filter((item) =>
		inProjectScope(scopedProjectId, item.projectId)
	);
	const recentEdits = datastore.projectDashboard.recentEdits.filter((item) =>
		item.href.includes(`/project/${scopedProjectId}/`)
	);
	return {
		project,
		me: datastore.projectDashboard.me,
		stories,
		journeys,
		problems,
		ideas,
		tasks,
		feedback,
		events,
		activity,
		recentEdits,
		now: new Date().toISOString()
	};
});

export const getProjectTeamMembers = query("unchecked", (projectId: string) => {
	const scopedProjectId = requireProjectId(projectId);
	return {
		members: datastore.team.members.filter((member) => inProjectScope(scopedProjectId, member.projectId)),
		invites: datastore.team.invites.filter((inv) => inv.projectId === scopedProjectId)
	};
});

export const getProjectTeamRoles = query("unchecked", (projectId: string) => {
	const scopedProjectId = requireProjectId(projectId);
	const rolePermissions = datastore.team.rolePermissions[scopedProjectId];
	if (!rolePermissions) {
		error(500, "Role permissions are not configured for this project.");
	}
	return {
		members: datastore.team.members.filter((member) => inProjectScope(scopedProjectId, member.projectId)),
		rolePermissions
	};
});

export const getProjectSettings = query("unchecked", (projectId: string) => {
	const scopedProjectId = requireProjectId(projectId);
	const project = datastore.projects.find((item) => item.id === scopedProjectId);
	if (!project) {
		error(404, "Project not found.");
	}
	if (
		datastore.settings.whiteboardsEnabled === undefined ||
		datastore.settings.advancedDatabasesEnabled === undefined ||
		datastore.settings.calendarManualEventsEnabled === undefined ||
		datastore.settings.resourceVersioningEnabled === undefined ||
		datastore.settings.feedbackAggregationEnabled === undefined ||
		datastore.settings.notifyArtifactCreated === undefined ||
		datastore.settings.notifyArtifactLocked === undefined ||
		datastore.settings.notifyFeedbackAdded === undefined ||
		datastore.settings.notifyResourceUpdated === undefined ||
		datastore.settings.deliveryChannel === undefined
	) {
		error(500, "Project settings are not fully configured.");
	}
	return {
		projectName: project.name,
		projectDescription: datastore.settings.projectDescription,
		projectStatus: project.status,
		whiteboardsEnabled: datastore.settings.whiteboardsEnabled,
		advancedDatabasesEnabled: datastore.settings.advancedDatabasesEnabled,
		calendarManualEventsEnabled: datastore.settings.calendarManualEventsEnabled,
		resourceVersioningEnabled: datastore.settings.resourceVersioningEnabled,
		feedbackAggregationEnabled: datastore.settings.feedbackAggregationEnabled,
		notifyArtifactCreated: datastore.settings.notifyArtifactCreated,
		notifyArtifactLocked: datastore.settings.notifyArtifactLocked,
		notifyFeedbackAdded: datastore.settings.notifyFeedbackAdded,
		notifyResourceUpdated: datastore.settings.notifyResourceUpdated,
		deliveryChannel: datastore.settings.deliveryChannel,
		members: datastore.team.members.filter((member) => inProjectScope(scopedProjectId, member.projectId))
	};
});

export const createProjectInvite = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<{ email: string; role: string; sentDate: string; status: "pending" }> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canMemberCreate(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = createInviteSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		requireProjectId(parsed.data.projectId);
		const scopedProjectId = parsed.data.projectId.trim();
		const inviteExists = datastore.team.invites.some(
			(item) => item.email.toLowerCase() === parsed.data.email.toLowerCase() && item.status === "pending" && item.projectId === scopedProjectId
		);
		if (inviteExists) {
			return { success: false, error: "Pending invite already exists" };
		}
		const created = {
			email: parsed.data.email.toLowerCase(),
			role: parsed.data.role,
			sentDate: new Date().toISOString().slice(0, 10),
			status: "pending" as const,
			projectId: scopedProjectId
		};
		datastore.team.invites.unshift(created);
		return { success: true, data: created };
	}
);

export const cancelProjectInvite = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<{ email: string }> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canMemberDelete(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = cancelInviteSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		requireProjectId(parsed.data.projectId);
		const scopedProjectId = parsed.data.projectId.trim();
		const index = datastore.team.invites.findIndex(
			(item) => item.email.toLowerCase() === parsed.data.email.toLowerCase() && item.projectId === scopedProjectId
		);
		if (index < 0) {
			return { success: false, error: "Invite not found" };
		}
		if (datastore.team.invites[index].status !== "pending") {
			return { success: false, error: "Only pending invites can be cancelled" };
		}
		datastore.team.invites.splice(index, 1);
		return { success: true, data: { email: parsed.data.email.toLowerCase() } };
	}
);

export const updateProjectRolePermissions = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<{ role: ProjectRole; permissions: EffectivePermissions }> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canMemberEdit(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateRolePermissionsSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		if (parsed.data.role === "Owner") {
			return { success: false, error: "Owner permissions cannot be modified." };
		}
		const scopedProjectId = requireProjectId(parsed.data.projectId);
		const rolePermissions = datastore.team.rolePermissions[scopedProjectId];
		if (!rolePermissions) {
			return { success: false, error: "Role permissions not found" };
		}
		rolePermissions[parsed.data.role] = structuredClone(
			parsed.data.permissions
		) as EffectivePermissions;
		return {
			success: true,
			data: {
				role: parsed.data.role,
				permissions: rolePermissions[parsed.data.role]
			}
		};
	}
);

export const updateProjectMemberRole = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<{ memberId: string; role: ProjectRole }> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canMemberEdit(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateMemberRoleSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		if (parsed.data.role === "Owner") {
			return { success: false, error: "Cannot assign Owner role." };
		}
		const scopedProjectId = requireProjectId(parsed.data.projectId);
		const member = datastore.team.members.find(
			(item) => item.id === parsed.data.memberId && inProjectScope(scopedProjectId, item.projectId)
		);
		if (!member) {
			return { success: false, error: "Member not found" };
		}
		member.role = parsed.data.role;
		member.updatedAt = new Date().toISOString().slice(0, 10);
		return {
			success: true,
			data: {
				memberId: member.id,
				role: member.role
			}
		};
	}
);

export const updateProjectSettings = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<{ projectId: string }> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canProjectEdit(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = updateProjectSettingsSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const scopedProjectId = requireProjectId(parsed.data.projectId);
		const project = datastore.projects.find((item) => item.id === scopedProjectId);
		if (!project) {
			return { success: false, error: "Project not found" };
		}

		const nextName = parsed.data.settings.projectName.trim();
		project.name = nextName;
		project.status = parsed.data.settings.projectStatus;
		datastore.settings.projectName = nextName;
		if (parsed.data.settings.projectDescription !== undefined) {
			datastore.settings.projectDescription = parsed.data.settings.projectDescription.trim();
		}
		datastore.settings.projectStatus = parsed.data.settings.projectStatus;
		datastore.settings.whiteboardsEnabled =
			parsed.data.settings.whiteboardsEnabled ?? datastore.settings.whiteboardsEnabled;
		datastore.settings.advancedDatabasesEnabled =
			parsed.data.settings.advancedDatabasesEnabled ?? datastore.settings.advancedDatabasesEnabled;
		datastore.settings.calendarManualEventsEnabled =
			parsed.data.settings.calendarManualEventsEnabled ??
			datastore.settings.calendarManualEventsEnabled;
		datastore.settings.resourceVersioningEnabled =
			parsed.data.settings.resourceVersioningEnabled ?? datastore.settings.resourceVersioningEnabled;
		datastore.settings.feedbackAggregationEnabled =
			parsed.data.settings.feedbackAggregationEnabled ??
			datastore.settings.feedbackAggregationEnabled;
		datastore.settings.notifyArtifactCreated =
			parsed.data.settings.notifyArtifactCreated ?? datastore.settings.notifyArtifactCreated;
		datastore.settings.notifyArtifactLocked =
			parsed.data.settings.notifyArtifactLocked ?? datastore.settings.notifyArtifactLocked;
		datastore.settings.notifyFeedbackAdded =
			parsed.data.settings.notifyFeedbackAdded ?? datastore.settings.notifyFeedbackAdded;
		datastore.settings.notifyResourceUpdated =
			parsed.data.settings.notifyResourceUpdated ?? datastore.settings.notifyResourceUpdated;
		datastore.settings.deliveryChannel =
			parsed.data.settings.deliveryChannel ?? datastore.settings.deliveryChannel;

		for (const workspaceProject of datastore.workspace.projects) {
			if (workspaceProject.id === scopedProjectId) {
				workspaceProject.name = nextName;
				workspaceProject.status = parsed.data.settings.projectStatus;
				workspaceProject.lastUpdatedAt = new Date().toISOString();
				if (parsed.data.settings.projectDescription !== undefined) {
					workspaceProject.description = parsed.data.settings.projectDescription.trim();
				}
			}
		}

		if (datastore.projectDashboard.project.id === scopedProjectId) {
			datastore.projectDashboard.project.name = nextName;
			datastore.projectDashboard.project.status = parsed.data.settings.projectStatus;
		}

		return { success: true, data: { projectId: scopedProjectId } };
	}
);

export const archiveProject = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<{ projectId: string; status: "Archived" }> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canProjectArchive(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = projectActionSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const scopedProjectId = requireProjectId(parsed.data.projectId);
		const project = datastore.projects.find((item) => item.id === scopedProjectId);
		if (!project) {
			return { success: false, error: "Project not found" };
		}
		if (project.status === "Archived") {
			return { success: false, error: "Project already archived" };
		}
		project.status = "Archived";
		for (const workspaceProject of datastore.workspace.projects) {
			if (workspaceProject.id === scopedProjectId) {
				workspaceProject.status = "Archived";
			}
		}
		if (datastore.projectDashboard.project.id === scopedProjectId) {
			datastore.projectDashboard.project.status = "Archived";
			datastore.settings.projectStatus = "Archived";
		}
		return { success: true, data: { projectId: scopedProjectId, status: "Archived" } };
	}
);

export const deleteProject = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<{ projectId: string; status: "Archived" }> => {
		permissions = getTrustedProjectPermissions(input);
		if (!canProjectDelete(permissions)) {
			return { success: false, error: "Permission denied" };
		}
		const parsed = projectActionSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const scopedProjectId = requireProjectId(parsed.data.projectId);
		const project = datastore.projects.find((item) => item.id === scopedProjectId);
		if (!project) {
			return { success: false, error: "Project not found" };
		}
		project.status = "Archived";
		for (const workspaceProject of datastore.workspace.projects) {
			if (workspaceProject.id === scopedProjectId) {
				workspaceProject.status = "Archived";
			}
		}
		for (const row of datastore.stories) {
			if (inProjectScope(scopedProjectId, row.projectId)) row.isOrphan = true;
		}
		for (const row of datastore.journeys) {
			if (inProjectScope(scopedProjectId, row.projectId)) row.isOrphan = true;
		}
		for (const row of datastore.problems) {
			if (inProjectScope(scopedProjectId, row.projectId)) row.isOrphan = true;
		}
		for (const row of datastore.ideas) {
			if (inProjectScope(scopedProjectId, row.projectId)) row.isOrphan = true;
		}
		for (const row of datastore.tasks) {
			if (inProjectScope(scopedProjectId, row.projectId)) row.isOrphan = true;
		}
		for (const row of datastore.feedback) {
			if (inProjectScope(scopedProjectId, row.projectId)) row.isOrphan = true;
		}
		for (const row of datastore.pages) {
			if (inProjectScope(scopedProjectId, row.projectId)) row.isOrphan = true;
		}
		return { success: true, data: { projectId: scopedProjectId, status: "Archived" } };
	}
);
