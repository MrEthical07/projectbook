import { getTasks } from "$lib/remote/task.remote";

export async function load({ params }: { params: { projectId: string } }) {
	return {
		rows: await getTasks(params.projectId)
	};
}
