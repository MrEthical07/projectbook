type StatusPresentation = {
	userMessage: string;
	tip: string;
};

const STATUS_PRESENTATION: Record<number, StatusPresentation> = {
	400: {
		userMessage: "We could not process your input.",
		tip: "Review required fields and accepted formats, then try again."
	},
	401: {
		userMessage: "You need to sign in to continue.",
		tip: "Your session may have expired."
	},
	403: {
		userMessage: "You do not have enough permission for this operation.",
		tip: "If you believe this is a mistake, contact the owner of the project for requesting access."
	},
	404: {
		userMessage: "The requested resource could not be found.",
		tip: "The resource may have been deleted or the link may be stale."
	},
	405: {
		userMessage: "This action is not supported.",
		tip: "Please update the app or contact support if this persists."
	},
	409: {
		userMessage: "This request conflicts with current server state.",
		tip: "Reload latest data before trying again."
	},
	422: {
		userMessage: "We could not process your input.",
		tip: "Review required fields and accepted formats, then try again."
	},
	415: {
		userMessage: "Request format is not supported.",
		tip: "This usually indicates a frontend integration bug."
	},
	429: {
		userMessage: "Too many attempts. Please wait before trying again.",
		tip: "Repeated retries can extend cooldown."
	},
	500: {
		userMessage: "Server encountered an unexpected error.",
		tip: "Try again in a moment."
	},
	503: {
		userMessage: "Backend API is currently unavailable.",
		tip: "Try again shortly. In local development, confirm the backend server is running."
	},
	504: {
		userMessage: "The request timed out.",
		tip: "Retry after a short delay."
	}
};

const CODE_PRESENTATION: Record<string, StatusPresentation> = {
	member_exists: {
		userMessage: "This user is already a project member.",
		tip: "Search team members before sending another invite."
	},
	user_not_found: {
		userMessage: "No user account exists for this email.",
		tip: "Ask them to sign up first, then send the invite again."
	},
	role_config_missing: {
		userMessage: "Role permissions could not be resolved.",
		tip: "Retry shortly. If this continues, contact backend support."
	},
	already_cancelled: {
		userMessage: "This invite was already cancelled.",
		tip: "Refresh the invites list to sync the current status."
	},
	forbidden: {
		userMessage: "You do not have enough permission for this operation.",
		tip: "If you believe this is a mistake, contact the owner of the project for requesting access."
	},
	unauthorized: {
		userMessage: "You need to sign in to continue.",
		tip: "Your session may have expired."
	}
};

type BackendIssue = {
	path?: string;
	code?: string;
	message?: string;
	received?: unknown;
	expected?: unknown;
};

type BackendErrorObject = {
	message?: string;
	status?: number;
	code?: string;
	source?: string;
	requestId?: string;
	timestamp?: string;
	retryable?: boolean;
	issues?: BackendIssue[];
	details?: unknown;
};

type BackendEnvelope = {
	success?: boolean;
	error?: unknown;
	request_id?: string;
	requestId?: string;
};

export type ApiErrorDetails = {
	statusCode: number;
	name: string;
	reason: string;
	userMessage: string;
	tip: string;
	requestId?: string;
	retryable?: boolean;
	timestamp?: string;
	details?: unknown;
	issues?: BackendIssue[];
};

const normalizeCode = (value: string | undefined, fallbackStatus: number): string => {
	const normalized = value?.trim();
	if (normalized && normalized.length > 0) {
		return normalized.toLowerCase();
	}
	switch (fallbackStatus) {
		case 400:
			return "bad_request";
			case 422:
				return "validation_error";
		case 401:
			return "unauthorized";
		case 403:
			return "forbidden";
		case 404:
			return "not_found";
		case 409:
			return "conflict";
		case 429:
			return "too_many_requests";
		default:
			return "internal_error";
	}
};

const pickPresentation = (statusCode: number, name: string): StatusPresentation => {
	return (
		CODE_PRESENTATION[name] ??
		STATUS_PRESENTATION[statusCode] ?? {
			userMessage: "Something went wrong while processing the request.",
			tip: "Please try again."
		}
	);
};

const asErrorObject = (value: unknown): BackendErrorObject => {
	if (!value) {
		return {};
	}
	if (typeof value === "string") {
		return { message: value };
	}
	if (typeof value === "object") {
		return value as BackendErrorObject;
	}
	return {};
};

export class ApiRequestError extends Error {
	readonly statusCode: number;
	readonly code: string;
	readonly reason: string;
	readonly userMessage: string;
	readonly tip: string;
	readonly requestId?: string;
	readonly retryable?: boolean;
	readonly timestamp?: string;
	readonly details?: unknown;
	readonly issues?: BackendIssue[];

	constructor(details: ApiErrorDetails) {
		super(details.reason || details.userMessage);
		this.name = details.name;
		this.statusCode = details.statusCode;
		this.code = details.name;
		this.reason = details.reason;
		this.userMessage = details.userMessage;
		this.tip = details.tip;
		this.requestId = details.requestId;
		this.retryable = details.retryable;
		this.timestamp = details.timestamp;
		this.details = details.details;
		this.issues = details.issues;
	}
}

export const isApiRequestError = (value: unknown): value is ApiRequestError =>
	value instanceof ApiRequestError;

export const createApiRequestError = (input: {
	statusCode: number;
	envelope?: BackendEnvelope | null;
	fallbackReason?: string;
	details?: unknown;
}): ApiRequestError => {
	const { statusCode, envelope, fallbackReason, details } = input;
	const errorObject = asErrorObject(envelope?.error);
	const name = normalizeCode(errorObject.code, statusCode);
	const reason =
		errorObject.message?.trim() ||
		fallbackReason?.trim() ||
		"Request failed.";
	const presentation = pickPresentation(statusCode, name);
	return new ApiRequestError({
		statusCode,
		name,
		reason,
		userMessage: presentation.userMessage,
		tip: presentation.tip,
		requestId: errorObject.requestId ?? envelope?.request_id ?? envelope?.requestId,
		retryable: errorObject.retryable,
		timestamp: errorObject.timestamp,
		details: errorObject.details ?? details,
		issues: Array.isArray(errorObject.issues) ? errorObject.issues : undefined
	});
};
