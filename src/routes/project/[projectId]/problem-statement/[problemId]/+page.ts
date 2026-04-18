import { getProblemPageData } from "$lib/remote/problem.remote";

export async function load({ params }: { params: { projectId: string; problemId: string } }) {
	return {
		...(await getProblemPageData({ projectId: params.projectId, problemId: params.problemId }))
	};
}
