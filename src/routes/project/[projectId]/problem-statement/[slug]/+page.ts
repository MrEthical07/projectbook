import { getProblemPageData } from "$lib/remote/problem.remote";

export async function load({ params }: { params: { projectId: string; slug: string } }) {
	return {
		...(await getProblemPageData({ projectId: params.projectId, slug: params.slug }))
	};
}
