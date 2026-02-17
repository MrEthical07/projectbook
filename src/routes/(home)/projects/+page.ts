import { getWorkspaceProjects } from "$lib/remote/workspace.remote";

export async function load() {
	return {
		projects: await getWorkspaceProjects()
	};
}
