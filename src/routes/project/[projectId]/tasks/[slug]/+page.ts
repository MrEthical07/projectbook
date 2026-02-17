import { getTaskPageData } from "$lib/remote/task.remote";

export async function load({ params }: { params: { projectId: string; slug: string } }) {
	return {
		...(await getTaskPageData({ projectId: params.projectId, slug: params.slug }))
	};
}
