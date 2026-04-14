import {
	getUserDashboard,
	getUserInvitesPage
} from "$lib/remote/user-home.remote";

export async function load() {
	const dashboard = await getUserDashboard();
	return {
		invites: await getUserInvitesPage(),
		userId: dashboard.user.id
	};
}
