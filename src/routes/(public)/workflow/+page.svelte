<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button';
	import { reveal } from '$lib/publicComponents/reveal';
	import { getPublicPageSeo } from '$lib/seo/site';
	import {
		BookOpen,
		Target,
		Lightbulb,
		CheckSquare,
		MessageSquare,
		ArrowRight,
		ArrowDown,
		RotateCcw,
		ChevronRight,
		ExternalLink,
		Layers,
		Compass,
		GitMerge
	} from '@lucide/svelte';

	const seo = getPublicPageSeo('/workflow');

	/* ── Data ─────────────────────────────────────────────────── */
	const stages = [
	{
		step: '01',
		label: 'Story',
		phase: 'Research & Understanding',
		Icon: BookOpen,
		accent: '#9D8BFA',
		bg: 'rgba(124,58,237,0.08)',
		border: '#9D8BFA30',
		glow: 'rgba(124,58,237,0.10)',
		question: 'What is the user actually experiencing?',
		inherits: ['Direct observation', 'Field research', 'Behavioral data'],
		produces: ['Structured user context', 'Problem hypothesis'],
		handoff: 'User context and problem hypothesis',
		desc: 'Stories encode the observed reality of user experience before any solution thinking begins. They are not feature requests — they are documented human truth.',
		example:
			'"Users consistently abandon checkout at step 3. In exit interviews, they cite uncertainty about whether delivery fees will change their total before payment is confirmed."'
	},
	{
		step: '02',
		label: 'Problem',
		phase: 'Problem Definition',
		Icon: Target,
		accent: '#A44DFA',
		bg: 'rgba(147,51,234,0.08)',
		border: '#A44DFA30',
		glow: 'rgba(147,51,234,0.10)',
		question: 'What specifically needs to be solved?',
		inherits: ['User context', 'Research findings', 'Story lineage'],
		produces: ['Scoped problem definition', 'Solution constraints'],
		handoff: 'Scoped problem definition with clear success criteria',
		desc: 'Problems structure the pain points surfaced by stories. Each problem is scoped, framed, and linked to its originating insight. Problems are never invented from assumptions.',
		example:
			'"Checkout flow does not show running delivery costs until the final confirmation step. Users cannot make an informed decision about cart contents before reaching payment."'
	},
	{
		step: '03',
		label: 'Idea',
		phase: 'Solution Exploration',
		Icon: Lightbulb,
		accent: '#8187F8',
		bg: 'rgba(79,70,229,0.08)',
		border: '#8187F828',
		glow: 'rgba(79,70,229,0.10)',
		question: 'How might we solve it?',
		inherits: ['Problem definition', 'Constraints', 'User context lineage'],
		produces: ['Solution hypothesis', 'Execution scope'],
		handoff: 'Solution hypothesis with inherited problem scope',
		desc: 'Ideas are solution explorations anchored to specific problems. An idea without a problem is an assumption. Ideation is structured, not free-floating.',
		example:
			'"Add a persistent order summary sidebar visible throughout all checkout steps, showing live-calculated delivery costs and total before confirmation is required."'
	},
	{
		step: '04',
		label: 'Task',
		phase: 'Execution',
		Icon: CheckSquare,
		accent: '#9A8CFA',
		bg: 'rgba(37,99,235,0.08)',
		border: '#9A8CFA28',
		glow: 'rgba(37,99,235,0.10)',
		question: 'What are we building, and why?',
		inherits: ['Solution hypothesis', 'Problem context', 'Full chain lineage'],
		produces: ['Completed deliverable', 'Execution record'],
		handoff: 'Completed execution artifact with full lineage',
		desc: 'Tasks move ideas into active execution with the full chain of reasoning visible at all times. Context is never stripped — execution is always purposeful, never arbitrary.',
		example:
			'"Implement sticky checkout sidebar component with real-time delivery cost calculation. Component must display across all 3 checkout steps and update on address input change."'
	},
	{
		step: '05',
		label: 'Feedback',
		phase: 'Validation',
		Icon: MessageSquare,
		accent: '#A284FC',
		bg: 'rgba(8,145,178,0.08)',
		border: '#A284FC28',
		glow: 'rgba(8,145,178,0.10)',
		question: 'Did we solve the right thing?',
		inherits: ['Execution artifact', 'Original problem definition', 'User story'],
		produces: ['Validated outcome', 'New story input'],
		handoff: 'Validated outcome → loops back to Story layer',
		desc: 'Feedback validates or invalidates the hypothesis that started the chain. It is measured against the original problem definition — not subjective preference.',
		example:
			'"Post-launch A/B test shows checkout completion rate increased 28%. Cart abandonment at step 3 dropped from 41% to 12%."'
	}
];

	const exChain = [
		{
			stage: 'Story',
			Icon: BookOpen,
			accent: '#a78bfa',
			bg: 'rgba(167,139,250,0.07)',
			border: 'rgba(167,139,250,0.2)',
			title: 'Checkout abandonment',
			content: 'Users leave at step 3 citing surprise fees and uncertainty about final cost.'
		},
		{
			stage: 'Problem',
			Icon: Target,
			accent: '#c084fc',
			bg: 'rgba(192,132,252,0.07)',
			border: 'rgba(192,132,252,0.2)',
			title: 'Fee transparency gap',
			content: 'Delivery costs are not visible until the final checkout confirmation step.'
		},
		{
			stage: 'Idea',
			Icon: Lightbulb,
			accent: '#818cf8',
			bg: 'rgba(129,140,248,0.07)',
			border: 'rgba(129,140,248,0.2)',
			title: 'Persistent order sidebar',
			content: 'Live-calculated running total and delivery fees shown throughout all steps.'
		},
		{
			stage: 'Task',
			Icon: CheckSquare,
			accent: '#a78bfa',
			bg: 'rgba(167,139,250,0.07)',
			border: 'rgba(167,139,250,0.2)',
			title: 'Sticky sidebar component',
			content: 'Implement real-time order summary panel with delivery cost recalculation.'
		},
		{
			stage: 'Feedback',
			Icon: MessageSquare,
			accent: '#c084fc',
			bg: 'rgba(192,132,252,0.07)',
			border: 'rgba(192,132,252,0.2)',
			title: '28% lift in completion',
			content:
				'A/B test confirms fee transparency as primary driver. Abandonment at step 3 dropped 71%.'
		}
	];

	const STEP_DELAY = 0.65;
	const LINE_OFFSET = 0.28;

	const principles = [
		{
			Icon: Layers,
			title: 'Context is never stripped',
			accent: '#a78bfa',
			desc: 'Every artifact in the chain carries the full lineage of decisions that created it. A task always knows the idea it implements, the problem it addresses, and the story it originated from.'
		},
		{
			Icon: Compass,
			title: 'Progression is enforced',
			accent: '#c084fc',
			desc: 'Artifacts cannot skip stages or exist without structural intent. Ideation cannot begin without a defined problem. Execution cannot begin without an idea.'
		},
		{
			Icon: GitMerge,
			title: 'Validation closes the loop',
			accent: '#818cf8',
			desc: 'Feedback is not a sentiment box. It is a structured validation artifact that references the original hypothesis — confirming or challenging the reasoning that started the chain.'
		}
	];
