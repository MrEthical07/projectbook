<script lang="ts">
	import { goto } from "$app/navigation";
	import { getContext } from "svelte";
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { useSidebar } from "$lib/components/ui/sidebar/context.svelte.js";
	import {
		createSidebarArtifact,
		deleteSidebarArtifact,
		renameSidebarArtifact
	} from "$lib/remote/sidebar.remote";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
	import { PlusIcon, EllipsisIcon, Pen, Trash } from "@lucide/svelte";
	import type { Component } from "svelte";
	import { Button } from "../ui/button";
	import { Input } from "../ui/input";
	import { Label } from "../ui/label";

	type SidebarPrefix =
		| "stories"
		| "journeys"
		| "problem-statement"
		| "ideas"
		| "tasks"
		| "feedback"
		| "pages";

	type SidebarSubItem = {
		title: string;
		slug: string;
	};

	type DomainKey = "story" | "problem" | "idea" | "task" | "feedback" | "page";

	const sidebar = useSidebar();
	let {
		item,
		projectId,
		path,
		onMutated
	}: {
		item: {
			title: string;
			icon?: Component;
			prefix: string;
			isActive?: boolean;
			items: SidebarSubItem[];
		};
		projectId: string;
		path: string;
		onMutated?: () => Promise<void> | void;
	} = $props();

	let isOpen = $derived(item.isActive);
	let addOpen = $state(false);
	let newPageTitle = $state("");
	let isCreating = $state(false);
	let renameOpen = $state(false);
	let deleteOpen = $state(false);
	let renameTitle = $state("");
	let targetItem = $state<SidebarSubItem | null>(null);
	let isMutating = $state(false);
	let mutationError = $state("");
	const access = getContext<ProjectAccess | undefined>("access");

	const prefixToDomain = (prefix: string): DomainKey | null => {
		switch (prefix) {
			case "stories":
			case "journeys":
				return "story";
			case "problem-statement":
				return "problem";
			case "ideas":
				return "idea";
			case "tasks":
				return "task";
			case "feedback":
				return "feedback";
			case "pages":
				return "page";
			default:
				return null;
		}
	};

	const permissionFor = (
		action: "create" | "edit" | "delete"
	): boolean => {
		const domain = prefixToDomain(item.prefix);
		if (!domain || !access?.permissions) return false;
		return access.permissions[domain][action] === true;
	};

	let canCreateItem = $derived(permissionFor("create"));
	let canEditItem = $derived(permissionFor("edit"));
	let canDeleteItem = $derived(permissionFor("delete"));
	let hasAnyRowAction = $derived(canEditItem || canDeleteItem);

	type MutationResult<T> =
		| {
				success: true;
				data: T;
		  }
		| {
				success: false;
				error: string;
		  };

	const actorIdForCommand = (): string | null => access?.user.id ?? null;
	const permissionsForCommand = (): EffectivePermissions | null => access?.permissions ?? null;

	const createArtifact = async () => {
		const title = newPageTitle.trim();
		if (!title || isCreating) return;
		const permissions = permissionsForCommand();
		if (!permissions) {
			mutationError = "Permissions context is unavailable.";
			return;
		}
		const actorId = actorIdForCommand();
		if (!actorId) {
			mutationError = "Active user id is missing.";
			return;
		}

		isCreating = true;
		mutationError = "";
		const result = (await createSidebarArtifact({
			input: {
				projectId,
				prefix: item.prefix as SidebarPrefix,
				actorId,
				title
			},
			permissions
		})) as MutationResult<{ id: string }>;
		isCreating = false;

		if (!result.success) {
			mutationError = result.error;
			return;
		}

		addOpen = false;
		newPageTitle = "";
		await onMutated?.();
		await goto(`/project/${projectId}/${item.prefix}/${result.data.id}`);
	};

	const openRenameDialog = (subItem: SidebarSubItem) => {
		targetItem = subItem;
		renameTitle = subItem.title;
		mutationError = "";
		renameOpen = true;
	};

	const openDeleteDialog = (subItem: SidebarSubItem) => {
		targetItem = subItem;
		mutationError = "";
		deleteOpen = true;
	};

	const renameArtifact = async () => {
		if (!targetItem || isMutating) return;
		const title = renameTitle.trim();
		if (!title) return;
		const permissions = permissionsForCommand();
		if (!permissions) {
			mutationError = "Permissions context is unavailable.";
			return;
		}
		const actorId = actorIdForCommand();
		if (!actorId) {
			mutationError = "Active user id is missing.";
			return;
		}

		isMutating = true;
		const result = (await renameSidebarArtifact({
			input: {
				projectId,
				prefix: item.prefix as SidebarPrefix,
				artifactId: targetItem.slug,
				actorId,
				title
			},
			permissions
		})) as MutationResult<{ id: string; title: string }>;
		isMutating = false;

		if (!result.success) {
			mutationError = result.error;
			return;
		}

		renameOpen = false;
		targetItem = null;
		renameTitle = "";
		await onMutated?.();
	};

	const removeArtifact = async () => {
		if (!targetItem || isMutating) return;
		const permissions = permissionsForCommand();
		if (!permissions) {
			mutationError = "Permissions context is unavailable.";
			return;
		}
		const actorId = actorIdForCommand();
		if (!actorId) {
			mutationError = "Active user id is missing.";
			return;
		}

		const deletingSlug = targetItem.slug;
		const wasViewingThisItem = path.endsWith(`${item.prefix}/${deletingSlug}`);
		isMutating = true;
		const result = (await deleteSidebarArtifact({
			input: {
				projectId,
				prefix: item.prefix as SidebarPrefix,
				artifactId: deletingSlug,
				actorId
			},
			permissions
		})) as MutationResult<{ id: string }>;
		isMutating = false;

		if (!result.success) {
			mutationError = result.error;
			return;
		}

		deleteOpen = false;
		targetItem = null;
		await onMutated?.();
		if (wasViewingThisItem) {
			await goto(`/project/${projectId}/${item.prefix}`);
		}
	};
