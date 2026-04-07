<script lang="ts">
	import SubMenu from "$lib/components/sidebar/subMenu.svelte";
	import NavUser from "$lib/components/sidebar/nav-user.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import ProjectSwitcher from "$lib/components/sidebar/project-switcher.svelte";
	import { invalidateAll } from "$app/navigation";
	import { can } from "$lib/utils/permission";
	import { resolveProjectIcon } from "$lib/utils/project-icons";
	import { getContext } from "svelte";
	import type { ComponentProps } from "svelte";
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

	type SidebarNode = {
		title: string;
		slug: string;
	};

	type SidebarRemoteData = {
		user: {
			name: string;
			email: string;
			avatar: string;
		};
		projects: Array<{
			id: string;
			name: string;
			icon: ProjectIconKey;
			status?: string;
		}>;
		artifacts: {
			stories: SidebarNode[];
			journeys: SidebarNode[];
			problems: SidebarNode[];
			ideas: SidebarNode[];
			tasks: SidebarNode[];
			feedback: SidebarNode[];
			pages: SidebarNode[];
		};
	};

	type SidebarQueryResult =
		| {
				success: true;
				data: SidebarRemoteData;
		  }
		| {
				success: false;
				error: string;
		  };

	const sanitizeNodes = (value: SidebarNode[] | unknown): SidebarNode[] => {
		if (!Array.isArray(value)) return [];
		return value
			.filter(
				(item): item is SidebarNode =>
					Boolean(
						item &&
						typeof item === "object" &&
						typeof (item as SidebarNode).slug === "string" &&
						typeof (item as SidebarNode).title === "string"
					)
			)
			.map((item) => ({
				slug: item.slug.trim(),
				title: item.title.trim()
			}))
			.filter((item) => item.slug.length > 0 && item.title.length > 0);
	};

	let {
		sidebarData,
		ref = $bindable(null),
		collapsible = "icon",
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		sidebarData: SidebarQueryResult;
	} = $props();

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
	const access = getContext<ProjectAccess | undefined>("access");
	let permissions = $derived(access?.permissions);
	let canViewProject = $derived(can(permissions, "project", "view"));
	let canManageTeam = $derived(can(permissions, "member", "edit"));
	let canEditProject = $derived(can(permissions, "project", "edit"));

	const activeClass =
		" bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary";

	const refreshSidebar = async () => {
		await invalidateAll();
	};

	let sidebarError = $derived.by(() => {
		if (!projectId) return "Missing project id in route.";
		if (!sidebarData) return "Sidebar data unavailable.";
		if (!sidebarData.success) return sidebarData.error;
		if (!sidebarData.data) return "Sidebar payload is empty.";
		if (!page.url.pathname.startsWith(`/project/${projectId}`)) {
			return `Route is outside project scope: /project/${projectId}`;
		}
		return "";
	});
	let sourceData = $derived.by(() => {
		if (!sidebarData || !sidebarData.success) {
			return null;
		}
		return sidebarData.data;
	});

	let data = $derived.by(() => {
		if (!sourceData || !projectId) return null;
		const source = sourceData;
		const sourceProjects = Array.isArray(source.projects) ? source.projects : [];
		const projects = sourceProjects
			.map((project) => ({
				id: typeof project?.id === "string" ? project.id.trim() : "",
				name:
					typeof project?.name === "string" && project.name.trim().length > 0
						? project.name.trim()
						: "Project",
				url:
					typeof project?.id === "string" && project.id.trim().length > 0
						? `/project/${project.id.trim()}`
						: "",
				icon: resolveProjectIcon(project?.icon)
			}))
			.filter((project) => project.id.length > 0 && project.url.length > 0);
		const artifacts = source.artifacts ?? {
			stories: [],
			journeys: [],
			problems: [],
			ideas: [],
			tasks: [],
			feedback: [],
			pages: []
		};
		const navTeam = [
			...(canManageTeam
				? [
						{
							name: "Members",
							url: `/project/${projectId}/team/members`,
							icon: Users,
							tooltip: "Manage Members",
							isActive: path === "team/members" || path.startsWith("team/members/")
						},
						{
							name: "Roles",
							url: `/project/${projectId}/team/roles`,
							icon: UserLock,
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
							icon: Settings,
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
			user: source.user,
			projects,
			dashboard: {
				title: "Dashboard",
				url: `/project/${projectId}`,
				icon: LayoutDashboard,
				isActive: path === ""
			},
			designThinking: {
				name: "Design Thinking",
				icon: Compass,
				subMenus: [
					{
						name: "Empathize",
						items: [
							{
								title: "User Stories",
								icon: UserRound,
								prefix: "stories",
								isActive: path === "stories" || path.startsWith("stories/"),
								items: sanitizeNodes(artifacts.stories)
							},
							{
								title: "User Journeys",
								icon: Route,
								prefix: "journeys",
								isActive: path === "journeys" || path.startsWith("journeys/"),
								items: sanitizeNodes(artifacts.journeys)
							}
						]
					},
					{
						name: "Define",
						items: [
							{
								title: "Problem Statement",
								icon: Target,
								prefix: "problem-statement",
								isActive: path === "problem-statement" || path.startsWith("problem-statement/"),
								items: sanitizeNodes(artifacts.problems)
							}
						]
					},
					{
						name: "Ideate",
						items: [
							{
								title: "Ideas",
								icon: Lightbulb,
								prefix: "ideas",
								isActive: path === "ideas" || path.startsWith("ideas/"),
								items: sanitizeNodes(artifacts.ideas)
							}
						]
					},
					{
						name: "Prototype",
						items: [
							{
								title: "Task Board",
								icon: ClipboardList,
								prefix: "tasks",
								isActive: path === "tasks" || path.startsWith("tasks/"),
								items: sanitizeNodes(artifacts.tasks)
							}
						]
					},
					{
						name: "Test",
						items: [
							{
								title: "Feedback",
								icon: MessageSquareQuote,
								prefix: "feedback",
								isActive: path === "feedback" || path.startsWith("feedback/"),
								items: sanitizeNodes(artifacts.feedback)
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
						icon: Calendar,
						isActive: path === "calendar" || path.startsWith("calendar/")
					},
					resources: {
						title: "Resources",
						url: `/project/${projectId}/resources`,
						icon: Folder,
						isActive: path === "resources" || path.startsWith("resources/")
					},
					pages: {
						title: "Pages",
						prefix: "pages",
						icon: NotepadText,
						isActive: path === "pages" || path.startsWith("pages/"),
						items: sanitizeNodes(artifacts.pages)
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
				<p class="mt-1 text-xs text-destructive">{sidebarError}</p>
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
										<data.dashboard.icon />
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
										<SubMenu item={item} projectId={projectId} path={path} onMutated={refreshSidebar} />
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
											<data.projectSupport.items.calendar.icon />
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
											<data.projectSupport.items.resources.icon />
											<span>{data.projectSupport.items.resources.title}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
							<SubMenu
								item={data.projectSupport.items.pages}
								projectId={projectId}
								path={path}
								onMutated={refreshSidebar}
							/>
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
									<a href={item.url} {...props}>
										{#if item.icon}
											<item.icon />
										{:else}
											<Settings />
										{/if}
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
					<p class="mt-1 text-xs text-destructive">{sidebarError}</p>
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
