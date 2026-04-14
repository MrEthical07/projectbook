import { getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import { apiRequest, type ApiRequestOptions } from "./client";
import { isApiRequestError } from "./error-mapping";

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

export const remoteQueryRequest = async <TData, TBody = unknown>(
	options: ApiRequestOptions<TBody>
): Promise<TData> => {
	const event = getRequestEvent();
	try {
		return await apiRequest<TData, TBody>(event, options);
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
	fallbackMessage?: string
): Promise<MutationResult<TData>> => {
	return runMutation(
		() => {
			const event = getRequestEvent();
			return apiRequest<TData, TBody>(event, options);
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
