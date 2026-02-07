<script lang="ts">
	import SubMenu from "$lib/components/sidebar/subMenu.svelte";
	import NavUser from "$lib/components/sidebar/nav-user.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import ProjectSwitcher from "./project-switcher.svelte";
	import type { ComponentProps } from "svelte";
	import { UserLock, Settings, Users, LayoutDashboard } from "@lucide/svelte"

	import { page } from "$app/state";
	import { store } from "$lib/stores.svelte";
	import type { ArtifactKind } from "$lib/types";

	let dummyProjectId = "yeyyy";
	// Robust path splitting
	let projectId = $derived(page.params.projectId ?? dummyProjectId);
	let path = $derived(page.url.pathname);
	let projectPathPrefix = $derived(`/project/${projectId}`);

	// Helper to check active state more robustly
	const isActive = (segment: string) => path.includes(`${projectPathPrefix}/${segment}`);
	const isDashboardActive = $derived(path === projectPathPrefix || path === `${projectPathPrefix}/`);

	import { 
		AudioWaveformIcon, 
		ChartPieIcon, 
		CommandIcon, 
		Calendar, 
		Folder, 
		Compass,
		UserRound,
		Route,
		Target,
		Lightbulb,
		MessageSquareQuote,
		NotepadText, 
		ClipboardList, 
		MapIcon, 
		GalleryVerticalEndIcon, 
		FrameIcon, 
    	PresentationIcon
	} from "@lucide/svelte";

	const projectArtifacts = $derived(store.artifacts.filter(a => a.projectId === projectId));
	const getArtifacts = (kind: ArtifactKind) => projectArtifacts.filter(a => a.kind === kind).map(a => ({ title: a.title, slug: a.slug, id: a.id }));

	const data = $derived({
		user: {
            name: store.user.displayName,
            email: store.user.email,
            avatar: store.user.avatarUrl || "/avatars/shadcn.jpg"
        },
		projects: store.projects.map(p => ({
			name: p.name,
			url: `/project/${p.id}`,
			icon: FrameIcon, // Default icon
		})),
		dashboard: {
			title: "Dashboard",
			url: projectPathPrefix,
			icon: LayoutDashboard,
			isActive: isDashboardActive,
		},

		designThinking: {
			name: "Design Thinking",
			icon: Compass,
			isActive: true,
			subMenus: [
				{
					name: "Empathize",
					isActive: isActive("stories") || isActive("journeys"),
					items: [
						{
							title: "User Stories",
							icon: UserRound,
							prefix: "stories",
							isActive: isActive("stories"),
							items: getArtifacts("story"),
						},
						{
							title: "User Journeys",
							icon: Route,
							prefix: "journeys",
							isActive: isActive("journeys"),
							items: getArtifacts("journey")
						}
					]
				},
				{
					name: "Define",
					isActive: isActive("problem-statement"),
					items: [
						{
							title: "Problem Statement",
							icon: Target,
							prefix: "problem-statement",
							isActive: isActive("problem-statement"),
							items: getArtifacts("problem")
						}
					]
				},
				{
					name: "Ideate",
					isActive: isActive("ideas") || isActive("whiteboard"),
					items: [
						{
							title: "Ideas",
							icon: Lightbulb,
							prefix: "ideas",
							isActive: isActive("ideas"),
							items: getArtifacts("idea")
						},
						{
							title: "Whiteboard",
							icon: PresentationIcon,
							prefix: "whiteboard",
							isActive: isActive("whiteboard"),
							items: getArtifacts("whiteboard")
						}
					]
				},
				{
					name: "Prototype",
					isActive: isActive("tasks"),
					items: [
						{
							title: "Task Board",
							icon: ClipboardList,
							prefix: "tasks",
							isActive: isActive("tasks"),
							items: [
								// Tasks are a bit different, they have a main board + list of tasks
								// For now, let's keep the mock structure or list tasks?
								// The original code had "My Tasks", "Urgent Tasks".
								// These seem like filters.
								// For now, let's just keep generic "Task Board" link or specific views if needed.
								// Since tasks are managed in a specific route, maybe we don't list individual tasks here unless they are distinct boards.
								// The bug report doesn't explicitly ask for dynamic task lists in sidebar, but generic persistence.
								// I'll keep the static links for "My Tasks" and "Urgent" as filters for now,
								// or I can just link to the main board.
								// Let's link to the main board.
								{
									title: "All Tasks",
									slug: "" // Empty slug goes to /tasks/
								}
							]
						}
					]
				},
				{
					name: "Test",
					isActive: isActive("feedback"),
					items: [
						{
							title: "Feedback",
							icon: MessageSquareQuote,
							prefix: "feedback",
							isActive: isActive("feedback"),
							items: getArtifacts("feedback")
						}
					]
				},
			]
		},
		
		projectSupport: {
			name: "Project Support",
			isActive: isActive("calendar") || isActive("resources") || isActive("pages"),
			items: {
				calendar: {
					title: "Calendar",
					url: `${projectPathPrefix}/calendar`,
					icon: Calendar,
					isActive: isActive("calendar"),
				},
				resources: {
					title: "Resources",
					url: `${projectPathPrefix}/resources`,
					icon: Folder,
					isActive: isActive("resources"),
				},
				pages: {
					title: "Pages",
					prefix: "pages",
					isActive: isActive("pages"),
					icon: NotepadText,
					items: getArtifacts("page")
				}
			}
		},

		navTeam: [
			{
				name: "Members",
				url: `${projectPathPrefix}/team/members`,
				icon: Users,
				tooltip: "Manage Members",
				isActive: isActive("team/members"),
			},
			{
				name: "Roles",
				url: `${projectPathPrefix}/team/roles`,
				icon: UserLock,
				tooltip: "Manage Roles & Access",
				isActive: isActive("team/roles"),
			},
			{
				name: "Project Settings",
				url: `${projectPathPrefix}/settings`,
				icon: Settings,
				tooltip: "Project Settings",
				isActive: isActive("settings"),
			},
		],
	});

	let {
		ref = $bindable(null),
		collapsible = "icon",
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root {collapsible} {...restProps} class="">
	<Sidebar.Header class="p-0 py-2">
		<!-- <OrganizationSwitcher organizations={data.organization} /> -->
		<ProjectSwitcher projects={data.projects}/>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
				<Sidebar.GroupContent class="space-y-0">
					<Sidebar.MenuItem>
						<Sidebar.MenuButton class={data.dashboard.isActive ? " bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary" : ""} tooltipContent="Project Dashboard">
							{#snippet child({ props })}
							<a href={data.dashboard.url} {...props} >
								<data.dashboard.icon />
								<span>{data.dashboard.title}</span>
							</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
					<Sidebar.MenuItem class="p-0">
							{#each data.designThinking.subMenus as subMenu}
							<Sidebar.Group class="px-0 py-1">
								<Sidebar.GroupLabel class="-mt-1 text-xs">{subMenu.name}</Sidebar.GroupLabel>
								<Sidebar.GroupContent>
									{#each subMenu.items as item}
										<SubMenu item={item} projectId={projectId} path={path} prefix={item.prefix}/>
									{/each}
								</Sidebar.GroupContent>
							</Sidebar.Group>
							{/each}
					</Sidebar.MenuItem>
					<Sidebar.Group class="px-0">
						<Sidebar.GroupLabel class="-mt-1 text-xs">Other</Sidebar.GroupLabel>
						<Sidebar.GroupContent>
							<Sidebar.MenuItem>
							<Sidebar.MenuButton class={data.projectSupport.items.calendar.isActive ? " bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary" : ""} tooltipContent={data.projectSupport.items.calendar.title}>
									{#snippet child({ props })}
									<a href={data.projectSupport.items.calendar.url} {...props}>
										<data.projectSupport.items.calendar.icon />
										<span>{data.projectSupport.items.calendar.title}</span>
									</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
							<Sidebar.MenuItem>
								<Sidebar.MenuButton class={data.projectSupport.items.resources.isActive ? " bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary" : ""} tooltipContent={data.projectSupport.items.resources.title}>
									{#snippet child({ props })}
									<a href={data.projectSupport.items.resources.url} {...props}>
										<data.projectSupport.items.resources.icon />
										<span>{data.projectSupport.items.resources.title}</span>
									</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						<SubMenu item={data.projectSupport.items.pages} projectId={projectId} path={path} prefix={data.projectSupport.items.pages.prefix}/>
						</Sidebar.GroupContent>
					</Sidebar.Group>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<Sidebar.Group>
			<Sidebar.GroupLabel>Team</Sidebar.GroupLabel>
			{#each data.navTeam as item}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton tooltipContent={item.tooltip} class={item.isActive ? " bg-primary/10 hover:bg-primary/20 border-primary text-primary hover:text-primary" : ""}>
					{#snippet child({ props })}
					<a href={item.url} {...props}>
						<item.icon/>
						<span>{item.name}</span>
					</a>
					{/snippet}
				</Sidebar.MenuButton>
            </Sidebar.MenuItem>
			{/each}
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={data.user} />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
