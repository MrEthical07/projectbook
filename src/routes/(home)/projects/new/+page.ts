import {
	getProjectCreationReference
} from "$lib/remote/user-home.remote";

export async function load() {
	return {
		reference: await getProjectCreationReference()
	};
}
