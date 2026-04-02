import type { LayoutLoad } from "./$types";
import { getWorkspaceSidebarData } from "$lib/remote/workspace.remote";

export const load: LayoutLoad = async () => {
	return {
		homeSidebarData: await getWorkspaceSidebarData()
	};
};
