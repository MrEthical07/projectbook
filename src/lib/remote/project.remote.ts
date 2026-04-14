import { command, query } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	remoteQueryRequest,
	runMutation,
	type MutationResult
} from "$lib/server/api/remote";
import { isApiRequestError } from "$lib/server/api/error-mapping";

type ArtifactListPayload<TRow> = {
	items?: TRow[];
	offset?: number;
	limit?: number;
};

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

const fetchArtifactRows = async <TRow>(
	projectId: string,
	resourcePath: string
): Promise<TRow[]> => {
	try {
		const payload = await remoteQueryRequest<ArtifactListPayload<TRow>>({
			path: `/projects/${encodePathSegment(projectId)}${resourcePath}`,
			method: "GET"
		});
		return Array.isArray(payload.items) ? payload.items : [];
	} catch (err) {
		if (isApiRequestError(err) && err.statusCode === 403) {
			return [];
		}
		throw err;
	}
};

export const getProjectDashboard = query("unchecked", async (projectId: string) => {
	const scopedProjectId = projectId.trim();
	const basePath = `/projects/${encodePathSegment(scopedProjectId)}`;

	const dashboardPromise = remoteQueryRequest<{
		project: ProjectInfo;
		me: { id: string; name: string; initials: string };
		events: ProjectEventItem[];
		activity: ProjectActivityItem[];
		recentEdits: Array<{ id: string; type: string; title: string; href: string; at: string }>;
	}>({
		path: `${basePath}/dashboard`,
		method: "GET"
	});

	const [dashboard, stories, journeys, problems, ideas, tasks, feedback] = await Promise.all([
		dashboardPromise,
		fetchArtifactRows<StoryRow>(scopedProjectId, "/stories"),
		fetchArtifactRows<JourneyRow>(scopedProjectId, "/journeys"),
		fetchArtifactRows<ProblemRow>(scopedProjectId, "/problems"),
		fetchArtifactRows<IdeaRow>(scopedProjectId, "/ideas"),
		fetchArtifactRows<TaskRow>(scopedProjectId, "/tasks"),
		fetchArtifactRows<FeedbackRow>(scopedProjectId, "/feedback")
	]);

	return {
		project: dashboard.project,
		me: dashboard.me,
		stories,
		journeys,
		problems,
		ideas,
		tasks,
		feedback,
		events: dashboard.events,
		activity: dashboard.activity,
		recentEdits: dashboard.recentEdits,
		now: new Date().toISOString()
	};
});

export const getProjectTeamMembers = query("unchecked", async (projectId: string) => {
	return remoteQueryRequest<{
		members: TeamMember[];
		invites: Array<{ email: string; role: ProjectRole; sentDate: string; status: "pending" | "accepted" }>;
	}>({
		path: `/projects/${encodePathSegment(projectId)}/team/members`,
		method: "GET"
	});
});

export const getProjectTeamRoles = query("unchecked", async (projectId: string) => {
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
		path: `/projects/${encodePathSegment(projectId)}/team/roles`,
		method: "GET"
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
	const scopedProjectId = encodePathSegment(projectId);
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
			path: `/projects/${scopedProjectId}/settings`,
			method: "GET"
		}),
		remoteQueryRequest<{ members: TeamMember[] }>({
			path: `/projects/${scopedProjectId}/team/members`,
			method: "GET"
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
				method: "PUT",
				rawBody: `{"role":${JSON.stringify(parsed.data.role)},"permissionMask":${parsed.data.permissionMask}}`
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
				method: "PUT",
				rawBody: `{"role":${JSON.stringify(parsed.data.role)},"isCustom":${parsed.data.isCustom ? "true" : "false"},"permissionMask":${parsed.data.permissionMask}}`
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
			method: "PUT",
			body: {
				settings: parsed.data.settings
			}
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
		});
	}
);
