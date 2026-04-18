import type { RequestEvent } from "@sveltejs/kit";
import { z } from "zod";
import {
	clearPermissionContextCookie,
	clearApiAuthTokenCookies,
	getAccessTokenCookie,
	hasPermissionContextRevalidateCooldownCookie,
	getRefreshTokenCookie,
	setPermissionContextRevalidateCooldownCookie,
	setApiAuthTokenCookies
} from "$lib/server/auth/cookies";
import { buildApiUrl, resolveBackendApiBaseUrl } from "./config";
import { createApiRequestError, isApiRequestError } from "./error-mapping";

const SENSITIVE_HINTS = [
	"password",
	"token",
	"secret",
	"authorization",
	"cookie",
	"session",
	"apikey",
	"api_key"
];

const resolvedMethod = (options: ApiRequestOptions): string =>
	options.method ??
	(options.body === undefined && options.rawBody === undefined ? "GET" : "POST");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === "object" && !Array.isArray(value);

const keyLooksSensitive = (key: string): boolean => {
	const normalized = key.toLowerCase();
	return SENSITIVE_HINTS.some((hint) => normalized.includes(hint));
};

const redactForLog = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map((item) => redactForLog(item));
	}
	if (!isPlainObject(value)) {
		return value;
	}

	const output: Record<string, unknown> = {};
	for (const [key, fieldValue] of Object.entries(value)) {
		output[key] = keyLooksSensitive(key) ? "[REDACTED]" : redactForLog(fieldValue);
	}
	return output;
};

const headersForLog = (headers: Headers): Record<string, string> => {
	const output: Record<string, string> = {};
	for (const [key, value] of headers.entries()) {
		output[key] = keyLooksSensitive(key) ? "[REDACTED]" : value;
	}
	return output;
};

const bodyForLog = (options: ApiRequestOptions): unknown => {
	if (options.rawBody !== undefined) {
		const raw = options.rawBody.trim();
		if (raw.length === 0) {
			return "";
		}
		try {
			return redactForLog(JSON.parse(raw));
		} catch {
			return raw;
		}
	}
	return redactForLog(options.body);
};

const logApiRequest = (
	url: string,
	options: ApiRequestOptions,
	headers: Headers,
	origin: string
): void => {
	console.info("[api:request]", {
		origin,
		method: resolvedMethod(options),
		path: options.path,
		url,
		auth: options.auth !== false,
		headers: headersForLog(headers),
		body: bodyForLog(options)
	});
};

const logApiResponse = <TData>(
	url: string,
	options: ApiRequestOptions,
	response: Response,
	envelope: ApiEnvelope<TData> | null,
	durationMs: number
): void => {
	console.info("[api:response]", {
		method: resolvedMethod(options),
		path: options.path,
		url,
		status: response.status,
		ok: response.ok,
		response_time_ms: durationMs,
		request_id: envelope?.request_id,
		envelope: redactForLog(envelope)
	});
};

const logApiError = (
	url: string,
	options: ApiRequestOptions,
	context: string,
	err: unknown,
	extra?: Record<string, unknown>
): void => {
	console.error("[api:error]", {
		context,
		method: resolvedMethod(options),
		path: options.path,
		url,
		error: err instanceof Error ? err.message : String(err),
		stack: err instanceof Error ? err.stack : undefined,
		extra: redactForLog(extra)
	});
};

const apiIssueSchema = z
	.object({
		path: z.string().optional(),
		code: z.string().optional(),
		message: z.string().optional(),
		received: z.unknown().optional(),
		expected: z.unknown().optional()
	})
	.passthrough();

const apiErrorSchema = z
	.object({
		code: z.string().min(1),
		message: z.string().min(1),
		details: z.unknown().optional(),
		retryable: z.boolean().optional(),
		timestamp: z.string().optional(),
		issues: z.array(apiIssueSchema).optional()
	})
	.passthrough();

const apiEnvelopeSchema = z
	.object({
		success: z.boolean(),
		data: z.unknown().optional(),
		error: apiErrorSchema.optional(),
		meta: z.unknown().optional(),
		request_id: z.string().optional()
	})
	.strict();

type ParsedApiEnvelope = z.infer<typeof apiEnvelopeSchema>;
type ApiEnvelope<T> = Omit<ParsedApiEnvelope, "data"> & {
	data?: T;
};

