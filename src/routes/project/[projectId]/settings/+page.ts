import { getProjectSettings } from "$lib/remote/project.remote";

export async function load({ params }: { params: { projectId: string } }) {
	return {
		settings: await getProjectSettings(params.projectId)
	};
}
