const attempts = new Map<string, { count: number; resetAt: number }>();

export const checkRateLimit = (
	key: string,
	maxAttempts: number,
	windowMs: number
): { allowed: boolean; retryAfterMs: number } => {
	const now = Date.now();
	const entry = attempts.get(key);

	if (!entry || now >= entry.resetAt) {
		attempts.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true, retryAfterMs: 0 };
	}

	if (entry.count >= maxAttempts) {
		return { allowed: false, retryAfterMs: entry.resetAt - now };
	}

	entry.count += 1;
	return { allowed: true, retryAfterMs: 0 };
};

export const withFormError = <T extends { valid: boolean; errors: { _errors?: string[] } }>(
	form: T,
	error: string
): void => {
	form.valid = false;
	form.errors._errors = [error];
};
