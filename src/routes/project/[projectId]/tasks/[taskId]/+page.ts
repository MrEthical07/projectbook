import { getTaskPageData } from "$lib/remote/task.remote";

export async function load({ params }: { params: { projectId: string; taskId: string } }) {
	return {
		...(await getTaskPageData({ projectId: params.projectId, taskId: params.taskId }))
	};
}
