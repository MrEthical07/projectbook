import type {
	AuthEmailLog,
	AuthSession,
	AuthUser,
	EmailVerificationToken,
	PasswordResetToken
} from "./types";

export interface AuthDataStore {
	users: AuthUser[];
	verificationTokens: EmailVerificationToken[];
	passwordResetTokens: PasswordResetToken[];
	sessions: AuthSession[];
	emailLog: AuthEmailLog[];
}

export const authStore: AuthDataStore = {
	users: [],
	verificationTokens: [],
	passwordResetTokens: [],
	sessions: [],
	emailLog: []
};

export function pruneExpiredTokens(): void {
	const now = Date.now();
	authStore.verificationTokens = authStore.verificationTokens.filter(
		(t) => !t.usedAt && t.expiresAt.getTime() > now
	);
	authStore.passwordResetTokens = authStore.passwordResetTokens.filter(
		(t) => !t.usedAt && t.expiresAt.getTime() > now
	);
}
