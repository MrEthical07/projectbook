import {
	getProjectCreationReference,
	getUserDashboard
} from "$lib/remote/user-home.remote";

export async function load() {
	const dashboard = await getUserDashboard();
	return {
		reference: await getProjectCreationReference(),
		userId: dashboard.user.id
	};
}
