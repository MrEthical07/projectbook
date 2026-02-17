export interface AuthUser {
	id: string;
	name: string;
	email: string;
	passwordHash: string;
	isEmailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
	lastLoginAt: Date | null;
}

export interface EmailVerificationToken {
	id: string;
	userId: string;
	tokenHash: string;
	expiresAt: Date;
	usedAt: Date | null;
	createdAt: Date;
}

export interface PasswordResetToken {
	id: string;
	userId: string;
	tokenHash: string;
	expiresAt: Date;
	usedAt: Date | null;
	createdAt: Date;
}

export interface AuthSession {
	id: string;
	userId: string;
	tokenHash: string;
	expiresAt: Date;
	createdAt: Date;
	revokedAt: Date | null;
}

export interface IssuedSession {
	token: string;
	expiresAt: Date;
}

export interface AuthEmailLog {
	id: string;
	kind: "verify" | "reset";
	to: string;
	link: string;
	sentAt: Date;
}

export type LoginFailureReason = "invalid_credentials" | "email_unverified";

export type LoginResult =
	| { ok: true; user: AuthUser }
	| { ok: false; reason: LoginFailureReason };

export type SignUpResult =
	| { ok: true; user: AuthUser }
	| { ok: false; reason: "email_taken" };

export type VerificationResult =
	| { status: "success"; email: string }
	| { status: "missing" }
	| { status: "failed" };

export type ResendVerificationResult =
	| { status: "sent" }
	| { status: "not_found" }
	| { status: "already_verified" };

export type ResetTokenState =
	| { valid: true; user: AuthUser }
	| { valid: false };

export type ResetPasswordResult =
	| { ok: true; user: AuthUser }
	| { ok: false; reason: "invalid_or_expired_token" };
