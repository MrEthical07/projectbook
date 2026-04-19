import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const workspaceRoot = process.cwd();

const checks = [
	{
		filePath: "src/lib/server/api/client.ts",
		mustContain: [
			"apiEnvelopeSchema",
			".strict()",
			"request_id",
			"access_expires_unix",
			"DELETE requests must not include a body."
		],
		mustNotContain: [
			"access_expires_utc",
			"accessExpiresUTC",
			"accessExpiresUnix",
			"candidate.session",
			"envelope?.requestId"
		]
	},
	{
		filePath: "src/lib/server/api/error-mapping.ts",
		mustContain: ["request_id"],
		mustNotContain: ["envelope?.requestId", "errorObject.requestId"]
	},
	{
		filePath: "src/lib/server/api/query-cache.ts",
		mustContain: [
			"handleProjectScopeChange",
			"[cache:project-switch-clear]",
			"user-project:"
		],
		mustNotContain: []
	},
	{
		filePath: "src/lib/server/api/remote.ts",
		mustContain: ["handleProjectScopeChange(event);"],
		mustNotContain: []
	},
	{
		filePath: "../Backend/internal/modules/auth/dto.go",
		mustContain: ["`json:\"access_expires_unix\"`"],
		mustNotContain: ["access_expires_utc"]
	},
	{
		filePath: "../Backend/internal/modules/activity/dto.go",
		mustContain: [
			"`json:\"items\"`",
			"`json:\"next_cursor,omitempty\"`"
		],
		mustNotContain: []
	},
	{
		filePath: "../Backend/internal/modules/calendar/dto.go",
		mustContain: [
			"`json:\"items\"`",
			"`json:\"next_cursor,omitempty\"`"
		],
		mustNotContain: []
	},
	{
		filePath: "../Backend/internal/core/response/response.go",
		mustContain: [
			"`json:\"success\"`",
			"`json:\"request_id,omitempty\"`"
		],
		mustNotContain: ["requestId"]
	},
	{
		filePath: "src/lib/remote/project.remote.ts",
		mustContain: [
			"`${basePath}/dashboard`",
			"my_work"
		],
		mustNotContain: [
			"path: `${basePath}/dashboard/events`",
			"path: `${basePath}/activity`"
		]
	},
	{
		filePath: "src/lib/remote/activity.remote.ts",
		mustContain: ["next_cursor", "cursor"],
		mustNotContain: []
	},
	{
		filePath: "src/lib/remote/calendar.remote.ts",
		mustContain: ["next_cursor", "cursor"],
		mustNotContain: []
	}
];

const violations = [];

for (const check of checks) {
	const absolutePath = path.resolve(workspaceRoot, check.filePath);
	if (!fs.existsSync(absolutePath)) {
		violations.push(`${check.filePath}: file not found`);
		continue;
	}

	const content = fs.readFileSync(absolutePath, "utf8");
	for (const requiredSnippet of check.mustContain) {
		if (!content.includes(requiredSnippet)) {
			violations.push(
				`${check.filePath}: missing required snippet \"${requiredSnippet}\"`
			);
		}
	}

	for (const forbiddenSnippet of check.mustNotContain) {
		if (content.includes(forbiddenSnippet)) {
			violations.push(
				`${check.filePath}: forbidden legacy snippet found \"${forbiddenSnippet}\"`
			);
		}
	}
}

const remoteRoot = path.resolve(workspaceRoot, "src/lib/remote");
const remoteFiles = fs.readdirSync(remoteRoot).filter((name) => name.endsWith(".ts"));
const deleteBodyPattern = /method:\s*"DELETE"[\s\S]{0,220}(body\s*:|rawBody\s*:)/g;

for (const fileName of remoteFiles) {
	const relativePath = `src/lib/remote/${fileName}`;
	const absolutePath = path.resolve(workspaceRoot, relativePath);
	const content = fs.readFileSync(absolutePath, "utf8");
	if (deleteBodyPattern.test(content)) {
		violations.push(`${relativePath}: DELETE request includes body or rawBody`);
	}
}

if (violations.length > 0) {
	console.error("API contract checks failed:");
	for (const violation of violations) {
		console.error(`- ${violation}`);
	}
	process.exit(1);
}

console.log("API contract checks passed.");
