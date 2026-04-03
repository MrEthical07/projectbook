<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favi.png';
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>ProjectBook</title>
	<meta
		name="description"
		content="Design Thinking workspace for people-centric teams."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

{@render children()}