</script>

<Sidebar.Menu>
	<Collapsible.Root bind:open={isOpen} class="group/collapsible">
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
									<a href="/project/{projectId}/{item.prefix}" {...props}>
										<span class="pr-6">All</span>
									</a>
								{/snippet}
							</Sidebar.MenuSubButton>
						</Sidebar.MenuSubItem>
						{#each item.items as subItem (subItem.slug)}
							<Sidebar.MenuSubItem class="w-full mr-0 pr-0">
								<Sidebar.MenuSubButton class={path.endsWith(item.prefix + "/" + subItem.slug) ? " bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary" : ""}>
									{#snippet child({ props })}
										<a href="/project/{projectId}/{item.prefix}/{subItem.slug}" {...props}>
											<span class="pr-6">{subItem.title}</span>
										</a>
										{#if hasAnyRowAction}
											<DropdownMenu.Root>
												<DropdownMenu.Trigger>
													{#snippet child({ props })}
														<Sidebar.MenuAction {...props} class="mr-1 mb-0.5">
															<EllipsisIcon />
															<span class="sr-only">More</span>
														</Sidebar.MenuAction>
													{/snippet}
												</DropdownMenu.Trigger>
												<DropdownMenu.Content
													class="w-48 rounded-lg"
													side={sidebar.isMobile ? "bottom" : "right"}
													align={sidebar.isMobile ? "end" : "start"}
												>
													{#if canEditItem}
														<DropdownMenu.Item onSelect={() => openRenameDialog(subItem)}>
															<Pen class="text-muted-foreground" />
															<span>Rename</span>
														</DropdownMenu.Item>
													{/if}
													{#if canDeleteItem}
														<DropdownMenu.Item
															class="text-destructive focus:text-destructive"
															onSelect={() => openDeleteDialog(subItem)}
														>
															<Trash class="text-destructive" />
															<span>Delete</span>
														</DropdownMenu.Item>
													{/if}
												</DropdownMenu.Content>
											</DropdownMenu.Root>
										{/if}
									{/snippet}
								</Sidebar.MenuSubButton>
							</Sidebar.MenuSubItem>
						{/each}
						{#if canCreateItem}
							<Sidebar.MenuSubItem>
								<Dialog.Root bind:open={addOpen}>
									<Dialog.Trigger class="w-full">
										<div class="flex flex-row items-center gap-2 ml-1 px-2 py-1 border justify-center rounded hover:bg-accent">
											<PlusIcon class="size-4" />
											<div class="text-xs">Add New</div>
										</div>
									</Dialog.Trigger>
									<Dialog.Content>
										<Dialog.Header>
											<Dialog.Title>Create {item.title}</Dialog.Title>
											<Dialog.Description>
												Enter a name and create a new artifact in {item.title.toLowerCase()}.
											</Dialog.Description>
										</Dialog.Header>
										<div class="grid gap-2">
											<Label for="submenu-create-title">Name</Label>
											<Input id="submenu-create-title" bind:value={newPageTitle} placeholder={`New ${item.title}`} />
											{#if mutationError}
												<p class="text-xs text-destructive">{mutationError}</p>
											{/if}
										</div>
										<Dialog.Footer>
											<Button variant="outline" onclick={() => (addOpen = false)} disabled={isCreating}>
												Cancel
											</Button>
											<Button onclick={createArtifact} disabled={!newPageTitle.trim() || isCreating}>
												{isCreating ? "Creating..." : "Create"}
											</Button>
										</Dialog.Footer>
									</Dialog.Content>
								</Dialog.Root>
							</Sidebar.MenuSubItem>
						{/if}
					</Sidebar.MenuSub>
				</Collapsible.Content>
			</Sidebar.MenuItem>
		{/snippet}
	</Collapsible.Root>
</Sidebar.Menu>

<Dialog.Root bind:open={renameOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Rename {item.title}</Dialog.Title>
			<Dialog.Description>Update the title for this artifact.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-2">
			<Label for="submenu-rename-title">Name</Label>
			<Input id="submenu-rename-title" bind:value={renameTitle} />
			{#if mutationError}
				<p class="text-xs text-destructive">{mutationError}</p>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (renameOpen = false)} disabled={isMutating}>Cancel</Button>
			<Button onclick={renameArtifact} disabled={!renameTitle.trim() || isMutating}>
				{isMutating ? "Saving..." : "Save"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete {item.title}</Dialog.Title>
			{#if targetItem}
				<Dialog.Description>
					This will permanently remove "{targetItem.title}".
				</Dialog.Description>
			{:else}
				<Dialog.Description>
					No artifact is selected for deletion.
				</Dialog.Description>
			{/if}
		</Dialog.Header>
		{#if mutationError}
			<p class="text-xs text-destructive">{mutationError}</p>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteOpen = false)} disabled={isMutating}>Cancel</Button>
			<Button variant="destructive" onclick={removeArtifact} disabled={isMutating}>
				{isMutating ? "Deleting..." : "Delete"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
