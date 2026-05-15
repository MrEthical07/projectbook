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
		Search,
		LayoutGrid,
		Code2,
		ClipboardCheck,
		ArrowRight,
		Shield,
		GitBranch,
		Users,
		ExternalLink,
		ChevronRight
	} from '@lucide/svelte';

	const seo = getPublicPageSeo('/collaboration');

	/* ── Data ─────────────────────────────────────────────────── */
	const artifactChain = [
		{
			label: 'Story',
			Icon: BookOpen,
			accent: '#a78bfa',
			bg: 'rgba(167,139,250,0.08)',
			border: 'rgba(167,139,250,0.22)'
		},
		{
			label: 'Problem',
			Icon: Target,
			accent: '#c084fc',
			bg: 'rgba(192,132,252,0.08)',
			border: 'rgba(192,132,252,0.22)'
		},
		{
			label: 'Idea',
			Icon: Lightbulb,
			accent: '#818cf8',
			bg: 'rgba(129,140,248,0.08)',
			border: 'rgba(129,140,248,0.22)'
		},
		{
			label: 'Task',
			Icon: CheckSquare,
			accent: '#a78bfa',
			bg: 'rgba(167,139,250,0.08)',
			border: 'rgba(167,139,250,0.22)'
		},
		{
			label: 'Feedback',
			Icon: MessageSquare,
			accent: '#c084fc',
			bg: 'rgba(192,132,252,0.08)',
			border: 'rgba(192,132,252,0.22)'
		}
	];

	const roles = [
		{
			title: 'Researcher',
			roleLabel: 'Research & Discovery',
			Icon: Search,
			accent: '#a78bfa',
			bg: 'rgba(167,139,250,0.07)',
			border: 'rgba(167,139,250,0.2)',
			scope: ['Story'],
			desc: 'Researchers ground the team in reality. They author stories from direct observation, user interviews, and behavioral data — converting raw experience into structured understanding.',
			contribution: 'Surfaces the human truth behind every product decision.',
			principles: ['First-hand observation', 'Structured documentation', 'Research continuity']
		},
		{
			title: 'Product',
			roleLabel: 'Strategy & Definition',
			Icon: LayoutGrid,
			accent: '#c084fc',
			bg: 'rgba(192,132,252,0.07)',
			border: 'rgba(192,132,252,0.2)',
			scope: ['Problem', 'Idea'],
			desc: 'Product teams transform research into strategic direction. They frame problems from stories, evaluate ideas, and own the definition of what is worth building — and why.',
			contribution: 'Connects user reality to product direction and solution scope.',
			principles: ['Problem framing', 'Idea evaluation', 'Strategic continuity']
		},
		{
			title: 'Engineering',
			roleLabel: 'Execution & Delivery',
			Icon: Code2,
			accent: '#818cf8',
			bg: 'rgba(129,140,248,0.07)',
			border: 'rgba(129,140,248,0.2)',
			scope: ['Task'],
			desc: 'Engineering executes selected ideas with full context of the problem being solved. Tasks always carry their complete lineage. Execution is never context-free.',
			contribution: 'Delivers solutions with clarity of purpose and full reasoning visible.',
			principles: ['Context-aware execution', 'Purposeful delivery', 'Traceable implementation']
		},
		{
			title: 'Validation',
			roleLabel: 'Outcome & Feedback',
			Icon: ClipboardCheck,
			accent: '#c084fc',
			bg: 'rgba(192,132,252,0.07)',
			border: 'rgba(192,132,252,0.2)',
			scope: ['Feedback'],
			desc: 'Validation teams close the loop between execution and intent. They evaluate outcomes against the original problem definition — not subjective preference.',
			contribution: 'Validates outcomes and restarts the learning cycle with evidence.',
			principles: ['Hypothesis validation', 'Evidence-based outcomes', 'Loop closure']
		}
	];

	const principles = [
		{
			Icon: Shield,
			title: 'Clarity, not restriction',
			accent: '#a78bfa',
			desc: 'Role boundaries in ProjectBook are not about limiting access — they are about making responsibilities visible. Teams collaborate with shared understanding of who owns what.'
		},
		{
			Icon: GitBranch,
			title: 'Structure scales with teams',
			accent: '#c084fc',
			desc: 'As teams grow, structured collaboration prevents the chaos of uncontrolled editing. Workflows remain organised because ownership is explicit, not assumed.'
		},
		{
			Icon: Users,
			title: 'Execution integrity is shared',
			accent: '#818cf8',
			desc: 'No team member works in isolation. Researchers inform product. Product informs engineering. Engineering delivers. Validation confirms. Every role depends on the one before it.'
		}
	];
