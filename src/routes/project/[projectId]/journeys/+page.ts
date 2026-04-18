import { getJourneys } from "$lib/remote/journey.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const result = await getJourneys({ projectId: params.projectId, limit: 20 });
	return {
		rows: result.items,
		nextCursor: result.nextCursor
	};
}
