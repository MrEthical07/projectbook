import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { fail, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { resetPasswordSchema } from "$lib/schemas/auth.schema";
import { setAuthNoticeCookie } from "$lib/server/auth/cookies";
import { authService } from "$lib/server/auth/service";
import { checkRateLimit, withFormError } from "$lib/server/auth/rate-limit";

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get("token");
	const form = await superValidate(zod4(resetPasswordSchema));
	const tokenState = authService.getPasswordResetTokenState(token);
	return {
		form,
		tokenValid: tokenState.valid
	};
};

export const actions: Actions = {
	reset: async ({ request, url, cookies }) => {
		const form = await superValidate(request, zod4(resetPasswordSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const token = url.searchParams.get("token");
		if (!token) {
			withFormError(form, "Invalid or expired reset link.");
			return fail(400, { form });
		}

		const result = await authService.resetPassword(token, form.data.password);
		if (!result.ok) {
			withFormError(form, "Invalid or expired reset link.");
			return fail(400, { form });
		}

		setAuthNoticeCookie(cookies, "Password reset successful. Sign in with your new password.");
		redirect(303, "/auth");
	}
};
