import { getProblems } from "$lib/remote/problem.remote";

export async function load({ params }: { params: { projectId: string } }) {
	return {
		rows: await getProblems(params.projectId)
	};
}
