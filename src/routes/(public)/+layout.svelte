<script lang="ts">
	import Navbar from '$lib/publicComponents/Navbar.svelte';
	import Footer from '$lib/publicComponents/Footer.svelte';

	let { children } = $props();
</script>

<Navbar />

<main class="bg-[#07070f]/95">
	{@render children()}
</main>

<Footer />
