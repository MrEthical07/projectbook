import type { Actions, PageServerLoad } from "./$types";
import { fail, message, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { resendVerificationSchema } from "$lib/schemas/auth.schema";
import {
	resendVerificationRequest,
	verifyEmailRequest
} from "$lib/server/api/auth";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import { checkRateLimit } from "$lib/server/auth/rate-limit";

const RESEND_FORM_ID = "resend-verification-form";

export const load: PageServerLoad = async (event) => {
	const { url } = event;
	const token = url.searchParams.get("token");
	let verificationState: "pending" | "success" | "failed" = "pending";
	let verifiedEmail: string | null = null;

	if (token) {
		try {
			const verification = await verifyEmailRequest(event, { token });
			verificationState = verification.status === "success" ? "success" : "failed";
			verifiedEmail = verification.email ?? null;
		} catch (err) {
			console.error("[auth:verify-email] token verification failed", err);
			verificationState = "failed";
		}
	}

	const resendEmail = url.searchParams.get("email") ?? verifiedEmail ?? "";

	const resendForm = await superValidate(
		{ email: resendEmail },
		zod4(resendVerificationSchema),
		{ id: RESEND_FORM_ID }
	);

	return {
		verificationState,
		verifiedEmail,
		resendForm
	};
};

export const actions: Actions = {
	resend: async (event) => {
		const { request, getClientAddress } = event;
		const form = await superValidate(request, zod4(resendVerificationSchema), {
			id: RESEND_FORM_ID
		});

		if (!form.valid) {
			return fail(400, { form });
		}

		const ip = getClientAddress();
		const rl = checkRateLimit(`resend:${ip}`, 3, 15 * 60 * 1000);
		if (!rl.allowed) {
			form.valid = false;
			form.errors.email = ["Too many requests. Please try again later."];
			return fail(429, { form });
		}

		try {
			await resendVerificationRequest(event, { email: form.data.email });
		} catch (err) {
			console.error("[auth:verify-email] resend failed", err);
			if (isApiRequestError(err)) {
				form.valid = false;
				if (err.statusCode === 404) {
					form.errors.email = ["No account found with this email."];
				} else if (err.statusCode === 409) {
					form.errors.email = ["Email is already verified. Sign in instead."];
				} else {
					form.errors.email = [err.userMessage];
				}
				return fail(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 400, {
					form
				});
			}
			form.valid = false;
			form.errors.email = ["Could not resend verification email right now."];
			return fail(500, { form });
		}

		return message(form, "Verification email sent. Please check your inbox.");
	}
};
