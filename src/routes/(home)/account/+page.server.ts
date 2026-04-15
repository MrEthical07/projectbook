import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import {
	changePasswordConfirmSchema,
	changePasswordRequestOtpSchema
} from "$lib/schemas/auth.schema";
import {
	confirmChangePassword,
	requestChangePasswordOtp
} from "$lib/server/api/auth";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import {
	clearApiAuthTokenCookies,
	setAuthNoticeCookie
} from "$lib/server/auth/cookies";
import { checkRateLimit } from "$lib/server/auth/rate-limit";

const REQUEST_FORM_ID = "account-change-password-request-form";
const CONFIRM_FORM_ID = "account-change-password-confirm-form";

const loadForms = async () => {
	const requestForm = await superValidate(zod4(changePasswordRequestOtpSchema), {
		id: REQUEST_FORM_ID
	});
	const confirmForm = await superValidate(
		{
			challengeId: "",
			code: "",
			currentPassword: "",
			password: "",
			confirmPassword: ""
		},
		zod4(changePasswordConfirmSchema),
		{ id: CONFIRM_FORM_ID }
	);

	return { requestForm, confirmForm };
};

export const load: PageServerLoad = async () => {
	return loadForms();
};

export const actions: Actions = {
	requestOtp: async (event) => {
		const { request, getClientAddress } = event;
		const requestForm = await superValidate(request, zod4(changePasswordRequestOtpSchema), {
			id: REQUEST_FORM_ID
		});
		const { confirmForm } = await loadForms();

		if (!requestForm.valid) {
			return fail(400, { requestForm, confirmForm });
		}

		const ip = getClientAddress();
		const rl = checkRateLimit(`change-password-request:${ip}`, 5, 15 * 60 * 1000);
		if (!rl.allowed) {
			requestForm.valid = false;
			requestForm.errors._errors = ["Too many requests. Please try again later."];
			return fail(429, { requestForm, confirmForm });
		}

		try {
			const otp = await requestChangePasswordOtp(event, {
				currentPassword: requestForm.data.currentPassword
			});
			if (typeof otp.challengeId === "string" && otp.challengeId.trim().length > 0) {
				confirmForm.data.challengeId = otp.challengeId;
				confirmForm.data.currentPassword = requestForm.data.currentPassword;
			}
			requestForm.message = "Verification code sent. Check your email.";
			return { requestForm, confirmForm };
		} catch (err) {
			console.error("[account:change-password] request otp failed", err);
			if (isApiRequestError(err)) {
				requestForm.valid = false;
				requestForm.errors._errors = [err.userMessage];
				return fail(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 400, {
					requestForm,
					confirmForm
				});
			}
			requestForm.valid = false;
			requestForm.errors._errors = ["Could not send verification code right now."];
			return fail(500, { requestForm, confirmForm });
		}
	},

	confirm: async (event) => {
		const { request, getClientAddress, cookies } = event;
		const confirmForm = await superValidate(request, zod4(changePasswordConfirmSchema), {
			id: CONFIRM_FORM_ID
		});
		const requestForm = await superValidate(zod4(changePasswordRequestOtpSchema), {
			id: REQUEST_FORM_ID
		});

		if (!confirmForm.valid) {
			return fail(400, { requestForm, confirmForm });
		}

		const ip = getClientAddress();
		const rl = checkRateLimit(`change-password-confirm:${ip}`, 10, 15 * 60 * 1000);
		if (!rl.allowed) {
			confirmForm.valid = false;
			confirmForm.errors._errors = ["Too many attempts. Please try again later."];
			return fail(429, { requestForm, confirmForm });
		}

		try {
			await confirmChangePassword(event, {
				challengeId: confirmForm.data.challengeId,
				code: confirmForm.data.code,
				currentPassword: confirmForm.data.currentPassword,
				password: confirmForm.data.password,
				confirmPassword: confirmForm.data.confirmPassword
			});
		} catch (err) {
			console.error("[account:change-password] confirm failed", err);
			if (isApiRequestError(err)) {
				confirmForm.valid = false;
				if (err.statusCode === 400) {
					confirmForm.errors._errors = ["Invalid or expired verification code."];
				} else if (err.statusCode === 401) {
					confirmForm.errors._errors = ["Current password is incorrect."];
				} else if (err.statusCode === 429) {
					confirmForm.errors._errors = ["Too many attempts. Request a new code."];
				} else {
					confirmForm.errors._errors = [err.userMessage];
				}
				return fail(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 400, {
					requestForm,
					confirmForm
				});
			}
			confirmForm.valid = false;
			confirmForm.errors._errors = ["Could not change password right now."];
			return fail(500, { requestForm, confirmForm });
		}

		clearApiAuthTokenCookies(cookies);
		setAuthNoticeCookie(cookies, "Password changed. Sign in again with your new password.");
		redirect(303, "/auth");
	}
};
