import { getPageEditorData } from "$lib/remote/page.remote";

export async function load({ params }: { params: { projectId: string; slug: string } }) {
	return {
		editor: await getPageEditorData({ projectId: params.projectId, slug: params.slug })
	};
}
