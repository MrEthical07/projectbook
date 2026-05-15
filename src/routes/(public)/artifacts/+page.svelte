<script lang="ts">
	import { reveal } from '$lib/publicComponents/reveal';
	import { getPublicPageSeo } from '$lib/seo/site';
	import {
		BookOpen,
		Target,
		Lightbulb,
		CheckSquare,
		MessageSquare,
		Map as MapIcon,
		FileText,
		Link2,
		ArrowRight,
		ArrowDown,
		CircleDot,
		ChevronRight,
		Layers,
		Eye,
		AlertCircle
	} from '@lucide/svelte';

	const seo = getPublicPageSeo('/artifacts');

	/* ── Data ─────────────────────────────────────────────────── */
	const primaryChain = [
		{
			step: '01',
			label: 'Story',
			stage: 'User Research',
			Icon: BookOpen,
			accent: '#a78bfa',
			bg: 'rgba(167,139,250,0.08)',
			border: 'rgba(167,139,250,0.25)',
			desc: 'Captures the user context that initiates the entire chain. Stories encode real observations before any solution thinking begins.',
			connectsTo: ['Problem', 'Journey'],
			receivesFrom: ['Feedback'],
			principle: 'Every execution artifact has an origin in observed reality.'
		},
		{
			step: '02',
			label: 'Problem',
			stage: 'Problem Definition',
			Icon: Target,
			accent: '#c084fc',
			bg: 'rgba(192,132,252,0.08)',
			border: 'rgba(192,132,252,0.25)',
			desc: 'Frames validated pain points derived from user stories. Problems are scoped, categorised, and always traceable to the insight that surfaced them.',
			connectsTo: ['Idea'],
			receivesFrom: ['Story', 'Journey'],
			principle: 'Structured problems prevent premature solution thinking.'
		},
		{
			step: '03',
			label: 'Idea',
			stage: 'Ideation',
			Icon: Lightbulb,
			accent: '#818cf8',
			bg: 'rgba(129,140,248,0.08)',
			border: 'rgba(129,140,248,0.25)',
			desc: 'Represents solution explorations anchored to specific problems. Ideas never float in isolation — they always reference the problem they address.',
			connectsTo: ['Task'],
			receivesFrom: ['Problem'],
			principle: 'Solutions without problems are assumptions, not insights.'
		},
		{
			step: '04',
			label: 'Task',
			stage: 'Execution',
			Icon: CheckSquare,
			accent: '#a78bfa',
			bg: 'rgba(167,139,250,0.08)',
			border: 'rgba(167,139,250,0.25)',
			desc: 'Moves ideas into active execution. Tasks inherit the full context lineage — the why is always visible alongside the what.',
			connectsTo: ['Feedback'],
			receivesFrom: ['Idea'],
			principle: 'Purposeful tasks carry their origin with them.'
		},
		{
			step: '05',
			label: 'Feedback',
			stage: 'Validation',
			Icon: MessageSquare,
			accent: '#c084fc',
			bg: 'rgba(192,132,252,0.08)',
			border: 'rgba(192,132,252,0.25)',
			desc: 'Validates execution outcomes against the original intent. Feedback closes the loop by feeding observations back toward the story that initiated the chain.',
			connectsTo: ['Story'],
			receivesFrom: ['Task'],
			principle: 'Outcomes validate — or invalidate — the hypotheses that started the work.'
		}
	];

	const contextLayer = [
		{
			label: 'Journey',
			stage: 'Experience Mapping',
			Icon: MapIcon,
			accent: '#7c3aed',
			bg: 'rgba(124,58,237,0.08)',
			border: 'rgba(124,58,237,0.2)',
			desc: 'Maps the full user experience across touchpoints and time. Journeys provide spatial context for pain points, enriching stories and grounding problems.',
			connectsTo: ['Story', 'Problem']
		},
		{
			label: 'Page',
			stage: 'Documentation',
			Icon: FileText,
			accent: '#475569',
			bg: 'rgba(71,85,105,0.1)',
			border: 'rgba(71,85,105,0.3)',
			desc: 'Rich documentation anchored to any artifact in the chain. Pages capture rationale and reasoning without becoming part of the execution chain itself.',
			connectsTo: ['Any artifact']
		},
		{
			label: 'Resource',
			stage: 'Reference',
			Icon: Link2,
			accent: '#334155',
			bg: 'rgba(51,65,85,0.12)',
			border: 'rgba(51,65,85,0.35)',
			desc: 'External links, references, and assets attached directly to artifacts. Resources keep context close without cluttering the workflow.',
			connectsTo: ['Any artifact']
		}
	];

	const principles2 = [
		{
			Icon: Layers,
			title: 'Lineage over isolation',
			accent: '#a78bfa',
			desc: 'Every artifact carries the full chain of decisions that created it. When you open a Task, you see the Idea, the Problem, and the Story — not just a description of work.'
		},
		{
			Icon: Eye,
			title: 'Visibility over assumption',
			accent: '#c084fc',
			desc: 'Nothing is assumed. Relationships between artifacts are explicit, navigable, and searchable. The system shows you what is connected — and what is not.'
		},
		{
			Icon: AlertCircle,
			title: 'Integrity over flexibility',
			accent: '#818cf8',
			desc: 'Artifacts enforce their own rules. A Task without an Idea, an Idea without a Problem — these states are surfaced, not silently permitted. Structure is the feature.'
		}
	];
