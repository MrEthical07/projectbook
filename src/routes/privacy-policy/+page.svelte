<script lang="ts">
	import LegalDocument from '$lib/components/legal/legal-document.svelte';
	import { privacyPolicy } from '$lib/content/legal';
	import { getPublicPageSeo } from '$lib/seo/site';

	const seo = getPublicPageSeo('/privacy-policy');
</script>

<svelte:head>
	<title>{seo?.title ?? 'Privacy Policy - ProjectBook'}</title>
	<meta name="description" content={seo?.description ?? ''} />
	<meta name="robots" content="index, follow" />
	<meta name="googlebot" content="index, follow" />
	{#if seo?.canonical}
		<link rel="canonical" href={seo.canonical} />
	{/if}
	<meta property="og:type" content="website" />
	<meta property="og:title" content={seo?.title ?? 'Privacy Policy - ProjectBook'} />
	<meta property="og:description" content={seo?.description ?? ''} />
	{#if seo?.canonical}
		<meta property="og:url" content={seo.canonical} />
	{/if}
	{#if seo?.ogImage}
		<meta property="og:image" content={seo.ogImage} />
	{/if}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo?.title ?? 'Privacy Policy - ProjectBook'} />
	<meta name="twitter:description" content={seo?.description ?? ''} />
	{#if seo?.ogImage}
		<meta name="twitter:image" content={seo.ogImage} />
	{/if}
</svelte:head>

<LegalDocument document={privacyPolicy} />
