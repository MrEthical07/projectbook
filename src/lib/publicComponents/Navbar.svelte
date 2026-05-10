<script lang="ts">
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { BookOpen, ExternalLink, Menu, X, ChevronRight, Github } from '@lucide/svelte';

	let scrolled = $state(false);
	let mobileOpen = $state(false);

	const links = [
		{ label: 'Workflow', href: '/workflow' },
		{ label: 'Artifacts', href: '/artifacts' },
		{ label: 'Collaboration', href: '/collaboration' }
	];

	onMount(() => {
		const onScroll = () => {
			scrolled = window.scrollY > 20;
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	/* Close drawer on route change */
	$effect(() => {
		page.url.pathname;
		mobileOpen = false;
	});
</script>

<header class="fixed top-0 right-0 left-0 z-50">
	<!-- ── Bar ── -->
	<div
		class="transition-all duration-300
    {scrolled || mobileOpen
			? 'border-b border-white/5 bg-[#07070f]/95 backdrop-blur-xl'
			: 'bg-transparent'}"
	>
		<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
			<!-- Logo -->
			<a href="/" class="flex shrink-0 items-center gap-2">
				<div class="flex h-7 w-7 items-center justify-center rounded-md bg-violet-600">
					<BookOpen size={14} class="text-white" />
				</div>
				<span class="font-semibold tracking-tight text-[#f8f8ff]">
					Project<span class="text-violet-400">Book</span>
				</span>
			</a>

			<!-- Desktop nav -->
			<nav class="hidden items-center gap-7 md:flex">
				{#each links as link}
					{@const active = page.url.pathname === link.href}
					<a
						href={link.href}
						class="group relative text-sm transition-colors duration-200
              {active ? 'text-white' : 'text-gray-400 hover:text-white'}"
					>
						{link.label}
						<!-- active underline -->
						<span
							class="absolute -bottom-0.5 left-0 h-px rounded-full transition-all duration-300
              {active
								? 'to-pb-2 w-full bg-linear-to-r from-[#a78bfa]'
								: 'w-0 bg-white/25 group-hover:w-full'}"
						>
						</span>
					</a>
				{/each}
			</nav>

			<!-- Right -->
			<div class="flex items-center gap-3">
				<a
					href="https://github.com/MrEthical07/projectbook"
					target="_blank"
					class="hidden h-9 w-9 items-center justify-center rounded-lg border-2 border-white/70 p-2 text-white/80
                 transition-all duration-200 hover:border-white hover:bg-white/8 hover:text-white hover:shadow-md
                 hover:shadow-white/25 md:flex"
					aria-label="GitHub"
				>
					<Github size={20} strokeWidth={2.5} />
				</a>

				<a
					href="/auth"
					class="hidden items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm
                 font-medium text-white transition-all duration-200 hover:bg-violet-500 hover:shadow-lg
                 hover:shadow-violet-500/25 md:flex"
				>
					Open App
					<ExternalLink size={14} />
				</a>

				<button
					onclick={() => (mobileOpen = !mobileOpen)}
					class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400
                 transition-colors hover:bg-white/8 md:hidden"
					aria-label="Toggle menu"
				>
					{#if mobileOpen}
						<X size={20} />
					{:else}
						<Menu size={20} />
					{/if}
				</button>
			</div>
		</div>
	</div>

	<!-- ── Mobile drawer ── -->
	{#if mobileOpen}
		<div
			transition:fly={{ y: -8, duration: 200 }}
			class="border-b border-white/5 bg-[#07070f]/98 backdrop-blur-xl md:hidden"
		>
			<div class="space-y-1 px-5 py-4">
				{#each links as link}
					{@const active = page.url.pathname === link.href}
					<a
						href={link.href}
						class="flex items-center justify-between rounded-xl px-4 py-3
                   text-sm transition-colors
                   {active
							? 'border border-violet-500/20 bg-violet-500/10 font-medium text-white'
							: 'border border-transparent text-white/60 hover:bg-white/5'}"
					>
						{link.label}
						<ChevronRight size={16} class="opacity-40" />
					</a>
				{/each}

				<a
					href="https://github.com/MrEthical07/projectbook"
					target="_blank"
					class="hover:bg-white/5transition-colors flex items-center justify-between gap-2 rounded-xl border
                 border-transparent px-4 py-3 text-white/60"
					aria-label="GitHub"
				>
					Github
					<ChevronRight size={16} class="opacity-40" />
				</a>

				<div class="mt-1 border-t border-white/5 pt-3">
					<a
						href="/auth"
						class="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4
                   py-3 text-sm font-medium text-white transition-all
                   duration-200 hover:bg-violet-500"
					>
						Open App
						<ExternalLink size={16} />
					</a>
				</div>
			</div>
		</div>
	{/if}
</header>
