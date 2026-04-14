import { getUserNotificationsPage } from "$lib/remote/user-home.remote";

export async function load() {
	return {
		notifications: await getUserNotificationsPage()
	};
}
