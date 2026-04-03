<script lang="ts">
	let { data } = $props();

	let sections = $derived(data.sections);
</script>

<svelte:head>
	<title>Docs • ProjectBook</title>
	<meta
		name="description"
		content="Reference documentation for workflows, artifacts, and platform usage."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<main class="min-h-screen bg-background p-4 sm:p-8">
	<div class="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
		<aside class="rounded-xl border border-border/70 bg-card p-4 lg:sticky lg:top-6 lg:h-fit">
			<div class="space-y-1">
				<h1 class="text-lg font-semibold">ProjectBook Docs</h1>
				<p class="text-xs text-muted-foreground">System usage and reference</p>
			</div>

			<nav class="mt-4 grid gap-1">
				{#each sections as section (section.id)}
					<a
						href={`#${section.id}`}
						class="rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
					>
						{section.title}
					</a>
				{/each}
			</nav>
		</aside>

		<div class="space-y-6">
			<section id="getting-started" class="rounded-xl border border-border/70 bg-card p-6">
				<h2 class="text-2xl font-semibold">Getting Started</h2>
				<div class="mt-3 space-y-2 text-sm text-muted-foreground">
					<p>1. Create a project from <strong>/projects/new</strong>.</p>
					<p>2. Invite collaborators and assign roles.</p>
					<p>3. Use the project dashboard to understand current state before acting.</p>
					<p>4. Move into artifacts to capture decisions and evidence.</p>
				</div>
			</section>

			<section id="design-thinking-flow" class="rounded-xl border border-border/70 bg-card p-6">
				<h2 class="text-2xl font-semibold">Design Thinking Flow</h2>
				<div class="mt-3 space-y-3 text-sm text-muted-foreground">
					<p><strong>Empathize:</strong> capture user stories and journeys.</p>
					<p><strong>Define:</strong> convert findings into clear problem statements.</p>
					<p><strong>Ideate:</strong> explore ideas and select promising directions.</p>
					<p><strong>Prototype:</strong> create tasks and execution plans.</p>
					<p><strong>Test:</strong> collect feedback and iterate with evidence.</p>
				</div>
			</section>

			<section id="artifact-guide" class="rounded-xl border border-border/70 bg-card p-6">
				<h2 class="text-2xl font-semibold">Artifact Guide</h2>
				<div class="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
					<div class="rounded-md bg-muted/40 p-3">
						<h3 class="font-medium text-foreground">Stories and Journeys</h3>
						<p class="mt-1">Capture user context and behavior before solutioning.</p>
					</div>
					<div class="rounded-md bg-muted/40 p-3">
						<h3 class="font-medium text-foreground">Problem Statements</h3>
						<p class="mt-1">Define validated problems and lock them when ready.</p>
					</div>
					<div class="rounded-md bg-muted/40 p-3">
						<h3 class="font-medium text-foreground">Ideas and Pages</h3>
						<p class="mt-1">Document options, rationale, and supporting references.</p>
					</div>
					<div class="rounded-md bg-muted/40 p-3">
						<h3 class="font-medium text-foreground">Tasks and Feedback</h3>
						<p class="mt-1">Track implementation and learning outcomes.</p>
					</div>
				</div>
			</section>

			<section id="faq" class="rounded-xl border border-border/70 bg-card p-6">
				<h2 class="text-2xl font-semibold">FAQ</h2>
				<div class="mt-3 space-y-4 text-sm text-muted-foreground">
					<div>
						<h3 class="font-medium text-foreground">Can I edit artifacts later?</h3>
						<p class="mt-1">Yes. Most artifact pages are editable unless status rules restrict actions.</p>
					</div>
					<div>
						<h3 class="font-medium text-foreground">How are permissions enforced?</h3>
						<p class="mt-1">Permissions are role-based. Owners and admins can manage membership and roles.</p>
					</div>
					<div>
						<h3 class="font-medium text-foreground">Where can I see cross-project activity?</h3>
						<p class="mt-1">Go to <strong>/activity</strong> for the workspace-level stream.</p>
					</div>
				</div>
			</section>
		</div>
	</div>
</main>
