<script lang="ts">
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/context.svelte.js";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import { PlusIcon, EllipsisIcon, Pen, Trash } from "@lucide/svelte";
  	import type { Component } from "svelte";
  	import Button from "../ui/button/button.svelte";
	const sidebar = useSidebar();
	let {
		item,
		projectId,
		path
	}: {
		item: {
			title: string;
			icon?: Component;
			prefix: string;
			isActive?: boolean;
			items?: {
				title: string;
				slug: string;
			}[];
		},
		projectId: string;
		path: string;
	} = $props();
	let isOpen = $derived(item.isActive);
	const add = () => {
		alert("add");
	}
</script>

	<Sidebar.Menu>
			<Collapsible.Root bind:open={isOpen} class="group/collapsible" >
				{#snippet child({ props })}
					<Sidebar.MenuItem {...props}>
						<Collapsible.Trigger>
							{#snippet child({ props })}
								<Sidebar.MenuButton {...props} tooltipContent={item.title}>
									<item.icon />
									<span class="whitespace-nowrap truncate">{item.title}</span>
									<ChevronRightIcon
										size={16}
										class="ml-auto transition-transform duration-200 {isOpen ? 'rotate-90' : ''}"
									/>
								</Sidebar.MenuButton>
							{/snippet}
						</Collapsible.Trigger>
						<Collapsible.Content class="pr-0">
							<Sidebar.MenuSub class="px-1.5 mr-0 pr-0">
								<Sidebar.MenuSubItem class="w-full mr-0 pr-0">
									<Sidebar.MenuSubButton class={path === item.prefix ? " bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary" : ""}>
										{#snippet child({ props })}
											<a href="/project/{projectId}/{item.prefix}"  {...props}>
												<span class="pr-6">All</span>
											</a>
										{/snippet}
									</Sidebar.MenuSubButton>
								</Sidebar.MenuSubItem>
								{#each item.items ?? [] as subItem (subItem.title)}
									<Sidebar.MenuSubItem class="w-full mr-0 pr-0">
										<Sidebar.MenuSubButton class={path.endsWith(item.prefix +'/'+ subItem.slug) ? " bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary" : ""}>
											{#snippet child({ props })}
												<a href="/project/{projectId}/{item.prefix}/{subItem.slug}"  {...props}>
													<span class="pr-6">{subItem.title}</span>
												</a>
												<DropdownMenu.Root>
													<DropdownMenu.Trigger>
														{#snippet child({ props })}
															<Sidebar.MenuAction {...props} class="mr-1 mb-0.5">
																<EllipsisIcon/>
																<span class="sr-only">More</span>
															</Sidebar.MenuAction>
														{/snippet}
													</DropdownMenu.Trigger>
													<DropdownMenu.Content
														class="w-48 rounded-lg"
														side={sidebar.isMobile ? "bottom" : "right"}
														align={sidebar.isMobile ? "end" : "start"}
													>
														<DropdownMenu.Item>
															<Pen class="text-muted-foreground" />
															<span>Rename</span>
														</DropdownMenu.Item>
														<DropdownMenu.Item>
															<Trash class="text-muted-foreground" />
															<span>Delete</span>
														</DropdownMenu.Item>
													</DropdownMenu.Content>
												</DropdownMenu.Root>
											{/snippet}
										</Sidebar.MenuSubButton>
									</Sidebar.MenuSubItem>
								{/each}
								<Sidebar.MenuSubItem>
									<Sidebar.MenuSubButton onclick={add}>
										{#snippet child({ props })}
											<div class="flex flex-row items-center gap-2 ml-1 px-2 py-1 border justify-center rounded hover:bg-accent"> 
												<PlusIcon class="size-4" />
												<div class=" text-xs">Add New Page</div>
											</div>
										{/snippet}
									</Sidebar.MenuSubButton>
								</Sidebar.MenuSubItem>
							</Sidebar.MenuSub>
						</Collapsible.Content>
					</Sidebar.MenuItem>
				{/snippet}
			</Collapsible.Root>
	</Sidebar.Menu>
