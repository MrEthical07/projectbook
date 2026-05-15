import { dev } from '$app/environment';
import { PUBLIC_PROJECTBOOK_SITE_URL } from '$env/static/public';
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
};

const publicPages = siteData.publicPages as PublicPage[];
const disallowPaths = siteData.disallowPaths as string[];
const ogImagePath = siteData.ogImagePath as string;

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
		ogImage
	};
};

export const isIndexablePath = (pathname: string): boolean => {
	const normalized = normalizePath(pathname);
	return publicPages.some((page) => page.path === normalized);
};

export const buildSitemapXml = (origin: string): string => {
	const urlEntries = publicPages
		.map((page) => {
			const loc = buildAbsoluteUrl(origin, page.path);
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

export { publicPages, disallowPaths, ogImagePath };
