import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { clearSessionCookie, getSessionCookie } from "$lib/server/auth/cookies";
import { authService } from "$lib/server/auth/service";

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionToken = getSessionCookie(cookies);
	if (sessionToken) {
		authService.invalidateSessionByToken(sessionToken);
		clearSessionCookie(cookies);
	}
	redirect(303, "/auth");
};
