import type { LayoutLoad } from "./$types";
import { error } from "@sveltejs/kit";
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

	if (navigationData.currentProject.id.trim().toLowerCase() !== scopedProjectID.toLowerCase()) {
		error(404, "Project not found.");
	}

	return {
		access,
		navigationData
	};
};
