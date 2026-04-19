import type {
	SessionContextProjectPermission,
	SessionContextResponse
} from "$lib/server/api/auth";

const decodeBase64URL = (value: string): string | null => {
	if (!value || value.trim().length === 0) {
		return null;
	}
	try {
		const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
		const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
		return globalThis.atob(padded);
	} catch {
		return null;
	}
};

const asFiniteNumber = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number.parseInt(value.trim(), 10);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const normalizeProjectPermission = (
	entry: unknown
): SessionContextProjectPermission | null => {
	if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
		return null;
	}
	const candidate = entry as Record<string, unknown>;
	const projectID =
		typeof candidate.project_id === "string"
			? candidate.project_id.trim()
			: "";
	if (projectID.length === 0) {
		return null;
	}

	const permissionMask = asFiniteNumber(candidate.permission_mask);
	if (permissionMask === null || permissionMask < 0) {
		return null;
	}

	const updatedAtUnix = asFiniteNumber(candidate.updated_at_unix);

	return {
		project_id: projectID,
		project_slug:
			typeof candidate.project_slug === "string"
				? candidate.project_slug.trim() || undefined
				: undefined,
		role:
			typeof candidate.role === "string"
				? candidate.role.trim() || undefined
				: undefined,
		permission_mask: Math.trunc(permissionMask),
		is_custom: candidate.is_custom === true,
		updated_at_unix:
			typeof updatedAtUnix === "number" ? Math.trunc(updatedAtUnix) : undefined
	};
};

export const parsePermissionContextToken = (
	token: string | null | undefined
): SessionContextResponse | null => {
	const serialized = token?.trim() ?? "";
	if (serialized.length === 0) {
		return null;
	}

	const parts = serialized.split(".");
	if (parts.length < 2) {
		return null;
	}

	const decodedPayload = decodeBase64URL(parts[1]);
	if (!decodedPayload) {
		return null;
	}

	let claims: Record<string, unknown>;
	try {
		const parsed = JSON.parse(decodedPayload) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return null;
		}
		claims = parsed as Record<string, unknown>;
	} catch {
		return null;
	}

	const userID =
		typeof claims.user_id === "string" ? claims.user_id.trim() : "";
	if (userID.length === 0) {
		return null;
	}

	const expUnix = asFiniteNumber(claims.exp);
	if (expUnix === null) {
		return null;
	}

	const nowUnix = Math.floor(Date.now() / 1000);
	const effectiveExpUnix = Math.trunc(expUnix);
	if (effectiveExpUnix <= nowUnix) {
		return null;
	}

	const projectPermissions = Array.isArray(claims.project_permissions)
		? claims.project_permissions
				.map(normalizeProjectPermission)
				.filter((entry): entry is SessionContextProjectPermission => entry !== null)
		: [];

	const contextTokenVersion = asFiniteNumber(claims.v);
	const email = typeof claims.email === "string" ? claims.email.trim() : "";
	const emailVerified = claims.email_verified === false ? false : true;

	return {
		user_id: userID,
		email: email.length > 0 ? email : undefined,
		email_verified: emailVerified,
		backend_role:
			typeof claims.backend_role === "string"
				? claims.backend_role.trim() || undefined
				: undefined,
		project_permissions: projectPermissions,
		snapshot_hash:
			typeof claims.snapshot_hash === "string"
				? claims.snapshot_hash.trim() || undefined
				: undefined,
		expires_in_seconds: effectiveExpUnix - nowUnix,
		context_token: serialized,
		context_token_expires_unix: effectiveExpUnix,
		context_token_expires_utc: new Date(effectiveExpUnix * 1000).toISOString(),
		context_token_version:
			typeof contextTokenVersion === "number"
				? Math.trunc(contextTokenVersion)
				: undefined
	};
};
