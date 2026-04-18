import { getPages } from "$lib/remote/page.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const result = await getPages({ projectId: params.projectId, limit: 20 });
	return {
		rows: result.items,
		nextCursor: result.nextCursor
	};
}
