import { getProjectActivity } from "$lib/remote/activity.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const result = await getProjectActivity({ projectId: params.projectId, limit: 20 });
	return {
		items: result.items,
		nextCursor: result.nextCursor
	};
}
