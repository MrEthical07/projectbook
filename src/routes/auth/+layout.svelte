<script lang="ts">
	let { children } = $props();
</script>

<div class="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/10 via-background to-muted">
	<div
		class="pointer-events-none absolute inset-0 opacity-50"
		style="background-image: linear-gradient(to right, rgba(120, 120, 140, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(120, 120, 140, 0.12) 1px, transparent 1px); background-size: 28px 28px;"
	></div>
	<div class="pointer-events-none absolute -left-20 top-10 size-72 rounded-full bg-primary/25 blur-3xl"></div>
	<div class="pointer-events-none absolute right-0 top-1/3 size-80 rounded-full bg-primary/15 blur-3xl"></div>
	<div class="pointer-events-none absolute bottom-0 left-1/3 size-72 rounded-full bg-muted-foreground/10 blur-3xl"></div>

	<div class="relative z-10 min-h-screen">
		{@render children()}
	</div>
</div>
