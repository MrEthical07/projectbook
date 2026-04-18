import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	runMutation,
	type MutationResult
} from "$lib/server/api/remote";
import { invalidateQueryCache } from "$lib/server/api/query-cache";

const inviteRoleSchema = z.enum([
	"Owner",
	"Admin",
	"Editor",
	"Member",
	"Viewer",
	"Limited Access"
]);
const roleSchema = z.enum(["Owner", "Admin", "Editor", "Member", "Viewer", "Limited Access"]);
const permissionMaskSchema = z.string().regex(/^\d+$/);

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
	permissionMask: permissionMaskSchema
});

const updateMemberPermissionsSchema = z.object({
	projectId: z.string().min(1),
	memberId: z.string().min(1),
	role: roleSchema,
	isCustom: z.boolean(),
	permissionMask: permissionMaskSchema
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

const roleToPathSegment = (role: ProjectRole): string => {
	switch (role) {
		case "Owner":
			return "owner";
		case "Admin":
			return "admin";
		case "Editor":
			return "editor";
		case "Member":
			return "member";
		case "Viewer":
			return "viewer";
		case "Limited Access":
			return "limited-access";
	}
};

export const getProjectDashboard = query("unchecked", async (projectId: string) => {
	const scopedProjectId = projectId.trim();
	const basePath = `/projects/${encodePathSegment(scopedProjectId)}`;

	const [summary, myWork] = await Promise.all([
		remoteQueryRequest<{
			project: ProjectInfo;
			summary: {
				stories: number;
				journeys: number;
				problems: number;
				ideas: number;
				tasks: number;
				feedback: number;
				orphanStories: number;
				orphanJourneys: number;
				lockedProblems: number;
				problemsWithoutIdeas: number;
				selectedIdeas: number;
				selectedIdeasWithoutTasks: number;
				openTasks: number;
				overdueTasks: number;
				completedTasks: number;
				blockedOrAbandonedTasks: number;
				completedTasksNoFeedback: number;
				feedbackNeedsIteration: number;
			};
		}>({
			path: `${basePath}/dashboard/summary`,
			method: "GET",
			cachePolicy: {
				namespace: "project-dashboard-summary",
				ttlMs: 20_000,
				keyParts: { project_id: scopedProjectId },
				tags: [`project:${scopedProjectId}`, "project-dashboard"]
			}
		}),
		remoteQueryRequest<{
			me: { id: string; name: string; initials: string };
			myTasks: Array<{
				id: string;
				title: string;
				status: TaskStatus;
				deadline: string;
			}>;
			myFeedback: Array<{
				id: string;
				title: string;
				outcome: FeedbackOutcome;
			}>;
			recentEdits: Array<{ id: string; type: string; title: string; href: string; at: string }>;
		}>({
			path: `${basePath}/dashboard/my-work`,
			method: "GET",
			cachePolicy: {
				namespace: "project-dashboard-my-work",
				ttlMs: 15_000,
				keyParts: { project_id: scopedProjectId },
				tags: [`project:${scopedProjectId}`, "project-dashboard"]
			}
		})
	]);

	return {
		project: summary.project,
		me: myWork.me,
		summary: summary.summary,
		myTasks: myWork.myTasks,
		myFeedback: myWork.myFeedback,
		recentEdits: myWork.recentEdits,
		now: new Date().toISOString()
	};
});

export const getProjectTeamMembers = query("unchecked", async (projectId: string) => {
	const scopedProjectId = projectId.trim();
	return remoteQueryRequest<{
		members: TeamMember[];
		invites: Array<{ email: string; role: ProjectRole; sentDate: string; status: "pending" | "accepted" }>;
	}>({
		path: `/projects/${encodePathSegment(scopedProjectId)}/team/members`,
		method: "GET",
		cachePolicy: {
			namespace: "project-team-members",
			ttlMs: 20_000,
			keyParts: { project_id: scopedProjectId },
			tags: [`project:${scopedProjectId}`, "project-team"]
		}
	});
});

export const getProjectTeamRoles = query("unchecked", async (projectId: string) => {
	const scopedProjectId = projectId.trim();
	const payload = await remoteQueryRequest<{
		members: Array<{
			id: string;
			name: string;
			email: string;
			role: ProjectRole;
			status: string;
			joinedAt: string;
			isCustom: boolean;
			permissionMask: string;
		}>;
		rolePermissionMasks: Record<string, string>;
	}>({
		path: `/projects/${encodePathSegment(scopedProjectId)}/team/roles`,
		method: "GET",
		cachePolicy: {
			namespace: "project-team-roles",
			ttlMs: 20_000,
			keyParts: { project_id: scopedProjectId },
			tags: [`project:${scopedProjectId}`, "project-team", "project-access"]
		}
	});

	return {
		members: payload.members.map((member) => ({
			...member,
			status: member.status.toLowerCase() === "invited" ? "invited" : "active"
		})),
		rolePermissionMasks: payload.rolePermissionMasks
	};
});

export const getProjectSettings = query("unchecked", async (projectId: string) => {
	const scopedProjectId = projectId.trim();
	const scopedProjectPathId = encodePathSegment(scopedProjectId);
	const [settings, team] = await Promise.all([
		remoteQueryRequest<{
			projectName: string;
			projectDescription: string;
			projectStatus: "Active" | "Archived";
			whiteboardsEnabled: boolean;
			advancedDatabasesEnabled: boolean;
			calendarManualEventsEnabled: boolean;
			resourceVersioningEnabled: boolean;
			feedbackAggregationEnabled: boolean;
			notifyArtifactCreated: boolean;
			notifyArtifactLocked: boolean;
			notifyFeedbackAdded: boolean;
			notifyResourceUpdated: boolean;
			deliveryChannel: "In-app" | "Email";
		}>({
			path: `/projects/${scopedProjectPathId}/settings`,
			method: "GET",
			cachePolicy: {
				namespace: "project-settings",
				ttlMs: 30_000,
				keyParts: { project_id: scopedProjectId },
				tags: [`project:${scopedProjectId}`, "project-settings"]
			}
		}),
		remoteQueryRequest<{ members: TeamMember[] }>({
			path: `/projects/${scopedProjectPathId}/team/members`,
			method: "GET",
			cachePolicy: {
				namespace: "project-team-members",
				ttlMs: 20_000,
				keyParts: { project_id: scopedProjectId },
				tags: [`project:${scopedProjectId}`, "project-team"]
			}
		})
	]);

	return {
		...settings,
		members: team.members
	};
});

export const createProjectInvite = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ email: string; role: string; sentDate: string; status: "pending" }>> => {
		const parsed = createInviteSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ email: string; role: string; sentDate: string; status: "pending" }>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/team/invites`,
			method: "POST",
			body: {
				email: parsed.data.email,
				role: parsed.data.role
			}
		}, undefined, {
			tags: [
				`project:${parsed.data.projectId}`,
				"project-dashboard",
				"project-dashboard-summary",
				"project-dashboard-my-work",
				"project-dashboard-events",
				"project-dashboard-activity",
				"project-navigation",
				`project-navigation:${parsed.data.projectId}`,
				"project-team",
				"project-team-members"
			]
		});
	}
);

export const cancelProjectInvite = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ email: string }>> => {
		const parsed = cancelInviteSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ email: string }>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/team/invites/${encodePathSegment(parsed.data.email)}`,
			method: "DELETE"
		}, undefined, {
			tags: [
				`project:${parsed.data.projectId}`,
				"project-dashboard",
				"project-dashboard-summary",
				"project-dashboard-my-work",
				"project-dashboard-events",
				"project-dashboard-activity",
				"project-navigation",
				`project-navigation:${parsed.data.projectId}`,
				"project-team",
				"project-team-members"
			]
		});
	}
);

