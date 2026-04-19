<script lang="ts">
	import SubMenu from "$lib/components/sidebar/subMenu.svelte";
	import NavUser from "$lib/components/sidebar/nav-user.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import ProjectSwitcher from "$lib/components/sidebar/project-switcher.svelte";
	import { can } from "$lib/utils/permission";
	import { resolveIconComponent } from "$lib/utils/icon-fallback";
	import { resolveProjectIcon } from "$lib/utils/project-icons";
	import type { ProjectNavigationData } from "$lib/remote/project-navigation.remote";
	import { UserLock, Settings, Users, LayoutDashboard } from "@lucide/svelte";
	import { page } from "$app/state";
	import {
		Calendar,
		Folder,
		Compass,
		UserRound,
		Route,
		Target,
		Lightbulb,
		MessageSquareQuote,
		NotepadText,
		ClipboardList
	} from "@lucide/svelte";

	type AppSidebarProps = {
		navigationData: ProjectNavigationData;
		access: ProjectAccess;
		ref?: HTMLElement | null;
		collapsible?: "offcanvas" | "icon" | "none";
	} & Record<string, unknown>;

	let {
		navigationData,
		access,
		ref = $bindable(null),
		collapsible = "icon",
		...restProps
	}: AppSidebarProps = $props();

	let projectId = $derived.by(() => {
		const id = page.params.projectId?.trim();
		return id && id.length > 0 ? id : "";
	});
	let path = $derived.by(() => {
		if (!projectId) {
			return "";
		}
		const scopedBasePath = `/project/${projectId}`;
		if (page.url.pathname === scopedBasePath) {
			return "";
		}
		if (!page.url.pathname.startsWith(`${scopedBasePath}/`)) {
			return "";
		}
		return page.url.pathname.slice(scopedBasePath.length + 1);
	});

	let permissions = $derived(access?.permissions);
	let canViewProject = $derived(can(permissions, "project", "view"));
	let canManageTeam = $derived(can(permissions, "member", "edit"));
	let canEditProject = $derived(can(permissions, "project", "edit"));

	const activeClass =
		" bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary";

	let navigationError = $derived.by(() => {
		if (!projectId) return "Missing project id in route.";
		if (!navigationData?.currentProject?.id) return "Navigation payload is unavailable.";
		if (!page.url.pathname.startsWith(`/project/${projectId}`)) {
			return `Route is outside project scope: /project/${projectId}`;
		}
		return "";
	});

	let data = $derived.by(() => {
		if (!navigationData || !projectId) return null;

		const projects = navigationData.projectList.flatMap((project) => {
			const id = project.id.trim();
			if (id.length === 0) {
				return [];
			}

			const name = project.name.trim().length > 0 ? project.name.trim() : "Project";
			return [
				{
					id,
					name,
					url: `/project/${id}`,
					Icon: resolveIconComponent(resolveProjectIcon(project.icon), Folder)
				}
			];
		});

		const navTeam = [
			...(canManageTeam
				? [
						{
							name: "Members",
							url: `/project/${projectId}/team/members`,
							Icon: Users,
							tooltip: "Manage Members",
							isActive: path === "team/members" || path.startsWith("team/members/")
						},
						{
							name: "Roles",
							url: `/project/${projectId}/team/roles`,
							Icon: UserLock,
							tooltip: "Manage Roles & Access",
							isActive: path === "team/roles" || path.startsWith("team/roles/")
						}
					]
				: []),
			...(canEditProject
				? [
						{
							name: "Project Settings",
							url: `/project/${projectId}/settings`,
							Icon: Settings,
							tooltip: "Project Settings",
							isActive: path === "settings" || path.startsWith("settings/")
						}
					]
				: [])
		].filter(
			(item) =>
				typeof item?.name === "string" &&
				typeof item?.url === "string" &&
				typeof item?.tooltip === "string" &&
				typeof item?.isActive === "boolean"
		);

		return {
			user: {
				name: access.user.name?.trim() || "User",
				email: access.user.email?.trim() || "",
				avatar: "/avatars/shadcn.jpg"
			},
			projects,
			dashboard: {
				title: "Dashboard",
				url: `/project/${projectId}`,
				Icon: LayoutDashboard,
				isActive: path === ""
			},
			designThinking: {
				name: "Design Thinking",
				Icon: Compass,
				subMenus: [
					{
						name: "Empathize",
						items: [
							{
								title: "User Stories",
								Icon: UserRound,
								prefix: "stories",
								isActive: path === "stories" || path.startsWith("stories/")
							},
							{
								title: "User Journeys",
								Icon: Route,
								prefix: "journeys",
								isActive: path === "journeys" || path.startsWith("journeys/")
							}
						]
					},
					{
						name: "Define",
						items: [
							{
								title: "Problem Statement",
								Icon: Target,
								prefix: "problem-statement",
								isActive: path === "problem-statement" || path.startsWith("problem-statement/")
							}
						]
					},
					{
						name: "Ideate",
						items: [
							{
								title: "Ideas",
								Icon: Lightbulb,
								prefix: "ideas",
								isActive: path === "ideas" || path.startsWith("ideas/")
							}
						]
					},
					{
						name: "Prototype",
						items: [
							{
								title: "Task Board",
								Icon: ClipboardList,
								prefix: "tasks",
								isActive: path === "tasks" || path.startsWith("tasks/")
							}
						]
					},
					{
						name: "Test",
						items: [
							{
								title: "Feedback",
								Icon: MessageSquareQuote,
								prefix: "feedback",
								isActive: path === "feedback" || path.startsWith("feedback/")
							}
						]
					}
				]
			},
			projectSupport: {
				items: {
					calendar: {
						title: "Calendar",
						url: `/project/${projectId}/calendar`,
						Icon: Calendar,
						isActive: path === "calendar" || path.startsWith("calendar/")
					},
					resources: {
						title: "Resources",
						url: `/project/${projectId}/resources`,
						Icon: Folder,
						isActive: path === "resources" || path.startsWith("resources/")
					},
					pages: {
						title: "Pages",
						prefix: "pages",
						Icon: NotepadText,
						isActive: path === "pages" || path.startsWith("pages/")
					}
				}
			},
			navTeam
		};
	});
