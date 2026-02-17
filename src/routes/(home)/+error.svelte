<script lang="ts">
	import { page } from "$app/state";
	import StatusErrorCard from "$lib/components/errors/status-error-card.svelte";
</script>

<StatusErrorCard
	status={page.status}
	message={page.error?.message}
	homeHref="/"
	containerClass="flex min-h-[calc(100vh-1rem)] items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/60 p-4"
/>
