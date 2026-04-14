import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { logoutRequest } from "$lib/server/api/auth";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import {
	clearApiAuthTokenCookies,
	clearSessionCookie,
	getAccessTokenCookie,
	getSessionCookie
} from "$lib/server/auth/cookies";

export const load: PageServerLoad = async (event) => {
	const accessToken = getAccessTokenCookie(event.cookies);
	if (accessToken) {
		try {
			await logoutRequest(event);
		} catch (err) {
			console.error("[auth:logout] request failed", err);
			if (!isApiRequestError(err) || err.statusCode >= 500) {
				// Ignore backend logout errors and continue clearing local auth state.
			}
		}
	}

	if (getSessionCookie(event.cookies)) {
		clearSessionCookie(event.cookies);
	}
	clearApiAuthTokenCookies(event.cookies);
	redirect(303, "/auth");
};
