<script lang="ts">
	import LegalDocument from "$lib/components/legal/legal-document.svelte";
	import { privacyPolicy } from "$lib/content/legal";
</script>

<svelte:head>
	<title>Privacy Policy - ProjectBook</title>
	<meta
		name="description"
		content="Read the ProjectBook Privacy Policy, including how the service handles account data, project content, and cookies."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<LegalDocument document={privacyPolicy} />