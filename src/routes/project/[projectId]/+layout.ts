import type { LayoutLoad } from "./$types";
import { getProjectAccess } from "$lib/remote/access.remote";
import { getProjectSidebarData } from "$lib/remote/sidebar.remote";

export const load: LayoutLoad = async ({ params }) => {
	const sidebarData = await getProjectSidebarData(params.projectId);
	const sidebarProjects = sidebarData.success ? sidebarData.data.projects : [];
	const currentProject = sidebarProjects.find((item) => item.id === params.projectId);
	const resolvedProjectStatus: ProjectStatus =
		currentProject?.status === "Archived" ? "Archived" : "Active";

	return {
		access: await getProjectAccess(params.projectId),
		sidebarData,
		project: {
			id: params.projectId,
			name: currentProject?.name ?? "Project",
			status: resolvedProjectStatus
		}
	};
};
