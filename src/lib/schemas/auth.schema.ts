import { z } from "zod";

export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/;

const emailSchema = z
	.string()
	.trim()
	.min(1, "Email is required.")
	.email("Enter a valid email address.");

export const passwordPolicyMessage =
	"Password must be at least 10 characters and include uppercase, lowercase, number, and special character.";

export const passwordSchema = z
	.string()
	.regex(PASSWORD_POLICY_REGEX, passwordPolicyMessage);

export const signInSchema = z.object({
	email: emailSchema,
	password: z
		.string()
		.min(1, "Password is required."),
	remember: z.coerce.boolean().default(false)
});

export const signUpSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, "Full name must be at least 2 characters."),
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password.")
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match."
	});

export const forgotPasswordSchema = z.object({
	email: emailSchema
});

export const resetPasswordSchema = z
	.object({
		password: passwordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password.")
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match."
	});

export const resetPasswordOtpSchema = z
	.object({
		challengeId: z
			.string()
			.trim()
			.min(1, "Reset challenge is missing. Request a new code."),
		code: z
			.string()
			.trim()
			.regex(/^\d{6}$/, "Enter the 6-digit reset code."),
		password: passwordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password.")
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match."
	});

export const changePasswordRequestOtpSchema = z.object({
	currentPassword: z.string().min(1, "Current password is required.")
});

export const changePasswordConfirmSchema = z
	.object({
		challengeId: z
			.string()
			.trim()
			.min(1, "Verification context is missing. Request a new code."),
		code: z
			.string()
			.trim()
			.regex(/^\d{6}$/, "Enter the 6-digit verification code."),
		currentPassword: z.string().min(1, "Current password is required."),
		password: passwordSchema,
		confirmPassword: z.string().min(1, "Please confirm your password.")
	})
	.refine((value) => value.password === value.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match."
	});

export const resendVerificationSchema = z.object({
	email: emailSchema
});

export const verifyEmailSchema = z.object({
	verificationId: z
		.string()
		.trim()
		.min(1, "Verification context is missing. Request a new code."),
	code: z
		.string()
		.trim()
		.regex(/^\d{6}$/, "Enter the 6-digit verification code.")
});

export type SignInSchema = z.infer<typeof signInSchema>;
export type SignUpSchema = z.infer<typeof signUpSchema>;
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordOtpSchema = z.infer<typeof resetPasswordOtpSchema>;
export type ResendVerificationSchema = z.infer<typeof resendVerificationSchema>;
export type VerifyEmailSchema = z.infer<typeof verifyEmailSchema>;
export type ChangePasswordRequestOtpSchema = z.infer<typeof changePasswordRequestOtpSchema>;
export type ChangePasswordConfirmSchema = z.infer<typeof changePasswordConfirmSchema>;
