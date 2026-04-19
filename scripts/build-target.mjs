import { spawnSync } from 'node:child_process';

const target = (process.argv[2] ?? '').trim().toLowerCase();
const validTargets = new Set(['vercel', 'node']);

if (!validTargets.has(target)) {
	console.error('Invalid target. Usage: node scripts/build-target.mjs <vercel|node>');
	process.exit(1);
}

const result = spawnSync('vite', ['build'], {
	cwd: process.cwd(),
	stdio: 'inherit',
	shell: true,
	env: {
		...process.env,
		ADAPTER: target
	}
});

if (typeof result.status === 'number') {
	process.exit(result.status);
}

process.exit(1);
