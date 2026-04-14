import type { RequestEvent } from "@sveltejs/kit";
import { setApiAuthTokenCookies } from "$lib/server/auth/cookies";
import { apiRequest, extractApiAuthTokens } from "./client";
import { createApiRequestError } from "./error-mapping";

type SignupPayload = {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
};

type LoginPayload = {
	email: string;
	password: string;
	remember?: boolean;
};

type VerifyEmailPayload = {
	token: string;
};

type ResendVerificationPayload = {
	email: string;
};

type ForgotPasswordPayload = {
	email: string;
};

type ResetPasswordPayload = {
	token: string;
	password: string;
	confirmPassword: string;
};

export const signupRequest = async (event: RequestEvent, payload: SignupPayload) => {
	return apiRequest<{ user: { id: string; name: string; email: string; isEmailVerified: boolean } }>(
		event,
		{
			path: "/auth/signup",
			method: "POST",
			auth: false,
			retryOnUnauthorized: false,
			body: payload
		}
	);
};

export const loginRequest = async (event: RequestEvent, payload: LoginPayload): Promise<void> => {
	const data = await apiRequest<unknown, LoginPayload>(event, {
		path: "/auth/login",
		method: "POST",
		auth: false,
		retryOnUnauthorized: false,
		body: payload
	});

	const tokens = extractApiAuthTokens(data);
	if (!tokens) {
		throw createApiRequestError({
			statusCode: 500,
			fallbackReason: "Login response did not include tokens."
		});
	}

	setApiAuthTokenCookies(
		event.cookies,
		{
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			accessExpiresAt: tokens.accessExpiresAt
		},
		payload.remember === true
	);
};

export const verifyEmailRequest = async (event: RequestEvent, payload: VerifyEmailPayload) => {
	return apiRequest<{ status?: string; email?: string }>(event, {
		path: "/auth/verify-email",
		method: "POST",
		auth: false,
		retryOnUnauthorized: false,
		body: payload
	});
};

export const resendVerificationRequest = async (
	event: RequestEvent,
	payload: ResendVerificationPayload
) => {
	return apiRequest<{ status?: string }>(event, {
		path: "/auth/resend-verification",
		method: "POST",
		auth: false,
		retryOnUnauthorized: false,
		body: payload
	});
};

export const forgotPasswordRequest = async (
	event: RequestEvent,
	payload: ForgotPasswordPayload
) => {
	return apiRequest<{ message?: string }>(event, {
		path: "/auth/forgot-password",
		method: "POST",
		auth: false,
		retryOnUnauthorized: false,
		body: payload
	});
};

export const resetPasswordRequest = async (
	event: RequestEvent,
	payload: ResetPasswordPayload
) => {
	return apiRequest<{ message?: string }>(event, {
		path: "/auth/reset-password",
		method: "POST",
		auth: false,
		retryOnUnauthorized: false,
		body: payload
	});
};

export const logoutRequest = async (event: RequestEvent): Promise<void> => {
	await apiRequest<null>(event, {
		path: "/auth/logout",
		method: "POST"
	});
};

type WhoAmIResponse = {
	user_id: string;
	project_id?: string;
	role?: string;
	permission_mask?: number;
	permissions?: string[];
};

export type SessionContextProjectPermission = {
	project_id: string;
	project_slug?: string;
	role?: string;
	permission_mask: number;
	is_custom?: boolean;
	updated_at_unix?: number;
};

export type SessionContextResponse = {
	user_id: string;
	backend_role?: string;
	project_permissions: SessionContextProjectPermission[];
	snapshot_hash?: string;
	expires_in_seconds?: number;
	context_token?: string;
	context_token_expires_utc?: string;
	context_token_expires_unix?: number;
	context_token_version?: number;
};

export const whoAmIRequest = async (event: RequestEvent): Promise<WhoAmIResponse> => {
	return apiRequest<WhoAmIResponse>(event, {
		path: "/system/whoami",
		method: "GET"
	});
};

export const sessionContextRequest = async (
	event: RequestEvent
): Promise<SessionContextResponse> => {
	return apiRequest<SessionContextResponse>(event, {
		path: "/system/session-context",
		method: "GET"
	});
};
