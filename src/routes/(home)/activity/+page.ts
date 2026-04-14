import { getUserActivityPage } from "$lib/remote/user-home.remote";

export async function load() {
	return {
		activities: await getUserActivityPage()
	};
}
