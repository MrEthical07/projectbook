import { getAccountSettings, getWorkspaceDashboard } from "$lib/remote/workspace.remote";

export async function load() {
	const dashboard = await getWorkspaceDashboard();
	return {
		account: await getAccountSettings(),
		userId: dashboard.user.id
	};
}
