import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { fail, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import {
	forgotPasswordSchema,
	resetPasswordOtpSchema,
	resetPasswordSchema
} from "$lib/schemas/auth.schema";
import { forgotPasswordRequest, resetPasswordRequest } from "$lib/server/api/auth";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import {
	clearApiAuthTokenCookies,
	setAuthNoticeCookie
} from "$lib/server/auth/cookies";
import { checkRateLimit, withFormError } from "$lib/server/auth/rate-limit";

const RESET_OTP_FORM_ID = "reset-password-otp-form";
const RESET_TOKEN_FORM_ID = "reset-password-token-form";
const RESET_RESEND_FORM_ID = "reset-password-resend-form";

const challengeIDFromURL = (url: URL): string => url.searchParams.get("challengeId")?.trim() ?? "";
const emailFromURL = (url: URL): string => url.searchParams.get("email")?.trim() ?? "";
const tokenFromURL = (url: URL): string => url.searchParams.get("token")?.trim() ?? "";

const loadForms = async (url: URL) => {
	const otpForm = await superValidate(
		{ challengeId: challengeIDFromURL(url), code: "", password: "", confirmPassword: "" },
		zod4(resetPasswordOtpSchema),
		{ id: RESET_OTP_FORM_ID }
	);
	const tokenForm = await superValidate(zod4(resetPasswordSchema), { id: RESET_TOKEN_FORM_ID });
	const resendForm = await superValidate(
		{ email: emailFromURL(url) },
		zod4(forgotPasswordSchema),
		{ id: RESET_RESEND_FORM_ID }
	);

	return { otpForm, tokenForm, resendForm };
};

export const load: PageServerLoad = async ({ url }) => {
	const { otpForm, tokenForm, resendForm } = await loadForms(url);
	return {
		otpForm,
		tokenForm,
		resendForm,
		challengeMode: challengeIDFromURL(url).length > 0,
		tokenMode: tokenFromURL(url).length > 0
	};
};

export const actions: Actions = {
	resetOtp: async (event) => {
		const { request, cookies, url } = event;
		const otpForm = await superValidate(request, zod4(resetPasswordOtpSchema), {
			id: RESET_OTP_FORM_ID
		});
		const tokenForm = await superValidate(zod4(resetPasswordSchema), { id: RESET_TOKEN_FORM_ID });
		const resendForm = await superValidate(
			{ email: emailFromURL(url) },
			zod4(forgotPasswordSchema),
			{ id: RESET_RESEND_FORM_ID }
		);

		if (!otpForm.valid) {
			return fail(400, { otpForm, tokenForm, resendForm });
		}

		try {
			await resetPasswordRequest(event, {
				challengeId: otpForm.data.challengeId,
				code: otpForm.data.code,
				password: otpForm.data.password,
				confirmPassword: otpForm.data.confirmPassword
			});
		} catch (err) {
			console.error("[auth:reset-password] otp request failed", err);
			if (isApiRequestError(err)) {
				otpForm.valid = false;
				if (err.statusCode === 400) {
					otpForm.errors._errors = ["Invalid or expired reset code."];
				} else if (err.statusCode === 429) {
					otpForm.errors._errors = ["Too many attempts. Request a new code."];
				} else {
					otpForm.errors._errors = [err.userMessage];
				}
				return fail(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 400, {
					otpForm,
					tokenForm,
					resendForm
				});
			}
			otpForm.valid = false;
			otpForm.errors._errors = ["Could not reset password right now."];
			return fail(500, { otpForm, tokenForm, resendForm });
		}

		clearApiAuthTokenCookies(cookies);
		setAuthNoticeCookie(cookies, "Password reset successful. Sign in with your new password.");
		redirect(303, "/auth");
	},

	resetToken: async (event) => {
		const { request, url, cookies } = event;
		const otpForm = await superValidate(
			{ challengeId: challengeIDFromURL(url), code: "", password: "", confirmPassword: "" },
			zod4(resetPasswordOtpSchema),
			{ id: RESET_OTP_FORM_ID }
		);
		const tokenForm = await superValidate(request, zod4(resetPasswordSchema), { id: RESET_TOKEN_FORM_ID });
		const resendForm = await superValidate(
			{ email: emailFromURL(url) },
			zod4(forgotPasswordSchema),
			{ id: RESET_RESEND_FORM_ID }
		);

		if (!tokenForm.valid) {
			return fail(400, { otpForm, tokenForm, resendForm });
		}

		const token = tokenFromURL(url);
		if (!token) {
			withFormError(tokenForm, "Invalid or expired reset link.");
			return fail(400, { otpForm, tokenForm, resendForm });
		}

		try {
			await resetPasswordRequest(event, {
				token,
				password: tokenForm.data.password,
				confirmPassword: tokenForm.data.confirmPassword
			});
		} catch (err) {
			console.error("[auth:reset-password] request failed", err);
			if (isApiRequestError(err)) {
				withFormError(tokenForm, err.statusCode === 400 ? "Invalid or expired reset link." : err.userMessage);
				return fail(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 400, {
					otpForm,
					tokenForm,
					resendForm
				});
			}
			withFormError(tokenForm, "Could not reset password right now.");
			return fail(500, { otpForm, tokenForm, resendForm });
		}

		clearApiAuthTokenCookies(cookies);
		setAuthNoticeCookie(cookies, "Password reset successful. Sign in with your new password.");
		redirect(303, "/auth");
	},

	resend: async (event) => {
		const { request, url, getClientAddress } = event;
		const otpForm = await superValidate(
			{ challengeId: challengeIDFromURL(url), code: "", password: "", confirmPassword: "" },
			zod4(resetPasswordOtpSchema),
			{ id: RESET_OTP_FORM_ID }
		);
		const tokenForm = await superValidate(zod4(resetPasswordSchema), { id: RESET_TOKEN_FORM_ID });
		const resendForm = await superValidate(request, zod4(forgotPasswordSchema), {
			id: RESET_RESEND_FORM_ID
		});

		if (!resendForm.valid) {
			return fail(400, { otpForm, tokenForm, resendForm });
		}

		const ip = getClientAddress();
		const rl = checkRateLimit(`reset-resend:${ip}`, 3, 15 * 60 * 1000);
		if (!rl.allowed) {
			resendForm.valid = false;
			resendForm.errors.email = ["Too many requests. Please try again later."];
			return fail(429, { otpForm, tokenForm, resendForm });
		}

		try {
			const reset = await forgotPasswordRequest(event, { email: resendForm.data.email });
			if (typeof reset.challengeId === "string" && reset.challengeId.trim().length > 0) {
				otpForm.data.challengeId = reset.challengeId;
				otpForm.data.code = "";
			}
		} catch (err) {
			console.error("[auth:reset-password] resend failed", err);
			if (isApiRequestError(err)) {
				resendForm.valid = false;
				resendForm.errors.email = [err.userMessage];
				return fail(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 400, {
					otpForm,
					tokenForm,
					resendForm
				});
			}
			resendForm.valid = false;
			resendForm.errors.email = ["Could not resend reset code right now."];
			return fail(500, { otpForm, tokenForm, resendForm });
		}

		resendForm.message = "Reset code sent. Check your inbox.";
		return { otpForm, tokenForm, resendForm };
	}
};
