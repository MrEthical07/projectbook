<script lang="ts">
	import LegalDocument from "$lib/components/legal/legal-document.svelte";
	import { termsAndConditions } from "$lib/content/legal";
</script>

<svelte:head>
	<title>Terms and Conditions - ProjectBook</title>
	<meta
		name="description"
		content="Read the ProjectBook Terms and Conditions covering acceptable use, account responsibilities, cookies, and service limits."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<LegalDocument document={termsAndConditions} />
