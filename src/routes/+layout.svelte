<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import AppSidebar from "$lib/components/sidebar/app-sidebar.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{@render children()}
