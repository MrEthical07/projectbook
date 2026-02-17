declare module "node:crypto" {
	export interface Hash {
		update(data: string | Uint8Array): Hash;
		digest(encoding: "hex"): string;
	}

	export interface RandomBytesResult {
		toString(encoding: "base64url"): string;
	}

	export function createHash(algorithm: string): Hash;
	export function randomBytes(size: number): RandomBytesResult;
	export function randomUUID(): string;
}
