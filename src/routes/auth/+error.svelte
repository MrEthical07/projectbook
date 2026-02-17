<script lang="ts">
	import { page } from "$app/state";
	import StatusErrorCard from "$lib/components/errors/status-error-card.svelte";
</script>

<StatusErrorCard
	status={page.status}
	message={page.error?.message}
	homeHref="/auth"
	containerClass="flex min-h-screen items-center justify-center p-4"
/>