</script>

<svelte:head>
	<title>{seo?.title ?? 'Artifact System - ProjectBook'}</title>
	<meta name="description" content={seo?.description ?? ''} />
	<meta name="robots" content="index, follow" />
	<meta name="googlebot" content="index, follow" />
	{#if seo?.canonical}
		<link rel="canonical" href={seo.canonical} />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:title" content={seo?.title ?? 'Artifact System - ProjectBook'} />
	<meta property="og:description" content={seo?.description ?? ''} />
	{#if seo?.canonical}
		<meta property="og:url" content={seo.canonical} />
	{/if}
	{#if seo?.ogImage}
		<meta property="og:image" content={seo.ogImage} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo?.title ?? 'Artifact System - ProjectBook'} />
	<meta name="twitter:description" content={seo?.description ?? ''} />
	{#if seo?.ogImage}
		<meta name="twitter:image" content={seo.ogImage} />
	{/if}
</svelte:head>

<!-- ── Hero ─────────────────────────────────────────────────── -->
<section
	class="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-20"
>
	<div
		class="background-size:60px_60px pointer-events-none absolute
    inset-0
    bg-[linear-gradient(rgba(139,92,246,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.035)_1px,transparent_1px)]"
	></div>
	<div
		class="pointer-events-none absolute top-1/2 left-1/2 h-125 w-225
               -translate-x-1/2 -translate-y-1/2
               blur-2xl
               [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.10)_0%,transparent_70%)]"
	></div>

	<div class="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
		<div
			class="hero-enter mb-10 inline-flex items-center gap-2 rounded-full border border-violet-500/30
                bg-violet-500/10 px-4 py-1.5 font-mono text-sm text-violet-300 [animation-delay:0ms]"
		>
			<span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400"></span>
			§ Artifact System
		</div>

		<h1
			class="hero-enter mb-6 text-[clamp(2.4rem,5.5vw,4.2rem)] leading-[1.1] font-bold tracking-[-0.025em]
               text-white [animation-delay:100ms]"
		>
			Work structured into{' '}
			<span
				class="bg-linear-to-br from-[#a78bfa] via-[#818cf8] to-[#818cf8] bg-clip-text text-transparent"
			>
				connected artifacts.
			</span>
		</h1>

		<p
			class="hero-enter mb-5 max-w-2xl text-lg leading-relaxed text-gray-400 [animation-delay:200ms]"
		>
			ProjectBook doesn't store tasks and documents. It builds execution artifacts — each one a
			deliberate step in a traceable chain of product thinking.
		</p>
		<p
			class="hero-enter mb-16 max-w-lg text-sm leading-relaxed text-gray-500 [animation-delay:350ms]"
		>
			Eight artifact types. One connected execution system.
		</p>

		<!-- Mini chain -->
		<div
			class="hero-enter flex flex-wrap items-center justify-center gap-1 [animation-delay:450ms]"
		>
			{#each primaryChain as node, i}
				<div class="flex items-center gap-1">
					<div
						class="flex items-center gap-2 rounded-xl px-3 py-2"
						style="background:{node.bg}; border:1px solid {node.border}"
					>
						<node.Icon size={14} color={node.accent} />
						<span class="text-xs font-medium whitespace-nowrap text-white">{node.label}</span>
					</div>
					{#if i < primaryChain.length - 1}
						<ArrowRight size={12} class="shrink-0 text-[#a78bfa]/35" />
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<div
		class="pointer-events-none absolute right-0 bottom-0 left-0 h-24
    [background:linear-gradient(to_bottom,transparent,#07070f)]"
	></div>
</section>

<!-- ── Primary lifecycle ─────────────────────────────────────── -->
<section class="relative bg-[#07070f] px-6 py-28">
	<div
		class="pointer-events-none absolute top-0 bottom-0 left-0 w-1/3
    [background:radial-gradient(ellipse_at_left_center,rgba(139,92,246,0.05)_0%,transparent_60%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-7xl">
		<div use:reveal class="mb-20">
			<div class="mb-5 font-mono text-xs tracking-widest text-[#a78bfa] uppercase">
				§ Primary Lifecycle
			</div>
			<h2
				class="mb-5 max-w-2xl text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-white"
			>
				Five stages. One continuous thread.
			</h2>
			<p class="max-w-lg leading-relaxed text-gray-500">
				The primary execution chain moves from user insight to validated outcome. Each artifact
				hands off context to the next — nothing is lost, nothing is assumed.
			</p>
		</div>

		<!-- Chain nodes -->
		<div class="flex flex-col gap-8 lg:grid lg:grid-cols-5 lg:gap-7">
			{#each primaryChain as node, i}
				<div class="relative min-w-0">
					<!-- Mobile connector -->
					{#if i < primaryChain.length - 1}
						<div
							class="pointer-events-none absolute top-full left-1/2 z-10 mt-1 flex
                            -translate-x-1/2 flex-col items-center lg:hidden"
						>
							<div class="h-5 w-px bg-[#a78bfa]/40"></div>

							<ArrowDown size={12} class="-mt-2 text-[#a78bfa]/40" />
						</div>
					{/if}

					<!-- Card -->
					<div
						use:reveal={{ delay: i * 100 }}
						class="group flex h-full flex-col rounded-2xl border border-white/[0.07]
                        bg-[rgba(10,10,22,0.95)] p-6 transition-all duration-300
                        hover:border-violet-500/30 xl:p-7"
					>
						<!-- Step + icon -->
						<div class="mb-5 flex items-start justify-between">
							<div
								class="flex h-11 w-11 items-center justify-center rounded-xl"
								style="
                                background:{node.bg};
                                border:1px solid {node.border};
                                box-shadow:0 0 24px {node.accent}10;
                            "
							>
								<node.Icon size={20} color={node.accent} />
							</div>

							<span class="font-mono text-xs opacity-30" style="color:{node.accent}">
								{node.step}
							</span>
						</div>

						<!-- Label -->
						<div class="mb-3">
							<div class="mb-1.5 font-semibold text-white">
								{node.label}
							</div>

							<span
								class="inline-block rounded px-2 py-0.5 font-mono text-[0.7rem]"
								style="background:{node.accent}14; color:{node.accent}"
							>
								{node.stage}
							</span>
						</div>

						<p class="mb-5 flex-1 text-[0.82rem] leading-relaxed text-gray-500">
							{node.desc}
						</p>

						<!-- Connections -->
						<div class="space-y-2">
							{#if node.receivesFrom.length}
								<div class="flex items-start gap-2">
									<span class="mt-0.5 shrink-0 font-mono text-[0.65rem] text-gray-500">
										← from
									</span>

									<div class="flex flex-wrap gap-1">
										{#each node.receivesFrom as r}
											<span
												class="rounded bg-white/4 px-1.5 py-0.5
                                                font-mono text-[0.65rem] text-white/30"
											>
												{r}
											</span>
										{/each}
									</div>
								</div>
							{/if}

							{#if node.connectsTo.length}
								<div class="flex items-start gap-2">
									<span class="mt-0.5 shrink-0 font-mono text-[0.65rem] text-gray-500"> → to </span>

									<div class="flex flex-wrap gap-1">
										{#each node.connectsTo as c}
											<span
												class="rounded px-1.5 py-0.5 font-mono text-[0.65rem]"
												style="background:{node.accent}12; color:{node.accent}"
											>
												{c}
											</span>
										{/each}
									</div>
								</div>
							{/if}
						</div>

						<!-- Hover reveal -->
						<div
							class="mt-4 border-t border-white/5 pt-4 opacity-0
                            transition-opacity duration-300 group-hover:opacity-100"
						>
							<p class="text-[0.75rem] leading-relaxed text-gray-500 italic">
								"{node.principle}"
							</p>
						</div>
					</div>

					<!-- Desktop connector -->
					{#if i < primaryChain.length - 1}
						<div
							class="pointer-events-none absolute top-1/2 left-full z-10 hidden
                            w-6 -translate-y-1/2 items-center lg:flex xl:w-7.5"
						>
							<div class="relative h-px flex-1 overflow-hidden">
								<div class="absolute inset-0 bg-[#a78bfa]/20"></div>

								<div class="anim-travel-h" style="animation-delay:{i * 0.6}s"></div>
							</div>

							<ArrowRight size={12} class="-ml-2 shrink-0 text-[#a78bfa]/40" />
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Feedback loop note -->
		<div use:reveal class="mt-8 flex items-center justify-center gap-3">
			<div
				class="h-px max-w-xs flex-1 [background:linear-gradient(to_right,transparent,rgba(192,132,252,0.2))]"
			></div>
			<div
				class="border-pb-2/12 flex items-center gap-2 rounded-full border bg-[#c084fc]/5 px-4
                  py-2 font-mono text-xs text-[#c084fc]/60"
			>
				<CircleDot size={12} />
				Feedback loops back to Story — the chain is continuous
			</div>
			<div
				class="h-px max-w-xs flex-1 [background:linear-gradient(to_left,transparent,rgba(192,132,252,0.2))]"
			></div>
		</div>
	</div>
</section>

<!-- ── Context layer ─────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-[#07070f] px-6 py-28">
	<div
		class="pointer-events-none absolute top-1/2 right-0 h-150
               w-125 -translate-y-1/2
               [background:radial-gradient(ellipse_at_right,rgba(139,92,246,0.06)_0%,transparent_65%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-6xl">
		<div use:reveal class="mb-20">
			<div class="mb-5 font-mono text-xs tracking-widest text-[#a78bfa] uppercase">
				§ Context Layer
			</div>
			<h2
				class="mb-5 max-w-2xl text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-white"
			>
				Supporting artifacts <span class="text-gray-500">enrich the chain.</span>
			</h2>
			<p class="max-w-lg leading-relaxed text-gray-500">
				Three additional artifact types sit alongside the primary execution chain. They provide
				context, documentation, and reference without disrupting workflow integrity.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
			{#each contextLayer as art, i}
				<div
					use:reveal={{ delay: i * 100 }}
					class="group overflow-hidden rounded-2xl border
                 border-white/[0.07] bg-[rgba(10,10,22,0.95)] transition-all duration-300 hover:border-violet-500/20"
				>
					<div class="flex items-center gap-4 border-b border-white/5 px-6 py-5">
						<div
							class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
							style="background:{art.bg}; border:1px solid {art.border}"
						>
							<art.Icon size={20} color={art.accent} />
						</div>
						<div>
							<div class="text-[1.05rem] font-semibold text-white">{art.label}</div>
							<div class="font-mono text-xs" style="color:{art.accent}; opacity:0.7">
								{art.stage}
							</div>
						</div>
					</div>

					<div class="space-y-4 px-6 py-5">
						<p class="text-sm leading-relaxed text-gray-500">{art.desc}</p>
						<div class="flex flex-wrap gap-1.5">
							{#each art.connectsTo as c}
								<span
									class="rounded-md px-2 py-0.5 font-mono text-[0.65rem]"
									style="background:{art.accent}10; color:{art.accent}; border:1px solid {art.accent}25"
								>
									→ {c}
								</span>
							{/each}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ── Artifact principles ───────────────────────────────────── -->
<section class="relative overflow-hidden bg-[#07070f] px-6 py-28">
	<div
		class="pointer-events-none absolute top-1/2 left-1/2 h-100 w-175
               -translate-x-1/2 -translate-y-1/2
               [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-6xl">
		<div use:reveal class="mb-16">
			<div class="mb-5 font-mono text-xs tracking-widest text-[#a78bfa] uppercase">
				§ Design Principles
			</div>
			<h2
				class="max-w-xl text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-white"
			>
				Built for traceability, <span class="text-gray-500">not just storage.</span>
			</h2>
		</div>

		<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
			{#each principles2 as p, i}
				<div
					use:reveal={{ delay: i * 100 }}
					class="group relative overflow-hidden rounded-2xl border border-white/[0.07]
                 bg-[rgba(10,10,22,0.95)] p-7 transition-all duration-300 hover:border-violet-500/25"
				>
					<div
						class="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity
                      duration-500 group-hover:opacity-100"
						style="background:radial-gradient(circle at 20% 20%,{p.accent}07 0%,transparent 60%)"
					></div>
					<div
						class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
						style="background:{p.accent}10; border:1px solid {p.accent}28"
					>
						<p.Icon size={20} color={p.accent} />
					</div>
					<div class="mb-3 font-semibold text-white">{p.title}</div>
					<p class="text-sm leading-relaxed text-gray-500">{p.desc}</p>
				</div>
			{/each}
		</div>

		<!-- CTA -->
		<div use:reveal class="mt-20 text-center">
			<a
				href="/workflow"
				class="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-medium
               text-white transition-all duration-200 hover:bg-violet-500 hover:shadow-xl hover:shadow-violet-500/30"
			>
				See the execution flow
				<ChevronRight size={16} />
			</a>
		</div>
	</div>
</section>
