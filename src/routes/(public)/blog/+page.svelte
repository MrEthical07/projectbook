<script lang="ts">
	import { reveal } from '$lib/publicComponents/reveal';
	import { getPublicPageSeo } from '$lib/seo/site';
	import { formatPostDate } from '$lib/content/blog';
	import { ArrowRight, PenLine } from '@lucide/svelte';

	let { data } = $props();

	const seo = getPublicPageSeo('/blog');
	const fallbackTitle = 'Blog - ProjectBook';

	const posts = $derived(data.posts);
</script>

<svelte:head>
	<title>{seo?.title ?? fallbackTitle}</title>
	<meta name="description" content={seo?.description ?? ''} />
	<meta name="robots" content="index, follow" />
	<meta name="googlebot" content="index, follow" />
	{#if seo?.canonical}
		<link rel="canonical" href={seo.canonical} />
	{/if}
	<meta property="og:type" content="website" />
	{#if seo?.siteName}
		<meta property="og:site_name" content={seo.siteName} />
	{/if}
	<meta property="og:title" content={seo?.title ?? fallbackTitle} />
	<meta property="og:description" content={seo?.description ?? ''} />
	{#if seo?.canonical}
		<meta property="og:url" content={seo.canonical} />
	{/if}
	{#if seo?.ogImage}
		<meta property="og:image" content={seo.ogImage} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo?.title ?? fallbackTitle} />
	<meta name="twitter:description" content={seo?.description ?? ''} />
	{#if seo?.ogImage}
		<meta name="twitter:image" content={seo.ogImage} />
	{/if}
</svelte:head>

<!-- ── Hero ─────────────────────────────────────────────────── -->
<section class="relative overflow-hidden px-6 pt-32 pb-16">
	<div
		class="pointer-events-none absolute top-1/2 left-1/2 h-125 w-250
               -translate-x-1/2 -translate-y-1/2
               blur-2xl
               [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.10)_0%,transparent_68%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-3xl text-center">
		<div
			class="hero-enter mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30
                bg-primary/10 px-4 py-1.5 font-mono text-sm text-primary [animation-delay:0ms]"
		>
			<span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400"></span>
			§ Blog
		</div>

		<h1
			class="hero-enter mb-6 text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.1] font-bold tracking-[-0.025em]
               text-gray-700 [animation-delay:100ms]"
		>
			Notes on building{' '}
			<span
				class="bg-linear-to-br from-[#a78bfa] via-primary to-[#818cf8] bg-clip-text text-transparent"
			>
				ProjectBook.
			</span>
		</h1>

		<p
			class="hero-enter mx-auto max-w-xl text-lg leading-relaxed text-gray-600 [animation-delay:200ms]"
		>
			Product thinking, structured execution, and what we are learning as we build in the open.
		</p>
	</div>
</section>

<!-- ── Post list ─────────────────────────────────────────────── -->
<section class="relative bg-white px-6 pt-8 pb-32">
	<div class="relative z-10 mx-auto max-w-3xl">
		{#if posts.length === 0}
			<div
				use:reveal
				class="flex flex-col items-center gap-4 rounded-2xl border bg-muted px-8 py-16 text-center"
			>
				<div
					class="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/8"
				>
					<PenLine size={20} class="text-primary" />
				</div>
				<div class="font-semibold text-gray-700">No posts yet</div>
				<p class="text-grey-600 max-w-sm text-sm leading-relaxed">
					The first post is on its way. Check back shortly.
				</p>
			</div>
		{:else}
			<div class="space-y-5">
				{#each posts as post, i (post.slug)}
					<a
						use:reveal={{ delay: i * 80 }}
						href={`/blog/${post.slug}`}
						class="group block overflow-hidden rounded-2xl border bg-muted p-7
                   transition-all duration-300 hover:border-primary"
					>
						{#if post.date}
							<div class="mb-3 font-mono text-xs tracking-wide text-primary">
								{formatPostDate(post.date)}
							</div>
						{/if}
						<h2 class="mb-3 text-xl font-semibold text-gray-700 sm:text-2xl">
							{post.title}
						</h2>
						<p class="text-grey-600 mb-5 text-sm leading-relaxed">
							{post.description}
						</p>
						<div class="flex items-center gap-2 text-sm font-medium text-primary">
							Read post
							<ArrowRight
								size={15}
								class="transition-transform duration-300 group-hover:translate-x-1"
							/>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</section>
