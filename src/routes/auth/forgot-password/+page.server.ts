import type { Actions, PageServerLoad } from "./$types";
import { message, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { forgotPasswordSchema } from "$lib/schemas/auth.schema";
import { forgotPasswordRequest } from "$lib/server/api/auth";
import { isApiRequestError } from "$lib/server/api/error-mapping";
import { checkRateLimit } from "$lib/server/auth/rate-limit";

const toMessageStatus = (statusCode: number): 400 | 401 | 403 | 404 | 409 | 429 | 500 => {
	if (statusCode === 400) return 400;
	if (statusCode === 401) return 401;
	if (statusCode === 403) return 403;
	if (statusCode === 404) return 404;
	if (statusCode === 409) return 409;
	if (statusCode === 429) return 429;
	return 500;
};

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(forgotPasswordSchema));
	return { form };
};

export const actions: Actions = {
	default: async (event) => {
		const { request, getClientAddress } = event;
		const form = await superValidate(request, zod4(forgotPasswordSchema));
		if (!form.valid) {
			return message(form, "Please enter a valid email address.", { status: 400 });
		}

		const ip = getClientAddress();
		const rl = checkRateLimit(`forgot:${ip}`, 3, 15 * 60 * 1000);
		if (!rl.allowed) {
			return message(form, "Too many requests. Please try again later.", { status: 429 });
		}

		try {
			await forgotPasswordRequest(event, { email: form.data.email });
		} catch (err) {
			console.error("[auth:forgot-password] request failed", err);
			if (isApiRequestError(err)) {
				return message(form, err.userMessage, {
					status: toMessageStatus(err.statusCode)
				});
			}
			return message(form, "Unable to send reset link right now.", { status: 500 });
		}
		form.data.email = "";

		return message(form, "If an account exists, a reset link has been sent.");
	}
};
