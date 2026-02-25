import type { Actions, PageServerLoad } from "./$types";
import { message, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { forgotPasswordSchema } from "$lib/schemas/auth.schema";
import { authService } from "$lib/server/auth/service";
import { checkRateLimit } from "$lib/server/auth/rate-limit";

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(forgotPasswordSchema));
	return { form };
};

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const form = await superValidate(request, zod4(forgotPasswordSchema));
		if (!form.valid) {
			return message(form, "Please enter a valid email address.", { status: 400 });
		}

		const ip = getClientAddress();
		const rl = checkRateLimit(`forgot:${ip}`, 3, 15 * 60 * 1000);
		if (!rl.allowed) {
			return message(form, "Too many requests. Please try again later.", { status: 429 });
		}

		await authService.requestPasswordReset(form.data.email);
		form.data.email = "";

		return message(form, "If an account exists, a reset link has been sent.");
	}
};
