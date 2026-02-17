import { getFeedback } from "$lib/remote/feedback.remote";

export async function load({ params }: { params: { projectId: string } }) {
	return {
		rows: await getFeedback(params.projectId)
	};
}
