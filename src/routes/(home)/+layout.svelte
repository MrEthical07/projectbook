<script lang="ts">
	import AppSidebar from "$lib/components/homeSidebar/sidebar.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import type { LayoutProps } from "./$types";

	let { data, children }: LayoutProps = $props();
</script>

<Sidebar.Provider>
	<AppSidebar homeSidebarData={data.homeSidebarData} />
	<Sidebar.Inset>
		<div class="bg-sidebar p-2 h-full">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
