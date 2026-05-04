import { getProblemPageData } from "$lib/remote/problem.remote";

export async function load({ params, depends }: { params: { projectId: string; problemId: string }; depends: Function }) {
	depends('problem:data');
	const data = await getProblemPageData({ projectId: params.projectId, problemId: params.problemId });
	return {
		...data
	};
}
