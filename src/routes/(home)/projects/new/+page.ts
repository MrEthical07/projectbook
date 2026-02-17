import { getAddProjectReference, getWorkspaceDashboard } from "$lib/remote/workspace.remote";

export async function load() {
	const dashboard = await getWorkspaceDashboard();
	return {
		reference: await getAddProjectReference(),
		userId: dashboard.user.id
	};
}
