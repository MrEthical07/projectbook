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
