<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favi.png';
	let { children } = $props();
</script>

<svelte:head>
	<title>ProjectBook</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