const parseApiEnvelope = <TData>(
	payload: unknown,
	statusCode: number,
	options: ApiRequestOptions
): ApiEnvelope<TData> => {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		throw createApiRequestError({
			statusCode: 500,
			fallbackReason: "API response violated envelope contract.",
			details: {
				path: options.path,
				status_code: statusCode,
				reason: "envelope must be a JSON object"
			}
		});
	}

	const candidate = payload as Record<string, unknown>;
	if (Object.prototype.hasOwnProperty.call(candidate, "requestId")) {
		throw createApiRequestError({
			statusCode: 500,
			fallbackReason: "API response violated envelope contract.",
			details: {
				path: options.path,
				status_code: statusCode,
				reason: "legacy requestId field is not allowed"
			}
		});
	}

	const parsed = apiEnvelopeSchema.safeParse(payload);
	if (!parsed.success) {
		throw createApiRequestError({
			statusCode: 500,
			fallbackReason: "API response violated envelope contract.",
			details: {
				path: options.path,
				status_code: statusCode,
				issues: parsed.error.issues
			}
		});
	}

	const envelope = parsed.data;
	if (envelope.success && envelope.error !== undefined) {
		throw createApiRequestError({
			statusCode: 500,
			fallbackReason: "API response violated envelope contract.",
			details: {
				path: options.path,
				status_code: statusCode,
				reason: "success response cannot include error payload"
			}
		});
	}
	if (!envelope.success && envelope.error === undefined) {
		throw createApiRequestError({
			statusCode: 500,
			fallbackReason: "API response violated envelope contract.",
			details: {
				path: options.path,
				status_code: statusCode,
				reason: "failed response must include error payload"
			}
		});
	}
	if (!envelope.success && envelope.data !== undefined) {
		throw createApiRequestError({
			statusCode: 500,
			fallbackReason: "API response violated envelope contract.",
			details: {
				path: options.path,
				status_code: statusCode,
				reason: "failed response cannot include data payload"
			}
		});
	}
	if (statusCode < 400 && !envelope.success) {
		throw createApiRequestError({
			statusCode: 500,
			fallbackReason: "API response violated envelope contract.",
			details: {
				path: options.path,
				status_code: statusCode,
				reason: "success HTTP status cannot return success=false"
			}
		});
	}
	if (statusCode >= 400 && envelope.success) {
		throw createApiRequestError({
			statusCode: 500,
			fallbackReason: "API response violated envelope contract.",
			details: {
				path: options.path,
				status_code: statusCode,
				reason: "error HTTP status cannot return success=true"
			}
		});
	}

	return envelope as ApiEnvelope<TData>;
};

// Refresh only when already expired to minimize churn and rate-limit pressure.
const PROACTIVE_REFRESH_WINDOW_SECONDS = 0;
const REFRESH_PROMISE_LOCAL_KEY = "__projectbook_refresh_promise";

export type ApiAuthTokenSet = {
	accessToken: string;
	refreshToken: string;
	accessExpiresAt?: string | Date | null;
};

export type ApiRequestOptions<TBody = unknown> = {
	path: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: TBody;
	rawBody?: string;
	headers?: HeadersInit;
	auth?: boolean;
	retryOnUnauthorized?: boolean;
	allowCookieWrites?: boolean;
};

const parseJsonSafe = async <T>(response: Response): Promise<T | null> => {
	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.toLowerCase().includes("application/json")) {
		return null;
	}
	try {
		return (await response.json()) as T;
	} catch {
		return null;
	}
};

const buildRequestHeaders = (
	options: ApiRequestOptions,
	accessToken?: string | null
): Headers => {
	const headers = new Headers(options.headers ?? {});
	headers.set("Accept", "application/json");
	if ((options.body !== undefined || options.rawBody !== undefined) && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}
	if (options.auth !== false && accessToken) {
		headers.set("Authorization", `Bearer ${accessToken}`);
	}
	return headers;
};

const parseDateFromUnix = (value: unknown): Date | null => {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return null;
	}
	const parsed = new Date(value * 1000);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const decodeJwtExpiryUnix = (token: string): number | null => {
	const parts = token.split(".");
	if (parts.length < 2) {
		return null;
	}
	try {
		const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const padded = payloadBase64 + "=".repeat((4 - (payloadBase64.length % 4)) % 4);
		const decoded = globalThis.atob(padded);
		const payload = JSON.parse(decoded) as { exp?: unknown };
		return typeof payload.exp === "number" && Number.isFinite(payload.exp)
			? payload.exp
			: null;
	} catch {
		return null;
	}
};

const isAccessTokenNearExpiry = (token: string): boolean => {
	const expiryUnix = decodeJwtExpiryUnix(token);
	if (!expiryUnix) {
		return false;
	}
	const nowUnix = Math.floor(Date.now() / 1000);
	return expiryUnix - nowUnix <= PROACTIVE_REFRESH_WINDOW_SECONDS;
};

