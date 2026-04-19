<script lang="ts">
	import { page } from "$app/state";
	import NavUser from "$lib/components/sidebar/nav-user.svelte";
	import * as Badge from "$lib/components/ui/badge";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { resolveIconComponent } from "$lib/utils/icon-fallback";
	import type { ComponentProps } from "svelte";
	import {
		Bell,
		BookOpen,
		CircleHelp,
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

	type HomeSidebarData = {
		user: {
			name: string;
			email: string;
			avatar: string;
		};
	};

	let pathname = $derived(page.url.pathname);
	const activeClass =
		"bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary";

	let {
		homeSidebarData,
		ref = $bindable(null),
		collapsible = "icon",
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		homeSidebarData?: HomeSidebarData | null;
	} = $props();

	let sidebarError = $derived.by(() => {
		if (!homeSidebarData) return "Home sidebar data unavailable.";
		if (!homeSidebarData.user) return "Home sidebar user is missing.";
		return "";
	});
	let user = $derived.by(() => homeSidebarData?.user ?? null);

	let data = $derived({
		branding: {
			name: "ProjectBook",
			plan: "Free"
		},
		home: [
			{
				name: "Dashboard",
				url: "/",
				icon: LayoutDashboard,
				tooltip: "Home Overview",
				isActive: pathname === "/"
			},
			{
				name: "Notifications",
				url: "/notifications",
				icon: Bell,
				tooltip: "Notifications",
				isActive: pathname.includes("/notifications"),
				badge: ""
			},
			{
				name: "Invites",
				url: "/invites",
				icon: Mail,
				tooltip: "Invites",
				isActive: pathname.includes("/invites"),
				badge: ""
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
								<span class="truncate text-xs text-muted-foreground">Home</span>
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
			<Sidebar.GroupLabel>Home</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				{#each data.home as item (item.name)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton class={item.isActive ? activeClass : ""} tooltipContent={item.tooltip}>
							{#snippet child({ props })}
								{@const HomeIcon = resolveIconComponent(item.icon, CircleHelp)}
								<a href={item.url} {...props}>
									<HomeIcon />
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
								{@const ProjectIcon = resolveIconComponent(item.icon, CircleHelp)}
								<a href={item.url} {...props}>
									<ProjectIcon />
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
								{@const AccountIcon = resolveIconComponent(item.icon, CircleHelp)}
								<a href={item.url} {...props}>
									<AccountIcon />
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
		{#if user}
			<NavUser user={user} />
		{:else}
			<div class="px-3 py-2">
				<p class="text-xs text-destructive">{sidebarError}</p>
			</div>
		{/if}
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
