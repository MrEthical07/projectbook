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
import type { SessionContextResponse } from "./auth";
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

const ANSI_BLUE = "\x1b[34m";
const ANSI_RESET = "\x1b[0m";

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

const logRefreshRotation = (
	message: string,
	details?: Record<string, unknown>
): void => {
	console.info(
		`${ANSI_BLUE}[auth:refresh] ${message}${ANSI_RESET}`,
		details ? redactForLog(details) : undefined
	);
};

const logAuthFlow = (details: {
	stage: "refresh_attempt" | "refresh_dedupe" | "ensure_authenticated";
	outcome: "success" | "invalid" | "retryable";
	retry: boolean;
	status_code?: number;
	reason?: string;
	source?: "local" | "shared" | "origin";
}): void => {
	console.info("[auth:flow]", redactForLog(details));
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

const ACCESS_TOKEN_REFRESH_BUFFER_SECONDS = 45;
const REFRESH_PROMISE_LOCAL_KEY = "__projectbook_refresh_promise";

export type ApiAuthTokenSet = {
	accessToken: string;
	refreshToken: string;
	accessExpiresAt?: string | Date | null;
};

export type RefreshOutcome =
	| {
			type: "success";
			tokens: ApiAuthTokenSet;
			session?: SessionContextResponse;
	  }
	| {
			type: "invalid";
	  }
	| {
			type: "retryable";
	  };

export type EnsureAuthResult = {
	authenticated: boolean;
	accessToken?: string;
	session?: SessionContextResponse;
	transient?: boolean;
};

const refreshPromiseByToken = new Map<string, Promise<RefreshOutcome>>();

export type ApiRequestOptions<TBody = unknown> = {
	path: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: TBody;
	rawBody?: string;
	headers?: HeadersInit;
	auth?: boolean;
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

const isAccessTokenValidForRequest = (token: string): boolean => {
	const expiryUnix = decodeJwtExpiryUnix(token);
	if (!expiryUnix) {
		return false;
	}
	const nowUnix = Math.floor(Date.now() / 1000);
	return expiryUnix - nowUnix > ACCESS_TOKEN_REFRESH_BUFFER_SECONDS;
};

const envelopeErrorCode = <TData>(envelope: ApiEnvelope<TData> | null): string => {
	if (!envelope?.error || typeof envelope.error !== "object") {
		return "";
	}
	const code = (envelope.error as { code?: unknown }).code;
	return typeof code === "string" ? code.trim().toLowerCase() : "";
};

const envelopeErrorMessage = <TData>(envelope: ApiEnvelope<TData> | null): string => {
	if (!envelope?.error || typeof envelope.error !== "object") {
		return "";
	}
	const message = (envelope.error as { message?: unknown }).message;
	return typeof message === "string" ? message.trim().toLowerCase() : "";
};

const shouldClearOnRefreshFailure = <TData>(
	statusCode: number,
	envelope: ApiEnvelope<TData> | null
): boolean => {
	if (statusCode === 401) {
		return true;
	}
	if (statusCode !== 403) {
		return false;
	}
	if (envelopeErrorCode(envelope) !== "forbidden") {
		return false;
	}
	const message = envelopeErrorMessage(envelope);
	return message.includes("authentication state rejected");
};

const isRetryableRefreshStatus = (statusCode: number): boolean =>
	statusCode === 408 ||
	statusCode === 429 ||
	statusCode === 500 ||
	statusCode === 502 ||
	statusCode === 503 ||
	statusCode === 504;

const isSessionContextResponse = (value: unknown): value is SessionContextResponse => {
	if (!isPlainObject(value)) {
		return false;
	}
	if (typeof value.user_id !== "string" || value.user_id.trim().length === 0) {
		return false;
	}
	return Array.isArray(value.project_permissions);
};

const extractRefreshSessionContext = (payload: unknown): SessionContextResponse | undefined => {
	if (!isPlainObject(payload)) {
		return undefined;
	}

	const directCandidate = payload.session_context ?? payload.sessionContext;
	if (isSessionContextResponse(directCandidate)) {
		return directCandidate;
	}

	const nestedCandidate = payload.context ?? payload.session;
	if (isSessionContextResponse(nestedCandidate)) {
		return nestedCandidate;
	}

	if (isSessionContextResponse(payload)) {
		return payload;
	}

	return undefined;
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

const readRefreshPromise = (event: RequestEvent): Promise<RefreshOutcome> | null => {
	const candidate = event.locals[REFRESH_PROMISE_LOCAL_KEY];
	if (!candidate || typeof candidate !== "object") {
		return null;
	}
	if (typeof (candidate as Promise<RefreshOutcome>).then !== "function") {
		return null;
	}
	return candidate as Promise<RefreshOutcome>;
};

const applyRefreshOutcome = (
	event: RequestEvent,
	outcome: RefreshOutcome,
	canWriteCookies: boolean,
	source: "local" | "shared" | "origin",
	previousRefreshToken?: string
): RefreshOutcome => {
	if (outcome.type === "invalid") {
		if (canWriteCookies) {
			clearApiAuthTokenCookies(event.cookies);
			logRefreshRotation("refresh token invalid; cleared access and refresh cookies", {
				source,
				new_access_cookie_created: false,
				new_refresh_cookie_created: false
			});
		}
		return outcome;
	}

	if (outcome.type === "success" && canWriteCookies) {
		setApiAuthTokenCookies(
			event.cookies,
			{
				accessToken: outcome.tokens.accessToken,
				refreshToken: outcome.tokens.refreshToken,
				accessExpiresAt: outcome.tokens.accessExpiresAt
			},
			false,
			{ clearPermissionContext: false }
		);
		logRefreshRotation("new access and refresh cookies created after refresh", {
			source,
			new_access_cookie_created: true,
			new_refresh_cookie_created: true,
			refresh_rotated:
				typeof previousRefreshToken === "string"
					? outcome.tokens.refreshToken !== previousRefreshToken
					: undefined,
			access_expires_at_utc:
				outcome.tokens.accessExpiresAt instanceof Date
					? outcome.tokens.accessExpiresAt.toISOString()
					: null
		});
	}

	return outcome;
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

const performRefreshAttempt = async (
	event: RequestEvent,
	refreshToken: string,
	retry: boolean
): Promise<RefreshOutcome> => {
	let response: Response;
	let envelope: ApiEnvelope<unknown> | null;

	try {
		const refreshResult = await executeRequest<unknown, { refresh_token: string }>(
			event,
			{
				path: "/auth/refresh",
				method: "POST",
				auth: false,
				body: {
					refresh_token: refreshToken
				}
			}
		);
		response = refreshResult.response;
		envelope = refreshResult.envelope;
	} catch (err) {
		if (isApiRequestError(err)) {
			logAuthFlow({
				stage: "refresh_attempt",
				outcome: "retryable",
				retry,
				status_code: err.statusCode,
				reason: err.reason
			});
			return { type: "retryable" };
		}

		logAuthFlow({
			stage: "refresh_attempt",
			outcome: "retryable",
			retry,
			reason: err instanceof Error ? err.message : String(err)
		});
		return { type: "retryable" };
	}

	if (!response.ok) {
		if (shouldClearOnRefreshFailure(response.status, envelope)) {
			logAuthFlow({
				stage: "refresh_attempt",
				outcome: "invalid",
				retry,
				status_code: response.status
			});
			return { type: "invalid" };
		}

		if (isRetryableRefreshStatus(response.status)) {
			logAuthFlow({
				stage: "refresh_attempt",
				outcome: "retryable",
				retry,
				status_code: response.status
			});
			return { type: "retryable" };
		}

		logAuthFlow({
			stage: "refresh_attempt",
			outcome: "retryable",
			retry,
			status_code: response.status,
			reason: "non-invalid refresh failure treated as transient"
		});
		return { type: "retryable" };
	}

	if (!envelope || envelope.success !== true || envelope.data === undefined) {
		logAuthFlow({
			stage: "refresh_attempt",
			outcome: "retryable",
			retry,
			status_code: response.status,
			reason: "refresh response was incomplete"
		});
		return { type: "retryable" };
	}

	const nextTokens = extractApiAuthTokens(envelope.data);
	if (!nextTokens) {
		logAuthFlow({
			stage: "refresh_attempt",
			outcome: "retryable",
			retry,
			status_code: response.status,
			reason: "refresh response missing tokens"
		});
		return { type: "retryable" };
	}

	logAuthFlow({
		stage: "refresh_attempt",
		outcome: "success",
		retry,
		status_code: response.status
	});

	return {
		type: "success",
		tokens: nextTokens,
		session: extractRefreshSessionContext(envelope.data)
	};
};

const refreshAccessToken = async (
	event: RequestEvent,
	options?: {
		allowCookieWrites?: boolean;
	}
): Promise<RefreshOutcome> => {
	const canWriteCookies = options?.allowCookieWrites !== false;
	const pendingRefresh = readRefreshPromise(event);
	if (pendingRefresh) {
		const outcome = await pendingRefresh;
		return applyRefreshOutcome(event, outcome, canWriteCookies, "local");
	}
	const refreshToken = getRefreshTokenCookie(event.cookies);
	if (!refreshToken) {
		return applyRefreshOutcome(event, { type: "invalid" }, canWriteCookies, "origin");
	}

	const sharedRefreshPromise = refreshPromiseByToken.get(refreshToken);
	if (sharedRefreshPromise) {
		logRefreshRotation("waiting for in-flight rotation", {
			dedupe_scope: "cross-request"
		});
		event.locals[REFRESH_PROMISE_LOCAL_KEY] = sharedRefreshPromise;
		try {
			const outcome = await sharedRefreshPromise;
			logAuthFlow({
				stage: "refresh_dedupe",
				outcome: outcome.type,
				retry: false,
				source: "shared"
			});
			return applyRefreshOutcome(event, outcome, canWriteCookies, "shared", refreshToken);
		} finally {
			delete event.locals[REFRESH_PROMISE_LOCAL_KEY];
		}
	}

	const refreshPromise = (async (): Promise<RefreshOutcome> => {
		const firstAttempt = await performRefreshAttempt(event, refreshToken, false);
		if (firstAttempt.type !== "retryable") {
			return firstAttempt;
		}

		return performRefreshAttempt(event, refreshToken, true);
	})();

	event.locals[REFRESH_PROMISE_LOCAL_KEY] = refreshPromise;
	refreshPromiseByToken.set(refreshToken, refreshPromise);
	try {
		const outcome = await refreshPromise;
		return applyRefreshOutcome(event, outcome, canWriteCookies, "origin", refreshToken);
	} finally {
		delete event.locals[REFRESH_PROMISE_LOCAL_KEY];
		if (refreshPromiseByToken.get(refreshToken) === refreshPromise) {
			refreshPromiseByToken.delete(refreshToken);
		}
	}
};

export const ensureAuthenticated = async (
	event: RequestEvent,
	options?: {
		allowCookieWrites?: boolean;
	}
): Promise<EnsureAuthResult> => {
	const canWriteCookies = options?.allowCookieWrites !== false;
	const accessToken = getAccessTokenCookie(event.cookies);
	if (accessToken && isAccessTokenValidForRequest(accessToken)) {
		return {
			authenticated: true,
			accessToken
		};
	}

	const refreshToken = getRefreshTokenCookie(event.cookies);
	if (!refreshToken) {
		if (canWriteCookies) {
			clearApiAuthTokenCookies(event.cookies);
		}
		logAuthFlow({
			stage: "ensure_authenticated",
			outcome: "invalid",
			retry: false,
			reason: "refresh token missing"
		});
		return {
			authenticated: false
		};
	}

	logRefreshRotation("access token missing/expired; refreshing before request", {
		preflight: true
	});

	const refreshOutcome = await refreshAccessToken(event, {
		allowCookieWrites: canWriteCookies
	});

	if (refreshOutcome.type === "success") {
		logAuthFlow({
			stage: "ensure_authenticated",
			outcome: "success",
			retry: false
		});
		return {
			authenticated: true,
			accessToken: refreshOutcome.tokens.accessToken,
			session: refreshOutcome.session
		};
	}

	if (refreshOutcome.type === "invalid") {
		logAuthFlow({
			stage: "ensure_authenticated",
			outcome: "invalid",
			retry: false
		});
		return {
			authenticated: false
		};
	}

	logAuthFlow({
		stage: "ensure_authenticated",
		outcome: "retryable",
		retry: true,
		reason: "refresh unavailable after one retry"
	});
	return {
		authenticated: false,
		transient: true
	};
};

const authFailureError = (transient: boolean) =>
	createApiRequestError({
		statusCode: transient ? 503 : 401,
		fallbackReason: transient
			? "authentication temporarily unavailable"
			: "authentication required"
	});

export const apiRequest = async <TData, TBody = unknown>(
	event: RequestEvent,
	options: ApiRequestOptions<TBody>
): Promise<TData> => {
	const baseUrl = resolveBackendApiBaseUrl(event.url.origin);
	const url = buildApiUrl(baseUrl, options.path);
	const allowCookieWrites = options.allowCookieWrites !== false;

	let accessToken: string | null = null;
	if (options.auth !== false) {
		const auth = await ensureAuthenticated(event, {
			allowCookieWrites
		});
		if (!auth.authenticated) {
			const apiError = authFailureError(auth.transient === true);
			logApiError(url, options, "preflight-auth-failed", apiError, {
				statusCode: auth.transient === true ? 503 : 401,
				transient: auth.transient === true
			});
			throw apiError;
		}

		if (!auth.accessToken) {
			const apiError = createApiRequestError({
				statusCode: 500,
				fallbackReason: "authentication state missing access token"
			});
			logApiError(url, options, "missing-access-after-preflight", apiError, {
				statusCode: 500
			});
			throw apiError;
		}

		accessToken = auth.accessToken;
	}

	const { response, envelope } = await executeRequest<TData, TBody>(event, options, accessToken);

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
