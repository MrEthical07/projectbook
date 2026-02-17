import { getStoryPageData } from "$lib/remote/story.remote";

export async function load({ params }: { params: { projectId: string; slug: string } }) {
	return {
		...(await getStoryPageData({ projectId: params.projectId, slug: params.slug }))
	};
}
