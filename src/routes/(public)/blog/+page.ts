import { publishedPosts } from '$lib/content/blog';

export const load = async () => {
	return {
		posts: publishedPosts
	};
};
