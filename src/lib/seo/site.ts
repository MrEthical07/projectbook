import { dev } from '$app/environment';
import { PUBLIC_PROJECTBOOK_SITE_URL } from '$env/static/public';
import { publishedPosts } from '$lib/content/blog';
import siteData from './site-data.json';

type PublicPage = {
	path: string;
	title: string;
	description: string;
};

type PublicPageSeo = {
	title: string;
	description: string;
	canonical: string | null;
	ogImage: string | null;
	siteName: string;
};

const publicPages = siteData.publicPages as PublicPage[];
const disallowPaths = siteData.disallowPaths as string[];
/**
 * Indexable roots whose child pages are generated rather than enumerated in
 * site-data.json. Without this, hooks.server.ts would stamp a noindex header
 * on every blog post.
 */
const extraIndexablePaths = ['/blog'];
const ogImagePath = siteData.ogImagePath as string;
const siteName = siteData.siteName as string;

const normalizePath = (pathname: string): string => {
	if (pathname.length > 1 && pathname.endsWith('/')) {
		return pathname.slice(0, -1);
	}
	return pathname;
};

const normalizeOrigin = (origin: string): string => origin.replace(/\/+$/, '');

export const getSiteOrigin = (fallbackOrigin?: string): string => {
	const configured = normalizeOrigin(PUBLIC_PROJECTBOOK_SITE_URL?.trim() ?? '');
	if (configured.length > 0) {
		return configured;
	}
	if (dev && fallbackOrigin) {
		return normalizeOrigin(fallbackOrigin);
	}
	return '';
};

const buildAbsoluteUrl = (origin: string, pathname: string): string => {
	const base = normalizeOrigin(origin);
	const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
	return `${base}${path}`;
};

export const getPublicPageSeo = (pathname: string, fallbackOrigin?: string): PublicPageSeo | null => {
	const normalized = normalizePath(pathname);
	const page = publicPages.find((entry) => entry.path === normalized);
	if (!page) {
		return null;
	}
	const origin = getSiteOrigin(fallbackOrigin);
	const canonical = origin ? buildAbsoluteUrl(origin, page.path) : null;
	const ogImage = origin ? buildAbsoluteUrl(origin, ogImagePath) : null;

	return {
		title: page.title,
		description: page.description,
		canonical,
		ogImage,
		siteName
	};
};

/**
 * SEO for pages whose content is not part of the static publicPages list, such
 * as individual blog posts. Mirrors getPublicPageSeo so callers can share the
 * same head markup.
 */
export const buildPageSeo = (
	pathname: string,
	title: string,
	description: string,
	fallbackOrigin?: string
): PublicPageSeo => {
	const origin = getSiteOrigin(fallbackOrigin);
	const normalized = normalizePath(pathname);

	return {
		title,
		description,
		canonical: origin ? buildAbsoluteUrl(origin, normalized) : null,
		ogImage: origin ? buildAbsoluteUrl(origin, ogImagePath) : null,
		siteName
	};
};

export const isIndexablePath = (pathname: string): boolean => {
	const normalized = normalizePath(pathname);
	if (publicPages.some((page) => page.path === normalized)) {
		return true;
	}
	return extraIndexablePaths.some(
		(path) => normalized === path || normalized.startsWith(`${path}/`)
	);
};

export const buildSitemapXml = (origin: string): string => {
	const paths = [
		...publicPages.map((page) => page.path),
		...publishedPosts.map((post) => `/blog/${post.slug}`)
	];

	const urlEntries = paths
		.map((path) => {
			const loc = buildAbsoluteUrl(origin, path);
			return `  <url>\n    <loc>${loc}</loc>\n  </url>`;
		})
		.join('\n');

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		urlEntries,
		'</urlset>',
		''
	].join('\n');
};

export { publicPages, disallowPaths, ogImagePath, siteName };
