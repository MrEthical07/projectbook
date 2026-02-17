import { getPages } from "$lib/remote/page.remote";

export async function load({ params }: { params: { projectId: string } }) {
	return {
		rows: await getPages(params.projectId)
	};
}
