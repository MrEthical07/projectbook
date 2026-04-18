import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const workspaceRoot = process.cwd();

const budgetTargets = [
	{
		name: "home-navigation",
		maxCalls: 2,
		files: [
			"src/routes/(home)/+layout.ts",
			"src/routes/(home)/+page.ts"
		]
	},
	{
		name: "project-navigation",
		maxCalls: 3,
		files: [
			"src/routes/project/[projectId]/+layout.ts",
			"src/routes/project/[projectId]/+page.ts"
		]
	}
];

const remoteImportPattern = /^\s*import\s*\{([^}]*)\}\s*from\s*["']\$lib\/remote\/[^"']+["'];?\s*$/gm;

const extractRemoteSymbols = (source) => {
	const names = [];
	let match;
	while ((match = remoteImportPattern.exec(source)) !== null) {
		const symbols = match[1]
			.split(",")
			.map((part) => part.trim())
			.filter((part) => part.length > 0)
			.map((part) => {
				const [imported, alias] = part.split(/\s+as\s+/i).map((value) => value.trim());
				return alias || imported;
			});
		names.push(...symbols);
	}

	return [...new Set(names)];
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const countRemoteCalls = (source) => {
	const symbols = extractRemoteSymbols(source);
	if (symbols.length === 0) {
		return 0;
	}

	const codeWithoutImports = source
		.split(/\r?\n/)
		.filter((line) => !line.trim().startsWith("import "))
		.join("\n");

	let calls = 0;
	for (const symbol of symbols) {
		const pattern = new RegExp(`\\b${escapeRegex(symbol)}\\s*\\(`, "g");
		const matches = codeWithoutImports.match(pattern);
		if (matches) {
			calls += matches.length;
		}
	}

	return calls;
};

const violations = [];
const details = [];

for (const target of budgetTargets) {
	let callCount = 0;
	for (const relativePath of target.files) {
		const absolutePath = path.resolve(workspaceRoot, relativePath);
		if (!fs.existsSync(absolutePath)) {
			violations.push(`${target.name}: file not found ${relativePath}`);
			continue;
		}

		const source = fs.readFileSync(absolutePath, "utf8");
		callCount += countRemoteCalls(source);
	}

	details.push(`${target.name}: ${callCount} call(s), budget ${target.maxCalls}`);
	if (callCount > target.maxCalls) {
		violations.push(
			`${target.name}: call budget exceeded (${callCount} > ${target.maxCalls})`
		);
	}
}

if (violations.length > 0) {
	console.error("Route call budget checks failed:");
	for (const detail of details) {
		console.error(`- ${detail}`);
	}
	for (const violation of violations) {
		console.error(`- ${violation}`);
	}
	process.exit(1);
}

console.log("Route call budget checks passed:");
for (const detail of details) {
	console.log(`- ${detail}`);
}
