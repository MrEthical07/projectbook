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

type ProjectSearchInput = {
	projectId: string;
	q: string;
	limit?: number;
};

export type ProjectSearchResultItem = {
	id: string;
	type: string;
	title: string;
	description?: string;
	status?: string;
	href: string;
	updatedAt?: string;
};

const projectSearchSchema = z.object({
	projectId: z.string().trim().min(1),
	q: z.string().trim().min(1),
	limit: z.number().int().positive().max(50).optional()
});

const submitGlobalFeedbackSchema = z.object({
	subject: z.string().trim().min(1).max(160),
	message: z.string().trim().min(1).max(5000),
	context: z.object({
		projectId: z.string().trim().max(64).optional(),
		path: z.string().trim().max(512).optional(),
		userAgent: z.string().trim().max(512).optional(),
		mode: z.enum(["light", "dark"]).optional(),
		submittedAt: z.string().trim().max(64).optional()
	})
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
	const dashboard = await remoteQueryRequest<{
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
		events: ProjectEventItem[];
		activity: ProjectActivityItem[];
		my_work?: {
			focus_user?: { id: string; name: string; initials: string };
			tasks?: Array<{ id: string; title: string; status: TaskStatus; deadline: string }>;
			feedback?: Array<{ id: string; title: string; outcome: FeedbackOutcome }>;
			recent_edits?: Array<{ id: string; type: string; title: string; href: string; at: string }>;
		};
	}>({
		path: `${basePath}/dashboard`,
		method: "GET",
		cachePolicy: {
			namespace: "project-dashboard",
			ttlMs: 20_000,
			keyParts: { project_id: scopedProjectId },
			tags: [`project:${scopedProjectId}`, "project-dashboard"]
		}
	});

	const myWork = dashboard.my_work ?? {};

	return {
		project: dashboard.project,
		me: myWork.focus_user ?? { id: "", name: "", initials: "" },
		summary: dashboard.summary,
		events: Array.isArray(dashboard.events) ? dashboard.events : [],
		activity: Array.isArray(dashboard.activity) ? dashboard.activity : [],
		myTasks: Array.isArray(myWork.tasks) ? myWork.tasks : [],
		myFeedback: Array.isArray(myWork.feedback) ? myWork.feedback : [],
		recentEdits: Array.isArray(myWork.recent_edits) ? myWork.recent_edits : [],
		now: new Date().toISOString()
	};
});

export const searchProject = query("unchecked", async (input: ProjectSearchInput) => {
	const parsed = projectSearchSchema.safeParse(input);
	if (!parsed.success) {
		return {
			items: [] as ProjectSearchResultItem[]
		};
	}

	const scopedProjectId = parsed.data.projectId;
	const queryText = parsed.data.q;
	const limit =
		typeof parsed.data.limit === "number" && Number.isFinite(parsed.data.limit) && parsed.data.limit > 0
			? Math.trunc(parsed.data.limit)
			: undefined;
	const search = new URLSearchParams();
	if (queryText.length > 0) {
		search.set("q", queryText);
	}
	if (typeof limit === "number") {
		search.set("limit", String(limit));
	}
	const queryString = search.toString();

	return remoteQueryRequest<{
		items: ProjectSearchResultItem[];
	}>(
		{
			path: `/projects/${encodePathSegment(scopedProjectId)}/search${queryString ? `?${queryString}` : ""}`,
			method: "GET",
			cachePolicy: {
				namespace: "project-search",
				ttlMs: 15_000,
				keyParts: {
					project_id: scopedProjectId,
					q: queryText.length > 0 ? queryText : null,
					limit
				},
				tags: [`project:${scopedProjectId}`, "project-search"]
			}
		}
	);
});

export const submitGlobalFeedback = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ feedbackId: string; status: string; submittedAt: string }>> => {
		const parsed = submitGlobalFeedbackSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid feedback input" };
		}

		return remoteMutationRequest<{ feedbackId: string; status: string; submittedAt: string }>(
			{
				path: "/feedback",
				method: "POST",
				body: parsed.data
			},
			undefined,
			{ tags: ["global-feedback"] }
		);
	}
);

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
				"project-overview",
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
				"project-overview",
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
					"project-dashboard",
					"project-overview",
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
					"project-dashboard",
					"project-overview",
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
				"project-overview",
				"project-access",
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
				"project-overview",
				"project-access",
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
				"project-overview",
				"project-access",
				"project-team-members",
				"home-dashboard",
				"home-projects"
			]
		});
	}
);
