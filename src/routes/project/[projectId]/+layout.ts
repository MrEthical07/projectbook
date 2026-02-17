import type { LayoutLoad } from "./$types";
import { getProjectAccess } from "$lib/remote/access.remote";
import { getProjectSidebarData } from "$lib/remote/sidebar.remote";

export const load: LayoutLoad = async ({ params }) => {
	return {
		access: await getProjectAccess(params.projectId),
		sidebarData: await getProjectSidebarData(params.projectId)
	};
};
