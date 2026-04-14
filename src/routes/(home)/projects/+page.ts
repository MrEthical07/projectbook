import { getUserProjects } from "$lib/remote/user-home.remote";

export async function load() {
	return {
		projects: await getUserProjects()
	};
}
