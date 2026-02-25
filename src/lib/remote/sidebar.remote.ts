import { command, query } from "$app/server";
import { z } from "zod";
import { datastore } from "$lib/server/data/datastore";
import { getProjectAccess } from "$lib/remote/access.remote";
import "$lib/server/data/workspace.data";
import "$lib/server/data/project.data";
import "$lib/server/data/stories.data";
import "$lib/server/data/journeys.data";
import "$lib/server/data/problems.data";
import "$lib/server/data/ideas.data";
import "$lib/server/data/tasks.data";
import "$lib/server/data/feedback.data";
import "$lib/server/data/pages.data";

type SidebarPrefix =
	| "stories"
	| "journeys"
	| "problem-statement"
	| "ideas"
	| "tasks"
	| "feedback"
	| "pages";

export type SidebarNode = {
	slug: string;
	title: string;
};

export type SidebarRemoteData = {
	user: {
		name: string;
		email: string;
		avatar: string;
	};
	projects: Array<{
		id: string;
		name: string;
		icon: ProjectIconKey;
		status?: string;
	}>;
	artifacts: {
		stories: SidebarNode[];
		journeys: SidebarNode[];
		problems: SidebarNode[];
		ideas: SidebarNode[];
		tasks: SidebarNode[];
		feedback: SidebarNode[];
		pages: SidebarNode[];
	};
};

export type SidebarQueryResult =
	| {
			success: true;
			data: SidebarRemoteData;
	  }
	| {
			success: false;
			error: string;
	  };

type MutationResult<T> =
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: string;
	  };

const prefixSchema = z.enum([
	"stories",
	"journeys",
	"problem-statement",
	"ideas",
	"tasks",
	"feedback",
	"pages"
]);

const createSidebarArtifactSchema = z.object({
	projectId: z.string().min(1),
	prefix: prefixSchema,
	actorId: z.string().min(1),
	title: z.string().trim().min(1)
});

const renameSidebarArtifactSchema = z.object({
	projectId: z.string().min(1),
	prefix: prefixSchema,
	artifactId: z.string().min(1),
	actorId: z.string().min(1),
	title: z.string().trim().min(1)
});

const deleteSidebarArtifactSchema = z.object({
	projectId: z.string().min(1),
	prefix: prefixSchema,
	artifactId: z.string().min(1),
	actorId: z.string().min(1)
});

const inProjectScope = (projectId: string, itemProjectId?: string) =>
	itemProjectId === projectId;

const projectExists = (projectId: string) =>
	datastore.projects.some((project) => project.id === projectId) ||
	datastore.workspace.projects.some((project) => project.id === projectId);

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

const actorNameFor = (projectId: string, actorId: string): string | null => {
	if (datastore.workspace.user.id === actorId) {
		const userHasProject = datastore.workspace.projects.some((project) => project.id === projectId);
		return userHasProject ? datastore.workspace.user.name : null;
	}
	const member = datastore.team.members.find(
		(item) => item.id === actorId && item.projectId === projectId
	);
	return member?.name ?? null;
};

const initialsFor = (name: string) =>
	name
		.split(" ")
		.map((part) => part[0] ?? "")
		.join("")
		.slice(0, 2)
		.toUpperCase();

const permissionDomainForPrefix = (
	prefix: SidebarPrefix
): "story" | "problem" | "idea" | "task" | "feedback" | "page" => {
	switch (prefix) {
		case "stories":
		case "journeys":
			return "story";
		case "problem-statement":
			return "problem";
		case "ideas":
			return "idea";
		case "tasks":
			return "task";
		case "feedback":
			return "feedback";
		case "pages":
			return "page";
	}
};

const canCreate = (permissions: EffectivePermissions, prefix: SidebarPrefix) =>
	permissions?.[permissionDomainForPrefix(prefix)]?.create === true;
const canEdit = (permissions: EffectivePermissions, prefix: SidebarPrefix) =>
	permissions?.[permissionDomainForPrefix(prefix)]?.edit === true;
const canDelete = (permissions: EffectivePermissions, prefix: SidebarPrefix) =>
	permissions?.[permissionDomainForPrefix(prefix)]?.delete === true;

const listStories = (projectId: string) =>
	datastore.stories.filter((item) => inProjectScope(projectId, item.projectId));
const listJourneys = (projectId: string) =>
	datastore.journeys.filter((item) => inProjectScope(projectId, item.projectId));
const listProblems = (projectId: string) =>
	datastore.problems.filter((item) => inProjectScope(projectId, item.projectId));
