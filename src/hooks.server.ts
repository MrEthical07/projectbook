import { randomUUID } from "node:crypto";
import type { Handle } from "@sveltejs/kit";
import { getSessionCookie } from "$lib/server/auth/cookies";
import { authService } from "$lib/server/auth/service";

const PUBLIC_PATHS = ["/auth", "/auth/verify", "/auth/forgot-password", "/auth/reset-password"];

const isPublicPath = (pathname: string): boolean =>
	PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

let superAdminSeeded = false;

export const handle: Handle = async ({ event, resolve }) => {
	if (!superAdminSeeded) {
		await authService.seedSuperAdmin();
		superAdminSeeded = true;
	}

	event.locals.requestId = randomUUID();

	const sessionToken = getSessionCookie(event.cookies);
	if (sessionToken) {
		const user = authService.getUserBySessionToken(sessionToken);
		if (user) {
			event.locals.user = {
				id: user.id,
				name: user.name,
				email: user.email,
				authenticated: true
			};
			event.locals.session = {
				id: sessionToken
			};
		}
	}

	if (!event.locals.user && !isPublicPath(event.url.pathname)) {
		if (event.url.pathname !== "/logout") {
			return new Response(null, {
				status: 303,
				headers: { location: "/auth" }
			});
		}
	}

	return resolve(event);
};
