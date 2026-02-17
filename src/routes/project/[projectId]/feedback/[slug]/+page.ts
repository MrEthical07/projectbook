import { getFeedbackPageData } from "$lib/remote/feedback.remote";

export async function load({ params }: { params: { projectId: string; slug: string } }) {
	return {
		...(await getFeedbackPageData({ projectId: params.projectId, slug: params.slug }))
	};
}