</script>

<Sidebar.Root {collapsible} {...restProps} class="">
	<Sidebar.Header class="p-0 py-2">
		{#if data}
			<ProjectSwitcher projects={data.projects} currentProjectId={projectId} />
		{:else}
			<div class="px-3 py-2">
				<p class="text-xs font-medium">Project navigation unavailable</p>
				<p class="mt-1 text-xs text-destructive">{navigationError}</p>
			</div>
		{/if}
	</Sidebar.Header>
	<Sidebar.Content>
		{#if data}
			<Sidebar.Group>
				<Sidebar.GroupContent class="space-y-0">
					{#if canViewProject}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton class={data.dashboard.isActive ? activeClass : ""} tooltipContent="Project Dashboard">
								{#snippet child({ props })}
									<a href={data.dashboard.url} {...props}>
										<LayoutDashboard />
										<span>{data.dashboard.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/if}
					<Sidebar.MenuItem class="p-0">
						{#each data.designThinking.subMenus as subMenu (subMenu.name)}
							<Sidebar.Group class="px-0 py-1">
								<Sidebar.GroupLabel class="-mt-1 text-xs">{subMenu.name}</Sidebar.GroupLabel>
								<Sidebar.GroupContent>
									{#each subMenu.items as item (item.prefix)}
										<SubMenu item={item} projectId={projectId} />
									{/each}
								</Sidebar.GroupContent>
							</Sidebar.Group>
						{/each}
					</Sidebar.MenuItem>
					<Sidebar.Group class="px-0">
						<Sidebar.GroupLabel class="-mt-1 text-xs">Other</Sidebar.GroupLabel>
						<Sidebar.GroupContent>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									class={data.projectSupport.items.calendar.isActive ? activeClass : ""}
									tooltipContent={data.projectSupport.items.calendar.title}
								>
									{#snippet child({ props })}
										<a href={data.projectSupport.items.calendar.url} {...props}>
											<Calendar />
											<span>{data.projectSupport.items.calendar.title}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									class={data.projectSupport.items.resources.isActive ? activeClass : ""}
									tooltipContent={data.projectSupport.items.resources.title}
								>
									{#snippet child({ props })}
										<a href={data.projectSupport.items.resources.url} {...props}>
											<Folder />
											<span>{data.projectSupport.items.resources.title}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
							<SubMenu item={data.projectSupport.items.pages} projectId={projectId} />
						</Sidebar.GroupContent>
					</Sidebar.Group>
				</Sidebar.GroupContent>
			</Sidebar.Group>

			{#if data.navTeam.length > 0}
				<Sidebar.Group>
					<Sidebar.GroupLabel>Team</Sidebar.GroupLabel>
					{#each data.navTeam as item (item.name)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton tooltipContent={item.tooltip} class={item.isActive ? activeClass : ""}>
								{#snippet child({ props })}
									{@const TeamIcon = resolveIconComponent(item.Icon, Settings)}
									<a href={item.url} {...props}>
										<TeamIcon />
										<span>{item.name}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Group>
			{/if}
		{:else}
			<Sidebar.Group>
				<Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
				<Sidebar.GroupContent class="px-3">
					<p class="text-xs text-muted-foreground">
						The sidebar could not be loaded for this project.
					</p>
					<p class="mt-1 text-xs text-destructive">{navigationError}</p>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}
	</Sidebar.Content>
	<Sidebar.Footer>
		{#if data}
			<NavUser user={data.user} />
		{/if}
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
