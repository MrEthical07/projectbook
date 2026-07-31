import { access, readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

const readText = async (relativePath) => {
	const fileUrl = new URL(relativePath, projectRoot);
	return readFile(fileUrl, 'utf8');
};

const assert = (condition, message) => {
	if (!condition) {
		throw new Error(message);
	}
};

const run = async () => {
	const siteData = JSON.parse(await readText('src/lib/seo/site-data.json'));
	const expectedPublicPaths = [
		'/',
		'/artifacts',
		'/collaboration',
		'/workflow',
		'/blog',
		'/pricing',
		'/docs',
		'/terms-and-conditions',
		'/privacy-policy'
	];

	assert(
		siteData.publicPages.length === expectedPublicPaths.length,
		'Unexpected public page count'
	);
	for (const path of expectedPublicPaths) {
		assert(
			siteData.publicPages.some((page) => page.path === path),
			`Missing public page path: ${path}`
		);
	}

	const rootLayout = await readText('src/routes/+layout.svelte');
	assert(!rootLayout.includes('noindex'), 'Root layout should not include noindex');

	const publicPages = [
		'src/routes/(public)/+page.svelte',
		'src/routes/(public)/artifacts/+page.svelte',
		'src/routes/(public)/collaboration/+page.svelte',
		'src/routes/(public)/workflow/+page.svelte',
		'src/routes/(public)/blog/+page.svelte',
		'src/routes/(public)/pricing/+page.svelte',
		'src/routes/docs/+page.svelte',
		'src/routes/terms-and-conditions/+page.svelte',
		'src/routes/privacy-policy/+page.svelte'
	];

	for (const pagePath of publicPages) {
		const contents = await readText(pagePath);
		assert(
			contents.includes('name="robots" content="index, follow"'),
			`Missing indexable robots meta in ${pagePath}`
		);
		assert(contents.includes('rel="canonical"'), `Missing canonical link in ${pagePath}`);
		assert(contents.includes('property="og:title"'), `Missing og:title in ${pagePath}`);
		assert(contents.includes('property="og:site_name"'), `Missing og:site_name in ${pagePath}`);
		assert(contents.includes('property="og:url"'), `Missing og:url in ${pagePath}`);
		assert(contents.includes('property="og:image"'), `Missing og:image in ${pagePath}`);
		assert(
			contents.includes('name="twitter:card" content="summary_large_image"'),
			`Missing twitter:card in ${pagePath}`
		);
		assert(contents.includes('name="twitter:image"'), `Missing twitter:image in ${pagePath}`);
	}

	const privateLayouts = [
		'src/routes/(home)/+layout.svelte',
		'src/routes/project/[projectId]/+layout.svelte',
		'src/routes/auth/+layout.svelte'
	];

	for (const layoutPath of privateLayouts) {
		const contents = await readText(layoutPath);
		assert(
			contents.includes('noindex, nofollow, noarchive, nosnippet'),
			`Missing noindex meta in ${layoutPath}`
		);
	}

	const privatePages = ['src/routes/my-account/+page.svelte', 'src/routes/logout/+page.svelte'];

	for (const pagePath of privatePages) {
		const contents = await readText(pagePath);
		assert(
			contents.includes('noindex, nofollow, noarchive, nosnippet'),
			`Missing strict noindex meta in ${pagePath}`
		);
	}

	await access(new URL('src/routes/sitemap.xml/+server.ts', projectRoot));

	await access(new URL('static/robots.txt', projectRoot));
	await access(new URL('static/llms.txt', projectRoot));

	// Cross-file consistency. These four sources of truth drifted apart before,
	// so verify they still agree rather than only that the files exist.
	const robots = await readText('static/robots.txt');
	const robotsAllow = [...robots.matchAll(/^Allow:\s*(\S+)/gm)].map((match) => match[1]);
	const robotsDisallow = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((match) => match[1]);

	for (const page of siteData.publicPages) {
		assert(robotsAllow.includes(page.path), `robots.txt is missing Allow for ${page.path}`);
		assert(!robotsDisallow.includes(page.path), `robots.txt disallows public page ${page.path}`);
	}

	for (const path of siteData.disallowPaths) {
		assert(robotsDisallow.includes(path), `robots.txt is missing Disallow for ${path}`);
	}

	const llms = await readText('static/llms.txt');
	const [llmsPublicSection, llmsDisallowedSection = ''] = llms.split('## Disallowed areas');
	const llmsUrls = (section) =>
		[...section.matchAll(/^- https:\/\/projectbook\.dev(\/\S*)?$/gm)].map(
			(match) => match[1] ?? '/'
		);
	const llmsPublic = llmsUrls(llmsPublicSection);
	const llmsDisallowed = llmsUrls(llmsDisallowedSection);

	for (const page of siteData.publicPages) {
		assert(llmsPublic.includes(page.path), `llms.txt is missing public page ${page.path}`);
		assert(
			!llmsDisallowed.includes(page.path),
			`llms.txt lists public page ${page.path} under "Disallowed areas"`
		);
	}

	let robotsRouteExists = false;
	try {
		await access(new URL('src/routes/robots.txt/+server.ts', projectRoot));
		robotsRouteExists = true;
	} catch {
		robotsRouteExists = false;
	}
	assert(!robotsRouteExists, 'robots.txt route should be removed');

	let llmsRouteExists = false;
	try {
		await access(new URL('src/routes/llms.txt/+server.ts', projectRoot));
		llmsRouteExists = true;
	} catch {
		llmsRouteExists = false;
	}
	assert(!llmsRouteExists, 'llms.txt route should be removed');

	console.log('SEO checks passed.');
};

run().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