export const updateProjectRolePermissions = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{
		role: ProjectRole;
		permissionMask: PermissionMask;
		customMembersUnaffected: number;
	}>> => {
		const parsed = updateRolePermissionsSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		if (parsed.data.role === "Owner") {
			return { success: false, error: "Owner permissions cannot be modified." };
		}

		return runMutation(async () => {
			const response = await remoteQueryRequest<{
				customMembersUnaffected?: number;
			}>({
				path: `/projects/${encodePathSegment(parsed.data.projectId)}/team/roles/${roleToPathSegment(parsed.data.role)}/permissions`,
				method: "PATCH",
				rawBody: `{"role":${JSON.stringify(parsed.data.role)},"permissionMask":${parsed.data.permissionMask}}`
			});
			invalidateQueryCache({
				tags: [
					`project:${parsed.data.projectId}`,
					"project-access",
					"project-navigation",
					`project-navigation:${parsed.data.projectId}`,
					"project-dashboard",
					"project-dashboard-summary",
					"project-dashboard-my-work",
					"project-dashboard-events",
					"project-dashboard-activity",
					"project-team",
					"project-team-members"
				]
			});

			return {
				role: parsed.data.role,
				permissionMask: parsed.data.permissionMask,
				customMembersUnaffected: response.customMembersUnaffected ?? 0
			};
		});
	}
);

