import { getWorkspaceDashboard } from "$lib/remote/workspace.remote";

export async function load() {
	const dashboard = await getWorkspaceDashboard();
	return {
		user: dashboard.user,
		projects: dashboard.projects,
		invites: dashboard.invites,
		notifications: dashboard.notifications,
		activity: dashboard.activity
	};
}
