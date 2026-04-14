import { createHash } from "node:crypto";
import { env } from "$env/dynamic/private";
import type { Cookies } from "@sveltejs/kit";
import {
	clearPermissionContextCookie,
	getPermissionContextCookie,
	setPermissionContextCookie
} from "./cookies";

const permissionContextTokenVersion = 1;
const textDecoder = new TextDecoder();

const resolvePermissionContextSecret = (): string => {
	const configured = env.PROJECTBOOK_PERMISSION_CONTEXT_SECRET?.trim();
	if (configured && configured.length >= 32) {
		return configured;
	}
	return "projectbook-dev-permission-context-secret";
};

const permissionContextSecret = resolvePermissionContextSecret();

export type ProjectPermissionMatrixEntry = {
	project_id: string;
	project_slug?: string;
	role?: string;
	permission_mask: number;
	is_custom?: boolean;
	updated_at_unix?: number;
};

export type PermissionContextSnapshot = {
	user_id: string;
	backend_role?: string;
	project_permissions: ProjectPermissionMatrixEntry[];
	snapshot_hash?: string;
	expires_in_seconds?: number;
	context_token?: string;
	context_token_expires_unix?: number;
	context_token_expires_utc?: string;
	context_token_version?: number;
};

export type PermissionContextTokenData = {
	user_id: string;
	backend_role?: string;
	project_permissions: ProjectPermissionMatrixEntry[];
	snapshot_hash?: string;
	iat: number;
	exp: number;
	v: number;
};

const base64UrlDecodeBytes = (value: string): Uint8Array => {
	const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
	const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(base64);
	const output = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		output[index] = binary.charCodeAt(index);
	}
	return output;
};
const base64UrlDecode = (value: string): string =>
	textDecoder.decode(base64UrlDecodeBytes(value));

const signToken = (unsignedToken: string): string =>
	createHash("sha256")
		.update(unsignedToken)
		.update(".")
		.update(permissionContextSecret)
		.digest("hex");

const parsePositiveInt = (value: unknown): number | null => {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return null;
	}
	if (value <= 0) {
		return null;
	}
	return Math.trunc(value);
};

const normalizeProjectPermissions = (value: unknown): ProjectPermissionMatrixEntry[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	const normalized: ProjectPermissionMatrixEntry[] = [];
	for (const item of value) {
		if (!item || typeof item !== "object" || Array.isArray(item)) {
			continue;
		}
		const row = item as Record<string, unknown>;
		const projectID = typeof row.project_id === "string" ? row.project_id.trim() : "";
		if (!projectID) {
			continue;
		}
		const projectSlug =
			typeof row.project_slug === "string" && row.project_slug.trim().length > 0
				? row.project_slug.trim()
				: undefined;
		const role =
			typeof row.role === "string" && row.role.trim().length > 0 ? row.role.trim() : undefined;
		const permissionMask = parsePositiveInt(row.permission_mask) ?? 0;
		const updatedAtUnix = parsePositiveInt(row.updated_at_unix) ?? undefined;
		const isCustom = row.is_custom === true;

		normalized.push({
			project_id: projectID,
			project_slug: projectSlug,
			role,
			permission_mask: permissionMask,
			is_custom: isCustom,
			updated_at_unix: updatedAtUnix
		});
	}

	return normalized;
};

const decodePermissionContextToken = (token: string): PermissionContextTokenData | null => {
	const parts = token.split(".");
	if (parts.length !== 3) {
		return null;
	}

	const [encodedHeader, encodedPayload, encodedSignature] = parts;
	const unsignedToken = `${encodedHeader}.${encodedPayload}`;
	const expectedSignature = signToken(unsignedToken);

	if (encodedSignature !== expectedSignature) {
		return null;
	}

	try {
		const header = JSON.parse(base64UrlDecode(encodedHeader)) as { alg?: string; typ?: string };
		if (header.alg !== "HS256" || header.typ !== "JWT") {
			return null;
		}

		const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Record<string, unknown>;
		const userID = typeof payload.user_id === "string" ? payload.user_id.trim() : "";
		if (!userID) {
			return null;
		}

		const exp = parsePositiveInt(payload.exp);
		const iat = parsePositiveInt(payload.iat);
		const version = parsePositiveInt(payload.v);
		if (!exp || !iat || version !== permissionContextTokenVersion) {
			return null;
		}
		if (exp <= Math.floor(Date.now() / 1000)) {
			return null;
		}

		return {
			user_id: userID,
			backend_role:
				typeof payload.backend_role === "string" ? payload.backend_role.trim() : undefined,
			project_permissions: normalizeProjectPermissions(payload.project_permissions),
			snapshot_hash:
				typeof payload.snapshot_hash === "string" ? payload.snapshot_hash.trim() : undefined,
			iat,
			exp,
			v: version
		};
	} catch {
		return null;
	}
};
export const readPermissionContextToken = (
	cookies: Cookies
): PermissionContextTokenData | null => {
	const token = getPermissionContextCookie(cookies);
	if (!token) {
		return null;
	}

	const parsed = decodePermissionContextToken(token);
	if (!parsed) {
		clearPermissionContextCookie(cookies);
		return null;
	}
	return parsed;
};

export const writePermissionContextToken = (
	cookies: Cookies,
	snapshot: PermissionContextSnapshot
): PermissionContextTokenData => {
	const backendToken =
		typeof snapshot.context_token === "string" ? snapshot.context_token.trim() : "";
	if (!backendToken) {
		clearPermissionContextCookie(cookies);
		throw new Error("session context token missing");
	}

	const parsed = decodePermissionContextToken(backendToken);
	if (!parsed) {
		clearPermissionContextCookie(cookies);
		throw new Error("session context token invalid");
	}

	if (snapshot.user_id?.trim() && parsed.user_id !== snapshot.user_id.trim()) {
		clearPermissionContextCookie(cookies);
		throw new Error("session context token user mismatch");
	}

	setPermissionContextCookie(cookies, backendToken, new Date(parsed.exp * 1000));
	return parsed;
};
