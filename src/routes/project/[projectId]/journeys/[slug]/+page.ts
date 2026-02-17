import { getJourneyPageData } from "$lib/remote/journey.remote";

export async function load({ params }: { params: { projectId: string; slug: string } }) {
	return {
		...(await getJourneyPageData({ projectId: params.projectId, slug: params.slug }))
	};
}
