<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button';
	import { reveal } from '$lib/publicComponents/reveal';
	import { getPublicPageSeo } from '$lib/seo/site';
	import {
		Server,
		Github,
		ExternalLink,
		Database,
		ShieldCheck,
		Unlock,
		Package,
		Clock,
		EyeOff
	} from '@lucide/svelte';

	const seo = getPublicPageSeo('/pricing');

	const neverDo = [
		{
			Icon: Unlock,
			accent: '#a78bfa',
			title: 'Never paywall your own data',
			desc: 'Reading and exporting everything in your workspace will always be free, including if you exceed a limit or stop paying.'
		},
		{
			Icon: Package,
			accent: '#c084fc',
			title: 'Never gate features in the open-source project',
			desc: 'Self-hosters get 100% of the functionality. There is no "community edition" with pieces removed. What you are paying for on the hosted version is us running the infrastructure, not access to features.'
		},
		{
			Icon: Clock,
			accent: '#818cf8',
			title: 'Never retroactively squeeze existing users',
			desc: 'If we introduce limits, workspaces created beforehand get grandfathered.'
		},
		{
			Icon: EyeOff,
			accent: '#a78bfa',
			title: 'No telemetry, no tracking, no selling data',
			desc: 'Self-hosted instances phone home to nobody.'
		}
	];

	const stack = ['Web app', 'API', 'Postgres', 'MongoDB', 'Redis'];

	const selfHostFacts = [
		{ Icon: Database, label: 'Your data lives in your database' },
		{ Icon: ShieldCheck, label: 'Apache 2.0 licensed' },
		{ Icon: Unlock, label: 'No limits, no license keys, no account required' }
	];

	const SELF_HOSTING_GUIDE =
		'https://github.com/MrEthical07/projectbook-backend/blob/main/SELF-HOSTING.md';
	const GITHUB_REPO = 'https://github.com/MrEthical07/projectbook';
</script>

<svelte:head>
	<title>{seo?.title ?? 'Pricing - ProjectBook'}</title>
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
	<meta property="og:title" content={seo?.title ?? 'Pricing - ProjectBook'} />
	<meta property="og:description" content={seo?.description ?? ''} />
	{#if seo?.canonical}
		<meta property="og:url" content={seo.canonical} />
	{/if}
	{#if seo?.ogImage}
		<meta property="og:image" content={seo.ogImage} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo?.title ?? 'Pricing - ProjectBook'} />
	<meta name="twitter:description" content={seo?.description ?? ''} />
	{#if seo?.ogImage}
		<meta name="twitter:image" content={seo.ogImage} />
	{/if}
</svelte:head>

<!-- ── Hero ─────────────────────────────────────────────────── -->
<section
	class="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-20"
>
	<div
		class="pointer-events-none absolute top-1/2 left-1/2 h-125 w-250
               -translate-x-1/2 -translate-y-1/2
               blur-2xl
               [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.10)_0%,transparent_68%)]"
	></div>

	<div class="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
		<div
			class="hero-enter mb-10 inline-flex items-center gap-2 rounded-full border border-primary/30
                bg-primary/10 px-4 py-1.5 font-mono text-sm text-primary [animation-delay:0ms]"
		>
			<span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400"></span>
			§ Pricing
		</div>

		<h1
			class="hero-enter mb-6 text-[clamp(2.4rem,5.5vw,4.2rem)] leading-[1.1] font-bold tracking-[-0.025em]
               text-gray-700 [animation-delay:100ms]"
		>
			ProjectBook is open source.{' '}
			<span
				class="bg-linear-to-br from-[#a78bfa] via-primary to-[#818cf8] bg-clip-text text-transparent"
			>
				Self-hosting is free and unlimited, permanently.
			</span>
		</h1>

		<p
			class="hero-enter mb-12 max-w-2xl text-lg leading-relaxed text-gray-600 [animation-delay:200ms]"
		>
			The hosted version at projectbook.dev is <span class="font-semibold text-gray-700"
				>free while we are in beta.</span
			>
			No credit card, no trial timer.
		</p>

		<div class="hero-enter flex flex-wrap justify-center gap-4 [animation-delay:350ms]">
			<a
				href={SELF_HOSTING_GUIDE}
				target="_blank"
				rel="noreferrer"
				class={buttonVariants({ variant: 'default', size: 'lg' })}
			>
				<Server size={16} />
				Self-hosting guide
			</a>
			<a
				href={GITHUB_REPO}
				target="_blank"
				rel="noreferrer"
				class={buttonVariants({ variant: 'outline', size: 'lg' })}
			>
				<Github size={16} />
				GitHub
			</a>
		</div>
	</div>
</section>

