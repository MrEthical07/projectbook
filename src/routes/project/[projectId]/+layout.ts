import type { LayoutLoad } from "./$types";
import { getProjectAccess } from "$lib/remote/access.remote";
import { getProjectNavigationData } from "$lib/remote/project-navigation.remote";

export const load: LayoutLoad = async ({ params, depends }) => {
	const scopedProjectID = params.projectId.trim();
	const dependencyKey: `${string}:${string}` = `project-layout:${scopedProjectID}`;
	depends(dependencyKey);

	const [access, navigationData] = await Promise.all([
		getProjectAccess(scopedProjectID),
		getProjectNavigationData(scopedProjectID)
	]);

	return {
		access,
		navigationData
	};
};