const shouldClearOnRefreshFailure = (statusCode: number): boolean =>
	statusCode === 401;

const envelopeErrorCode = <TData>(envelope: ApiEnvelope<TData> | null): string => {
	if (!envelope?.error || typeof envelope.error !== "object") {
		return "";
	}
	const code = (envelope.error as { code?: unknown }).code;
	return typeof code === "string" ? code.trim().toLowerCase() : "";
};

const shouldInvalidatePermissionContext = <TData>(
	statusCode: number,
	envelope: ApiEnvelope<TData> | null
): boolean => {
	if (statusCode !== 403) {
		return false;
	}
	const code = envelopeErrorCode(envelope);
	return code === "forbidden" || code === "permission_denied";
};

const readRefreshPromise = (event: RequestEvent): Promise<boolean> | null => {
	const candidate = event.locals[REFRESH_PROMISE_LOCAL_KEY];
	if (!candidate || typeof candidate !== "object") {
		return null;
	}
	if (typeof (candidate as Promise<boolean>).then !== "function") {
		return null;
	}
	return candidate as Promise<boolean>;
};

export const extractApiAuthTokens = (payload: unknown): ApiAuthTokenSet | null => {
	if (!payload || typeof payload !== "object") {
		return null;
	}

	const candidate = payload as Record<string, unknown>;
	const accessToken =
		typeof candidate.access_token === "string" ? candidate.access_token : null;
	const refreshToken =
		typeof candidate.refresh_token === "string" ? candidate.refresh_token : null;
	const accessExpiresAt = parseDateFromUnix(candidate.access_expires_unix);

	if (!accessToken || !refreshToken || !accessExpiresAt) {
		return null;
	}

	return {
		accessToken,
		refreshToken,
		accessExpiresAt
	};
};

const executeRequest = async <TData, TBody>(
	event: RequestEvent,
	options: ApiRequestOptions<TBody>,
	accessToken?: string | null
): Promise<{ response: Response; envelope: ApiEnvelope<TData> | null }> => {
	const baseUrl = resolveBackendApiBaseUrl(event.url.origin);
	const url = buildApiUrl(baseUrl, options.path);
	const method = resolvedMethod(options);
	if (method === "DELETE" && (options.body !== undefined || options.rawBody !== undefined)) {
		throw createApiRequestError({
			statusCode: 500,
			fallbackReason: "DELETE requests must not include a body.",
			details: {
				path: options.path,
				method
			}
		});
	}
	const headers = buildRequestHeaders(options, accessToken);
	logApiRequest(url, options, headers, event.url.origin);
	const startedAtUnixMs = Date.now();
	let response: Response;
	try {
		response = await event.fetch(url, {
			method,
			headers,
			body:
				options.rawBody !== undefined
					? options.rawBody
					: options.body === undefined
						? undefined
						: JSON.stringify(options.body)
		});
	} catch (err) {
		logApiError(url, options, "fetch", err, {
			statusCode: 503,
			cause: err instanceof Error ? err.message : String(err)
		});
		throw createApiRequestError({
			statusCode: 503,
			fallbackReason: "Unable to reach API service.",
			details: {
				path: options.path,
				method,
				cause: err instanceof Error ? err.message : String(err)
			}
		});
	}
	const rawEnvelope = await parseJsonSafe<unknown>(response);
	const envelope =
		rawEnvelope === null ? null : parseApiEnvelope<TData>(rawEnvelope, response.status, options);
	logApiResponse(url, options, response, envelope, Date.now() - startedAtUnixMs);
	return { response, envelope };
};

