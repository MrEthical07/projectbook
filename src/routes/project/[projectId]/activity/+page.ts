import { getProjectActivity } from "$lib/remote/activity.remote";

export async function load({ params }: { params: { projectId: string } }) {
	return {
		items: await getProjectActivity({ projectId: params.projectId, limit: 50 })
	};
}
