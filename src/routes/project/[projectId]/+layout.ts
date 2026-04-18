import type { LayoutLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { getProjectAccess } from "$lib/remote/access.remote";
import { getProjectSidebarData } from "$lib/remote/sidebar.remote";

export const load: LayoutLoad = async ({ params, depends }) => {
	const scopedProjectID = params.projectId.trim();
	const dependencyKey: `${string}:${string}` = `project-layout:${scopedProjectID}`;
	depends(dependencyKey);

	const access = await getProjectAccess(scopedProjectID);
	const sidebarData = await getProjectSidebarData(scopedProjectID);

	if (!sidebarData.success) {
		const message = sidebarData.error.trim();
		if (/not found/i.test(message)) {
			error(404, message || "Project not found.");
		}

		return {
			access,
			sidebarData
		};
	}

	if (sidebarData.data.projects.length > 0) {
		const currentProjectFound = sidebarData.data.projects.some(
			(project) => project.id.trim().toLowerCase() === scopedProjectID.toLowerCase()
		);
		if (!currentProjectFound) {
			error(404, "Project not found.");
		}
	}

	return {
		access,
		sidebarData
	};
};
