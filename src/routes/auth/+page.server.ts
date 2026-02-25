import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { fail, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { signInSchema, signUpSchema } from "$lib/schemas/auth.schema";
import {
	clearSessionCookie,
	consumeAuthNoticeCookie,
	getSessionCookie,
	setSessionCookie
} from "$lib/server/auth/cookies";
import { authService } from "$lib/server/auth/service";
import { checkRateLimit, withFormError } from "$lib/server/auth/rate-limit";

const SIGN_IN_FORM_ID = "sign-in-form";
const SIGN_UP_FORM_ID = "sign-up-form";

const loadForms = async () => {
	const loginForm = await superValidate(zod4(signInSchema), { id: SIGN_IN_FORM_ID });
	const signupForm = await superValidate(zod4(signUpSchema), { id: SIGN_UP_FORM_ID });
	return { loginForm, signupForm };
};

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionToken = getSessionCookie(cookies);
	if (sessionToken) {
		const sessionUser = authService.getUserBySessionToken(sessionToken);
		if (sessionUser) {
			redirect(303, "/");
		}
		authService.invalidateSessionByToken(sessionToken);
		clearSessionCookie(cookies);
	}

	const notice = consumeAuthNoticeCookie(cookies);
	const { loginForm, signupForm } = await loadForms();

	return { loginForm, signupForm, notice };
};

export const actions: Actions = {
	login: async ({ request, cookies, getClientAddress }) => {
		const loginForm = await superValidate(request, zod4(signInSchema), { id: SIGN_IN_FORM_ID });
		const signupForm = await superValidate(zod4(signUpSchema), { id: SIGN_UP_FORM_ID });

		if (!loginForm.valid) {
			return fail(400, { loginForm, signupForm });
		}

		const ip = getClientAddress();
		const rl = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
		if (!rl.allowed) {
			withFormError(loginForm, "Too many login attempts. Please try again later.");
			return fail(429, { loginForm, signupForm });
		}

		const result = await authService.authenticate(loginForm.data.email, loginForm.data.password);
		if (!result.ok) {
			withFormError(
				loginForm,
				result.reason === "email_unverified"
					? "Please verify your email before signing in."
					: "Invalid credentials."
			);
			return fail(400, { loginForm, signupForm });
		}

		const session = authService.createSession(result.user.id, loginForm.data.remember);
		setSessionCookie(cookies, session.token, session.expiresAt);

		redirect(303, "/");
	},

	signup: async ({ request, getClientAddress }) => {
		const signupForm = await superValidate(request, zod4(signUpSchema), { id: SIGN_UP_FORM_ID });
		const loginForm = await superValidate(zod4(signInSchema), { id: SIGN_IN_FORM_ID });

		if (!signupForm.valid) {
			return fail(400, { loginForm, signupForm });
		}

		const ip = getClientAddress();
		const rl = checkRateLimit(`signup:${ip}`, 5, 15 * 60 * 1000);
		if (!rl.allowed) {
			withFormError(signupForm, "Too many signup attempts. Please try again later.");
			return fail(429, { loginForm, signupForm });
		}

		const result = await authService.registerUser(
			signupForm.data.name,
			signupForm.data.email,
			signupForm.data.password
		);

		if (!result.ok) {
			signupForm.valid = false;
			signupForm.errors.email = ["Email is already registered. Sign in instead."];
			return fail(400, { loginForm, signupForm });
		}

		signupForm.data.password = "";
		signupForm.data.confirmPassword = "";
		signupForm.message = "Check your email to verify your account.";

		return { loginForm, signupForm };
	}
};
