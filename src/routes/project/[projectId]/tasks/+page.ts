import { getTasks } from "$lib/remote/task.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const result = await getTasks({ projectId: params.projectId, limit: 20 });
	return {
		rows: result.items,
		nextCursor: result.nextCursor
	};
}