<!-- ── What we'll charge for later ───────────────────────────── -->
<section class="relative bg-white px-6 py-28">
	<div
		class="pointer-events-none absolute top-0 bottom-0 left-0 w-1/2
    [background:radial-gradient(ellipse_at_left_center,rgba(139,92,246,0.04)_0%,transparent_60%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-3xl">
		<div use:reveal class="mb-10">
			<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
				§ What We'll Charge For Later
			</div>
			<h2
				class="mb-6 text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-gray-700"
			>
				A generous free tier, and a <span class="text-primary">flat price per workspace.</span>
			</h2>
		</div>

		<div use:reveal={{ delay: 50 }} class="space-y-5">
			<p class="text-grey-600 leading-relaxed">
				Eventually the hosted version will have a <span class="font-semibold text-gray-700"
					>generous free tier</span
				>
				with a limit on the number of artifacts in a workspace, and a
				<span class="font-semibold text-gray-700">flat paid tier per workspace</span>, not per seat,
				because charging per person punishes teams for collaborating, which is the whole point of
				the product.
			</p>
			<p class="text-grey-600 leading-relaxed">
				We don't have exact numbers yet, and we'd rather set them by watching how real teams use
				ProjectBook than by guessing today. When we do set them, everything below still applies.
			</p>
		</div>
	</div>
</section>

<!-- ── What we will never do ─────────────────────────────────── -->
<section class="relative overflow-hidden bg-white px-6 py-28">
	<div
		class="pointer-events-none absolute top-1/2 right-0 h-150
               w-125 -translate-y-1/2
               [background:radial-gradient(ellipse_at_right,rgba(139,92,246,0.07)_0%,transparent_65%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-5xl">
		<div use:reveal class="mb-16">
			<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
				§ What We Will Never Do
			</div>
			<h2
				class="max-w-xl text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-gray-700"
			>
				Commitments, <span class="text-grey-600">not marketing.</span>
			</h2>
		</div>

		<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
			{#each neverDo as item, i}
				<div
					use:reveal={{ delay: i * 100 }}
					class="group relative overflow-hidden rounded-2xl border
                 bg-muted p-7 transition-all duration-300 hover:border-primary"
				>
					<div
						class="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity
                      duration-500 group-hover:opacity-100"
						style="background:radial-gradient(circle at 20% 20%,{item.accent}07 0%,transparent 60%)"
					></div>
					<div
						class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
						style="background:{item.accent}10; border:1px solid {item.accent}28"
					>
						<item.Icon size={20} color={item.accent} />
					</div>
					<div class="mb-3 font-semibold text-gray-700">{item.title}</div>
					<p class="text-grey-600 text-sm leading-relaxed">{item.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ── Self-hosting ──────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-white px-6 py-28">
	<div
		class="pointer-events-none absolute top-1/2 left-1/2 h-100 w-175
               -translate-x-1/2 -translate-y-1/2
               [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-4xl">
		<div use:reveal class="mb-12">
			<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
				§ Self-Hosting
			</div>
			<h2
				class="mb-6 text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-gray-700"
			>
				One command gets you <span class="text-primary">the whole stack.</span>
			</h2>
		</div>

		<div
			use:reveal={{ delay: 50 }}
			class="overflow-hidden rounded-2xl border bg-muted transition-all duration-300"
		>
			<div class="border-b px-6 py-4">
				<code class="font-mono text-sm text-primary">docker compose up</code>
			</div>
			<div class="p-6">
				<p class="text-grey-600 mb-6 leading-relaxed">
					<code class="font-mono text-sm text-gray-700">docker compose up</code> gets you the whole stack.
				</p>

				<div class="mb-6 flex flex-wrap gap-2">
					{#each stack as piece}
						<span class="rounded bg-primary/8 px-2.5 py-1 font-mono text-[0.7rem] text-primary">
							{piece}
						</span>
					{/each}
				</div>

				<div class="space-y-3">
					{#each selfHostFacts as fact}
						<div class="flex items-center gap-3">
							<fact.Icon size={16} class="shrink-0 text-primary" />
							<span class="text-grey-600 text-sm">{fact.label}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div use:reveal={{ delay: 100 }} class="mt-8 flex flex-wrap gap-4">
			<a
				href={SELF_HOSTING_GUIDE}
				target="_blank"
				rel="noreferrer"
				class={buttonVariants({ variant: 'default', size: 'lg' })}
			>
				Self-hosting guide
				<ExternalLink size={16} />
			</a>
			<a
				href={GITHUB_REPO}
				target="_blank"
				rel="noreferrer"
				class={buttonVariants({ variant: 'outline', size: 'lg' })}
			>
				<Github size={16} />
				GitHub
			</a>
		</div>
	</div>
</section>

<!-- ── Why this model ────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-white px-6 py-32">
	<div
		class="pointer-events-none absolute top-1/2 left-1/2 h-125 w-200
               -translate-x-1/2 -translate-y-1/2
               blur-[30px]
               [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.09)_0%,transparent_65%)]"
	></div>
	<div
		class="background-size:60px_60px pointer-events-none absolute
    inset-0
    bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)]"
	></div>

	<div class="relative z-10 mx-auto max-w-3xl text-center">
		<div use:reveal>
			<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
				§ Why This Model
			</div>
			<h2
				class="mb-8 text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-gray-700"
			>
				Charge for what actually <span class="text-primary">costs money.</span>
			</h2>

			<p class="text-grey-600 mx-auto mb-6 max-w-xl leading-relaxed">
				Open-source products that gate features behind a paid tier tend to make the open version
				subtly worse on purpose. We'd rather the open project be genuinely complete and charge for
				the thing that actually costs money: running servers, backups, and updates so you don't have
				to.
			</p>

			<div
				class="bg-primary/5] mt-12 inline-block rounded-2xl border
                  border-primary/18 px-8 py-6"
			>
				<p class="font-mono text-sm leading-[1.9] text-primary">
					"If you self-host and never pay us anything,<br />
					that's a success, not a loophole."
				</p>
			</div>
		</div>
	</div>
</section>
