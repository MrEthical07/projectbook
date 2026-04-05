<script lang="ts">
	import type { LegalDocumentData } from "$lib/content/legal";

	let { document }: { document: LegalDocumentData } = $props();
</script>

<main id="top" class="min-h-screen bg-linear-to-b from-background via-background to-muted/30 p-4 sm:p-8">
	<div class="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
		<aside class="lg:sticky lg:top-6 lg:h-fit">
			<div class="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
				<p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
					{document.eyebrow}
				</p>
				<div class="mt-4 space-y-1">
					<h2 class="text-lg font-semibold">On this page</h2>
					<p class="text-xs text-muted-foreground">Last updated {document.lastUpdated}</p>
				</div>

				<nav class="mt-4 grid gap-1">
					{#each document.sections as section (section.id)}
						<a
							href={`#${section.id}`}
							class="rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
						>
							{section.title}
						</a>
					{/each}
				</nav>

				{#if document.relatedLinks.length > 0}
					<div class="mt-5 border-t border-border/60 pt-4">
						<p class="text-xs font-medium text-foreground">Related</p>
						<div class="mt-2 grid gap-1">
							{#each document.relatedLinks as link (link.href)}
								<a
									href={link.href}
									class="rounded-md px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
								>
									{link.label}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</aside>

		<div class="space-y-6">
			<section class="rounded-xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
				<p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
					{document.eyebrow}
				</p>
				<h1 class="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{document.title}</h1>
				<p class="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
					{document.description}
				</p>

				<div class="mt-6 inline-flex rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
					Last updated {document.lastUpdated}
				</div>

				<div class="mt-6 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
					{document.reviewNotice}
				</div>
			</section>

			{#each document.sections as section (section.id)}
				<section id={section.id} class="rounded-xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<h2 class="text-2xl font-semibold tracking-tight">{section.title}</h2>
						<a
							href="#top"
							class="text-xs text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
						>
							Back to top
						</a>
					</div>

					<div class="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
						{#each section.paragraphs as paragraph (paragraph)}
							<p>{paragraph}</p>
						{/each}
					</div>

					{#if section.bullets}
						<ul class="mt-5 space-y-2 text-sm text-muted-foreground">
							{#each section.bullets as bullet (bullet)}
								<li class="flex items-start gap-3">
									<span class="mt-2 h-1.5 w-1.5 rounded-full bg-primary"></span>
									<span>{bullet}</span>
								</li>
							{/each}
						</ul>
					{/if}

					{#if section.cards}
						<div class="mt-5 grid gap-3 sm:grid-cols-2">
							{#each section.cards as card (card.title)}
								<article class="rounded-lg bg-muted/40 p-4">
									<h3 class="text-sm font-semibold text-foreground">{card.title}</h3>
									<p class="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
								</article>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	</div>
</main>