</script>

<svelte:head>
	<title>{seo?.title ?? 'Execution Flow - ProjectBook'}</title>
	<meta name="description" content={seo?.description ?? ''} />
	<meta name="robots" content="index, follow" />
	<meta name="googlebot" content="index, follow" />
	{#if seo?.canonical}
		<link rel="canonical" href={seo.canonical} />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:title" content={seo?.title ?? 'Execution Flow - ProjectBook'} />
	<meta property="og:description" content={seo?.description ?? ''} />
	{#if seo?.canonical}
		<meta property="og:url" content={seo.canonical} />
	{/if}
	{#if seo?.ogImage}
		<meta property="og:image" content={seo.ogImage} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo?.title ?? 'Execution Flow - ProjectBook'} />
	<meta name="twitter:description" content={seo?.description ?? ''} />
	{#if seo?.ogImage}
		<meta name="twitter:image" content={seo.ogImage} />
	{/if}
</svelte:head>

<!-- ── Hero ─────────────────────────────────────────────────── -->
<section
	class="relative flex min-h-[78vh] flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-20"
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
			§ Execution System
		</div>

		<h1
			class="hero-enter mb-6 text-[clamp(2.4rem,5.5vw,4.2rem)] leading-[1.1] font-bold tracking-[-0.025em]
               text-gray-700 [animation-delay:100ms]"
		>
			Every stage of work,{' '}
			<span
				class="bg-linear-to-br from-[#a78bfa] via-primary to-[#818cf8] bg-clip-text text-transparent"
			>
				deliberately connected.
			</span>
		</h1>

		<p
			class="hero-enter mb-4 max-w-2xl text-lg leading-relaxed text-gray-600 [animation-delay:200ms]"
		>
			ProjectBook is not a collection of tools. It is a structured lifecycle where every decision
			carries the reasoning that created it — from the first user observation to the final validated
			outcome.
		</p>
		<p class="hero-enter mb-16 text-sm text-grey-600 [animation-delay:350ms]">
			Context preserved. Reasoning intact. Outcomes traceable.
		</p>

		<!-- Chain — desktop -->
		<div
			class="hero-enter hidden flex-wrap items-center justify-center gap-0 [animation-delay:450ms] sm:flex"
		>
			{#each stages as s, i}
				<div class="flex items-center">
					<div
						class="node-glow flex w-20 flex-col items-center gap-2 rounded-2xl px-4 py-3.5"
						style="background:{s.bg}; border:1px solid {s.border}; --glow:{s.glow}; animation-delay:{i *
							STEP_DELAY}s"
					>
						<s.Icon size={20} color={s.accent} />
						<span class="text-xs font-semibold whitespace-nowrap text-gray-700">{s.label}</span>
						<span
							class="font-mono text-[0.6rem] whitespace-nowrap opacity-50"
							style="color:{s.accent}">{s.step}</span
						>
					</div>
					{#if i < stages.length - 1}
						<div class="flex w-10 shrink-0 items-center gap-0.5">
							<div class="relative h-px flex-1 overflow-hidden bg-primary/20">
								<div class="anim-travel-h" style="animation-delay:{i * STEP_DELAY + LINE_OFFSET}s"></div>
							</div>
							<ArrowRight size={12} class="shrink-0 text-primary/40" />
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Chain — mobile vertical -->
		<div
			class="hero-enter mx-auto flex w-full max-w-xs flex-col items-center gap-2 [animation-delay:450ms] sm:hidden"
		>
			{#each stages as s, i}
				<div class="flex w-full flex-col items-center">
					{#if i > 0}
						<div class="flex flex-col items-center py-1">
							<div class="h-5 w-px bg-primary/25"></div>
							<ArrowDown size={12} class="text-primary/40" />
						</div>
					{/if}
					<div
						class="flex w-full items-center gap-3 rounded-xl px-4 py-3"
						style="background:{s.bg}; border:1px solid {s.border}"
					>
						<s.Icon size={16} color={s.accent} />
						<span class="flex-1 text-sm font-semibold text-gray-700">{s.label}</span>
						<span class="shrink-0 font-mono text-[0.65rem] opacity-40" style="color:{s.accent}"
							>{s.step}</span
						>
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-6 flex items-center gap-2 font-mono text-[0.7rem] text-primary">
			<RotateCcw size={12} />
			Feedback validates and restarts the chain
		</div>
	</div>
</section>

<!-- ── Stage detail ─────────────────────────────────────────── -->
<section class="relative bg-white px-6 py-28">
	<div
		class="pointer-events-none absolute top-0 bottom-0 left-0 w-1/2
    [background:radial-gradient(ellipse_at_left_center,rgba(139,92,246,0.04)_0%,transparent_60%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-5xl">
		<div use:reveal class="mb-24">
			<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
				§ Stage Detail
			</div>
			<h2
				class="mb-5 max-w-2xl text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-gray-700"
			>
				Every stage answers a question. <span class="text-primary">In sequence.</span>
			</h2>
			<p class="max-w-lg leading-relaxed text-grey-600">
				Each stage inherits context from the previous one and passes enriched understanding forward.
				Work does not restart - it deepens.
			</p>
		</div>

		<!-- Timeline -->
		<div class="relative">
			<!-- Vertical spine -->
			<div
				class="pointer-events-none absolute top-8 bottom-8 left-6 hidden w-px [background:linear-gradient(to_bottom,transparent,rgba(139,92,246,0.25)_8%,rgba(139,92,246,0.25)_92%,transparent)]
        md:block"
			></div>

			<div class="space-y-4">
				{#each stages as stage, i}
					<div>
						<div use:reveal={{ delay: 50 }} class="flex items-start gap-8">
							<!-- Desktop step marker -->
							<div class="hidden shrink-0 flex-col items-center gap-2 pt-1 md:flex">
								<div
									class="z-10 flex h-12 w-12 items-center justify-center rounded-full bg-muted"
									style="border:1px solid {stage.border}; box-shadow:0 0 24px {stage.glow}"
								>
									<stage.Icon size={20} color={stage.accent} />
								</div>
							</div>

							<!-- Stage card -->
							<div
								class="group flex-1 overflow-hidden rounded-2xl border
                            bg-muted transition-all duration-300 hover:border-primary"
							>
								<!-- Card header -->
								<div
									class="border-white/5] flex flex-wrap items-start justify-between gap-2 border-b
                             px-4 py-4 sm:items-center sm:px-6"
								>
									<div class="flex flex-wrap items-center gap-3">
										<!-- Mobile icon -->
										<div
											class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg md:hidden bg-muted"
											style="border:1px solid {stage.border}"
										>
											<stage.Icon size={14} color={stage.accent} />
										</div>
										<div class="flex flex-wrap items-center gap-2">
											<span class="font-semibold text-gray-700">{stage.label}</span>
											<span
												class="rounded px-2 py-0.5 font-mono text-xs whitespace-nowrap"
												style="background:{stage.accent}12; color:{stage.accent}; font-size:0.68rem"
											>
												{stage.phase}
											</span>
										</div>
									</div>
									<span class="shrink-0 font-mono text-xs opacity-25" style="color:{stage.accent}">
										{stage.step}
									</span>
								</div>

								<!-- Card body -->
								<div class="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
									<div>
										<p
											class="mb-4 text-[0.95rem] leading-relaxed font-medium"
											style="color:{stage.accent}"
										>
											{stage.question}
										</p>
										<p class="text-sm leading-relaxed text-grey-600">{stage.desc}</p>
									</div>
									<div class="space-y-4">
										<!-- Inherits -->
										<div>
											<div class="mb-2 font-mono text-[0.65rem] text-gray-700">← inherits</div>
											<div class="flex flex-wrap gap-1.5">
												{#each stage.inherits as item}
													<span
														class="rounded bg-black/4 px-2 py-0.5 font-mono
                                       text-[0.65rem] text-gray-700"
													>
														{item}
													</span>
												{/each}
											</div>
										</div>
										<!-- Produces -->
										<div>
											<div
												class="mb-2 font-mono text-[0.65rem]"
												style="color:{stage.accent}; opacity:0.6"
											>
												→ produces
											</div>
											<div class="flex flex-wrap gap-1.5">
												{#each stage.produces as item}
													<span
														class="rounded px-2 py-0.5 font-mono text-[0.65rem]"
														style="background:{stage.accent}10; color:{stage.accent}"
													>
														{item}
													</span>
												{/each}
											</div>
										</div>
										<!-- Example -->
										<div class="border-white/5] rounded-xl border bg-white/2 p-4">
											<div
												class="mb-2 font-mono text-[0.62rem] opacity-40"
												style="color:{stage.accent}"
											>
												// example artifact
											</div>
											<p class="text-[0.78rem] leading-relaxed text-grey-600 italic">
												{stage.example}
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- Handoff connector -->
						{#if i < stages.length - 1}
							<div class="flex items-center gap-3 py-1 pl-0 md:pl-20">
								<div class="flex justify-center py-1">
									<div class="relative flex flex-col items-center gap-1">
										<div class="relative h-8 w-px overflow-hidden rounded-full bg-[#a78bfa]/15">
											<div class="anim-travel-v" style="animation-delay:{i * 0.4}s"></div>
										</div>
										<ArrowDown size={12} class="text-primary/40" />
									</div>
								</div>
								<div
									class="font-mono text-[0.65rem] leading-relaxed wrap-break-word"
									style="color:rgba(139,92,246,0.85)"
								>
									passes forward: {stage.handoff}
								</div>
							</div>
						{/if}
					</div>
				{/each}

				<!-- Chain closes -->
				<div use:reveal class="mt-6 flex items-center gap-3 md:pl-20">
					<RotateCcw size={16} class="text-primary" />
					<span class="font-mono text-[0.7rem] text-primary">
						Feedback closes the loop — new stories begin here
					</span>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ── Example chain ─────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-white px-6 py-28">
	<div
		class="pointer-events-none absolute top-1/2 right-0 h-150
               w-125 -translate-y-1/2
               [background:radial-gradient(ellipse_at_right,rgba(139,92,246,0.07)_0%,transparent_65%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-6xl">
		<div use:reveal class="mb-20 text-center">
			<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
				§ Execution In Practice
			</div>
			<h2
				class="mb-5 text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-gray-700"
			>
				From observation <span class="text-primary">to outcome.</span>
			</h2>
			<p class="mx-auto max-w-xl leading-relaxed text-grey-600">
				A single user observation becomes a validated product outcome — traceable through every
				stage.
			</p>
		</div>

		<!-- Cards: horizontal desktop, vertical mobile -->
		<div class="flex flex-col items-stretch gap-0 lg:flex-row">
			{#each exChain as item, i}
				<div class="flex min-w-0 flex-1 flex-col lg:flex-row">
					<!-- Mobile connector -->
					{#if i > 0}
						<div class="flex justify-center py-2 lg:hidden">
							<div class="flex flex-col items-center gap-1">
								<div class="h-6 w-px bg-muted"></div>
								<ArrowDown size={12} class="text-primary/35" />
							</div>
						</div>
					{/if}

					<div
						use:reveal={{ delay: i * 90 }}
						class="group flex flex-1 cursor-default flex-col rounded-2xl
                   border  bg-muted p-5
                   transition-all duration-300 hover:border-primary"
					>
						<div class="mb-4 flex items-center gap-2">
							<div
								class="flex h-7 w-7 items-center justify-center rounded-lg"
								style="background:{item.bg}; border:1px solid {item.border}"
							>
								<item.Icon size={14} color={item.accent} />
							</div>
							<span class="font-mono text-xs" style="color:{item.accent};"
								>{item.stage}</span
							>
						</div>
						<div class="mb-2 text-sm font-semibold text-gray-700">{item.title}</div>
						<p class="flex-1 text-[0.78rem] leading-relaxed text-grey-600">{item.content}</p>
					</div>

					<!-- Desktop connector -->
					{#if i < exChain.length - 1}
						<div class="hidden w-8 shrink-0 items-center lg:flex">
							<div class="relative h-px flex-1 overflow-hidden bg-[#a78bfa]/20">
								<div class="anim-travel-h" style="animation-delay:{i * 0.45}s"></div>
							</div>
							<ArrowRight size={12} class="shrink-0 text-primary/40" />
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Takeaway -->
		<div use:reveal class="mt-10 flex items-center justify-center gap-3">
			<div
				class="h-px max-w-xs flex-1 [background:linear-gradient(to_right,transparent,rgba(139,92,246,0.2))]"
			></div>
			<div
				class="rounded-full border border-primary/15 bg-primary/6 px-5
                  py-2.5 font-mono text-xs text-primary"
			>
				Every task above knows its complete origin
			</div>
			<div
				class="h-px max-w-xs flex-1 [background:linear-gradient(to_left,transparent,rgba(139,92,246,0.2))]"
			></div>
		</div>
	</div>
</section>

<!-- ── Execution principles ──────────────────────────────────── -->
<section class="relative overflow-hidden bg-white px-6 py-28">
	<div
		class="pointer-events-none absolute top-1/2 left-1/2 h-100 w-175
               -translate-x-1/2 -translate-y-1/2
               [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-6xl">
		<div use:reveal class="mb-16">
			<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
				§ Execution Principles
			</div>
			<h2
				class="max-w-xl text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-gray-700"
			>
				Structure as a feature, <span class="text-grey-600">not a constraint.</span>
			</h2>
		</div>

		<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
			{#each principles as p, i}
				<div
					use:reveal={{ delay: i * 100 }}
					class="group relative overflow-hidden rounded-2xl border 
                 bg-muted p-7 transition-all duration-300 hover:border-primary"
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
					<div class="mb-3 font-semibold text-gray-700">{p.title}</div>
					<p class="text-sm leading-relaxed text-grey-600">{p.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ── Closing CTA ───────────────────────────────────────────── -->
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
			<div
				class="bg-primary/5] mb-16 inline-block rounded-2xl border
                  border-primary/18 px-8 py-6"
			>
				<p class="font-mono text-sm leading-[1.9] text-primary">
					"ProjectBook preserves the full journey<br />
					from understanding a problem to validating a solution."
				</p>
			</div>

			<h2
				class="mb-5 text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-gray-700"
			>
				A living execution system.<br />
				<span class="text-primary">Every stage connected.</span>
			</h2>

			<p class="mx-auto mb-12 max-w-lg leading-relaxed text-grey-600">
				The workflow is not a feature list. It is the operating logic of structured product
				execution.
			</p>

			<div class="flex flex-wrap justify-center gap-4">
				<a
					href="/artifacts"
					class={buttonVariants({
						variant: 'default',
						size: 'lg'
					})}
				>
					Explore the artifacts
					<ChevronRight size={16} />
				</a>
				<a
					href="/auth"
					class={buttonVariants({
						variant: 'outline',
						size: 'lg'
					})}
				>
					Open App
					<ExternalLink size={16} />
				</a>
			</div>
		</div>
	</div>
</section>
