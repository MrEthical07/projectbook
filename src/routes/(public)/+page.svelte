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
		ChevronRight,
		GitBranch,
		SquarePlay,
		Github,
		ExternalLink,
		Ticket,
		StickyNote,
		MessageCircle,
		Table,
		PenLine,
		Inbox,
		AlertTriangle,
		ArrowDown,
		Map,
		Link2,
		FileText,
		Calendar,
		Users,
		Save,
		GitCommit,
		ShieldCheck,
		Lock,
		ArrowRightLeft,
		Sliders
	} from '@lucide/svelte';

	const seo = getPublicPageSeo('/');

	const actions = [
		{
			label: 'Open App',
			desc: 'Start working in ProjectBook',
			Icon: ExternalLink,
			primary: true,
			href: '/auth'
		},
		{
			label: 'Explore Demo',
			desc: 'See the workflow in action',
			Icon: SquarePlay,
			primary: false,
			href: 'https://demo.projectbook.dev'
		},
		{
			label: 'View GitHub',
			desc: 'Explore the source',
			Icon: Github,
			primary: false,
			href: 'https://github.com/MrEthical07/projectbook'
		},
		{
			label: 'Read Documentation',
			desc: 'Understand the architecture',
			Icon: BookOpen,
			primary: false,
			href: 'https://github.com/MrEthical07/projectbook/tree/main/docs'
		}
	];
	const chain = [
		{ label: 'Story', Icon: BookOpen, color: '#a78bfa', glow: 'rgba(167,139,250,0.94)' },
		{ label: 'Problem', Icon: Target, color: '#c084fc', glow: 'rgba(192,132,252,0.94)' },
		{ label: 'Idea', Icon: Lightbulb, color: '#818cf8', glow: 'rgba(129,140,248,0.94)' },
		{ label: 'Task', Icon: CheckSquare, color: '#a78bfa', glow: 'rgba(167,139,250,0.94)' },
		{ label: 'Feedback', Icon: MessageSquare, color: '#c084fc', glow: 'rgba(192,132,252,0.94)' }
	];

	const STEP_DELAY = 0.65;
	const LINE_OFFSET = 0.28;

	const principles = [
		{
			Icon: Save,
			title: 'Explicit Saves',
			accent: '#a78bfa',
			desc: 'No autosave. Every commit to the system is an intentional act. Deliberate changes, deliberate context.'
		},
		{
			Icon: GitCommit,
			title: 'Intentional Progression',
			accent: '#c084fc',
			desc: "Workflow stages are enforced. Artifacts can't skip stages or exist without structural intent."
		},
		{
			Icon: ShieldCheck,
			title: 'Validation Before Mutation',
			accent: '#818cf8',
			desc: 'Data integrity is enforced at the boundary. Invalid state cannot persist. The system refuses chaos.'
		},
		{
			Icon: Lock,
			title: 'Permission-Aware Execution',
			accent: '#a78bfa',
			desc: "Every action is permission-checked. The UI never shows what the backend wouldn't allow."
		},
		{
			Icon: ArrowRightLeft,
			title: 'Remote Boundaries',
			accent: '#c084fc',
			desc: 'Frontend and backend communicate across strict remote function boundaries — no leaking data contracts.'
		},
		{
			Icon: Sliders,
			title: 'Deterministic State',
			accent: '#818cf8',
			desc: 'Mutations are predictable. Side effects are explicit. Surprises are failures, not features.'
		}
	];

	const artifacts = [
		{
			label: 'Story',
			Icon: BookOpen,
			accent: '#a78bfa',
			links: ['Problem', 'Journey'],
			desc: 'Captures user understanding — research, context, and the raw insight driving product decisions.'
		},
		{
			label: 'Problem',
			Icon: Target,
			accent: '#c084fc',
			links: ['Story', 'Idea'],
			desc: 'Structures and frames pain points derived from stories. Scoped, categorised, linked to root insight.'
		},
		{
			label: 'Idea',
			Icon: Lightbulb,
			accent: '#818cf8',
			links: ['Problem', 'Task'],
			desc: 'Represents solution explorations scoped to specific problems. Never floats in isolation.'
		},
		{
			label: 'Task',
			Icon: CheckSquare,
			accent: '#a78bfa',
			links: ['Idea', 'Feedback'],
			desc: 'Manages execution with full lineage to the idea and problem it implements. Context always present.'
		},
		{
			label: 'Feedback',
			Icon: MessageSquare,
			accent: '#c084fc',
			links: ['Task', 'Story'],
			desc: 'Validates outcomes against original intent. Closes the loop back to the story that started it.'
		},
		{
			label: 'Page',
			Icon: FileText,
			accent: '#64748b',
			links: ['Any artifact'],
			desc: 'Rich documentation artifact. Supports context without becoming part of the chain itself.'
		},
		{
			label: 'Resource',
			Icon: Link2,
			accent: '#64748b',
			links: ['Any artifact'],
			desc: 'External references and links anchored to specific artifacts. Context without clutter.'
		}
	];

	const tags = ['Execution integrity', 'Workflow accountability', 'System awareness'];

	const flowNodes = [
		{ step: '01', label: 'Story', Icon: BookOpen, accent: '#a78bfa', tag: 'User Research' },
		{ step: '02', label: 'Problem', Icon: Target, accent: '#c084fc', tag: 'Problem Definition' },
		{ step: '03', label: 'Idea', Icon: Lightbulb, accent: '#818cf8', tag: 'Ideation' },
		{ step: '04', label: 'Task', Icon: CheckSquare, accent: '#a78bfa', tag: 'Execution' },
		{ step: '05', label: 'Feedback', Icon: MessageSquare, accent: '#c084fc', tag: 'Validation' }
	];

	const flowDescs = [
		'Research becomes structured understanding. User stories capture real-world insight before any solution is considered.',
		'Stories surface structured pain points. Each problem is traceable to its originating insight — reasoning is never lost.',
		'Problems generate solution explorations. Ideas are scoped, linked, and evaluated within the context of the problems they address.',
		'Ideas become executable artifacts. Tasks inherit context from the idea they implement — execution is always purposeful.',
		'Outcomes feed back into the system. Feedback validates or invalidates the hypotheses that started the chain.'
	];

	const support = [
		{ label: 'Journeys', Icon: Map, desc: 'Map the full user experience path' },
		{ label: 'Resources', Icon: Link2, desc: 'Link external context to artifacts' },
		{ label: 'Pages', Icon: FileText, desc: 'Rich documentation alongside work' },
		{ label: 'Calendar', Icon: Calendar, desc: 'Time-aware execution scheduling' },
		{ label: 'Collaboration', Icon: Users, desc: 'Scoped, role-aware participation' }
	];

	const tools = [
		{ label: 'Docs', Icon: FileText, x: 0, y: 0 },
		{ label: 'Tickets', Icon: Ticket, x: 20, y: -15 },
		{ label: 'Notes', Icon: StickyNote, x: -10, y: 10 },
		{ label: 'Chats', Icon: MessageCircle, x: 15, y: 5 },
		{ label: 'Sheets', Icon: Table, x: -20, y: -10 },
		{ label: 'Boards', Icon: PenLine, x: 5, y: 15 },
		{ label: 'Inbox', Icon: Inbox, x: -5, y: -5 }
	];

	const painPoints = [
		{
			title: 'Context fragmentation',
			desc: 'Decisions made in one tool are invisible in another.'
		},
		{
			title: 'Broken decision history',
			desc: 'The reasoning behind choices disappears as time passes.'
		},
		{
			title: 'Disconnected execution',
			desc: 'Tasks exist without connection to the problems they solve.'
		},
		{
			title: 'Shallow problem understanding',
			desc: 'Teams execute without tracing back to user research.'
		},
		{ title: 'Duplicate work', desc: 'Without lineage, the same ground gets covered repeatedly.' },
		{ title: 'Unclear ownership', desc: 'Artifacts have no clear origin, owner, or scope.' }
	];
