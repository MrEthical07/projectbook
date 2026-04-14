<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favi.png';
	let { children } = $props();
</script>

<svelte:head>
	<title>ProjectBook</title>
	<meta
		name="description"
		content="Design Thinking project hub for people-centric teams."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
