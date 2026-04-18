import { getPageEditorData } from "$lib/remote/page.remote";

export async function load({ params }: { params: { projectId: string; pageId: string } }) {
	return {
		editor: await getPageEditorData({ projectId: params.projectId, pageId: params.pageId })
	};
}
