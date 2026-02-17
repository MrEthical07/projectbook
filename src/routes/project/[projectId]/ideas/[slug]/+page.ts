import { getIdeaPageData } from "$lib/remote/idea.remote";

export async function load({ params }: { params: { projectId: string; slug: string } }) {
	return {
		...(await getIdeaPageData({ projectId: params.projectId, slug: params.slug }))
	};
}
