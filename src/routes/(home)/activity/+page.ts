import { getWorkspaceActivityPage } from "$lib/remote/workspace.remote";

export async function load() {
	return {
		activities: await getWorkspaceActivityPage()
	};
}
