import { getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { apiRequest, type ApiRequestOptions } from "./client";
import { isApiRequestError } from "./error-mapping";
import {
	handleProjectScopeChange,
	invalidateQueryCache,
	readQueryCache,
	type QueryCacheInvalidation,
	type QueryCachePolicy,
	writeQueryCache
} from "./query-cache";

export type MutationResult<T> =
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: string;
	  };

export const encodePathSegment = (value: string): string =>
	encodeURIComponent(value.trim());

export type RemoteQueryOptions<TBody = unknown> = ApiRequestOptions<TBody> & {
	cachePolicy?: QueryCachePolicy;
};

export const remoteQueryRequest = async <TData, TBody = unknown>(
	options: RemoteQueryOptions<TBody>
): Promise<TData> => {
	const event = getRequestEvent();
	handleProjectScopeChange(event);
	const cached = readQueryCache<TData>(event, options, options.cachePolicy);
	if (cached !== null) {
		return cached;
	}

	try {
		const data = await apiRequest<TData, TBody>(event, {
			...options,
			allowCookieWrites: false,
			retryOnUnauthorized: false
		});
		writeQueryCache(event, options, options.cachePolicy, data);
		return data;
	} catch (err) {
		if (isApiRequestError(err)) {
			error(err.statusCode, err.userMessage);
		}
		throw err;
	}
};

export const runMutation = async <TData>(
	runner: () => Promise<TData>,
	fallbackMessage = "Request failed."
): Promise<MutationResult<TData>> => {
	try {
		return {
			success: true,
			data: await runner()
		};
	} catch (err) {
		if (isApiRequestError(err)) {
			if (err.statusCode === 400 && err.reason.trim().length > 0) {
				return { success: false, error: err.reason.trim() };
			}
			return { success: false, error: err.userMessage };
		}
		if (err instanceof Error && err.message.trim().length > 0) {
			return { success: false, error: err.message };
		}
		return { success: false, error: fallbackMessage };
	}
};

export const remoteMutationRequest = async <TData, TBody = unknown>(
	options: ApiRequestOptions<TBody>,
	fallbackMessage?: string,
	invalidation?: QueryCacheInvalidation
): Promise<MutationResult<TData>> => {
	return runMutation(
		() => {
			const event = getRequestEvent();
			return apiRequest<TData, TBody>(event, options).then((data) => {
				invalidateQueryCache(invalidation);
				return data;
			});
		},
		fallbackMessage
	);
};

export const unwrapItems = <T>(payload: unknown): T[] => {
	if (Array.isArray(payload)) {
		return payload as T[];
	}
	if (!payload || typeof payload !== "object") {
		return [];
	}
	const candidate = payload as Record<string, unknown>;
	return Array.isArray(candidate.items) ? (candidate.items as T[]) : [];
};
