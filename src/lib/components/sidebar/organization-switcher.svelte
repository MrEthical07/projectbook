<script lang="ts">
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/index.js";
	import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
	import PlusIcon from "@lucide/svelte/icons/plus";
  	import type { Component } from "svelte";

	let { organizations }: { organizations: { name: string; logo: Component; plan: string }[] } = $props();
	const sidebar = useSidebar();

	let activeOrganization = $state(organizations[0]);
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<Sidebar.Group>
      			<Sidebar.GroupLabel class="h-4">Organization</Sidebar.GroupLabel>
      			<Sidebar.GroupContent>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								{...props}
								size="lg"
								class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								<div
									class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
								>
									<activeOrganization.logo class="size-4" />
								</div>
								<div class="grid flex-1 text-start text-sm leading-tight">
									<span class="truncate font-medium">
										{activeOrganization.name}
									</span>
									<span class="truncate text-xs">{activeOrganization.plan}</span>
								</div>
								<ChevronsUpDownIcon class="ms-auto" />
							</Sidebar.MenuButton>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
						align="start"
						side={sidebar.isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenu.Label class="text-muted-foreground text-xs">Organizations</DropdownMenu.Label>
						{#each organizations as organization, index (index)}
							<DropdownMenu.Item onSelect={() => (activeOrganization = organization)} class="gap-2 p-2 hover:scale-101">
								<div class="flex size-6 items-center justify-center rounded-md border">
									<organization.logo class="size-3.5 shrink-0" />
								</div>
								{organization.name}
								</DropdownMenu.Item>
						{/each}
						<DropdownMenu.Separator />
						<DropdownMenu.Item class="gap-2 p-2">
							<div
								class="flex size-6 items-center justify-center rounded-md border bg-transparent"
							>
								<PlusIcon class="size-4" />
							</div>
							<div class="text-muted-foreground font-medium">Add Organization</div>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</Sidebar.GroupContent>
    		</Sidebar.Group>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
