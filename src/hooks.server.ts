import { randomUUID } from "node:crypto";
import { brotliCompressSync, brotliDecompressSync } from "node:zlib";
import type { Cookies, Handle } from "@sveltejs/kit";
import { getSessionCookie } from "$lib/server/auth/cookies";
import { authService } from "$lib/server/auth/service";
import {
	applyAccountWorkspaceScope,
	captureWorkspaceSnapshot,
	hydrateWorkspaceSnapshot
} from "$lib/server/demo/account-scope";
import type { DataStore } from "$lib/server/data/datastore";
import { RetryAfterRateLimiter } from 'sveltekit-rate-limiter/server';

const limiter = new RetryAfterRateLimiter({
	IP: [100, 'm']
});

const SCOPE_COOKIE_PREFIX = "projectbook_scope_state";
const SCOPE_COOKIE_COUNT = `${SCOPE_COOKIE_PREFIX}_chunks`;
const SCOPE_COOKIE_CHUNK_PREFIX = `${SCOPE_COOKIE_PREFIX}_`;
const COOKIE_CHUNK_SIZE = 3500;
const COOKIE_MAX_CHUNKS = 24;

type ScopeCookiePayload = {
	version: 1;
	sessionToken: string;
	snapshot: DataStore;
};

const cookieOptions = (secure: boolean) => ({
	path: "/",
	httpOnly: true,
	sameSite: "lax" as const,
	secure,
	maxAge: 60 * 60 * 24 * 30
});

const clearScopeSnapshotCookies = (cookies: Cookies, secure: boolean): void => {
	const options = cookieOptions(secure);
	const existingCountRaw = cookies.get(SCOPE_COOKIE_COUNT);
	const existingCount = existingCountRaw ? Number.parseInt(existingCountRaw, 10) : 0;
	const chunkCount = Number.isFinite(existingCount) && existingCount > 0 ? existingCount : 0;

	cookies.delete(SCOPE_COOKIE_COUNT, options);
	for (let index = 0; index < chunkCount; index += 1) {
		cookies.delete(`${SCOPE_COOKIE_CHUNK_PREFIX}${index}`, options);
	}
};

const readScopeSnapshotFromCookies = (
	cookies: Cookies,
	sessionToken: string
): DataStore | null => {
	const chunkCountRaw = cookies.get(SCOPE_COOKIE_COUNT);
	if (!chunkCountRaw) return null;

	const chunkCount = Number.parseInt(chunkCountRaw, 10);
	if (!Number.isFinite(chunkCount) || chunkCount <= 0 || chunkCount > COOKIE_MAX_CHUNKS) {
		return null;
	}

	const parts: string[] = [];
	for (let index = 0; index < chunkCount; index += 1) {
		const chunk = cookies.get(`${SCOPE_COOKIE_CHUNK_PREFIX}${index}`);
		if (!chunk) {
			return null;
		}
		parts.push(chunk);
	}

	try {
		const compressed = Buffer.from(parts.join(""), "base64url");
		const payloadJson = brotliDecompressSync(compressed).toString("utf8");
		const payload = JSON.parse(payloadJson) as ScopeCookiePayload;
		if (payload.version !== 1 || payload.sessionToken !== sessionToken) {
			return null;
		}
		return payload.snapshot;
	} catch {
		return null;
	}
};

const buildScopeSnapshotSetCookieHeaders = (
	cookies: Cookies,
	sessionToken: string,
	snapshot: DataStore,
	secure: boolean
): string[] => {
	const options = cookieOptions(secure);
	const payload: ScopeCookiePayload = {
		version: 1,
		sessionToken,
		snapshot
	};

	const payloadJson = JSON.stringify(payload);
	const compressed = brotliCompressSync(Buffer.from(payloadJson, "utf8"));
	const encoded = compressed.toString("base64url");

	const nextChunks: string[] = [];
	for (let start = 0; start < encoded.length; start += COOKIE_CHUNK_SIZE) {
		nextChunks.push(encoded.slice(start, start + COOKIE_CHUNK_SIZE));
	}

	if (nextChunks.length > COOKIE_MAX_CHUNKS) {
		return [];
	}

	const existingCountRaw = cookies.get(SCOPE_COOKIE_COUNT);
	const existingCount = existingCountRaw ? Number.parseInt(existingCountRaw, 10) : 0;
	const previousChunkCount = Number.isFinite(existingCount) && existingCount > 0 ? existingCount : 0;
	const setCookieHeaders: string[] = [];

	setCookieHeaders.push(cookies.serialize(SCOPE_COOKIE_COUNT, String(nextChunks.length), options));
	nextChunks.forEach((chunk, index) => {
		setCookieHeaders.push(
			cookies.serialize(`${SCOPE_COOKIE_CHUNK_PREFIX}${index}`, chunk, options)
		);
	});

	for (let index = nextChunks.length; index < previousChunkCount; index += 1) {
		setCookieHeaders.push(
			cookies.serialize(`${SCOPE_COOKIE_CHUNK_PREFIX}${index}`, "", {
				...options,
				maxAge: 0
			})
		);
	}

	return setCookieHeaders;
};


const PUBLIC_PATHS = ["/auth", "/auth/verify", "/auth/forgot-password", "/auth/reset-password"];

const isPublicPath = (pathname: string): boolean =>
	PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

let authAccountsSeeded = false;

export const handle: Handle = async ({ event, resolve }) => {
	if (!authAccountsSeeded) {
		await authService.seedSuperAdmin();
		await authService.seedDemoAccount();
		authAccountsSeeded = true;
	}

	const isSecureRequest = event.url.protocol === "https:";

	event.locals.requestId = randomUUID();

	const sessionToken = getSessionCookie(event.cookies);
	let hasAuthenticatedSession = false;
	if (sessionToken) {
		const user = authService.getUserBySessionToken(sessionToken);
		if (user) {
			const persistedSnapshot = readScopeSnapshotFromCookies(event.cookies, sessionToken);
			if (persistedSnapshot) {
				hydrateWorkspaceSnapshot(persistedSnapshot);
			}

			applyAccountWorkspaceScope(user, sessionToken);
			hasAuthenticatedSession = true;

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

	if (!hasAuthenticatedSession) {
		clearScopeSnapshotCookies(event.cookies, isSecureRequest);
	}

	if (!event.locals.user && !isPublicPath(event.url.pathname)) {
		if (event.url.pathname !== "/logout") {
			return new Response(null, {
				status: 303,
				headers: { location: "/auth" }
			});
		}
	}

	const status = await limiter.check(event);
	if (status.limited) {
		const response = new Response(
			`You are being rate limited. Please try after ${status.retryAfter} seconds.`,
			{
				status: 429,
				headers: { 'Retry-After': status.retryAfter.toString() }
			}
		);
		return response;
	}

	const response = await resolve(event);

	const hasScopeSnapshotCookie = Boolean(event.cookies.get(SCOPE_COOKIE_COUNT));
	const isStateChangingRequest =
		event.request.method !== "GET" && event.request.method !== "HEAD";

	if (
		hasAuthenticatedSession &&
		sessionToken &&
		(isStateChangingRequest || !hasScopeSnapshotCookie)
	) {
		const setCookieHeaders = buildScopeSnapshotSetCookieHeaders(
			event.cookies,
			sessionToken,
			captureWorkspaceSnapshot(),
			isSecureRequest
		);
		for (const header of setCookieHeaders) {
			response.headers.append("set-cookie", header);
		}
	}

	return response;
};
