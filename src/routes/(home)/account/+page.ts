import {
	getUserAccountSettings,
	getUserDashboard
} from "$lib/remote/user-home.remote";

export async function load() {
	const dashboard = await getUserDashboard();
	return {
		account: await getUserAccountSettings(),
		userId: dashboard.user.id
	};
}