const listIdeas = (projectId: string) =>
	datastore.ideas.filter((item) => inProjectScope(projectId, item.projectId));
const listTasks = (projectId: string) =>
	datastore.tasks.filter((item) => inProjectScope(projectId, item.projectId));
const listFeedback = (projectId: string) =>
	datastore.feedback.filter((item) => inProjectScope(projectId, item.projectId));
const listPages = (projectId: string) =>
	datastore.pages.filter((item) => inProjectScope(projectId, item.projectId));

const toSidebarNodes = <T>(
	rows: T[],
	getId: (row: T) => string,
	getTitle: (row: T) => string
): SidebarNode[] =>
	rows
		.map((row) => ({
			slug: getId(row),
			title: getTitle(row).trim()
		}))
		.filter((row) => row.slug.length > 0 && row.title.length > 0);

const logProjectActivity = (
	projectId: string,
	userName: string,
	action: string,
	artifact: string,
	href: string
) => {
	const at = new Date().toISOString();
	const item = {
		id: `activity-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
		projectId,
		user: userName,
		initials: initialsFor(userName),
		action,
		artifact,
		href,
		at
	};
	datastore.projectDashboard.activity.unshift(item);
	datastore.activity.unshift(item);
};

type CreatedArtifact =
	| StoryRow
	| JourneyRow
	| ProblemRow
	| IdeaRow
	| TaskRow
	| FeedbackRow
	| PageRow;

const createArtifact = (
	prefix: SidebarPrefix,
	projectId: string,
	title: string,
	owner: string
): CreatedArtifact | null => {
	switch (prefix) {
		case "stories": {
			const id = uniqueId(title, listStories(projectId).map((item) => item.id));
			if (!id) return null;
			const created: StoryRow = {
				id,
				projectId,
				title: title.trim(),
				personaName: "",
				painPointsCount: 0,
				problemHypothesesCount: 0,
				owner,
				lastUpdated: new Date().toISOString().slice(0, 10),
				status: "Draft",
				isOrphan: true
			};
			datastore.stories.unshift(created);
			return created;
		}
		case "journeys": {
			const id = uniqueId(title, listJourneys(projectId).map((item) => item.id));
			if (!id) return null;
			const created: JourneyRow = {
				id,
				projectId,
				title: title.trim(),
				linkedPersonas: [],
				stagesCount: 0,
				painPointsCount: 0,
				owner,
				lastUpdated: new Date().toISOString().slice(0, 10),
				status: "Draft",
				isOrphan: true
			};
			datastore.journeys.unshift(created);
			return created;
		}
		case "problem-statement": {
			const id = uniqueId(title, listProblems(projectId).map((item) => item.id));
			if (!id) return null;
			const created: ProblemRow = {
				id,
				projectId,
				statement: title.trim(),
				linkedSources: [],
				painPointsCount: 0,
				ideasCount: 0,
				status: "Draft",
				owner,
				lastUpdated: new Date().toISOString().slice(0, 10),
				isOrphan: true
			};
			datastore.problems.unshift(created);
			return created;
		}
		case "ideas": {
			const id = uniqueId(title, listIdeas(projectId).map((item) => item.id));
			if (!id) return null;
			const created: IdeaRow = {
				id,
				projectId,
				title: title.trim(),
				linkedProblemStatement: "",
				persona: "",
				status: "Considered",
				tasksCount: 0,
				owner,
				lastUpdated: new Date().toISOString().slice(0, 10),
				linkedProblemLocked: false,
				isOrphan: true
			};
			datastore.ideas.unshift(created);
			return created;
		}
		case "tasks": {
			const id = uniqueId(title, listTasks(projectId).map((item) => item.id));
			if (!id) return null;
			const created: TaskRow = {
				id,
				projectId,
				title: title.trim(),
				linkedIdea: "",
				linkedProblemStatement: "",
				persona: "",
				owner,
				deadline: new Date().toISOString().slice(0, 10),
				status: "Planned",
				ideaRejected: false,
				hasFeedback: false,
				isOrphan: true
			};
			datastore.tasks.unshift(created);
			return created;
		}
		case "feedback": {
			const id = uniqueId(title, listFeedback(projectId).map((item) => item.id));
			if (!id) return null;
			const created: FeedbackRow = {
				id,
				projectId,
				title: title.trim(),
				linkedArtifacts: [],
				outcome: "Needs Iteration",
				linkedTaskOrIdea: "",
				owner,
				createdDate: new Date().toISOString().slice(0, 10),
				hasTaskLink: false,
				isOrphan: true
			};
			datastore.feedback.unshift(created);
			return created;
		}
		case "pages": {
			const id = uniqueId(title, listPages(projectId).map((item) => item.id));
			if (!id) return null;
			const created: PageRow = {
				id,
				projectId,
				title: title.trim(),
				owner,
				lastEdited: new Date().toISOString().slice(0, 10),
				linkedArtifactsCount: 0,
				status: "Draft",
				isOrphan: true
			};
			datastore.pages.unshift(created);
			return created;
		}
	}
};

const renameArtifact = (
	prefix: SidebarPrefix,
	projectId: string,
	artifactId: string,
	title: string
): { id: string; title: string } | null => {
	const nextTitle = title.trim();
	if (!nextTitle) return null;

	switch (prefix) {
		case "stories": {
			const row = datastore.stories.find(
				(item) => item.id === artifactId && inProjectScope(projectId, item.projectId)
			);
			if (!row) return null;
			row.title = nextTitle;
			row.lastUpdated = new Date().toISOString().slice(0, 10);
			return { id: row.id, title: row.title };
		}
		case "journeys": {
			const row = datastore.journeys.find(
				(item) => item.id === artifactId && inProjectScope(projectId, item.projectId)
			);
			if (!row) return null;
			row.title = nextTitle;
			row.lastUpdated = new Date().toISOString().slice(0, 10);
			return { id: row.id, title: row.title };
		}
		case "problem-statement": {
			const row = datastore.problems.find(
				(item) => item.id === artifactId && inProjectScope(projectId, item.projectId)
			);
			if (!row) return null;
			row.statement = nextTitle;
			row.lastUpdated = new Date().toISOString().slice(0, 10);
			return { id: row.id, title: row.statement };
		}
		case "ideas": {
			const row = datastore.ideas.find(
				(item) => item.id === artifactId && inProjectScope(projectId, item.projectId)
			);
			if (!row) return null;
			row.title = nextTitle;
			row.lastUpdated = new Date().toISOString().slice(0, 10);
			return { id: row.id, title: row.title };
		}
		case "tasks": {
			const row = datastore.tasks.find(
				(item) => item.id === artifactId && inProjectScope(projectId, item.projectId)
			);
			if (!row) return null;
			row.title = nextTitle;
			return { id: row.id, title: row.title };
		}
		case "feedback": {
			const row = datastore.feedback.find(
				(item) => item.id === artifactId && inProjectScope(projectId, item.projectId)
			);
			if (!row) return null;
			row.title = nextTitle;
			return { id: row.id, title: row.title };
		}
		case "pages": {
			const row = datastore.pages.find(
				(item) => item.id === artifactId && inProjectScope(projectId, item.projectId)
			);
			if (!row) return null;
			row.title = nextTitle;
			row.lastEdited = new Date().toISOString().slice(0, 10);
			return { id: row.id, title: row.title };
		}
	}
};

const deleteArtifact = (prefix: SidebarPrefix, projectId: string, artifactId: string): boolean => {
	const removeById = <T extends { id: string; projectId?: string }>(rows: T[]): boolean => {
		const index = rows.findIndex(
			(item) => item.id === artifactId && inProjectScope(projectId, item.projectId)
		);
		if (index < 0) return false;
		rows.splice(index, 1);
		return true;
	};

	switch (prefix) {
		case "stories":
			return removeById(datastore.stories);
		case "journeys":
			return removeById(datastore.journeys);
		case "problem-statement":
			return removeById(datastore.problems);
		case "ideas":
			return removeById(datastore.ideas);
		case "tasks":
			return removeById(datastore.tasks);
		case "feedback":
			return removeById(datastore.feedback);
		case "pages":
			return removeById(datastore.pages);
	}
};

export const getProjectSidebarData = query("unchecked", (projectId: string): SidebarQueryResult => {
	const parsedProjectId = z.string().min(1).safeParse(projectId);
	if (!parsedProjectId.success) {
		return { success: false, error: "Missing project id for sidebar data." };
	}
	const scopedProjectId = parsedProjectId.data.trim();
	if (!projectExists(scopedProjectId)) {
		return { success: false, error: "Project not found for sidebar data." };
	}

	return {
		success: true,
		data: {
			user: {
				name: datastore.workspace.user.name,
				email: datastore.workspace.user.email,
				avatar: "/avatars/shadcn.jpg"
			},
			projects: datastore.workspace.projects.map((project) => ({
				id: project.id,
				name: project.name,
				icon: project.icon,
				status: project.status
			})),
			artifacts: {
				stories: toSidebarNodes(listStories(scopedProjectId), (item) => item.id, (item) => item.title),
				journeys: toSidebarNodes(listJourneys(scopedProjectId), (item) => item.id, (item) => item.title),
				problems: toSidebarNodes(
					listProblems(scopedProjectId),
					(item) => item.id,
					(item) => item.statement
				),
				ideas: toSidebarNodes(listIdeas(scopedProjectId), (item) => item.id, (item) => item.title),
				tasks: toSidebarNodes(listTasks(scopedProjectId), (item) => item.id, (item) => item.title),
				feedback: toSidebarNodes(
					listFeedback(scopedProjectId),
					(item) => item.id,
					(item) => item.title
				),
				pages: toSidebarNodes(listPages(scopedProjectId), (item) => item.id, (item) => item.title)
			}
		}
	};
});

export const createSidebarArtifact = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<{ id: string; title: string }> => {
		const parsed = createSidebarArtifactSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const scopedProjectId = parsed.data.projectId.trim();
		if (!projectExists(scopedProjectId)) {
			return { success: false, error: "Project not found" };
		}
		if (!canCreate(permissions, parsed.data.prefix)) {
			return { success: false, error: "Permission denied" };
		}
		const owner = actorNameFor(scopedProjectId, parsed.data.actorId);
		if (!owner) {
			return { success: false, error: "Invalid actor" };
		}

		const created = createArtifact(parsed.data.prefix, scopedProjectId, parsed.data.title, owner);
		if (!created) {
			return { success: false, error: "Title must include letters or numbers." };
		}
		const artifactTitle =
			"title" in created
				? created.title
				: "statement" in created
					? created.statement
					: parsed.data.title.trim();

		logProjectActivity(
			scopedProjectId,
			owner,
			"created artifact",
			artifactTitle,
			`/project/${scopedProjectId}/${parsed.data.prefix}/${created.id}`
		);

		return {
			success: true,
			data: {
				id: created.id,
				title: artifactTitle
			}
		};
	}
);

export const renameSidebarArtifact = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<{ id: string; title: string }> => {
		const parsed = renameSidebarArtifactSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const scopedProjectId = parsed.data.projectId.trim();
		if (!projectExists(scopedProjectId)) {
			return { success: false, error: "Project not found" };
		}
		if (!canEdit(permissions, parsed.data.prefix)) {
			return { success: false, error: "Permission denied" };
		}
		const actorName = actorNameFor(scopedProjectId, parsed.data.actorId);
		if (!actorName) {
			return { success: false, error: "Invalid actor" };
		}

		const renamed = renameArtifact(
			parsed.data.prefix,
			scopedProjectId,
			parsed.data.artifactId,
			parsed.data.title
		);
		if (!renamed) {
			return { success: false, error: "Artifact not found" };
		}

		logProjectActivity(
			scopedProjectId,
			actorName,
			"renamed artifact",
			renamed.title,
			`/project/${scopedProjectId}/${parsed.data.prefix}/${renamed.id}`
		);

		return {
			success: true,
			data: renamed
		};
	}
);

export const deleteSidebarArtifact = command(
	"unchecked",
	({
		input,
		permissions
	}: {
		input: unknown;
		permissions: EffectivePermissions;
	}): MutationResult<{ id: string }> => {
		const parsed = deleteSidebarArtifactSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}
		const scopedProjectId = parsed.data.projectId.trim();
		if (!projectExists(scopedProjectId)) {
			return { success: false, error: "Project not found" };
		}
		if (!canDelete(permissions, parsed.data.prefix)) {
			return { success: false, error: "Permission denied" };
		}
		const actorName = actorNameFor(scopedProjectId, parsed.data.actorId);
		if (!actorName) {
			return { success: false, error: "Invalid actor" };
		}

		const deleted = deleteArtifact(parsed.data.prefix, scopedProjectId, parsed.data.artifactId);
		if (!deleted) {
			return { success: false, error: "Artifact not found" };
		}

		logProjectActivity(
			scopedProjectId,
			actorName,
			"deleted artifact",
			parsed.data.artifactId,
			`/project/${scopedProjectId}/${parsed.data.prefix}`
		);

		return {
			success: true,
			data: { id: parsed.data.artifactId }
		};
	}
);
