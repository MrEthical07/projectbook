import { getStoryPageData } from "$lib/remote/story.remote";

export async function load({ params }: { params: { projectId: string; storyId: string } }) {
	return {
		...(await getStoryPageData({ projectId: params.projectId, storyId: params.storyId }))
	};
}
