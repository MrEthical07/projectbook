import { getDocsSections } from "$lib/remote/workspace.remote";

export async function load() {
	return {
		sections: await getDocsSections()
	};
}
