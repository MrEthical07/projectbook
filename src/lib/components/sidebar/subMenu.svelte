<script lang="ts">
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/context.svelte.js";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import { PlusIcon, EllipsisIcon, Pen, Trash } from "@lucide/svelte";
  	import type { Component } from "svelte";
    import { store } from "$lib/stores.svelte";
    import type { ArtifactKind } from "$lib/types";

	const sidebar = useSidebar();
	let {
		item,
		projectId,
		path,
        prefix
	}: {
		item: {
			title: string;
			icon?: Component;
			prefix: string; // Used for routing
			isActive?: boolean;
			items?: {
				title: string;
				slug: string;
                id?: string;
			}[];
		},
		projectId: string;
		path: string;
        prefix?: string; // Explicit prefix passed from parent
	} = $props();

    // Fallback to item.prefix if not passed
    const activePrefix = $derived(prefix ?? item.prefix);

	let isOpen = $derived(item.isActive);

    const kindMap: Record<string, ArtifactKind> = {
        "stories": "story",
        "journeys": "journey",
        "problem-statement": "problem",
        "ideas": "idea",
        "whiteboard": "whiteboard",
        "feedback": "feedback",
        "pages": "page"
    };

    const getKind = (p: string): ArtifactKind | undefined => kindMap[p];

	const add = () => {
        const kind = getKind(activePrefix);
        if (!kind) {
            console.warn("Unknown prefix kind:", activePrefix);
            return;
        }
        const title = prompt(`Enter name for new ${kind}:`);
        if (!title) return;

        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const id = crypto.randomUUID();

        store.addArtifact({
            id,
            projectId,
            kind,
            title,
            slug,
            createdAt: new Date().toISOString().split('T')[0]
        });
	}

    const rename = (id: string, currentTitle: string) => {
        const newTitle = prompt("Rename to:", currentTitle);
        if (newTitle && newTitle !== currentTitle) {
            const slug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            store.updateArtifact(id, { title: newTitle, slug });
        }
    }

    const remove = (id: string) => {
        if (confirm("Are you sure you want to delete this item?")) {
            store.deleteArtifact(id);
        }
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
									<Sidebar.MenuSubButton class={path === activePrefix ? " bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary" : ""}>
										{#snippet child({ props })}
											<a href="/project/{projectId}/{activePrefix}"  {...props}>
												<span class="pr-6">All</span>
											</a>
										{/snippet}
									</Sidebar.MenuSubButton>
								</Sidebar.MenuSubItem>
								{#each item.items ?? [] as subItem (subItem.id ?? subItem.slug)}
									<Sidebar.MenuSubItem class="w-full mr-0 pr-0">
										<Sidebar.MenuSubButton class={path.endsWith(activePrefix +'/'+ subItem.slug) ? " bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary" : ""}>
											{#snippet child({ props })}
												<a href="/project/{projectId}/{activePrefix}/{subItem.slug}"  {...props}>
													<span class="pr-6">{subItem.title}</span>
												</a>
                                                {#if subItem.id}
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
                                                            <DropdownMenu.Item onclick={() => rename(subItem.id!, subItem.title)}>
                                                                <Pen class="text-muted-foreground" />
                                                                <span>Rename</span>
                                                            </DropdownMenu.Item>
                                                            <DropdownMenu.Item onclick={() => remove(subItem.id!)}>
                                                                <Trash class="text-muted-foreground" />
                                                                <span>Delete</span>
                                                            </DropdownMenu.Item>
                                                        </DropdownMenu.Content>
                                                    </DropdownMenu.Root>
                                                {/if}
											{/snippet}
										</Sidebar.MenuSubButton>
									</Sidebar.MenuSubItem>
								{/each}
                                {#if getKind(activePrefix)}
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
                                {/if}
							</Sidebar.MenuSub>
						</Collapsible.Content>
					</Sidebar.MenuItem>
				{/snippet}
			</Collapsible.Root>
	</Sidebar.Menu>
