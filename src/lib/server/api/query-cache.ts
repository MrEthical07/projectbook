import { createHash } from "node:crypto";
import type { RequestEvent } from "@sveltejs/kit";
import type { ApiRequestOptions } from "./client";

const MAX_QUERY_CACHE_ENTRIES = 1500;
const MAX_PROJECT_SCOPE_TRACK_ENTRIES = 3000;

type QueryCacheEntry = {
	value: unknown;
	expiresAtUnixMs: number;
	tags: string[];
};

const queryCacheStore = new Map<string, QueryCacheEntry>();
const lastProjectScopeByUser = new Map<string, string>();

export type QueryCachePolicy = {
	namespace: string;
	ttlMs: number;
	sessionPersistent?: boolean;
	keyParts?: Record<string, unknown>;
	tags?: string[];
};

export type QueryCacheInvalidation = {
	tags: string[];
};

const normalizeTag = (tag: string): string => tag.trim().toLowerCase();

const pruneIfNecessary = (): void => {
	while (queryCacheStore.size > MAX_QUERY_CACHE_ENTRIES) {
		const firstKey = queryCacheStore.keys().next().value;
		if (typeof firstKey !== "string") {
			break;
		}
		queryCacheStore.delete(firstKey);
	}
};

const stableSerialize = (value: unknown): string => {
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
	}
	if (value && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`);
		return `{${entries.join(",")}}`;
	}
	return JSON.stringify(value);
};

const requestMethod = (options: ApiRequestOptions): string =>
	(options.method ??
		(options.body === undefined && options.rawBody === undefined ? "GET" : "POST")).toUpperCase();

const buildCacheKey = (
	event: RequestEvent,
	options: ApiRequestOptions,
	policy: QueryCachePolicy
): string => {
	const keyPayload = {
		namespace: policy.namespace,
		method: requestMethod(options),
		path: options.path,
		user_id: event.locals.user?.id ?? "",
		project_id: event.params.projectId ?? "",
		key_parts: policy.keyParts ?? {}
	};
	const hash = createHash("sha256").update(stableSerialize(keyPayload)).digest("hex");
	return `${policy.namespace}:${hash}`;
};

const buildCacheTags = (
	event: RequestEvent,
	policy: QueryCachePolicy
): string[] => {
	const tags = new Set<string>();
	tags.add(normalizeTag(`namespace:${policy.namespace}`));
	tags.add(normalizeTag(`path:${policy.namespace}`));

	if (event.locals.user?.id) {
		tags.add(normalizeTag(`user:${event.locals.user.id}`));
	}
	if (event.params.projectId) {
		tags.add(normalizeTag(`project:${event.params.projectId}`));
	}
	if (event.locals.user?.id && event.params.projectId) {
		tags.add(normalizeTag(`user-project:${event.locals.user.id}:${event.params.projectId}`));
	}
	for (const tag of policy.tags ?? []) {
		const normalized = normalizeTag(tag);
		if (normalized.length > 0) {
			tags.add(normalized);
		}
	}
	return [...tags];
};

const isCachePolicyValid = (policy: QueryCachePolicy | undefined): policy is QueryCachePolicy => {
	if (!policy) {
		return false;
	}
	if (policy.namespace.trim().length === 0) {
		return false;
	}
	if (policy.sessionPersistent) {
		return true;
	}
	return Number.isFinite(policy.ttlMs) && policy.ttlMs > 0;
};

const pruneProjectScopeTracking = (): void => {
	while (lastProjectScopeByUser.size > MAX_PROJECT_SCOPE_TRACK_ENTRIES) {
		const firstKey = lastProjectScopeByUser.keys().next().value;
		if (typeof firstKey !== "string") {
			break;
		}
		lastProjectScopeByUser.delete(firstKey);
	}
};

export const handleProjectScopeChange = (event: RequestEvent): void => {
	const userId = event.locals.user?.id?.trim() ?? "";
	const projectId = event.params.projectId?.trim() ?? "";
	if (userId.length === 0 || projectId.length === 0) {
		return;
	}

	const previousProjectId = lastProjectScopeByUser.get(userId);
	if (previousProjectId && previousProjectId !== projectId) {
		invalidateQueryCache({
			tags: [`user-project:${userId}:${previousProjectId}`]
		});
		console.info("[cache:project-switch-clear]", {
			user_id: userId,
			from_project_id: previousProjectId,
			to_project_id: projectId
		});
	}

	lastProjectScopeByUser.set(userId, projectId);
	pruneProjectScopeTracking();
};

export const readQueryCache = <TData>(
	event: RequestEvent,
	options: ApiRequestOptions,
	policy: QueryCachePolicy | undefined
): TData | null => {
	if (!isCachePolicyValid(policy) || requestMethod(options) !== "GET") {
		return null;
	}

	const key = buildCacheKey(event, options, policy);
	const cached = queryCacheStore.get(key);
	if (!cached) {
		console.info("[cache:miss]", {
			namespace: policy.namespace,
			path: options.path,
			method: requestMethod(options),
			key,
			tag_count: (policy.tags ?? []).length
		});
		return null;
	}
	if (cached.expiresAtUnixMs <= Date.now()) {
		queryCacheStore.delete(key);
		console.info("[cache:stale]", {
			namespace: policy.namespace,
			path: options.path,
			method: requestMethod(options),
			key
		});
		return null;
	}
	console.info("[cache:hit]", {
		namespace: policy.namespace,
		path: options.path,
		method: requestMethod(options),
		key,
		expires_in_ms: Math.max(0, cached.expiresAtUnixMs - Date.now())
	});
	return cached.value as TData;
};

export const writeQueryCache = (
	event: RequestEvent,
	options: ApiRequestOptions,
	policy: QueryCachePolicy | undefined,
	value: unknown
): void => {
	if (!isCachePolicyValid(policy) || requestMethod(options) !== "GET") {
		return;
	}

	const key = buildCacheKey(event, options, policy);
	const expiresAtUnixMs = policy.sessionPersistent ? Number.POSITIVE_INFINITY : Date.now() + policy.ttlMs;
	queryCacheStore.set(key, {
		value,
		expiresAtUnixMs,
		tags: buildCacheTags(event, policy)
	});
	console.info("[cache:write]", {
		namespace: policy.namespace,
		path: options.path,
		method: requestMethod(options),
		key,
		ttl_ms: policy.sessionPersistent ? "session" : policy.ttlMs,
		expires_at_unix_ms: expiresAtUnixMs
	});
	pruneIfNecessary();
};

export const invalidateQueryCache = (invalidation: QueryCacheInvalidation | undefined): void => {
	if (!invalidation || invalidation.tags.length === 0) {
		return;
	}

	const tagsToInvalidate = new Set(
		invalidation.tags.map(normalizeTag).filter((tag) => tag.length > 0)
	);
	if (tagsToInvalidate.size === 0) {
		return;
	}

	for (const [cacheKey, entry] of queryCacheStore.entries()) {
		if (entry.expiresAtUnixMs <= Date.now()) {
			queryCacheStore.delete(cacheKey);
			continue;
		}

		const shouldDelete = entry.tags.some((tag) => tagsToInvalidate.has(tag));
		if (shouldDelete) {
			queryCacheStore.delete(cacheKey);
		}
	}

	console.info("[cache:invalidate]", {
		tags: [...tagsToInvalidate],
		remaining_entries: queryCacheStore.size
	});
};
