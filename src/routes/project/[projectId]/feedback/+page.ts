import { getFeedback } from "$lib/remote/feedback.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const result = await getFeedback({ projectId: params.projectId, limit: 20 });
	return {
		rows: result.items,
		nextCursor: result.nextCursor
	};
}
