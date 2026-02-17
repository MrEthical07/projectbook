import { getResourcePageData } from "$lib/remote/resource.remote";

export async function load({ params }: { params: { projectId: string; resourceId: string } }) {
	return {
		resource: await getResourcePageData({
			projectId: params.projectId,
			resourceId: params.resourceId
		})
	};
}
