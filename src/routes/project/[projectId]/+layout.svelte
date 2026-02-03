<script lang="ts">
	import AppSidebar from "$lib/components/sidebar/app-sidebar.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	let { children } = $props();
</script>

<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<main class="bg-sidebar p-2">
			{@render children()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
