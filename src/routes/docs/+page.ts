import { getUserDocsSections } from "$lib/remote/user-home.remote";

export async function load() {
	return {
		sections: await getUserDocsSections()
	};
}
