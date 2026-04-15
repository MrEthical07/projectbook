import {
	getUserAccountSettings,
	getUserDashboard
} from "$lib/remote/user-home.remote";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ data }) => {
	const dashboard = await getUserDashboard();
	return {
		...data,
		account: await getUserAccountSettings(),
		userId: dashboard.user.id
	};
};
