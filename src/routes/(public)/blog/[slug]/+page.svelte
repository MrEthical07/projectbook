<script lang="ts">
	import { page } from '$app/state';
	import { buildPageSeo } from '$lib/seo/site';
	import { formatPostDate } from '$lib/content/blog';
	import { ArrowLeft } from '@lucide/svelte';

	let { data } = $props();

	const post = $derived(data.post);
	const seo = $derived(
		buildPageSeo(`/blog/${post.slug}`, post.title, post.description, page.url.origin)
	);
</script>

<svelte:head>
	<title>{post.title} - ProjectBook</title>
	<meta name="description" content={post.description} />
	<meta name="robots" content="index, follow" />
	<meta name="googlebot" content="index, follow" />
	{#if seo.canonical}
		<link rel="canonical" href={seo.canonical} />
	{/if}
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content={seo.siteName} />
	<meta property="og:title" content={post.title} />
	<meta property="og:description" content={post.description} />
	{#if seo.canonical}
		<meta property="og:url" content={seo.canonical} />
	{/if}
	{#if seo.ogImage}
		<meta property="og:image" content={seo.ogImage} />
	{/if}
	{#if post.date}
		<meta property="article:published_time" content={post.date} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={post.title} />
	<meta name="twitter:description" content={post.description} />
	{#if seo.ogImage}
		<meta name="twitter:image" content={seo.ogImage} />
	{/if}
</svelte:head>

<article class="relative overflow-hidden bg-white px-6 pt-32 pb-32">
	<div
		class="pointer-events-none absolute top-0 left-1/2 h-100 w-200
               -translate-x-1/2
               blur-2xl
               [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.08)_0%,transparent_70%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-2xl">
		<a
			href="/blog"
			class="mb-10 inline-flex items-center gap-2 font-mono text-xs text-primary transition-colors hover:text-primary/80"
		>
			<ArrowLeft size={14} />
			Back to blog
		</a>

		<header class="mb-12">
			{#if post.date}
				<div class="mb-4 font-mono text-xs tracking-wide text-primary">
					{formatPostDate(post.date)}
				</div>
			{/if}
			<h1
				class="mb-5 text-[clamp(2rem,4.5vw,3rem)] leading-[1.15] font-bold tracking-[-0.025em] text-gray-700"
			>
				{post.title}
			</h1>
			<p class="text-lg leading-relaxed text-gray-600">{post.description}</p>
		</header>

		<div class="post-body">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html post.html}
		</div>
	</div>
</article>

<style>
	/* Markdown output is rendered from trusted in-repo files. Styles are scoped
	   here because the typography plugin is not registered globally. */
	.post-body :global(h2),
	.post-body :global(h3),
	.post-body :global(h4) {
		font-weight: 600;
		letter-spacing: -0.015em;
		color: var(--color-gray-700, #364153);
		margin-top: 2.75rem;
		margin-bottom: 1rem;
		line-height: 1.3;
	}

	.post-body :global(h2) {
		font-size: 1.5rem;
	}

	.post-body :global(h3) {
		font-size: 1.25rem;
	}

	.post-body :global(h4) {
		font-size: 1.1rem;
	}

	.post-body :global(p) {
		margin-bottom: 1.35rem;
		line-height: 1.8;
		color: var(--color-gray-600, #4a5565);
	}

	.post-body :global(ul) {
		margin: 0 0 1.35rem;
		padding-left: 1.25rem;
		list-style: disc;
	}

	.post-body :global(li) {
		margin-bottom: 0.6rem;
		line-height: 1.75;
		color: var(--color-gray-600, #4a5565);
	}

	.post-body :global(strong) {
		font-weight: 600;
		color: var(--color-gray-700, #364153);
	}

	.post-body :global(em) {
		font-style: italic;
	}

	.post-body :global(a) {
		color: var(--primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.post-body :global(a:hover) {
		opacity: 0.8;
	}

	.post-body :global(code) {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.85em;
		background: rgba(139, 92, 246, 0.08);
		color: var(--primary);
		padding: 0.15em 0.4em;
		border-radius: 0.3rem;
	}

	.post-body :global(pre) {
		background: var(--muted);
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		padding: 1rem 1.15rem;
		overflow-x: auto;
		margin-bottom: 1.35rem;
	}

	.post-body :global(pre code) {
		background: none;
		color: inherit;
		padding: 0;
		font-size: 0.85rem;
	}

	.post-body :global(blockquote) {
		border-left: 3px solid rgba(139, 92, 246, 0.35);
		padding-left: 1.1rem;
		margin: 0 0 1.35rem;
		font-style: italic;
	}

	.post-body :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 2.5rem 0;
	}
</style>
