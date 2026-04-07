<script lang="ts">
	import AppSidebar from "$lib/components/sidebar/app-sidebar.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as Card from "$lib/components/ui/card";
	import { Toaster } from "$lib/components/ui/sonner";
	import { can } from "$lib/utils/permission";
	import { page } from "$app/state";
	import { setContext } from "svelte";
	import type { LayoutProps } from "./$types";

	let { data, children }: LayoutProps = $props();
	const accessContext: ProjectAccess = {
		get user() {
			return data.access.user;
		},
		get role() {
			return data.access.role;
		},
		get permissionMask() {
			return data.access.permissionMask;
		},
		get permissions() {
			return data.access.permissions;
		}
	};
	setContext("access", accessContext);

	const resolveDomain = (pathname: string, projectId: string): PermissionDomain => {
		const marker = `/project/${projectId}/`;
		const scoped = pathname.startsWith(marker) ? pathname.slice(marker.length) : "";
		const segment = scoped.split("/")[0] ?? "";

		if (segment === "stories" || segment === "journeys") return "story";
		if (segment === "problem-statement") return "problem";
		if (segment === "ideas" || segment === "whiteboard") return "idea";
		if (segment === "tasks") return "task";
		if (segment === "feedback") return "feedback";
		if (segment === "resources") return "resource";
		if (segment === "pages") return "page";
		if (segment === "calendar") return "calendar";
		if (segment === "team") return "member";
		return "project";
	};

	const domainLabel = (domain: PermissionDomain): string => {
		if (domain === "member") return "Team";
		return domain.charAt(0).toUpperCase() + domain.slice(1);
	};

	let currentDomain = $derived(resolveDomain(page.url.pathname, page.params.projectId as string));
	let canViewCurrentDomain = $derived(can(data.access?.permissions, currentDomain, "view"));
</script>

<Sidebar.Provider>
	<AppSidebar sidebarData={data.sidebarData} />
	<Sidebar.Inset>
		<div class="bg-sidebar p-2 h-full">
			{#if canViewCurrentDomain}
				{@render children()}
			{:else}
				<div class="h-full rounded-lg bg-background p-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Access Denied</Card.Title>
							<Card.Description>
								You do not have permission to view the {domainLabel(currentDomain)} section.
								Contact your project administrator.
							</Card.Description>
						</Card.Header>
					</Card.Root>
				</div>
			{/if}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
<Toaster position="top-right" />
