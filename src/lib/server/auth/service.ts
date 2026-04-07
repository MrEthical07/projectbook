import { randomUUID } from "node:crypto";
import { dev } from "$app/environment";
import {
	DEFAULT_SESSION_TTL_MS,
	PASSWORD_RESET_TOKEN_TTL_MS,
	REMEMBER_SESSION_TTL_MS,
	VERIFICATION_TOKEN_TTL_MS
} from "./constants";
import { generateSecureToken, hashToken } from "./crypto";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { hashPassword, verifyPassword } from "./password";
import { authStore } from "./store";
import type {
	AuthSession,
	AuthUser,
	IssuedSession,
	LoginResult,
	PasswordResetToken,
	ResetPasswordResult,
	ResetTokenState,
	ResendVerificationResult,
	SignUpResult,
	VerificationResult
} from "./types";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const DEV_ADMIN_NAME = "Dev Admin";
const DEV_ADMIN_EMAIL = "admin@projectbook.local";
const DEV_ADMIN_PASSWORD = "DevAdmin#2026";

let devAdminSeeded = false;
let devAdminSeedPromise: Promise<void> | null = null;

const isExpired = (expiresAt: Date, now = Date.now()): boolean => expiresAt.getTime() <= now;

const findUserByEmail = (email: string): AuthUser | null =>
	authStore.users.find((user) => user.email === normalizeEmail(email)) ?? null;

const pruneExpiredSessions = (): void => {
	const now = Date.now();
	authStore.sessions = authStore.sessions.filter(
		(session) => !isExpired(session.expiresAt, now) && !session.revokedAt
	);
};

const markExistingVerificationTokensAsUsed = (userId: string, usedAt: Date): void => {
	for (const token of authStore.verificationTokens) {
		if (token.userId === userId && !token.usedAt) {
			token.usedAt = usedAt;
		}
	}
};

const markExistingResetTokensAsUsed = (userId: string, usedAt: Date): void => {
	for (const token of authStore.passwordResetTokens) {
		if (token.userId === userId && !token.usedAt) {
			token.usedAt = usedAt;
		}
	}
};

const createVerificationTokenForUser = async (user: AuthUser): Promise<void> => {
	const createdAt = new Date();
	const expiresAt = new Date(createdAt.getTime() + VERIFICATION_TOKEN_TTL_MS);
	const token = generateSecureToken(32);

	markExistingVerificationTokensAsUsed(user.id, createdAt);

	authStore.verificationTokens.push({
		id: randomUUID(),
		userId: user.id,
		tokenHash: hashToken(token),
		expiresAt,
		usedAt: null,
		createdAt
	});

	await sendVerificationEmail(user.email, token);
};

