import type { LayoutLoad } from "./$types";
import { getHomeSidebarData } from "$lib/remote/user-home.remote";

export const load: LayoutLoad = async () => {
	return {
		homeSidebarData: await getHomeSidebarData()
	};
};
