import type { Actions, PageServerLoad } from "./$types";
import { message, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { forgotPasswordSchema } from "$lib/schemas/auth.schema";
import { authService } from "$lib/server/auth/service";

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(forgotPasswordSchema));
	return { form };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod4(forgotPasswordSchema));
		if (!form.valid) {
			return message(form, "Please enter a valid email address.", { status: 400 });
		}

		await authService.requestPasswordReset(form.data.email);
		form.data.email = "";

		return message(form, "If an account exists, a reset link has been sent.");
	}
};
