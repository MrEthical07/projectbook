import { hash, verify } from "@node-rs/argon2";

const PASSWORD_HASH_OPTIONS = {
	memoryCost: 19_456,
	timeCost: 2,
	parallelism: 1
} as const;

export const hashPassword = async (password: string): Promise<string> =>
	hash(password, PASSWORD_HASH_OPTIONS);

export const verifyPassword = async (
	passwordHash: string,
	password: string
): Promise<boolean> => verify(passwordHash, password, PASSWORD_HASH_OPTIONS);
