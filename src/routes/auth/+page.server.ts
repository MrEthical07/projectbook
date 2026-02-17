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

const SIGN_IN_FORM_ID = "sign-in-form";
const SIGN_UP_FORM_ID = "sign-up-form";

const loadForms = async () => {
	const loginForm = await superValidate(zod4(signInSchema), { id: SIGN_IN_FORM_ID });
	const signupForm = await superValidate(zod4(signUpSchema), { id: SIGN_UP_FORM_ID });
	return { loginForm, signupForm };
};

const withFormError = <T extends { valid: boolean; errors: { _errors?: string[] } }>(
	form: T,
	error: string
) => {
	form.valid = false;
	form.errors._errors = [error];
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
	login: async ({ request, cookies }) => {
		const loginForm = await superValidate(request, zod4(signInSchema), { id: SIGN_IN_FORM_ID });
		const signupForm = await superValidate(zod4(signUpSchema), { id: SIGN_UP_FORM_ID });

		if (!loginForm.valid) {
			return fail(400, { loginForm, signupForm });
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

	signup: async ({ request }) => {
		const signupForm = await superValidate(request, zod4(signUpSchema), { id: SIGN_UP_FORM_ID });
		const loginForm = await superValidate(zod4(signInSchema), { id: SIGN_IN_FORM_ID });

		if (!signupForm.valid) {
			return fail(400, { loginForm, signupForm });
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
