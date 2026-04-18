import { getResources } from "$lib/remote/resource.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const resources = await getResources({
		projectId: params.projectId,
		sort: "lastUpdated",
		order: "desc",
		limit: 20
	});
	return {
		resources: resources.items,
		nextCursor: resources.nextCursor,
		reference: resources.reference
	};
}
