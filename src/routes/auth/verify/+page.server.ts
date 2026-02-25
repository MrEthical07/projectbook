import type { Actions, PageServerLoad } from "./$types";
import { fail, message, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { resendVerificationSchema } from "$lib/schemas/auth.schema";
import { authService } from "$lib/server/auth/service";
import { checkRateLimit } from "$lib/server/auth/rate-limit";

const RESEND_FORM_ID = "resend-verification-form";

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get("token");
	const verification = await authService.verifyEmailToken(token);

	const verificationState =
		verification.status === "missing" ? "pending" : verification.status;

	const resendEmail = url.searchParams.get("email") ?? (verification.status === "success" ? verification.email : "");

	const resendForm = await superValidate(
		{ email: resendEmail },
		zod4(resendVerificationSchema),
		{ id: RESEND_FORM_ID }
	);

	return {
		verificationState,
		verifiedEmail: verification.status === "success" ? verification.email : null,
		resendForm
	};
};

export const actions: Actions = {
	resend: async ({ request, getClientAddress }) => {
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

		const result = await authService.resendVerificationEmail(form.data.email);
		if (result.status === "not_found") {
			form.valid = false;
			form.errors.email = ["No account found with this email."];
			return fail(400, { form });
		}

		if (result.status === "already_verified") {
			form.valid = false;
			form.errors.email = ["Email is already verified. Sign in instead."];
			return fail(400, { form });
		}

		return message(form, "Verification email sent. Please check your inbox.");
	}
};
