import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { fail, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { resendVerificationSchema, verifyEmailSchema } from "$lib/schemas/auth.schema";
import {
	resendVerificationRequest,
	verifyEmailRequest
} from "$lib/server/api/auth";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import { setAuthNoticeCookie } from "$lib/server/auth/cookies";
import { checkRateLimit } from "$lib/server/auth/rate-limit";

const VERIFY_FORM_ID = "verify-email-form";
const RESEND_FORM_ID = "resend-verification-form";

const verificationIdFromURL = (url: URL): string =>
	url.searchParams.get("verificationId")?.trim() ?? "";

const emailFromURL = (url: URL): string =>
	url.searchParams.get("email")?.trim() ?? "";

export const load: PageServerLoad = async (event) => {
	const { url } = event;
	const verifyForm = await superValidate(
		{ verificationId: verificationIdFromURL(url), code: "" },
		zod4(verifyEmailSchema),
		{ id: VERIFY_FORM_ID }
	);
	const resendForm = await superValidate(
		{ email: emailFromURL(url) },
		zod4(resendVerificationSchema),
		{ id: RESEND_FORM_ID }
	);

	return {
		verifyForm,
		resendForm
	};
};

export const actions: Actions = {
	verify: async (event) => {
		const { request, cookies, url } = event;
		const verifyForm = await superValidate(request, zod4(verifyEmailSchema), {
			id: VERIFY_FORM_ID
		});
		const resendForm = await superValidate(
			{ email: emailFromURL(url) },
			zod4(resendVerificationSchema),
			{ id: RESEND_FORM_ID }
		);

		if (!verifyForm.valid) {
			return fail(400, { verifyForm, resendForm });
		}

		try {
			await verifyEmailRequest(event, {
				verificationId: verifyForm.data.verificationId,
				code: verifyForm.data.code
			});
		} catch (err) {
			console.error("[auth:verify-email] verify failed", err);
			if (isApiRequestError(err)) {
				verifyForm.valid = false;
				if (err.statusCode === 400) {
					verifyForm.errors._errors = ["Invalid or expired verification code."];
				} else if (err.statusCode === 429) {
					verifyForm.errors._errors = ["Too many attempts. Please request a new code."];
				} else {
					verifyForm.errors._errors = [err.userMessage];
				}
				return fail(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 400, {
					verifyForm,
					resendForm
				});
			}

			verifyForm.valid = false;
			verifyForm.errors._errors = ["Could not verify your account right now."];
			return fail(500, { verifyForm, resendForm });
		}

		setAuthNoticeCookie(cookies, "Email verified successfully. Sign in to continue.");
		redirect(303, "/auth");
	},

	resend: async (event) => {
		const { request, getClientAddress, url } = event;
		const verifyForm = await superValidate(
			{ verificationId: verificationIdFromURL(url), code: "" },
			zod4(verifyEmailSchema),
			{ id: VERIFY_FORM_ID }
		);
		const form = await superValidate(request, zod4(resendVerificationSchema), {
			id: RESEND_FORM_ID
		});

		if (!form.valid) {
			return fail(400, { verifyForm, resendForm: form });
		}

		const ip = getClientAddress();
		const rl = checkRateLimit(`resend:${ip}`, 3, 15 * 60 * 1000);
		if (!rl.allowed) {
			form.valid = false;
			form.errors.email = ["Too many requests. Please try again later."];
			return fail(429, { verifyForm, resendForm: form });
		}

		try {
			const resend = await resendVerificationRequest(event, { email: form.data.email });
			if (typeof resend.verificationId === "string" && resend.verificationId.trim().length > 0) {
				verifyForm.data.verificationId = resend.verificationId;
				verifyForm.data.code = "";
			}
		} catch (err) {
			console.error("[auth:verify-email] resend failed", err);
			if (isApiRequestError(err)) {
				form.valid = false;
				if (err.statusCode === 429) {
					form.errors.email = ["Too many requests. Please try again later."];
				} else {
					form.errors.email = [err.userMessage];
				}
				return fail(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 400, {
					verifyForm,
					resendForm: form
				});
			}
			form.valid = false;
			form.errors.email = ["Could not resend verification email right now."];
			return fail(500, { verifyForm, resendForm: form });
		}

		form.message = "Verification code sent. Check your inbox.";

		return {
			verifyForm,
			resendForm: form
		};
	}
};
