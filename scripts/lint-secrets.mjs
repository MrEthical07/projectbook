import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const textDecoder = new TextDecoder("utf8", { fatal: false });

const isIgnoredPath = (filePath) => {
	if (filePath.startsWith("node_modules/")) {
		return true;
	}
	if (filePath === "pnpm-lock.yaml") {
		return true;
	}
	if (filePath.startsWith(".env")) {
		return true;
	}
	return false;
};

const isLikelyBinary = (buffer) => {
	const max = Math.min(buffer.length, 4096);
	for (let i = 0; i < max; i += 1) {
		if (buffer[i] === 0) {
			return true;
		}
	}
	return false;
};

const patterns = [
	{
		name: "AWS access key",
		re: /\bAKIA[0-9A-Z]{16}\b/g
	},
	{
		name: "GitHub token",
		re: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{30,}\b/g
	},
	{
		name: "Google API key",
		re: /\bAIza[0-9A-Za-z_-]{20,}\b/g
	},
	{
		name: "Slack token",
		re: /\bxox[baprs]-[A-Za-z0-9-]{12,}\b/g
	},
	{
		name: "Resend API key",
		re: /\bre_[A-Za-z0-9_-]{20,}\b/g
	},
	{
		name: "Private key material",
		re: /-----BEGIN (?:RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----/g
	},
	{
		name: "Credentialed remote database URL",
		re: /\b(?:postgres(?:ql)?|mongodb(?:\+srv)?|redis):\/\/[^/\s:@]+:[^@\s]+@(?!(?:localhost|127\.0\.0\.1|::1)\b)[^\s'"`]+/gi
	}
];

const lineNumberAt = (content, index) => content.slice(0, index).split("\n").length;

const trackedFilesOutput = execFileSync("git", ["ls-files", "-z"], {
	encoding: "utf8"
});
const trackedFiles = trackedFilesOutput.split("\0").filter(Boolean);

const findings = [];
for (const filePath of trackedFiles) {
	if (isIgnoredPath(filePath)) {
		continue;
	}

	const absolutePath = resolve(process.cwd(), filePath);
	let raw;
	try {
		raw = readFileSync(absolutePath);
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
			continue;
		}
		throw error;
	}
	if (isLikelyBinary(raw)) {
		continue;
	}

	const content = textDecoder.decode(raw);
	for (const pattern of patterns) {
		pattern.re.lastIndex = 0;
		let match = pattern.re.exec(content);
		while (match) {
			findings.push({
				filePath,
				line: lineNumberAt(content, match.index),
				kind: pattern.name,
				value: match[0]
			});
			match = pattern.re.exec(content);
		}
	}
}

if (findings.length > 0) {
	console.error("Secret lint failed: potential sensitive values found in tracked files.");
	for (const finding of findings) {
		console.error(
			`- ${finding.filePath}:${finding.line} [${finding.kind}] ${finding.value}`
		);
	}
	process.exit(1);
}

console.log("Secret lint passed: no high-signal secret patterns detected.");
