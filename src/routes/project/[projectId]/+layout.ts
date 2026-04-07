import type { LayoutLoad } from "./$types";
import { getProjectAccess } from "$lib/remote/access.remote";
import { getProjectSidebarData } from "$lib/remote/sidebar.remote";
import { Folder } from "@lucide/svelte";

export const load: LayoutLoad = async ({ params }) => {
	const sidebarData = await getProjectSidebarData(params.projectId);
	const projectSummary = sidebarData.success
		? sidebarData.data.projects.find((project) => project.id === params.projectId)
		: undefined;

	return {
		access: await getProjectAccess(params.projectId),
		sidebarData,
		project: {
			id: params.projectId,
			icon: projectSummary?.icon ?? Folder,
			name: projectSummary?.name ?? "Project",
			status: (projectSummary?.status as ProjectStatus) ?? "Active"
		}
	};
};
