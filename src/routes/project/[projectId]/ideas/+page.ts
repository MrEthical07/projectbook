import { getIdeas } from "$lib/remote/idea.remote";

export async function load({ params }: { params: { projectId: string } }) {
	return {
		rows: await getIdeas(params.projectId)
	};
}
