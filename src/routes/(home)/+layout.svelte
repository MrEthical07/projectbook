<script lang="ts">
	import AppSidebar from '$lib/components/homeSidebar/sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
	<meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
	<meta name="description" content="Design Thinking project hub for people-centric teams." />
</svelte:head>

<Sidebar.Provider>
	<AppSidebar homeSidebarData={data.homeSidebarData} />
	<Sidebar.Inset>
		<div class="h-full bg-sidebar p-2">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
