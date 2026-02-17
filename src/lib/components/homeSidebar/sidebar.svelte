<script lang="ts">		
    import { page } from "$app/state";
	import NavUser from "$lib/components/homeSidebar/nav-user.svelte";
	import * as Badge from "$lib/components/ui/badge";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import type { ComponentProps } from "svelte";
	import {
		Bell,
		BookOpen,
		FolderKanban,
		LayoutDashboard,
		Mail,
		Plus,
		Settings,
		type Icon
	} from "@lucide/svelte";

	type NavItem = {
		name: string;
		url: string;
		icon: typeof Icon;
		tooltip: string;
		isActive: boolean;
		badge?: string;
	};

	let pathname = $derived(page.url.pathname);
	const activeClass = "bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary";

	let data = $derived({
		user: {
			name: "shadcn",
			email: "m@example.com",
			avatar: "/avatars/shadcn.jpg"
		},
		branding: {
			name: "ProjectBook",
			plan: "Free"
		},
		workspace: [
			{
				name: "Dashboard",
				url: "/",
				icon: LayoutDashboard,
				tooltip: "Workspace Overview",
				isActive: pathname === "/"
			},
			{
				name: "Notifications",
				url: "/notifications",
				icon: Bell,
				tooltip: "Notifications",
				isActive: pathname.includes("/notifications"),
				badge: "3"
			},
			{
				name: "Invites",
				url: "/invites",
				icon: Mail,
				tooltip: "Invites",
				isActive: pathname.includes("/invites"),
				badge: "2"
			}
		] satisfies NavItem[],
		projects: [
			{
				name: "All Projects",
				url: "/projects",
				icon: FolderKanban,
				tooltip: "All Projects",
				isActive:
					pathname === "/projects" ||
					(pathname.startsWith("/projects/") && !pathname.startsWith("/projects/new"))
			},
			{
				name: "Create Project",
				url: "/projects/new",
				icon: Plus,
				tooltip: "Create Project",
				isActive: pathname.startsWith("/projects/new")
			}
		] satisfies NavItem[],
		account: [
			{
				name: "Account Settings",
				url: "/account",
				icon: Settings,
				tooltip: "Account Settings",
				isActive: pathname.includes("/account")
			}
		] satisfies NavItem[]
	});

	let {
		ref = $bindable(null),
		collapsible = "icon",
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root {collapsible} {...restProps} class="">
	<Sidebar.Header class="py-2">
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg" tooltipContent="ProjectBook">
					{#snippet child({ props })}
						<a href="/" {...props}>
							<div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
								<BookOpen class="size-4" />
							</div>
							<div class="grid flex-1 text-start text-sm leading-tight">
								<span class="truncate font-semibold">{data.branding.name}</span>
								<span class="truncate text-xs text-muted-foreground">Workspace</span>
							</div>
							<Badge.Badge variant="outline" class="text-[10px]">{data.branding.plan}</Badge.Badge>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				{#each data.workspace as item (item.name)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton class={item.isActive ? activeClass : ""} tooltipContent={item.tooltip}>
							{#snippet child({ props })}
								<a href={item.url} {...props}>
									<item.icon />
									<span>{item.name}</span>
									{#if item.badge}
										<Badge.Badge variant="outline" class="ms-auto px-1.5 py-0 text-[10px]">
											{item.badge}
										</Badge.Badge>
									{/if}
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<Sidebar.Group>
			<Sidebar.GroupLabel>Projects</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				{#each data.projects as item (item.name)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton class={item.isActive ? activeClass : ""} tooltipContent={item.tooltip}>
							{#snippet child({ props })}
								<a href={item.url} {...props}>
									<item.icon />
									<span>{item.name}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<Sidebar.Group>
			<Sidebar.GroupLabel>Account</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				{#each data.account as item (item.name)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton class={item.isActive ? activeClass : ""} tooltipContent={item.tooltip}>
							{#snippet child({ props })}
								<a href={item.url} {...props}>
									<item.icon />
									<span>{item.name}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>