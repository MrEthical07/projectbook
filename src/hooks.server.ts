import { randomUUID } from "node:crypto";
import type { Handle, RequestEvent } from "@sveltejs/kit";
import {
	sessionContextRequest,
	type SessionContextProjectPermission,
	type SessionContextResponse
} from "$lib/server/api/auth";
import { ensureAuthenticated } from "$lib/server/api/client";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import {
	clearApiAuthTokenCookies,
	clearPermissionContextRevalidateCooldownCookie,
	clearPermissionContextCookie,
	getAccessTokenCookie,
	getRefreshTokenCookie,
	getPermissionContextCookie,
	setPermissionContextCookie
} from "$lib/server/auth/cookies";
import { parsePermissionContextToken } from "$lib/server/auth/permission-context";

const PUBLIC_PATHS = [
	"/auth", 
	"/auth/verify", 
	"/auth/forgot-password", 
	"/auth/reset-password", 
	"/healthz",
	"/readyz",
	"/privacy-policy",
	"/terms-and-conditions"
];

const UNVERIFIED_ALLOWED_PATHS = ["/auth/verify", "/logout"];

const isPublicPath = (pathname: string): boolean =>
	PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

const isAllowedWhileUnverified = (pathname: string): boolean =>
	UNVERIFIED_ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

const buildVerifyRedirect = (event: RequestEvent): string => {
	const query = new URLSearchParams();
	const email = event.locals.user?.email?.trim() ?? "";
	if (email.length > 0) {
		query.set("email", email);
	}
	const serialized = query.toString();
	return serialized.length > 0 ? `/auth/verify?${serialized}` : "/auth/verify";
};

const isKnownProjectRole = (value: string | undefined): value is ProjectRole =>
	value === "Owner" ||
	value === "Admin" ||
	value === "Editor" ||
	value === "Member" ||
	value === "Viewer" ||
	value === "Limited Access";

const sameProjectID = (left: string, right: string): boolean =>
	left.trim().toLowerCase() === right.trim().toLowerCase();

const resolveRouteProjectID = (event: RequestEvent): string | null => {
	const routeProjectID = typeof event.params.projectId === "string" ? event.params.projectId.trim() : "";
	if (routeProjectID.length > 0) {
		return routeProjectID;
	}

	const pathMatch = /^\/project\/([^/]+)/.exec(event.url.pathname);
	if (!pathMatch || pathMatch.length < 2) {
		return null;
	}

	try {
		const decoded = decodeURIComponent(pathMatch[1]).trim();
		return decoded.length > 0 ? decoded : null;
	} catch {
		const fallback = pathMatch[1].trim();
		return fallback.length > 0 ? fallback : null;
	}
};

const resolveProjectPermissionEntry = (
	context: SessionContextResponse,
	routeProjectID: string | null
): SessionContextProjectPermission | null => {
	if (!routeProjectID) {
		return null;
	}

	for (const entry of context.project_permissions) {
		if (sameProjectID(entry.project_id, routeProjectID)) {
			return entry;
		}
		if (entry.project_slug && sameProjectID(entry.project_slug, routeProjectID)) {
			return entry;
		}
	}

	return null;
};

const toPermissionMaskString = (value: number | undefined): PermissionMask | undefined => {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		return undefined;
	}
	return Math.trunc(value).toString();
};

const applyLocalsFromPermissionContext = (
	event: RequestEvent,
	context: SessionContextResponse
): void => {
	const backendRole = context.backend_role?.trim();
	const email = context.email?.trim();
	const emailVerified = context.email_verified !== false;
	event.locals.user = {
		id: context.user_id,
		email: email && email.length > 0 ? email : undefined,
		role: isKnownProjectRole(backendRole) ? backendRole : undefined,
		emailVerified,
		authenticated: true
	};

	const routeProjectID = resolveRouteProjectID(event);
	const projectPermissionEntry = resolveProjectPermissionEntry(context, routeProjectID);
	if (routeProjectID) {
		const projectRole =
			projectPermissionEntry && isKnownProjectRole(projectPermissionEntry.role)
				? projectPermissionEntry.role
				: undefined;
		const permissionMask = toPermissionMaskString(projectPermissionEntry?.permission_mask);

		event.locals.project = {
			id: routeProjectID,
			role: projectRole,
			permissionMask
		};
		event.locals.projectPermissionMask = permissionMask;
	}

	event.locals.session = {
		id: context.user_id
	};
};

const persistPermissionContext = (
	event: RequestEvent,
	context: SessionContextResponse
): void => {
	const contextToken = context.context_token?.trim() ?? "";
	if (contextToken.length > 0) {
		setPermissionContextCookie(
			event.cookies,
			contextToken,
			context.context_token_expires_utc ??
				(context.context_token_expires_unix
					? new Date(context.context_token_expires_unix * 1000)
					: null)
		);
	} else {
		clearPermissionContextCookie(event.cookies);
	}
	clearPermissionContextRevalidateCooldownCookie(event.cookies);
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = randomUUID();

	const accessToken = getAccessTokenCookie(event.cookies);
	const refreshToken = getRefreshTokenCookie(event.cookies);
	const hasAuthEvidence = Boolean(accessToken || refreshToken);

	let auth = hasAuthEvidence
		? await ensureAuthenticated(event)
		: {
			authenticated: false
		};

	if (auth.authenticated) {
		const permissionContextToken = getPermissionContextCookie(event.cookies);
		const cachedPermissionContext = parsePermissionContextToken(permissionContextToken);
		if (permissionContextToken && !cachedPermissionContext) {
			clearPermissionContextCookie(event.cookies);
		}

		if (auth.session) {
			persistPermissionContext(event, auth.session);
			applyLocalsFromPermissionContext(event, auth.session);
		} else if (cachedPermissionContext) {
			applyLocalsFromPermissionContext(event, cachedPermissionContext);
		} else {
			try {
				const sessionContext = await sessionContextRequest(event);
				persistPermissionContext(event, sessionContext);
				applyLocalsFromPermissionContext(event, sessionContext);
			} catch (err) {
				console.error("[hooks] session context failed", err);
				if (isApiRequestError(err) && err.statusCode === 401) {
					clearApiAuthTokenCookies(event.cookies);
					auth = {
						authenticated: false
					};
				} else {
					auth = {
						authenticated: false,
						transient: true
					};
				}
			}
		}
	}

	if (!event.locals.user && !isPublicPath(event.url.pathname)) {
		if (hasAuthEvidence && auth.authenticated === false && auth.transient === true) {
			console.warn("[hooks] auth degraded state resolved as UNAUTHENTICATED", {
				path: event.url.pathname
			});
		}
		if (event.url.pathname !== "/logout") {
			return new Response(null, {
				status: 303,
				headers: { location: "/auth" }
			});
		}
	}

	const userIsUnverified = event.locals.user?.authenticated === true && event.locals.user?.emailVerified === false;
	if (userIsUnverified) {
		const isPublic = isPublicPath(event.url.pathname);
		const shouldRedirect =
			!isAllowedWhileUnverified(event.url.pathname) &&
			(event.url.pathname === "/auth" || !isPublic);

		if (shouldRedirect) {
			return new Response(null, {
				status: 303,
				headers: { location: buildVerifyRedirect(event) }
			});
		}
	}

	return resolve(event);
};
