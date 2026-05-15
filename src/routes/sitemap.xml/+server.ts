import type { RequestHandler } from './$types';
import { buildSitemapXml, getSiteOrigin } from '$lib/seo/site';

export const GET: RequestHandler = async ({ url }) => {
	const origin = getSiteOrigin(url.origin);
	if (!origin) {
		return new Response('Missing PUBLIC_PROJECTBOOK_SITE_URL', {
			status: 500,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8'
			}
		}); 
	}

	const body = buildSitemapXml(origin);

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
