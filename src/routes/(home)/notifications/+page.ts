import { getWorkspaceNotificationsPage } from "$lib/remote/workspace.remote";

export async function load() {
	return {
		notifications: await getWorkspaceNotificationsPage()
	};
}