</script>

<svelte:head>
	<title>{seo?.title ?? 'Structured Collaboration - ProjectBook'}</title>
	<meta name="description" content={seo?.description ?? ''} />
	<meta name="robots" content="index, follow" />
	<meta name="googlebot" content="index, follow" />
	{#if seo?.canonical}
		<link rel="canonical" href={seo.canonical} />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:title" content={seo?.title ?? 'Structured Collaboration - ProjectBook'} />
	<meta property="og:description" content={seo?.description ?? ''} />
	{#if seo?.canonical}
		<meta property="og:url" content={seo.canonical} />
	{/if}
	{#if seo?.ogImage}
		<meta property="og:image" content={seo.ogImage} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo?.title ?? 'Structured Collaboration - ProjectBook'} />
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
		class="bg-size-[60px_60px] pointer-events-none absolute
    inset-0
    bg-[linear-gradient(rgba(139,92,246,0.085)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.085)_1px,transparent_1px)]"
	></div>
	<div
		class="pointer-events-none absolute top-1/2 left-1/2 h-125 w-225
               -translate-x-1/2 -translate-y-1/2
               blur-2xl
               [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.09)_0%,transparent_70%)]"
	></div>

	<div class="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
		<div
			class="hero-enter mb-10 inline-flex items-center gap-2 rounded-full border border-primary/30
                bg-primary/10 px-4 py-1.5 font-mono text-sm text-primary [animation-delay:0ms]"
		>
			<span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary"></span>
			§ Structured Collaboration
		</div>

		<h1
			class="hero-enter mb-6 text-[clamp(2.4rem,5.5vw,4.2rem)] leading-[1.1] font-bold tracking-[-0.025em]
               text-gray-700 [animation-delay:100ms]"
		>
			Collaboration that{' '}
			<span
				class="bg-linear-to-br from-primary via-primary to-[#818cf8] bg-clip-text text-transparent"
			>
				preserves structure.
			</span>
		</h1>

		<p
			class="hero-enter mb-5 max-w-2xl text-lg leading-relaxed text-gray-600 [animation-delay:200ms]"
		>
			In ProjectBook, teams work together within structured boundaries that preserve workflow
			integrity. Every collaborator has a clear role in the execution chain.
		</p>
		<p class="hero-enter mb-16 text-sm text-gray-500 [animation-delay:350ms]">
			Structure enables better teams. Not the other way around.
		</p>

		<!-- Roles preview — mobile 2×2 grid, desktop flex row with arrows -->
		<div class="hero-enter w-full [animation-delay:450ms]">
			<!-- Mobile 2×2 -->
			<div class="mx-auto grid max-w-xs grid-cols-2 gap-3 sm:hidden">
				{#each roles as role}
					<div
						class="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
						style="background:{role.bg}; border:1px solid {role.border}"
					>
						<role.Icon size={16} color={role.accent} />
						<div class="min-w-0">
							<div class="truncate text-xs font-semibold text-gray-700">{role.title}</div>
							<div
								class="truncate font-mono text-[0.6rem]"
								style="color:{role.accent}; opacity:0.6"
							>
								{role.scope.join(', ')}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Desktop flex row -->
			<div class="hidden flex-wrap items-center justify-center gap-3 sm:flex">
				{#each roles as role, i}
					<div class="flex items-center gap-2">
						<div
							class="flex items-center gap-2.5 rounded-xl px-4 py-2.5"
							style="background:{role.bg}; border:1px solid {role.border}"
						>
							<role.Icon size={16} color={role.accent} />
							<div>
								<div class="text-xs font-semibold text-gray-700">{role.title}</div>
								<div class="font-mono text-[0.6rem]" style="color:{role.accent}; opacity:0.6">
									{role.scope.join(', ')}
								</div>
							</div>
						</div>
						{#if i < roles.length - 1}
							<ArrowRight size={12} class="shrink-0 text-primary/30" />
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>

</section>

<!-- ── Role cards ─────────────────────────────────────────────── -->
<section class="relative px-6 py-28">
	<div
		class="pointer-events-none absolute top-1/2 right-0 h-96 w-96 -translate-y-1/2
    [background:radial-gradient(ellipse_at_right,rgba(139,92,246,0.06)_0%,transparent_65%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-6xl">
		<div use:reveal class="mb-20">
			<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
				§ Team Roles
			</div>
			<h2
				class="mb-5 max-w-2xl text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-gray-700"
			>
				Every team member owns a part <span class="text-primary">of the chain.</span>
			</h2>
			<p class="max-w-lg leading-relaxed text-gray-500">
				Different team members interact with different parts of the workflow depending on their
				responsibilities. Roles are not restrictions — they are clarity.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
			{#each roles as role, i}
				<div
					use:reveal={{ delay: i * 100 }}
					class="group overflow-hidden rounded-2xl border
                  bg-muted/70 transition-all duration-300 hover:border-primary/25"
				>
					<!-- Card header -->
					<div class="flex items-start gap-4 border-b px-6 py-5">
						<div
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
							style="background:{role.bg}; border:1px solid {role.border}"
						>
							<role.Icon size={20} color={role.accent} />
						</div>
						<div>
							<div class="mb-0.5 text-[1.05rem] font-semibold text-gray-700">{role.title}</div>
							<div class="font-mono text-xs" style="color:{role.accent}; opacity:0.7">
								{role.roleLabel}
							</div>
						</div>
					</div>

					<!-- Card body -->
					<div class="space-y-5 px-6 py-5">
						<p class="text-sm leading-relaxed text-gray-500">{role.desc}</p>

						<!-- Artifact scope -->
						<div>
							<div class="mb-2.5 font-mono text-[0.65rem] text-gray-700">Artifact scope</div>
							<div class="flex flex-wrap gap-2">
								{#each artifactChain as artifact}
									{@const inScope = role.scope.includes(artifact.label)}
									<div
										class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-200"
										style={inScope
											? `background:${role.accent}12; border:1px solid ${role.accent}30; color:${role.accent}`
											: `background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); color:rgba(255,255,255,0.18)`}
									>
										<artifact.Icon
											size={12}
											color={inScope ? role.accent : 'rgba(255,255,255,0.18)'}
										/>
										<span class="font-mono text-[0.68rem]">{artifact.label}</span>
									</div>
								{/each}
							</div>
						</div>

						<!-- Contribution -->
						<div
							class="flex items-start gap-2 rounded-xl p-4"
							style="background:{role.accent}15; border:1px solid {role.accent}50"
						>
							<div
								class="mt-2.5 h-1 w-1 shrink-0 rounded-full"
								style="background:{role.accent}"
							></div>
							<p
								class="text-[0.82rem] leading-relaxed italic"
								style="color:{role.accent}; opacity:0.8"
							>
								{role.contribution}
							</p>
						</div>

						<!-- Principles -->
						<div class="flex flex-wrap gap-1.5">
							{#each role.principles as pr}
								<span
									class="rounded-md bg-black/5 px-2 py-0.5 font-mono
                             text-[0.65rem] text-gray-700/80"
								>
									/ {pr}
								</span>
							{/each}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ── Scope map (coverage matrix) ──────────────────────────── -->
<section class="relative overflow-hidden px-6 py-28">
	<div
		class="pointer-events-none absolute top-1/2 left-0 h-96 w-96 -translate-y-1/2
    [background:radial-gradient(ellipse_at_left,rgba(139,92,246,0.07)_0%,transparent_65%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-6xl">
		<div use:reveal class="mb-20">
			<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
				§ Workflow Coverage
			</div>
			<h2
				class="mb-5 max-w-2xl text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-gray-700"
			>
				Every artifact is owned. <span class="text-primary">Nothing is ambiguous.</span>
			</h2>
			<p class="max-w-lg leading-relaxed text-gray-500">
				Across the full execution chain, every artifact has a team with clear responsibility. Gaps
				in ownership are visible — not hidden.
			</p>
		</div>

		<!-- Matrix — scrollable on mobile -->
		<div use:reveal>
			<p class="mb-2 text-right font-mono text-[0.65rem] text-gray-700/18 sm:hidden">← scroll →</p>
			<div class="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
				<div
					class="min-w-135 overflow-hidden rounded-2xl
                    border bg-muted/50"
				>
					<!-- Header row -->
					<div
						class="grid border-b px-4 py-4 sm:px-6"
						style="grid-template-columns: 140px repeat(5, 1fr)"
					>
						<div class="font-mono text-[0.65rem] text-gray-700">Team Role</div>
						{#each artifactChain as artifact}
							<div class="flex flex-col items-center gap-1.5">
								<div
									class="flex h-7 w-7 items-center justify-center rounded-lg"
									style="background:{artifact.bg}; border:1px solid {artifact.border}"
								>
									<artifact.Icon size={14} color={artifact.accent} />
								</div>
								<span class="text-center text-[0.7rem] font-medium text-gray-700">
									{artifact.label}
								</span>
							</div>
						{/each}
					</div>

					<!-- Role rows -->
					{#each roles as role, ri}
						<div
							class="grid items-center px-4 py-4 transition-colors hover:bg-black/1.5 sm:px-6 {ri < roles.length - 1
								? 'border-b border-muted-foreground/15'
								: ''}"
							style="grid-template-columns: 140px repeat(5, 1fr);"
						>
							<!-- Role label -->
							<div class="flex items-center gap-2 pr-3 sm:gap-3 sm:pr-4">
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
									style="background:{role.bg}; border:1px solid {role.border}"
								>
									<role.Icon size={14} color={role.accent} />
								</div>
								<div class="min-w-0">
									<div class="truncate text-[0.82rem] font-medium text-gray-700">{role.title}</div>
									<div
										class="truncate font-mono text-[0.6rem]"
										style="color:{role.accent}; opacity:0.5"
									>
										{role.scope.join(' · ')}
									</div>
								</div>
							</div>

							<!-- Scope cells -->
							{#each artifactChain as artifact}
								{@const active = role.scope.includes(artifact.label)}
								<div class="px-1">
									{#if active}
										<div
											class="flex h-10 items-center justify-center rounded-xl"
											style="background:{role.accent}14; border:1px solid {role.accent}35"
										>
											<artifact.Icon size={16} color={role.accent} />
										</div>
									{:else}
										<div class="h-10 rounded-xl border border-white/4 bg-white/3"></div>
									{/if}
								</div>
							{/each}
						</div>
					{/each}

					<!-- Footer -->
					<div
						class="flex flex-col items-start gap-3 border-t
                     px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
					>
						<span class="font-mono text-[0.65rem] text-gray-700">
							Coverage: 5/5 artifact stages — full chain ownership
						</span>
						<div class="flex shrink-0 items-center gap-4">
							<div class="flex items-center gap-1.5">
								<div class="border-pb-1/35 h-3 w-3 rounded-sm border bg-primary/30"></div>
								<span class="font-mono text-[0.6rem] text-gray-700">Active</span>
							</div>
							<div class="flex items-center gap-1.5">
								<div class="h-3 w-3 rounded-sm border border-black/4 bg-black/3"></div>
								<span class="font-mono text-[0.6rem] text-gray-700">Outside</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div use:reveal class="mt-6 text-center">
			<p class="text-xs text-gray-500">
				Each role owns its stage. The chain is owned collectively. No artifact is ownerless.
			</p>
		</div>
	</div>
</section>

<!-- ── Collaboration principles ──────────────────────────────── -->
<section class="relative overflow-hidden px-6 py-28">
	<div
		class="pointer-events-none absolute top-1/2 left-1/2 h-100 w-175
               -translate-x-1/2 -translate-y-1/2
               [background:radial-gradient(ellipse_at_center,rgba(139,92,246,0.06)_0%,transparent_70%)]"
	></div>

	<div class="relative z-10 mx-auto max-w-6xl">
		<div use:reveal class="mb-16">
			<div class="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
				§ Collaboration Principles
			</div>
			<h2
				class="max-w-xl text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.2] font-bold
                 tracking-[-0.02em] text-gray-700"
			>
				Collaboration without losing <span class="text-primary">execution clarity.</span>
			</h2>
		</div>

		<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
			{#each principles as p, i}
				<div
					use:reveal={{ delay: i * 100 }}
					class="group relative overflow-hidden rounded-2xl border 
                 bg-muted p-7 transition-all duration-300 hover:border-primary/25"
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
					<div class="] mb-3 font-semibold text-gray-700">{p.title}</div>
					<p class="text-sm leading-relaxed text-gray-500">{p.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ── Structure statement ───────────────────────────────────── -->
<section class="relative px-6 py-20">
	<div class="mx-auto max-w-5xl">
		<div
			use:reveal
			class="relative overflow-hidden rounded-2xl border border-primary/15
             bg-primary/4 p-10 md:p-14"
		>
			<!-- Corner decoration -->
			<div
				class="pointer-events-none absolute top-0 right-0 h-64 w-64
        [background:radial-gradient(circle_at_top_right,rgba(139,92,246,0.08)_0%,transparent_60%)]"
			></div>

			<div class="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
				<div>
					<div class="mb-6 font-mono text-xs tracking-widest text-primary uppercase">
						§ Key Insight
					</div>
					<h3
						class="mb-5 text-[clamp(1.4rem,2.5vw,2rem)] leading-tight font-bold
                     tracking-[-0.02em] text-gray-700"
					>
						Collaboration should preserve clarity,
						<span class="text-primary"> not destroy it.</span>
					</h3>
					<p class="text-sm leading-relaxed text-gray-500">
						Most collaboration tools add people to a shared canvas and hope for order to emerge.
						ProjectBook starts with order — and extends it to every team member who joins.
					</p>
				</div>

				<div class="space-y-3">
					{#each [{ label: 'Unstructured collaboration', items: ['Anyone edits anything', 'Ownership is ambiguous', 'Context collapses over time', 'Execution breaks down at scale'] }, { label: 'Structured collaboration', items: ['Every role has clear scope', 'Artifact ownership is explicit', 'Context flows through the chain', 'Execution scales with structure'], positive: true }] as col}
						<div
							class="rounded-xl p-5 border {col.positive ? 'border-primary/60 bg-primary/20' : 'bg-muted/50'}"
						>
							<div
								class="mb-3 font-mono text-xs {col.positive ? 'text-primary' : 'text-gray-700'}"
							>
								{col.label}
							</div>
							<ul class="space-y-1.5">
								{#each col.items as item}
									<li
										class="flex items-center gap-2 text-xs {col.positive ? 'text-gray-700' : 'text-gray-700/40'}"
									>
										<span
											class="h-1 w-1 shrink-0 rounded-full {col.positive ? 'bg-primary' : 'bg-gray-700'}"
										>
										</span>
										{item}
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Final CTA -->
		<div use:reveal class="mt-16 flex flex-col justify-center gap-4 sm:flex-row">
			<a
				href="/workflow"
				class={buttonVariants({
					variant: 'default',
					size: 'lg'
				})}
			>
				See the execution flow
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
</section>