const refreshAccessToken = async (
	event: RequestEvent,
	options?: {
		allowCookieWrites?: boolean;
	}
): Promise<boolean> => {
	const pendingRefresh = readRefreshPromise(event);
	if (pendingRefresh) {
		return pendingRefresh;
	}
	const canWriteCookies = options?.allowCookieWrites !== false;

	const refreshPromise = (async (): Promise<boolean> => {
		const refreshToken = getRefreshTokenCookie(event.cookies);
		if (!refreshToken) {
			if (canWriteCookies) {
				clearApiAuthTokenCookies(event.cookies);
			}
			return false;
		}

		let response: Response;
		let envelope: ApiEnvelope<unknown> | null;
		try {
			const refreshResult = await executeRequest<unknown, { refresh_token: string }>(
				event,
				{
					path: "/auth/refresh",
					method: "POST",
					auth: false,
					retryOnUnauthorized: false,
					body: {
						refresh_token: refreshToken
					}
				}
			);
			response = refreshResult.response;
			envelope = refreshResult.envelope;
		} catch (err) {
			// Refresh transport failures are retryable; preserve existing cookies.
			throw err;
		}

		if (!response.ok) {
			if (shouldClearOnRefreshFailure(response.status)) {
				if (canWriteCookies) {
					clearApiAuthTokenCookies(event.cookies);
				}
				return false;
			}
			throw createApiRequestError({
				statusCode: response.status,
				envelope,
				fallbackReason: "Unable to refresh session token."
			});
		}

		if (!envelope || envelope.success !== true || envelope.data === undefined) {
			throw createApiRequestError({
				statusCode: 503,
				fallbackReason: "Refresh response was incomplete."
			});
		}

		const nextTokens = extractApiAuthTokens(envelope.data);
		if (!nextTokens) {
			throw createApiRequestError({
				statusCode: 503,
				fallbackReason: "Refresh response did not include tokens."
			});
		}

		if (canWriteCookies) {
			setApiAuthTokenCookies(
				event.cookies,
				{
					accessToken: nextTokens.accessToken,
					refreshToken: nextTokens.refreshToken,
					accessExpiresAt: nextTokens.accessExpiresAt
				},
				false,
				{ clearPermissionContext: false }
			);
		}
		return true;
	})();

	event.locals[REFRESH_PROMISE_LOCAL_KEY] = refreshPromise;
	try {
		return await refreshPromise;
	} finally {
		delete event.locals[REFRESH_PROMISE_LOCAL_KEY];
	}
};

export const apiRequest = async <TData, TBody = unknown>(
	event: RequestEvent,
	options: ApiRequestOptions<TBody>
): Promise<TData> => {
	const baseUrl = resolveBackendApiBaseUrl(event.url.origin);
	const url = buildApiUrl(baseUrl, options.path);

	const requestOnce = async (canRetryWithRefresh: boolean): Promise<TData> => {
		const allowCookieWrites = options.allowCookieWrites !== false;
		let accessToken = options.auth === false ? null : getAccessTokenCookie(event.cookies);
		if (
			options.auth !== false &&
			canRetryWithRefresh &&
			allowCookieWrites &&
			accessToken &&
			isAccessTokenNearExpiry(accessToken)
		) {
			try {
				const refreshed = await refreshAccessToken(event, {
					allowCookieWrites
				});
				if (refreshed) {
					accessToken = getAccessTokenCookie(event.cookies);
				}
			} catch (err) {
				if (
					isApiRequestError(err) &&
					(err.statusCode === 429 || err.statusCode === 503 || err.statusCode === 504)
				) {
					// Keep using the current access token and let reactive refresh handle true expiry.
					logApiError(url, options, "proactive-refresh-skipped", err, {
						statusCode: err.statusCode
					});
				} else {
					throw err;
				}
			}
		}
		const { response, envelope } = await executeRequest<TData, TBody>(event, options, accessToken);

		if (
			response.status === 401 &&
			options.auth !== false &&
			options.retryOnUnauthorized !== false &&
			canRetryWithRefresh &&
			allowCookieWrites
		) {
			const refreshed = await refreshAccessToken(event, {
				allowCookieWrites
			});
			if (refreshed) {
				return requestOnce(false);
			}
		}

		if (!response.ok) {
			if (
				options.auth !== false &&
				allowCookieWrites &&
				shouldInvalidatePermissionContext(response.status, envelope) &&
				!hasPermissionContextRevalidateCooldownCookie(event.cookies)
			) {
				clearPermissionContextCookie(event.cookies);
				setPermissionContextRevalidateCooldownCookie(event.cookies);
			}
			const apiError = createApiRequestError({
				statusCode: response.status,
				envelope,
				fallbackReason: response.statusText
			});
			logApiError(url, options, "response-not-ok", apiError, {
				statusCode: response.status,
				envelope
			});
			throw apiError;
		}

		if (envelope?.success === false) {
			const apiError = createApiRequestError({
				statusCode: response.status,
				envelope,
				fallbackReason: "Request failed."
			});
			logApiError(url, options, "envelope-failed", apiError, {
				statusCode: response.status,
				envelope
			});
			throw apiError;
		}

		if (response.status === 204) {
			return undefined as TData;
		}

		if (!envelope || envelope.data === undefined) {
			const apiError = createApiRequestError({
				statusCode: 500,
				envelope,
				fallbackReason: "Response payload is missing data."
			});
			logApiError(url, options, "missing-data", apiError, {
				statusCode: 500,
				envelope
			});
			throw apiError;
		}

		return envelope.data;
	};

	return requestOnce(options.allowCookieWrites !== false);
};
