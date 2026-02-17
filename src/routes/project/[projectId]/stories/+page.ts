import { getStories } from "$lib/remote/story.remote";

export async function load({ params }: { params: { projectId: string } }) {
	return {
		rows: await getStories(params.projectId)
	};
}
