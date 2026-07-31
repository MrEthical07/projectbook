import { error } from '@sveltejs/kit';
import { getPublishedPost } from '$lib/content/blog';

export const load = async ({ params }) => {
	const post = getPublishedPost(params.slug);
	if (!post) {
		error(404, 'Post not found');
	}

	return { post };
};