const createPasswordResetTokenForUser = async (user: AuthUser): Promise<void> => {
	const createdAt = new Date();
	const expiresAt = new Date(createdAt.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
	const token = generateSecureToken(32);

	markExistingResetTokensAsUsed(user.id, createdAt);

	authStore.passwordResetTokens.push({
		id: randomUUID(),
		userId: user.id,
		tokenHash: hashToken(token),
		expiresAt,
		usedAt: null,
		createdAt
	});

	await sendPasswordResetEmail(user.email, token);
};

const findValidResetToken = (token: string): PasswordResetToken | null => {
	const tokenHash = hashToken(token);
	const found = authStore.passwordResetTokens.find((entry) => entry.tokenHash === tokenHash);
	if (!found || found.usedAt || isExpired(found.expiresAt)) {
		return null;
	}
	return found;
};

const revokeAllUserSessions = (userId: string): void => {
	const revokedAt = new Date();
	for (const session of authStore.sessions) {
		if (session.userId === userId && !session.revokedAt) {
			session.revokedAt = revokedAt;
		}
	}
};

const ensureDevAdminSeeded = async (): Promise<void> => {
	if (!dev || devAdminSeeded) {
		return;
	}

	if (devAdminSeedPromise) {
		await devAdminSeedPromise;
		return;
	}

	devAdminSeedPromise = (async () => {
		const normalizedEmail = normalizeEmail(DEV_ADMIN_EMAIL);
		const existingUser = authStore.users.find((user) => user.email === normalizedEmail);
		const seededPasswordHash = await hashPassword(DEV_ADMIN_PASSWORD);
		if (existingUser) {
			existingUser.name = DEV_ADMIN_NAME;
			existingUser.passwordHash = seededPasswordHash;
			existingUser.isEmailVerified = true;
			existingUser.updatedAt = new Date();
			devAdminSeeded = true;
			return;
		}

		const createdAt = new Date();
		authStore.users.push({
			id: randomUUID(),
			name: DEV_ADMIN_NAME,
			email: normalizedEmail,
			passwordHash: seededPasswordHash,
			isEmailVerified: true,
			createdAt,
			updatedAt: createdAt,
			lastLoginAt: null
		});
		devAdminSeeded = true;
	})();

	try {
		await devAdminSeedPromise;
	} finally {
		devAdminSeedPromise = null;
	}
};

export const authService = {
	async registerUser(name: string, email: string, password: string): Promise<SignUpResult> {
		await ensureDevAdminSeeded();
		const normalizedEmail = normalizeEmail(email);
		const existingUser = authStore.users.find((user) => user.email === normalizedEmail);
		if (existingUser) {
			return { ok: false, reason: "email_taken" };
		}

		const createdAt = new Date();
		const user: AuthUser = {
			id: randomUUID(),
			name: name.trim(),
			email: normalizedEmail,
			passwordHash: await hashPassword(password),
			isEmailVerified: false,
			createdAt,
			updatedAt: createdAt,
			lastLoginAt: null
		};

		authStore.users.push(user);
		await createVerificationTokenForUser(user);

		return { ok: true, user };
	},

	async authenticate(email: string, password: string): Promise<LoginResult> {
		await ensureDevAdminSeeded();
		const user = findUserByEmail(email);
		if (!user) {
			return { ok: false, reason: "invalid_credentials" };
		}

		const isPasswordValid = await verifyPassword(user.passwordHash, password);
		if (!isPasswordValid) {
			return { ok: false, reason: "invalid_credentials" };
		}

		if (!user.isEmailVerified) {
			return { ok: false, reason: "email_unverified" };
		}

		const now = new Date();
		user.lastLoginAt = now;
		user.updatedAt = now;

		return { ok: true, user };
	},

	createSession(userId: string, remember = false): IssuedSession {
		pruneExpiredSessions();

		const createdAt = new Date();
		const ttl = remember ? REMEMBER_SESSION_TTL_MS : DEFAULT_SESSION_TTL_MS;
		const expiresAt = new Date(createdAt.getTime() + ttl);
		const token = generateSecureToken(32);

		const session: AuthSession = {
			id: randomUUID(),
			userId,
			tokenHash: hashToken(token),
			expiresAt,
			createdAt,
			revokedAt: null
		};

		authStore.sessions.push(session);

		return { token, expiresAt };
	},

	getUserBySessionToken(token: string): AuthUser | null {
		pruneExpiredSessions();
		const hashedToken = hashToken(token);
		const session = authStore.sessions.find(
			(entry) => entry.tokenHash === hashedToken && !entry.revokedAt
		);
		if (!session) {
			return null;
		}
		return authStore.users.find((user) => user.id === session.userId) ?? null;
	},

	invalidateSessionByToken(token: string): void {
		const hash = hashToken(token);
		const session = authStore.sessions.find((entry) => entry.tokenHash === hash);
		if (session && !session.revokedAt) {
			session.revokedAt = new Date();
		}
	},

	async verifyEmailToken(token: string | null): Promise<VerificationResult> {
		if (!token) {
			return { status: "missing" };
		}

		const tokenHash = hashToken(token);
		const verificationToken = authStore.verificationTokens.find(
			(entry) => entry.tokenHash === tokenHash
		);

		if (!verificationToken || verificationToken.usedAt || isExpired(verificationToken.expiresAt)) {
			return { status: "failed" };
		}

		const user = authStore.users.find((entry) => entry.id === verificationToken.userId);
		if (!user) {
			return { status: "failed" };
		}

		const now = new Date();
		verificationToken.usedAt = now;
		user.isEmailVerified = true;
		user.updatedAt = now;

		return { status: "success", email: user.email };
	},

	async resendVerificationEmail(email: string): Promise<ResendVerificationResult> {
		await ensureDevAdminSeeded();
		const user = findUserByEmail(email);
		if (!user) {
			return { status: "not_found" };
		}

		if (user.isEmailVerified) {
			return { status: "already_verified" };
		}

		await createVerificationTokenForUser(user);
		return { status: "sent" };
	},

	async requestPasswordReset(email: string): Promise<void> {
		await ensureDevAdminSeeded();
		const user = findUserByEmail(email);
		if (!user) {
			return;
		}

		await createPasswordResetTokenForUser(user);
	},

	getPasswordResetTokenState(token: string | null): ResetTokenState {
		if (!token) {
			return { valid: false };
		}

		const resetToken = findValidResetToken(token);
		if (!resetToken) {
			return { valid: false };
		}

		const user = authStore.users.find((entry) => entry.id === resetToken.userId);
		if (!user) {
			return { valid: false };
		}

		return { valid: true, user };
	},

	async resetPassword(token: string, password: string): Promise<ResetPasswordResult> {
		await ensureDevAdminSeeded();
		const resetToken = findValidResetToken(token);
		if (!resetToken) {
			return { ok: false, reason: "invalid_or_expired_token" };
		}

		const user = authStore.users.find((entry) => entry.id === resetToken.userId);
		if (!user) {
			return { ok: false, reason: "invalid_or_expired_token" };
		}

		const now = new Date();
		user.passwordHash = await hashPassword(password);
		user.updatedAt = now;
		resetToken.usedAt = now;

		revokeAllUserSessions(user.id);

		return { ok: true, user };
	}
};

if (dev) {
	void ensureDevAdminSeeded();
}
