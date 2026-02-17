import { getWorkspaceDashboard, getWorkspaceInvitesPage } from "$lib/remote/workspace.remote";

export async function load() {
	const dashboard = await getWorkspaceDashboard();
	return {
		invites: await getWorkspaceInvitesPage(),
		userId: dashboard.user.id
	};
}
