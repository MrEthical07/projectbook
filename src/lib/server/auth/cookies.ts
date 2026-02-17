import { dev } from "$app/environment";
import type { Cookies } from "@sveltejs/kit";
import { AUTH_NOTICE_COOKIE, AUTH_SESSION_COOKIE } from "./constants";

const baseCookieOptions = {
	httpOnly: true,
	secure: !dev,
	sameSite: "strict" as const,
	path: "/"
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
