import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { fail, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { signInSchema, signUpSchema } from "$lib/schemas/auth.schema";
import {
	clearApiAuthTokenCookies,
	clearPermissionContextCookie,
	consumeAuthNoticeCookie,
	getAccessTokenCookie,
	setAuthNoticeCookie
} from "$lib/server/auth/cookies";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import {
	loginRequest,
	sessionContextRequest,
	signupRequest
} from "$lib/server/api/auth";
import { checkRateLimit, withFormError } from "$lib/server/auth/rate-limit";

const SIGN_IN_FORM_ID = "sign-in-form";
const SIGN_UP_FORM_ID = "sign-up-form";

const loadForms = async () => {
	const loginForm = await superValidate(zod4(signInSchema), { id: SIGN_IN_FORM_ID });
	const signupForm = await superValidate(zod4(signUpSchema), { id: SIGN_UP_FORM_ID });
	return { loginForm, signupForm };
};

const apiErrorReason = (details: unknown): string => {
	if (!details || typeof details !== "object") {
		return "";
	}

	const value = (details as { reason?: unknown }).reason;
	if (typeof value !== "string") {
		return "";
	}

	return value.trim().toLowerCase();
};

export const load: PageServerLoad = async (event) => {
	const accessToken = getAccessTokenCookie(event.cookies);
	if (accessToken) {
		try {
			await sessionContextRequest(event);
			clearPermissionContextCookie(event.cookies);
			redirect(303, "/");
		} catch (err) {
			console.error("[auth:load] session context failed", err);
			clearApiAuthTokenCookies(event.cookies);
		}
	}

	const notice = consumeAuthNoticeCookie(event.cookies);
	const { loginForm, signupForm } = await loadForms();

	return { loginForm, signupForm, notice };
};

export const actions: Actions = {
	login: async (event) => {
		const { request, getClientAddress } = event;
		const loginForm = await superValidate(request, zod4(signInSchema), { id: SIGN_IN_FORM_ID });
		const signupForm = await superValidate(zod4(signUpSchema), { id: SIGN_UP_FORM_ID });

		if (!loginForm.valid) {
			return fail(400, { loginForm, signupForm });
		}

		const ip = getClientAddress();
		const rl = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
		if (!rl.allowed) {
			withFormError(loginForm, "Too many login attempts. Please try again later.");
			return fail(429, { loginForm, signupForm });
		}

		try {
			await loginRequest(event, {
				email: loginForm.data.email,
				password: loginForm.data.password,
				remember: loginForm.data.remember
			});
		} catch (err) {
			console.error("[auth:login] request failed", err);
			if (isApiRequestError(err)) {
				const reason = err.reason.toLowerCase();
				if (apiErrorReason(err.details) === "email_unverified") {
					setAuthNoticeCookie(
						event.cookies,
						"Please verify your email with the OTP to continue."
					);
					redirect(303, `/auth/verify?email=${encodeURIComponent(loginForm.data.email)}`);
				}
				withFormError(
					loginForm,
					err.statusCode === 401 || reason.includes("credential")
						? "Invalid credentials."
						: reason.includes("verify")
							? "Please verify your email before signing in."
							: err.userMessage
				);
				return fail(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 400, {
					loginForm,
					signupForm
				});
			}
			withFormError(loginForm, "Sign-in failed. Please try again.");
			return fail(500, { loginForm, signupForm });
		}

		redirect(303, "/");
	},

	signup: async (event) => {
		const { request, getClientAddress } = event;
		const signupForm = await superValidate(request, zod4(signUpSchema), { id: SIGN_UP_FORM_ID });
		const loginForm = await superValidate(zod4(signInSchema), { id: SIGN_IN_FORM_ID });

		if (!signupForm.valid) {
			return fail(400, { loginForm, signupForm });
		}

		const ip = getClientAddress();
		const rl = checkRateLimit(`signup:${ip}`, 5, 15 * 60 * 1000);
		if (!rl.allowed) {
			withFormError(signupForm, "Too many signup attempts. Please try again later.");
			return fail(429, { loginForm, signupForm });
		}

		try {
			await signupRequest(event, {
				name: signupForm.data.name,
				email: signupForm.data.email,
				password: signupForm.data.password,
				confirmPassword: signupForm.data.confirmPassword
			});
		} catch (err) {
			console.error("[auth:signup] request failed", err);
			if (isApiRequestError(err)) {
				signupForm.valid = false;
				signupForm.errors.email = [
					err.statusCode === 409
						? "Email is already registered. Sign in instead."
						: err.userMessage
				];
				return fail(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 400, {
					loginForm,
					signupForm
				});
			}
			signupForm.valid = false;
			signupForm.errors._errors = ["Signup failed. Please try again."];
			return fail(500, { loginForm, signupForm });
		}

		signupForm.data.password = "";
		signupForm.data.confirmPassword = "";
		signupForm.message = "Account created. Sign in, then verify your email with the OTP.";

		return { loginForm, signupForm };
	}
};
