<script lang="ts">
	import { Book, BookMarked, BookOpen } from '@lucide/svelte';

	const pageLinks = [
		{ label: 'Workflow', href: '/workflow' },
		{ label: 'Artifacts', href: '/artifacts' },
		{ label: 'Collaboration', href: '/collaboration' }
	];
	const extLinks = [
		{ label: 'GitHub', href: 'https://github.com/MrEthical07/projectbook' },
		{ label: 'Documentation', href: 'https://github.com/MrEthical07/projectbook/tree/main/docs' }
	];
</script>

<footer class="border-t border bg-muted px-6 py-12">
	<div class="mx-auto max-w-6xl">
		<div class="flex flex-col items-center justify-between gap-8 md:flex-row">
			<!-- Logo -->
			<a href="/" class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-md bg-violet-600">
					<BookOpen size={16} class="text-white" />
				</div>
				<span class="text-[0.9rem] font-semibold text-black">
					Project<span class="text-violet-400">Book</span>
				</span>
			</a>

			<!-- Links -->
			<nav class="flex flex-wrap justify-center gap-6">
				{#each pageLinks as l}
					<a href={l.href} class="text-sm text-gray-600 transition-colors hover:text-gray-800">
						{l.label}
					</a>
				{/each}
				{#each extLinks as l}
					<a href={l.href} class="text-sm text-gray-600 transition-colors hover:text-gray-800">
						{l.label}
					</a>
				{/each}
			</nav>

			<!-- Meta -->
			<div class="font-mono text-xs text-gray-600">ProjectBook · 2026</div>
		</div>

		<div class="mt-8 border-t pt-8 text-center">
			<p class="text-xs text-gray-800">A structured operating system for product execution.</p>
		</div>
	</div>
</footer>
