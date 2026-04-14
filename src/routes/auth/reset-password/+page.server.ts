import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { fail, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { resetPasswordSchema } from "$lib/schemas/auth.schema";
import { resetPasswordRequest } from "$lib/server/api/auth";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import {
	clearApiAuthTokenCookies,
	setAuthNoticeCookie
} from "$lib/server/auth/cookies";
import { withFormError } from "$lib/server/auth/rate-limit";

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get("token");
	const form = await superValidate(zod4(resetPasswordSchema));
	return {
		form,
		tokenValid: typeof token === "string" && token.trim().length > 0
	};
};

export const actions: Actions = {
	reset: async (event) => {
		const { request, url, cookies } = event;
		const form = await superValidate(request, zod4(resetPasswordSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const token = url.searchParams.get("token");
		if (!token) {
			withFormError(form, "Invalid or expired reset link.");
			return fail(400, { form });
		}

		try {
			await resetPasswordRequest(event, {
				token,
				password: form.data.password,
				confirmPassword: form.data.confirmPassword
			});
		} catch (err) {
			console.error("[auth:reset-password] request failed", err);
			if (isApiRequestError(err)) {
				withFormError(form, err.statusCode === 400 ? "Invalid or expired reset link." : err.userMessage);
				return fail(err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 400, { form });
			}
			withFormError(form, "Could not reset password right now.");
			return fail(500, { form });
		}

		clearApiAuthTokenCookies(cookies);
		setAuthNoticeCookie(cookies, "Password reset successful. Sign in with your new password.");
		redirect(303, "/auth");
	}
};
