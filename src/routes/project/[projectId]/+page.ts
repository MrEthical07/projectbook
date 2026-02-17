import { getProjectDashboard } from "$lib/remote/project.remote";

export async function load({ params }: { params: { projectId: string } }) {
	return {
		dashboard: await getProjectDashboard(params.projectId)
	};
}
