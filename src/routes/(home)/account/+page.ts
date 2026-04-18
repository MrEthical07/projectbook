import {
	getUserAccountSettings
} from "$lib/remote/user-home.remote";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ data }) => {
	return {
		...data,
		account: await getUserAccountSettings()
	};
};
