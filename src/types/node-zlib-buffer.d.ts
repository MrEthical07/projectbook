declare module "node:zlib" {
	export function brotliCompressSync(data: unknown): {
		toString(encoding: "base64url"): string;
	};

	export function brotliDecompressSync(data: unknown): {
		toString(encoding: "utf8"): string;
	};
}

declare const Buffer: {
	from(data: string, encoding?: "utf8" | "base64url"): unknown;
};
