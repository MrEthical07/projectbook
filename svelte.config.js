import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const target = (process.env.ADAPTER ?? 'vercel').toLowerCase();

const resolveAdapter = () => {
	if (target === 'node') {
		return adapterNode();
	}
	if (target === 'vercel') {
		return adapterVercel({
			runtime: 'nodejs20.x'
		});
	}
	throw new Error(`Unsupported ADAPTER value: ${target}. Use "vercel" or "node".`);
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: true
	},
	kit: {
		adapter: resolveAdapter(),
		experimental: {
			remoteFunctions: true
		}
	}
};

export default config;
