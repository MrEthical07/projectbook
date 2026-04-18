import {
	getUserInvitesPage
} from "$lib/remote/user-home.remote";

export async function load() {
	return {
		invites: await getUserInvitesPage()
	};
}
