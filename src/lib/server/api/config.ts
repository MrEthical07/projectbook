import { env } from "$env/dynamic/private";

const API_VERSION_PREFIX = "/api/v1";

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const ensureVersionPrefix = (baseUrl: string): string => {
	const normalizedBase = trimTrailingSlash(baseUrl);
	if (
		normalizedBase.endsWith(API_VERSION_PREFIX) ||
		normalizedBase.endsWith(`${API_VERSION_PREFIX}/`)
	) {
		return normalizedBase;
	}
	return `${normalizedBase}${API_VERSION_PREFIX}`;
};

export const resolveBackendApiBaseUrl = (origin: string): string => {
	const configured =
		env.PROJECTBOOK_API_BASE_URL?.trim() ||
		env.API_URL?.trim();
	if (configured && configured.length > 0) {
		return ensureVersionPrefix(configured);
	}
	return `${trimTrailingSlash(origin)}${API_VERSION_PREFIX}`;
};

export const buildApiUrl = (baseUrl: string, path: string): string => {
	if (/^https?:\/\//i.test(path)) {
		return path;
	}
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${trimTrailingSlash(baseUrl)}${normalizedPath}`;
};
