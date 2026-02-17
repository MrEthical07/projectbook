<script lang="ts">
	import AppSidebar from "$lib/components/homeSidebar/sidebar.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	let { children } = $props();
</script>

<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<div class="bg-sidebar p-2 h-full">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
