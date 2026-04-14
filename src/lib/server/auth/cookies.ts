import { dev } from "$app/environment";
import type { Cookies } from "@sveltejs/kit";
import {
	ACCESS_TOKEN_FALLBACK_TTL_MS,
	AUTH_ACCESS_TOKEN_COOKIE,
	AUTH_NOTICE_COOKIE,
	AUTH_PERMISSION_CONTEXT_COOKIE,
	AUTH_REFRESH_TOKEN_COOKIE,
	AUTH_SESSION_COOKIE,
	DEFAULT_SESSION_TTL_MS,
	PERMISSION_CONTEXT_TTL_MS,
	REMEMBER_SESSION_TTL_MS
} from "./constants";

const baseCookieOptions = {
	httpOnly: true,
	secure: !dev,
	sameSite: "strict" as const,
	path: "/"
};

const parseExpiresAt = (value: string | Date | null | undefined): Date | null => {
	if (!value) {
		return null;
	}
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const setAccessTokenCookie = (
	cookies: Cookies,
	token: string,
	expiresAt?: string | Date | null
): void => {
	const resolvedExpiresAt =
		parseExpiresAt(expiresAt) ?? new Date(Date.now() + ACCESS_TOKEN_FALLBACK_TTL_MS);
	cookies.set(AUTH_ACCESS_TOKEN_COOKIE, token, {
		...baseCookieOptions,
		expires: resolvedExpiresAt
	});
};

export const getAccessTokenCookie = (cookies: Cookies): string | null =>
	cookies.get(AUTH_ACCESS_TOKEN_COOKIE) ?? null;

export const clearAccessTokenCookie = (cookies: Cookies): void => {
	cookies.delete(AUTH_ACCESS_TOKEN_COOKIE, { path: "/" });
};

export const setRefreshTokenCookie = (
	cookies: Cookies,
	token: string,
	remember = false
): void => {
	const ttl = remember ? REMEMBER_SESSION_TTL_MS : DEFAULT_SESSION_TTL_MS;
	cookies.set(AUTH_REFRESH_TOKEN_COOKIE, token, {
		...baseCookieOptions,
		expires: new Date(Date.now() + ttl)
	});
};

export const getRefreshTokenCookie = (cookies: Cookies): string | null =>
	cookies.get(AUTH_REFRESH_TOKEN_COOKIE) ?? null;

export const clearRefreshTokenCookie = (cookies: Cookies): void => {
	cookies.delete(AUTH_REFRESH_TOKEN_COOKIE, { path: "/" });
};

export const setPermissionContextCookie = (
	cookies: Cookies,
	token: string,
	expiresAt?: string | Date | null
): void => {
	const resolvedExpiresAt =
		parseExpiresAt(expiresAt) ?? new Date(Date.now() + PERMISSION_CONTEXT_TTL_MS);
	cookies.set(AUTH_PERMISSION_CONTEXT_COOKIE, token, {
		...baseCookieOptions,
		expires: resolvedExpiresAt
	});
};

export const getPermissionContextCookie = (cookies: Cookies): string | null =>
	cookies.get(AUTH_PERMISSION_CONTEXT_COOKIE) ?? null;

export const clearPermissionContextCookie = (cookies: Cookies): void => {
	cookies.delete(AUTH_PERMISSION_CONTEXT_COOKIE, { path: "/" });
};

export const setApiAuthTokenCookies = (
	cookies: Cookies,
	tokens: {
		accessToken: string;
		refreshToken: string;
		accessExpiresAt?: string | Date | null;
	},
	remember = false
): void => {
	clearPermissionContextCookie(cookies);
	setAccessTokenCookie(cookies, tokens.accessToken, tokens.accessExpiresAt);
	setRefreshTokenCookie(cookies, tokens.refreshToken, remember);
};

export const clearApiAuthTokenCookies = (cookies: Cookies): void => {
	clearAccessTokenCookie(cookies);
	clearRefreshTokenCookie(cookies);
	clearPermissionContextCookie(cookies);
};

export const setSessionCookie = (
	cookies: Cookies,
	token: string,
	expiresAt: Date
): void => {
	cookies.set(AUTH_SESSION_COOKIE, token, {
		...baseCookieOptions,
		expires: expiresAt
	});
};

export const clearSessionCookie = (cookies: Cookies): void => {
	cookies.delete(AUTH_SESSION_COOKIE, { path: "/" });
};

export const getSessionCookie = (cookies: Cookies): string | null =>
	cookies.get(AUTH_SESSION_COOKIE) ?? null;

export const setAuthNoticeCookie = (cookies: Cookies, message: string): void => {
	cookies.set(AUTH_NOTICE_COOKIE, message, {
		...baseCookieOptions,
		maxAge: 60
	});
};

export const consumeAuthNoticeCookie = (cookies: Cookies): string | null => {
	const notice = cookies.get(AUTH_NOTICE_COOKIE) ?? null;
	if (notice) {
		cookies.delete(AUTH_NOTICE_COOKIE, { path: "/" });
	}
	return notice;
};
