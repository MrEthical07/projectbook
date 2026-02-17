import { getJourneys } from "$lib/remote/journey.remote";

export async function load({ params }: { params: { projectId: string } }) {
	return {
		rows: await getJourneys(params.projectId)
	};
}
