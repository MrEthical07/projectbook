import { getResources } from "$lib/remote/resource.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const resources = await getResources(params.projectId);
	return {
		resources: resources.rows,
		reference: resources.reference
	};
}
