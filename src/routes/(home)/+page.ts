import { getUserDashboard } from "$lib/remote/user-home.remote";

export async function load() {
	const dashboard = await getUserDashboard();
	return {
		user: dashboard.user,
		projects: dashboard.projects,
		invites: dashboard.invites,
		notifications: dashboard.notifications,
		activity: dashboard.activity
	};
}
