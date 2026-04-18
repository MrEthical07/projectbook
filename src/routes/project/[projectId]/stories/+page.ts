import { getStories } from "$lib/remote/story.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const result = await getStories({ projectId: params.projectId, limit: 20 });
	return {
		rows: result.items,
		nextCursor: result.nextCursor
	};
}
