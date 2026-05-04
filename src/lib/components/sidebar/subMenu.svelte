<script lang="ts">
	import { goto } from "$app/navigation";
	import { getContext } from "svelte";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { createSidebarArtifact } from "$lib/remote/sidebar.remote";
	import { resolveIconComponent } from "$lib/utils/icon-fallback";
	import { PlusIcon } from "@lucide/svelte";
	import Folder from "@lucide/svelte/icons/folder";
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

	type DomainKey = "story" | "problem" | "idea" | "task" | "feedback" | "page";

	let {
		item,
		projectId
	}: {
		item: {
			title: string;
			Icon: Component;
			prefix: string;
			isActive?: boolean;
		};
		projectId: string;
	} = $props();

	const activeClass =
		" bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary";

	let addOpen = $state(false);
	let newArtifactTitle = $state("");
	let isCreating = $state(false);
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

	const permissionForCreate = (): boolean => {
		const domain = prefixToDomain(item.prefix);
		if (!domain || !access?.permissions) return false;
		return access.permissions[domain].create === true;
	};

	let canCreateItem = $derived(permissionForCreate());
	let itemUrl = $derived(`/project/${projectId}/${item.prefix}`);

	type MutationResult<T> =
		| {
				success: true;
				data: T;
		  }
		| {
				success: false;
				error: string;
		  };

	const openCreateDialog = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		mutationError = "";
		addOpen = true;
	};

	const createArtifact = async () => {
		const title = newArtifactTitle.trim();
		if (!title || isCreating) return;

		isCreating = true;
		mutationError = "";
		try {
			const result = (await createSidebarArtifact({
				input: {
					projectId,
					prefix: item.prefix as SidebarPrefix,
					title
				}
			})) as MutationResult<{ id: string }>;

			if (!result.success) {
				mutationError = result.error;
				return;
			}

			addOpen = false;
			newArtifactTitle = "";
			await goto(`/project/${projectId}/${item.prefix}/${result.data.id}`);
		} catch (error) {
			console.error("Failed to create sidebar artifact", error);
			mutationError = "Unable to create item right now.";
		} finally {
			isCreating = false;
		}
	};
</script>
<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton
			class={item.isActive ? activeClass : ""}
			tooltipContent={item.title}
		>
			{#snippet child({ props })}
				{@const ItemIcon = resolveIconComponent(item.Icon, Folder)}
				<a href={itemUrl} {...props}>
					<ItemIcon />
					<span class="whitespace-nowrap truncate">{item.title}</span>
				</a>
			{/snippet}
		</Sidebar.MenuButton>
		{#if canCreateItem}
			<Sidebar.MenuAction aria-label={`Create ${item.title}`} onclick={openCreateDialog}>
				<PlusIcon color="var(--muted-foreground)" />
				<span class="sr-only">Create {item.title}</span>
			</Sidebar.MenuAction>
		{/if}
	</Sidebar.MenuItem>
</Sidebar.Menu>

<Dialog.Root bind:open={addOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create {item.title}</Dialog.Title>
			<Dialog.Description>
				Enter a name and create a new artifact in {item.title.toLowerCase()}.
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-2">
			<Label for="submenu-create-title">Name</Label>
			<Input id="submenu-create-title" bind:value={newArtifactTitle} placeholder={`New ${item.title}`} />
			{#if mutationError}
				<p class="text-xs text-destructive">{mutationError}</p>
			{/if}
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (addOpen = false)} disabled={isCreating}>
				Cancel
			</Button>
			<Button onclick={createArtifact} disabled={!newArtifactTitle.trim() || isCreating}>
				{isCreating ? "Creating..." : "Create"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
