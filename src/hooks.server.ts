import { randomUUID } from "node:crypto";
import type { Handle, RequestEvent } from "@sveltejs/kit";
import {
	sessionContextRequest,
	type SessionContextProjectPermission,
	type SessionContextResponse
} from "$lib/server/api/auth";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import {
	clearApiAuthTokenCookies,
	clearPermissionContextCookie,
	getAccessTokenCookie
} from "$lib/server/auth/cookies";

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

const isPublicPath = (pathname: string): boolean =>
	PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

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
	event.locals.user = {
		id: context.user_id,
		role: isKnownProjectRole(backendRole) ? backendRole : undefined,
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

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = randomUUID();

	const accessToken = getAccessTokenCookie(event.cookies);
	let hasAccessToken = Boolean(accessToken);
	let authCheckTransientFailure = false;
	if (accessToken) {
		try {
			const sessionContext = await sessionContextRequest(event);
			clearPermissionContextCookie(event.cookies);
			applyLocalsFromPermissionContext(event, sessionContext);
		} catch (err) {
			console.error("[hooks] session context failed", err);
			if (isApiRequestError(err) && (err.statusCode === 401 || err.statusCode === 403)) {
				clearApiAuthTokenCookies(event.cookies);
				hasAccessToken = false;
			} else {
				authCheckTransientFailure = true;
			}
		}
	}

	if (!event.locals.user && !isPublicPath(event.url.pathname)) {
		if (hasAccessToken && authCheckTransientFailure) {
			return resolve(event);
		}
		if (event.url.pathname !== "/logout") {
			return new Response(null, {
				status: 303,
				headers: { location: "/auth" }
			});
		}
	}

	return resolve(event);
};
