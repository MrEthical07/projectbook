import { randomUUID } from "node:crypto";
import { authStore } from "./store";
import type { AuthEmailLog } from "./types";

const recordEmail = (entry: Omit<AuthEmailLog, "id" | "sentAt">) => {
	authStore.emailLog.unshift({
		id: randomUUID(),
		sentAt: new Date(),
		...entry
	});
};

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
	const link = `/auth/verify?token=${encodeURIComponent(token)}`;
	recordEmail({
		kind: "verify",
		to: email,
		link
	});
	console.info(`[auth] verification email -> ${email}: ${link}`);
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
	const link = `/auth/reset-password?token=${encodeURIComponent(token)}`;
	recordEmail({
		kind: "reset",
		to: email,
		link
	});
	console.info(`[auth] reset email -> ${email}: ${link}`);
};
