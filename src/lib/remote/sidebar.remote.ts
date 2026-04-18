import { command } from "$app/server";
import { z } from "zod";
import {
	encodePathSegment,
	remoteMutationRequest,
	type MutationResult
} from "$lib/server/api/remote";

type SidebarPrefix =
	| "stories"
	| "journeys"
	| "problem-statement"
	| "ideas"
	| "tasks"
	| "feedback"
	| "pages";

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
	title: z.string().trim().min(1)
});

const asObject = (value: unknown): Record<string, unknown> =>
	value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

const asTrimmedString = (value: unknown): string =>
	typeof value === "string" ? value.trim() : "";

const listNamespaceForPrefix = (prefix: SidebarPrefix): string => {
	switch (prefix) {
		case "stories":
			return "stories-list";
		case "journeys":
			return "journeys-list";
		case "problem-statement":
			return "problems-list";
		case "ideas":
			return "ideas-list";
		case "tasks":
			return "tasks-list";
		case "feedback":
			return "feedback-list";
		case "pages":
			return "pages-list";
	}
};

const invalidationTagsForCreate = (projectId: string, prefix: SidebarPrefix): string[] => {
	const namespace = listNamespaceForPrefix(prefix);
	return [namespace, `${namespace}:${projectId}`];
};

const resolveArtifactTitle = (
	prefix: SidebarPrefix,
	payload: Record<string, unknown>,
	fallback: string
): string => {
	if (prefix === "problem-statement") {
		const statement = asTrimmedString(payload.statement);
		if (statement.length > 0) {
			return statement;
		}
	}
	const title = asTrimmedString(payload.title);
	if (title.length > 0) {
		return title;
	}
	return fallback;
};

export const createSidebarArtifact = command(
	"unchecked",
	async ({ input }: { input: unknown }): Promise<MutationResult<{ id: string; title: string }>> => {
		const parsed = createSidebarArtifactSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid input" };
		}

		let result: MutationResult<Record<string, unknown>>;
		switch (parsed.data.prefix) {
			case "stories":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/stories`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: invalidationTagsForCreate(parsed.data.projectId, parsed.data.prefix) });
				break;
			case "journeys":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/journeys`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: invalidationTagsForCreate(parsed.data.projectId, parsed.data.prefix) });
				break;
			case "problem-statement":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/problems`,
					method: "POST",
					body: { statement: parsed.data.title }
				}, undefined, { tags: invalidationTagsForCreate(parsed.data.projectId, parsed.data.prefix) });
				break;
			case "ideas":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/ideas`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: invalidationTagsForCreate(parsed.data.projectId, parsed.data.prefix) });
				break;
			case "tasks":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/tasks`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: invalidationTagsForCreate(parsed.data.projectId, parsed.data.prefix) });
				break;
			case "feedback":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/feedback`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: invalidationTagsForCreate(parsed.data.projectId, parsed.data.prefix) });
				break;
			case "pages":
				result = await remoteMutationRequest<Record<string, unknown>>({
					path: `/projects/${encodePathSegment(parsed.data.projectId)}/pages`,
					method: "POST",
					body: { title: parsed.data.title }
				}, undefined, { tags: invalidationTagsForCreate(parsed.data.projectId, parsed.data.prefix) });
				break;
			default:
				return { success: false, error: "Unsupported sidebar prefix" };
		}

		if (!result.success) {
			return result;
		}

		const payload = asObject(result.data);
		const id = asTrimmedString(payload.id);
		if (id.length === 0) {
			return { success: false, error: "Created artifact payload is missing id." };
		}

		return {
			success: true,
			data: {
				id,
				title: resolveArtifactTitle(parsed.data.prefix, payload, parsed.data.title)
			}
		};
	}
);
