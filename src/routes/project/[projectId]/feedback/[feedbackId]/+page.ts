import { getFeedbackPageData } from "$lib/remote/feedback.remote";

export async function load({ params }: { params: { projectId: string; feedbackId: string } }) {
	return {
		...(await getFeedbackPageData({ projectId: params.projectId, feedbackId: params.feedbackId }))
	};
}
