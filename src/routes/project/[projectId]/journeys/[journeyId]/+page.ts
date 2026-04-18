import { getJourneyPageData } from "$lib/remote/journey.remote";

export async function load({ params }: { params: { projectId: string; journeyId: string } }) {
	return {
		...(await getJourneyPageData({ projectId: params.projectId, journeyId: params.journeyId }))
	};
}
