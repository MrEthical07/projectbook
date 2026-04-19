<script lang="ts">
	import { goto } from "$app/navigation";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/index.js";
	import { resolveIconComponent } from "$lib/utils/icon-fallback";
	import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
	import FolderKanbanIcon from "@lucide/svelte/icons/folder-kanban";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import type { Component } from "svelte";

	let {
		projects,
		currentProjectId
	}: {
		projects: { id: string; name: string; url: string; Icon: Component }[];
		currentProjectId: string;
	} = $props();
	const sidebar = useSidebar();
	const normalizeProjectID = (value: string): string => value.trim().toLowerCase();

	let activeProject = $derived.by(() => {
		const targetProjectID = normalizeProjectID(currentProjectId);
		const found = projects.find((project) => normalizeProjectID(project.id) === targetProjectID);
		return found ?? null;
	});
	let activeProjectMissing = $derived(
		currentProjectId.trim().length > 0 && activeProject === null
	);

	const safeGoto = (href: string) => {
		void goto(href).catch((error) => {
			console.error("Navigation failed", error);
		});
	};

	const selectProject = (projectUrl: string) => {
		if (!projectUrl) return;
		safeGoto(projectUrl);
	};
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<Sidebar.Group class="space-y-0 gap-0">
				<Sidebar.GroupLabel class="h-4">Project</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								{...props}
								size="lg"
								class="w-full py-0 h-10 hover:border-primary data-[state=open]:border-primary transition-all duration-200 border mt-2"
							>
								<div class="flex aspect-square size-8 items-center justify-center rounded-lg">
									{#if activeProject}
										{@const ActiveProjectIcon = resolveIconComponent(activeProject.Icon, FolderKanbanIcon)}
										<ActiveProjectIcon class="size-4" />
									{:else}
										<PlusIcon class="size-4" />
									{/if}
								</div>
								<div class="grid flex-1 text-start text-sm leading-tight">
									{#if activeProject}
										<span class="truncate font-medium">{activeProject.name}</span>
									{:else}
										<span class="truncate font-medium text-destructive">Project unavailable</span>
									{/if}
									{#if activeProjectMissing}
										<span class="truncate text-xs text-destructive">Current project not found</span>
									{/if}
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
						<DropdownMenu.Label class="text-muted-foreground text-xs">Projects</DropdownMenu.Label>
						{#if projects.length === 0}
							<div class="px-2 py-1.5 text-xs text-muted-foreground">No projects available</div>
						{:else}
							{#each projects as project (project.id)}
								{@const ProjectIcon = resolveIconComponent(project.Icon, FolderKanbanIcon)}
								<DropdownMenu.Item onSelect={() => selectProject(project.url)} class="gap-2 p-2 hover:scale-101">
									<div class="flex size-6 items-center justify-center rounded-md border">
										<ProjectIcon class="size-3.5 shrink-0" />
									</div>
									{project.name}
								</DropdownMenu.Item>
							{/each}
						{/if}
						<DropdownMenu.Separator />
						<DropdownMenu.Item class="gap-2 p-2" onSelect={() => safeGoto("/projects/new")}>
							<div class="flex size-6 items-center justify-center rounded-md border bg-transparent hover:scale-101">
								<PlusIcon class="size-4" />
							</div>
							<div class="text-muted-foreground font-medium">Add Project</div>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
