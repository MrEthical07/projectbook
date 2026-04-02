import { createHash, randomUUID } from "node:crypto";
import {
	DEMO_ID,
	DEMO_EMAIL,
	DEMO_NAME,
	DEMO_PASSWORD,
	DEFAULT_SESSION_TTL_MS,
	PASSWORD_RESET_TOKEN_TTL_MS,
	REMEMBER_SESSION_TTL_MS,
	SUPERADMIN_ID,
	SUPERADMIN_EMAIL,
	SUPERADMIN_NAME,
	SUPERADMIN_PASSWORD,
	VERIFICATION_TOKEN_TTL_MS
} from "./constants";
import { generateSecureToken, hashToken } from "./crypto";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { hashPassword, verifyPassword } from "./password";
import { authStore } from "./store";
import type {
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

const SESSION_SIGNING_SECRET = "projectbook-session-v1";

type StatelessSessionPayload = {
	userId: string;
	expiresAt: number;
	issuedAt: number;
	nonce: string;
};

const signSessionPayload = (encodedPayload: string): string =>
	createHash("sha256")
		.update(`${encodedPayload}.${SESSION_SIGNING_SECRET}`)
		.digest("hex");

const createStatelessSessionToken = (payload: StatelessSessionPayload): string => {
	const encodedPayload = encodeURIComponent(JSON.stringify(payload));
	const signature = signSessionPayload(encodedPayload);
	return `${encodedPayload}.${signature}`;
};

const parseStatelessSessionToken = (token: string): StatelessSessionPayload | null => {
	const separatorIndex = token.lastIndexOf(".");
	if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
		return null;
	}

	const encodedPayload = token.slice(0, separatorIndex);
	const providedSignature = token.slice(separatorIndex + 1);
	const expectedSignature = signSessionPayload(encodedPayload);
	if (expectedSignature !== providedSignature) {
		return null;
	}

	try {
		const decoded = decodeURIComponent(encodedPayload);
		const parsed = JSON.parse(decoded) as Partial<StatelessSessionPayload>;
		if (
			typeof parsed.userId !== "string" ||
			typeof parsed.expiresAt !== "number" ||
			typeof parsed.issuedAt !== "number" ||
			typeof parsed.nonce !== "string"
		) {
			return null;
		}

		if (parsed.expiresAt <= Date.now()) {
			return null;
		}

		return {
			userId: parsed.userId,
			expiresAt: parsed.expiresAt,
			issuedAt: parsed.issuedAt,
			nonce: parsed.nonce
		};
	} catch {
		return null;
	}
};

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

export const authService = {
	async registerUser(name: string, email: string, password: string): Promise<SignUpResult> {
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
		const createdAt = new Date();
		const ttl = remember ? REMEMBER_SESSION_TTL_MS : DEFAULT_SESSION_TTL_MS;
		const expiresAt = new Date(createdAt.getTime() + ttl);
		const token = createStatelessSessionToken({
			userId,
			expiresAt: expiresAt.getTime(),
			issuedAt: createdAt.getTime(),
			nonce: generateSecureToken(8)
		});

		return { token, expiresAt };
	},

	getUserBySessionToken(token: string): AuthUser | null {
		const statelessPayload = parseStatelessSessionToken(token);
		if (statelessPayload) {
			return authStore.users.find((user) => user.id === statelessPayload.userId) ?? null;
		}

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
		const statelessPayload = parseStatelessSessionToken(token);
		if (statelessPayload) {
			return;
		}

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
	},

	async seedSuperAdmin(): Promise<void> {
		const existing = findUserByEmail(SUPERADMIN_EMAIL);
		if (existing) {
			existing.id = SUPERADMIN_ID;
			existing.name = SUPERADMIN_NAME;
			existing.email = normalizeEmail(SUPERADMIN_EMAIL);
			existing.isEmailVerified = true;
			return;
		}

		const createdAt = new Date();
		const user: AuthUser = {
			id: SUPERADMIN_ID,
			name: SUPERADMIN_NAME,
			email: normalizeEmail(SUPERADMIN_EMAIL),
			passwordHash: await hashPassword(SUPERADMIN_PASSWORD),
			isEmailVerified: true,
			createdAt,
			updatedAt: createdAt,
			lastLoginAt: null
		};

		authStore.users.push(user);
		console.info(`[auth] superadmin account seeded: ${SUPERADMIN_EMAIL}`);
	},

	async seedDemoAccount(): Promise<void> {
		const existing = findUserByEmail(DEMO_EMAIL);
		if (existing) {
			existing.id = DEMO_ID;
			existing.name = DEMO_NAME;
			existing.email = normalizeEmail(DEMO_EMAIL);
			existing.isEmailVerified = true;
			return;
		}

		const createdAt = new Date();
		const user: AuthUser = {
			id: DEMO_ID,
			name: DEMO_NAME,
			email: normalizeEmail(DEMO_EMAIL),
			passwordHash: await hashPassword(DEMO_PASSWORD),
			isEmailVerified: true,
			createdAt,
			updatedAt: createdAt,
			lastLoginAt: null
		};

		authStore.users.push(user);
		console.info(`[auth] demo account seeded: ${DEMO_EMAIL}`);
	}
};