</script>

<svelte:head>
	<title>{seo?.title ?? 'ProjectBook'}</title>
	<meta name="description" content={seo?.description ?? ''} />
	<meta name="robots" content="index, follow" />
	<meta name="googlebot" content="index, follow" />
	{#if seo?.canonical}
		<link rel="canonical" href={seo.canonical} />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:title" content={seo?.title ?? 'ProjectBook'} />
	<meta property="og:description" content={seo?.description ?? ''} />
	{#if seo?.canonical}
		<meta property="og:url" content={seo.canonical} />
	{/if}
	{#if seo?.ogImage}
		<meta property="og:image" content={seo.ogImage} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo?.title ?? 'ProjectBook'} />
	<meta name="twitter:description" content={seo?.description ?? ''} />
	{#if seo?.ogImage}
		<meta name="twitter:image" content={seo.ogImage} />
	{/if}
</svelte:head>

<div>
	<section
		class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden
          bg-[#FFFFFF] px-6 pt-24 pb-20"
	>
		<!-- Grid bg -->
		<div
			class="pointer-events-none absolute inset-0
			bg-[linear-gradient(rgba(139,92,246,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.10)_1px,transparent_1px)]
			bg-size-[60px_60px]"
		></div>

		<!-- Glow orb -->
		<div
			class="pointer-events-none absolute top-1/2 left-1/2 h-125 w-200
                -translate-x-1/2 -translate-y-1/2
                blur-[50px]
                [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.23)_0%,transparent_70%)]"
		></div>

		<!-- Content -->
		<div class="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
			<!-- Badge -->
			<div
				class="hero-enter mb-10
        inline-flex items-center gap-2 rounded-full border border-primary/30
        bg-primary/10 px-4 py-1.5 font-mono text-sm text-primary [animation-delay:0ms]"
			>
				<span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary"></span>
				Design Thinking as First-Class Infrastructure
			</div>

			<!-- Headline -->
			<h1
				class="hero-enter mb-6
        text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.1] font-bold tracking-[-0.02em]
        text-gray-700 [animation-delay:100ms]"
			>
				Product work as a{' '}
				<span
					class="bg-linear-to-br from-[#a78bfa] via-primary to-[#818cf8] bg-clip-text text-transparent"
				>
					connected execution system.
				</span>
			</h1>

			<!-- Sub -->
			<p
				class="hero-enter mb-12
        max-w-xl text-lg leading-relaxed text-gray-600 [animation-delay:200ms]"
			>
				ProjectBook models product development as a traceable chain of artifacts - from user insight
				to validated outcomes. Every decision has lineage. Every outcome has origin.
			</p>

			<!-- CTAs -->
			<div class="hero-enter mb-24 flex flex-wrap justify-center gap-4 [animation-delay:300ms]">
				<a
					href="/workflow"
					class={buttonVariants({
						variant: 'default',
						size: 'lg'
					})}
				>
					Explore the System
					<ChevronRight size={16} />
				</a>
				<a
					href="/artifacts"
					class={buttonVariants({
						variant: 'outline',
						size: 'lg'
					})}
				>
					View Artifacts
				</a>
			</div>

			<!-- Execution chain -->
			<div class="hero-enter flex w-full flex-col justify-center [animation-delay:500ms]">
				<div class="mb-6 font-mono text-xs tracking-widest text-gray-600 uppercase">
					The Execution Chain
				</div>

				<div class="hidden grid-cols-5 items-start gap-6 md:grid">
					{#each chain as node, i}
						<div class="relative flex w-full justify-center">
							<div class="flex flex-col items-center gap-2">
								<div
									class="node-glow flex h-16 w-16 items-center justify-center rounded-2xl
                                  transition-transform duration-300 hover:scale-105
                                  md:h-20 md:w-20"
									style="
										background:{node.color}32;
										backdrop-filter:blur(20px);
										border:1px solid {node.color}35;
										box-shadow:0 0 20px {node.color}15;
										--glow:{node.glow};
										animation-delay:{i * STEP_DELAY}s;
									"
								>
									<node.Icon size={28} color={node.color} />
								</div>

								<span class="text-sm font-medium text-gray-700">
									{node.label}
								</span>
							</div>

							{#if i < chain.length - 1}
								<div
									class="pointer-events-none absolute top-10 left-4/5 z-10 hidden
                                  -translate-y-1/2 items-center md:flex"
								>
									<div
										class="relative h-px w-10 overflow-hidden rounded-full
                                      bg-violet-500/20 lg:w-14 xl:w-20"
									>
										<div class="anim-travel-h" style="animation-delay:{i * STEP_DELAY + LINE_OFFSET}s"></div>
									</div>

									<ArrowRight size={12} class="-ml-0.5 shrink-0 text-primary/50" />
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Mobile grid -->
				<div class="mx-auto grid max-w-xs grid-cols-2 gap-3 sm:max-w-sm sm:grid-cols-3 md:hidden">
					{#each chain as node}
						<div
							class="flex items-center gap-2 rounded-xl px-3 py-2.5"
							style="background:{node.color}12; border:1px solid {node.color}35"
						>
							<node.Icon size={15} color={node.color} />
							<span class="text-xs font-medium text-gray-800">{node.label}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<section class="relative overflow-hidden bg-[#FFFFFF] px-6 py-32">
		<div class="mx-auto max-w-6xl">
			<!-- Header -->
			<div use:reveal class="mb-20">
				<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
					§ The Problem
				</div>
				<h2
					class="mb-6 max-w-2xl text-[clamp(1.8rem,4vw,3rem)] leading-[1.2] font-bold
                  tracking-[-0.02em] text-gray-800"
				>
					Fragmented tools break <span class="text-primary">thinking.</span>
				</h2>
				<p class="max-w-xl leading-relaxed text-gray-600">
					Modern product teams scatter their work across disconnected systems. Each tool captures a
					slice of reality, but none of them speak to each other. Context collapses. Decisions lose
					their origin.
				</p>
			</div>

			<div class="grid grid-cols-1 items-start gap-16 lg:grid-cols-2">
				<!-- Scattered tools visual -->
				<div use:reveal={{ delay: 100 }}>
					<div
						class="relative h-80 overflow-hidden rounded-2xl
                      border border-white/6 bg-muted"
					>
						<!-- Tool pills -->
						<div class="absolute inset-0 flex flex-wrap content-center justify-center gap-4 p-8">
							{#each tools as tool, i}
								<div
									class="reveal in-view flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 bg-gray-200 border-dashed border border-gray-400"
									style:transform={`translate(${tool.x}px, ${tool.y}px)`}
									style:transition-delay={`${i * 70}ms`}
								>
									<tool.Icon size={18} class="text-gray-600" />
									<span class="text-xs text-gray-600">{tool.label}</span>
								</div>
							{/each}
						</div>

						<!-- Broken lines SVG -->
						<svg
							class="pointer-events-none absolute inset-0 h-full w-full opacity-25"
							aria-hidden="true"
						>
							<line
								x1="20%"
								y1="30%"
								x2="45%"
								y2="60%"
								stroke="#121212"
								stroke-width="1"
								stroke-dasharray="4 6"
							/>
							<line
								x1="70%"
								y1="25%"
								x2="40%"
								y2="70%"
								stroke="#121212"
								stroke-width="1"
								stroke-dasharray="4 6"
							/>
							<line
								x1="80%"
								y1="60%"
								x2="55%"
								y2="40%"
								stroke="#121212"
								stroke-width="1"
								stroke-dasharray="4 6"
							/>
							<line
								x1="30%"
								y1="75%"
								x2="65%"
								y2="50%"
								stroke="#121212"
								stroke-width="1"
								stroke-dasharray="4 6"
							/>
						</svg>

						<!-- Label -->
						<div class="absolute right-0 bottom-4 left-0 flex justify-center">
							<div
								class="inline-flex items-center gap-2 rounded-lg border border-red-500/20
                          bg-red-500/10 px-3 py-1.5 font-mono text-xs text-red-400"
							>
								<AlertTriangle size={12} />
								No connection. No context. No continuity.
							</div>
						</div>
					</div>
				</div>

				<!-- Pain points grid -->
				<div use:reveal={{ delay: 150 }} class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{#each painPoints as pt, i}
						<div
							class="reveal in-view rounded-xl p-5 bg-muted border"
                    		style:transition-delay={`${i * 80}ms`}
						>
							<div class="mb-2 text-sm font-medium text-gray-800">{pt.title}</div>
							<div class="text-[0.8rem] leading-relaxed text-gray-600">{pt.desc}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<section id="workflow" class="relative bg-[#FFFFFF] px-6 py-32">
		<!-- Subtle grid -->
		<div
			class="bg-size-[60px_60px] pointer-events-none absolute
      inset-0
      bg-[linear-gradient(rgba(139,92,246,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.08)_1px,transparent_1px)]"
		></div>

		<div class="relative z-10 mx-auto max-w-6xl">
			<!-- Header -->
			<div use:reveal class="mb-24 text-center">
				<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
					§ Design Thinking Execution Flow
				</div>
				<h2
					class="mb-6 text-[clamp(1.8rem,4vw,3rem)] leading-[1.2] font-bold tracking-[-0.02em] text-gray-800"
				>
					Not task management.{' '}
					<span class="text-primary">Execution continuity.</span>
				</h2>
				<p class="mx-auto max-w-xl leading-relaxed text-gray-600">
					ProjectBook enforces a structured lifecycle where every artifact is a link in a connected
					chain. Context, reasoning, and lineage are preserved at every step.
				</p>
			</div>

			<!-- Alternating flow chain -->
			<div class="relative">
				<!-- Vertical spine (desktop) -->
				<div
					class="pointer-events-none absolute top-0 bottom-0 left-1/2 hidden w-px [background:linear-gradient(to_bottom,transparent,rgba(139,92,246,0.3)_10%,rgba(139,92,246,0.3)_90%,transparent)]
          md:block"
				></div>

				<div class="space-y-6">
					{#each flowNodes as node, i}
						<div
							use:reveal={{ delay: i * 80 }}
							class="flex items-stretch gap-8 md:gap-16
                {i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}"
						>
							<!-- Card -->
							<div
								class="flex-1 rounded-2xl border border-white/[0.07] bg-muted
                          p-6 transition-all duration-300 hover:border-violet-500/30 md:p-8"
							>
								<div class="flex items-start gap-4">
									<div
										class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
										style="background:{node.accent}12; border:1px solid {node.accent}30"
									>
										<node.Icon size={20} color={node.accent} />
									</div>
									<div class="min-w-0 flex-1">
										<div class="mb-2 flex flex-wrap items-center gap-3">
											<h3 class="text-lg font-semibold text-gray-800">{node.label}</h3>
											<span
												class="rounded px-2 py-0.5 font-mono text-xs"
												style="background:{node.accent}15; color:{node.accent}"
											>
												{node.tag}
											</span>
										</div>
										<p class="text-sm leading-relaxed text-gray-600">{flowDescs[i]}</p>
									</div>
								</div>
							</div>

							<!-- Center node (desktop) -->
							<div class="hidden w-16 shrink-0 flex-col items-center justify-center md:flex">
								<div
									class="z-10 flex h-10 w-10 items-center justify-center rounded-full"
									style="background:{node.accent}20; border:1px solid {node.accent}50"
								>
									<span class="font-mono text-xs font-medium" style="color:{node.accent}">
										{node.step}
									</span>
								</div>
								{#if i < flowNodes.length - 1}
									<ArrowDown size={16} class="mt-2 text-violet-500/30" />
								{/if}
							</div>

							<!-- Empty spacer for alternating layout -->
							<div class="hidden flex-1 md:block"></div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Supporting systems -->
			<div use:reveal class="mt-24">
				<div class="mb-10 text-center font-mono text-xs tracking-widest text-gray-600 uppercase">
					Supporting Systems
				</div>
				<div class="flex flex-wrap justify-center gap-4">
					{#each support as sys}
						<div
							class="flex items-center gap-3 rounded-xl border border-violet-500/15
                        bg-muted px-5 py-3"
						>
							<sys.Icon size={16} class="text-primary" />
							<div>
								<div class="text-sm font-medium text-gray-800">{sys.label}</div>
								<div class="text-xs text-gray-500">{sys.desc}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<section id="artifacts" class="relative overflow-hidden bg-[#FFFFFF] px-6 py-32">
		<!-- Right glow -->
		<div
			class="pointer-events-none absolute top-1/2 right-0 h-150
                w-125 -translate-y-1/2
                [background:radial-gradient(ellipse_at_right,rgba(139,92,246,0.07)_0%,transparent_70%)]"
		></div>

		<div class="relative z-10 mx-auto max-w-6xl">
			<!-- Header -->
			<div use:reveal class="mb-20">
				<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
					§ Artifact System
				</div>
				<h2
					class="mb-6 max-w-2xl text-[clamp(1.8rem,4vw,3rem)] leading-[1.2] font-bold
                  tracking-[-0.02em] text-gray-800"
				>
					Artifacts are connected,{' '}
					<span class="text-primary">not isolated.</span>
				</h2>
				<p class="max-w-xl leading-relaxed text-gray-600">
					Each artifact type represents a specific stage in product execution. They exist in
					relationship to each other — forming a traceable web of decisions and outcomes.
				</p>
			</div>

			<!-- Grid -->
			<div class="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each artifacts as a, i}
					<div
						use:reveal={{ delay: i * 60 }}
						class="group cursor-default rounded-2xl border bg-muted p-5
                  transition-all duration-300 hover:border-primary"
					>
						<div
							class="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
							style="background:{a.accent}12; border:1px solid {a.accent}30"
						>
							<a.Icon size={16} color={a.accent} />
						</div>

						<div class="mb-2 text-[0.95rem] font-semibold text-gray-800">{a.label}</div>
						<p class="mb-4 text-[0.8rem] leading-relaxed text-gray-500">{a.desc}</p>

						<div class="flex flex-wrap gap-1.5">
							{#each a.links as link}
								<span
									class="flex items-center gap-1 rounded-md bg-violet-500/8 px-2 py-0.5 font-mono
                            text-xs text-primary/70"
								>
									<GitBranch size={10} />
									{link}
								</span>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<!-- Orphan detection callout -->
			<div use:reveal class="rounded-2xl border border-yellow-500/15 bg-yellow-500/4 p-8">
				<div class="flex items-start gap-5">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                      border border-yellow-500/25 bg-yellow-500/10"
					>
						<AlertTriangle size={20} class="text-yellow-500" />
					</div>
					<div>
						<div class="mb-2 font-semibold text-yellow-400">Orphan Detection</div>
						<p class="mb-4 max-w-2xl text-sm leading-relaxed text-gray-600">
							Artifacts without meaningful linkage become visible as disconnected workflow states.
							The system surfaces orphaned artifacts — tasks without ideas, ideas without problems —
							communicating execution integrity issues before they become systemic failures.
						</p>
						<div class="flex flex-wrap gap-3">
							{#each tags as tag}
								<span class="font-mono text-xs text-yellow-600">/ {tag}</span>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="relative overflow-hidden bg-[#FFFFFF] px-6 py-32">
		<!-- Left glow -->
		<div
			class="pointer-events-none absolute top-1/2 left-0 h-150
                w-100 -translate-y-1/2
                [background:radial-gradient(ellipse_at_left,rgba(139,92,246,0.08)_0%,transparent_70%)]"
		></div>

		<div class="relative z-10 mx-auto max-w-6xl">
			<!-- Header -->
			<div use:reveal class="mb-20">
				<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
					§ Execution Philosophy
				</div>
				<h2
					class="mb-6 max-w-2xl text-[clamp(1.8rem,4vw,3rem)] leading-[1.2] font-bold
                  tracking-[-0.02em] text-gray-800"
				>
					Deliberate by design.
				</h2>
				<p class="max-w-xl leading-relaxed text-gray-600">
					ProjectBook values deliberate execution over uncontrolled editing. The system enforces
					discipline — not as a constraint, but as a guarantee of coherence.
				</p>
			</div>

			<!-- Grid -->
			<div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
				{#each principles as p, i}
					<div
						use:reveal={{ delay: i * 80 }}
						class="group relative cursor-default overflow-hidden rounded-2xl border 
                  bg-muted p-6 transition-all duration-300 hover:border-primary"
					>
						<!-- Hover glow -->
						<div
							class="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity
                        duration-500 group-hover:opacity-100"
							style="background:radial-gradient(circle at 20% 20%,{p.accent}08 0%,transparent 60%)"
						></div>

						<div
							class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
							style="background:{p.accent}12; border:1px solid {p.accent}30"
						>
							<p.Icon size={20} color={p.accent} />
						</div>

						<h3 class="mb-3 font-semibold text-gray-800">{p.title}</h3>
						<p class="text-sm leading-relaxed text-gray-500">{p.desc}</p>
					</div>
				{/each}
			</div>

			<!-- Philosophy statement -->
			<div use:reveal class="mt-20 text-center">
				<div
					class="inline-block rounded-2xl border border-primary/40
                    bg-primary/6 px-8 py-5"
				>
					<p class="max-w-lg font-mono text-sm leading-[1.8] text-primary">
						"ProjectBook does not optimize for speed of editing.<br />
						It optimizes for integrity of thinking."
					</p>
				</div>
			</div>
		</div>
	</section>

	<section id="cta" class="relative overflow-hidden bg-[#FFFFFF] px-6 py-40">
		<!-- Glow -->
		<div
			class="pointer-events-none absolute top-1/2 left-1/2 h-150 w-225
                -translate-x-1/2 -translate-y-1/2
                blur-[30px]
                [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.12)_0%,transparent_65%)]"
		></div>
		<!-- Grid -->
		<div
			class="bg-size:60px_60px pointer-events-none absolute
      inset-0
      bg-[linear-gradient(rgba(139,92,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.04)_1px,transparent_1px)]"
		></div>

		<div class="relative z-10 mx-auto max-w-4xl text-center">
			<div use:reveal>
				<div class="mb-6 font-mono text-xs tracking-widest text-primary uppercase">
					§ Begin Here
				</div>

				<h2
					class="mb-6 text-[clamp(2rem,5vw,3.5rem)] leading-[1.15] font-bold
                  tracking-[-0.02em] text-gray-800"
				>
					A system that preserves thinking.
				</h2>

				<p class="mx-auto mb-16 max-w-md leading-relaxed text-gray-600">
					ProjectBook is ready. The workflow is structured. The artifacts are connected. The
					architecture is in place. Explore the system.
				</p>

				<!-- Action buttons -->
				<div class="flex flex-wrap justify-center gap-4">
					{#each actions as action, i}
						<a
							href={action.href}
							class="group flex items-center gap-3 rounded-2xl px-6 py-4 transition-all duration-200
                {action.primary
								? 'bg-violet-600 hover:bg-violet-500 hover:shadow-xl hover:shadow-violet-500/30'
								: 'border hover:bg-white/5'}"
							style="transition-delay:{i * 80}ms"
						>
							<div>
								<div class="text-left text-sm font-medium {action.primary ? 'text-white' : 'text-gray-800 '}">{action.label}</div>
								<div
									class="mt-0.5 text-left text-xs
                  {action.primary ? 'text-white' : 'text-gray-500'}"
								>
									{action.desc}
								</div>
							</div>
							<action.Icon
								size={16}
								class="shrink-0 transition-transform group-hover:translate-x-0.5
                  {action.primary ? 'text-violet-200' : 'text-gray-500'}"
							></action.Icon>
						</a>
					{/each}
				</div>
			</div>
		</div>
	</section>
</div>