export const updateProjectMemberPermissions = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{
		memberId: string;
		role: ProjectRole;
		isCustom: boolean;
		permissionMask: PermissionMask;
	}>> => {
		const parsed = updateMemberPermissionsSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		if (parsed.data.role === "Owner") {
			return { success: false, error: "Cannot assign Owner role." };
		}

		return runMutation(async () => {
			const response = await remoteQueryRequest<{
				memberId: string;
				role: ProjectRole;
				isCustom: boolean;
			}>({
				path: `/projects/${encodePathSegment(parsed.data.projectId)}/team/members/${encodePathSegment(parsed.data.memberId)}/permissions`,
				method: "PATCH",
				rawBody: `{"role":${JSON.stringify(parsed.data.role)},"isCustom":${parsed.data.isCustom ? "true" : "false"},"permissionMask":${parsed.data.permissionMask}}`
			});
			invalidateQueryCache({
				tags: [
					`project:${parsed.data.projectId}`,
					"project-access",
					"project-navigation",
					`project-navigation:${parsed.data.projectId}`,
					"project-dashboard",
					"project-dashboard-summary",
					"project-dashboard-my-work",
					"project-dashboard-events",
					"project-dashboard-activity",
					"project-team",
					"project-team-members"
				]
			});

			return {
				memberId: response.memberId ?? parsed.data.memberId,
				role: response.role ?? parsed.data.role,
				isCustom: response.isCustom ?? parsed.data.isCustom,
				permissionMask: parsed.data.permissionMask
			};
		});
	}
);

export const updateProjectSettings = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ projectId: string }>> => {
		const parsed = updateProjectSettingsSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ projectId: string }>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/settings`,
			method: "PATCH",
			body: {
				settings: parsed.data.settings
			}
		}, undefined, {
			tags: [
				`project:${parsed.data.projectId}`,
				"project-settings",
				"project-dashboard",
				"project-dashboard-summary",
				"project-dashboard-my-work",
				"project-dashboard-events",
				"project-dashboard-activity",
				"project-access",
				"project-navigation",
				`project-navigation:${parsed.data.projectId}`,
				"project-team-members"
			]
		});
	}
);

export const archiveProject = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ projectId: string; status: "Archived" }>> => {
		const parsed = projectActionSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ projectId: string; status: "Archived" }>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}/archive`,
			method: "POST"
		}, undefined, {
			tags: [
				`project:${parsed.data.projectId}`,
				"project-settings",
				"project-dashboard",
				"project-dashboard-summary",
				"project-dashboard-my-work",
				"project-dashboard-events",
				"project-dashboard-activity",
				"project-access",
				"project-navigation",
				`project-navigation:${parsed.data.projectId}`,
				"project-team-members",
				"home-dashboard",
				"home-projects"
			]
		});
	}
);

export const deleteProject = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ projectId: string; status: "Archived" }>> => {
		const parsed = projectActionSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		return remoteMutationRequest<{ projectId: string; status: "Archived" }>({
			path: `/projects/${encodePathSegment(parsed.data.projectId)}`,
			method: "DELETE"
		}, undefined, {
			tags: [
				`project:${parsed.data.projectId}`,
				"project-settings",
				"project-dashboard",
				"project-dashboard-summary",
				"project-dashboard-my-work",
				"project-dashboard-events",
				"project-dashboard-activity",
				"project-access",
				"project-navigation",
				`project-navigation:${parsed.data.projectId}`,
				"project-team-members",
				"home-dashboard",
				"home-projects"
			]
		});
	}
);
