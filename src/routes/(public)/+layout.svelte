<script lang="ts">
	import Navbar from '$lib/publicComponents/Navbar.svelte';
	import Footer from '$lib/publicComponents/Footer.svelte';

	let { children } = $props();
</script>

<Navbar />

<main class="bg-white">
	{@render children()}
</main>

<Footer />
