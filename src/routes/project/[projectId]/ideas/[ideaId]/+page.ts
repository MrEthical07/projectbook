import { getIdeaPageData } from "$lib/remote/idea.remote";

export async function load({ params }: { params: { projectId: string; ideaId: string } }) {
	return {
		...(await getIdeaPageData({ projectId: params.projectId, ideaId: params.ideaId }))
	};
}
