import { getIdeas } from "$lib/remote/idea.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const result = await getIdeas({ projectId: params.projectId, limit: 20 });
	return {
		rows: result.items,
		nextCursor: result.nextCursor
	};
}
