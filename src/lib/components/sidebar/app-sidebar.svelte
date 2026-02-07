<script lang="ts">
	import SubMenu from "$lib/components/sidebar/subMenu.svelte";
	import NavUser from "$lib/components/sidebar/nav-user.svelte";
	import OrganizationSwitcher from "$lib/components/sidebar/organization-switcher.svelte";
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import ProjectSwitcher from "./project-switcher.svelte";
	import type { ComponentProps } from "svelte";
	import { UserLock, Settings, Users, LayoutDashboard } from "@lucide/svelte"

	import { page } from "$app/state";

	let dummyProjectId = "yeyyy";
	let projectId = $derived(page.params.projectId ? page.params.projectId : dummyProjectId);
	let path = $derived((page.url.pathname.split('project/' + projectId + '/'))[1] ?? "/");

	import { 
		BookOpenIcon, 
		AudioWaveformIcon, 
		ChartPieIcon, 
		CommandIcon, 
		Calendar, 
		Folder, 
		ChevronRightIcon,
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
	const data = $derived({
		user: {
			name: "shadcn",
			email: "m@example.com",
			avatar: "/avatars/shadcn.jpg",
		},
		organization: [
			{
				name: "Acme Inc",
				logo: GalleryVerticalEndIcon,
				plan: "Enterprise",
			},
			{
				name: "Acme Corp.",
				logo: AudioWaveformIcon,
				plan: "Startup",
			},
			{
				name: "Evil Corp.",
				logo: CommandIcon,
				plan: "Free",
			},
		],
		projects: [
			{
				name: "Design Engineering",
				url: "/project/design",
				icon: FrameIcon,
			},
			{
				name: "Sales & Marketing",
				url: "/project/sales",
				icon: ChartPieIcon,
			},
			{
				name: "Travel",
				url: "/project/travel",
				icon: MapIcon,
			},
		],
		dashboard: {
			title: "Dashboard",
			url: "/project/"+ projectId,
			icon: LayoutDashboard,
			isActive: path === "/",
		},

		designThinking: {
			name: "Design Thinking",
			icon: Compass,
			isActive: true,
			subMenus: [
				{
					name: "Empathize",
					isActive: path.includes("stories") || path.includes("journeys"),
					items: [
						{
							title: "User Stories",
							icon: UserRound,
							prefix: "stories",
							isActive: path.includes("stories"),
							items: [
								{
									title: "User 1",
									slug: "user-1"
								},
							],
						},
						{
							title: "User Journeys",
							icon: Route,
							prefix: "journeys",
							isActive: path.includes("journeys"),
							items: [
								{
									title: "User 1",
									slug: "user-1"
								},
							]
						}
					]
				},
				{
					name: "Define",
					isActive: path.includes("problem-statement"),
					items: [
						{
							title: "Problem Statement",
							icon: Target,
							prefix: "problem-statement",
							isActive: path.includes("problem-statement"),
							items: [
								{
									title: "User 1",
									slug: "user-1"
								},
							]
						}
					]
				},
				{
					name: "Ideate",
					isActive: path.includes("ideas") || path.includes("whiteboard"),
					items: [
						{
							title: "Ideas",
							icon: Lightbulb,
							prefix: "ideas",
							isActive: path.includes("ideas"),
							items: [
								{
									title: "Idea 1",
									slug: "idea-1"
								},
							]
						},
						{
							title: "Whiteboard",
							icon: PresentationIcon,
							prefix: "whiteboard",
							isActive: path.includes("whiteboard"),
							items: [
								{
									title: "Whiteboard 1",
									slug: "whiteboard-1"
								},
							]
						}
					]
				},
				{
					name: "Prototype",
					isActive: path.includes("tasks"),
					items: [
						{
							title: "Task Board",
							icon: ClipboardList,
							prefix: "tasks",
							isActive: path.includes("tasks"),
							items: [
								{
									title: "My Tasks",
									slug: "mytasks"
								},
								{
									title: "Urgent Tasks",
									slug: "urgent"
								},
							]
						}
					]
				},
				{
					name: "Test",
					isActive: path.includes("feedback"),
					items: [
						{
							title: "Feedback",
							icon: MessageSquareQuote,
							prefix: "feedback",
							isActive: path.includes("feedback"),
							items: [
								{
									title: "Feedback 1",
									slug: "feedback-1"
								}
							]
						}
					]
				},
			]
		},
		
		projectSupport: {
			name: "Project Support",
			isActive: path.includes("calendar") || path.includes("resources") || path.includes("pages"),
			items: {
				calendar: {
					title: "Calendar",
					url: "/project/"+ projectId +"/calendar",
					icon: Calendar,
					isActive: path.includes("calendar"),
				},
				resources: {
					title: "Resources",
					url: "/project/"+ projectId +"/resources",
					icon: Folder,
					isActive: path.includes("resources"),
				},
				pages: {
					title: "Pages",
					prefix: "pages",
					isActive: path.includes("pages"),	
					icon: NotepadText,
					items: [
						{
							title: "Welcome",
							slug: "welcome"
						}
					]
				}
			}
		},

		navTeam: [
			{
				name: "Members",
				url: "/project/"+ projectId +"/team/members",
				icon: Users,
				tooltip: "Manage Members",
				isActive: path.includes("members"),
			},
			{
				name: "Roles",
				url: "/project/"+ projectId +"/team/roles",
				icon: UserLock,
				tooltip: "Manage Roles & Access",
				isActive: path.includes("roles"),
			},
			{
				name: "Project Settings",
				url: "/project/"+ projectId +"/settings",
				icon: Settings,
				tooltip: "Project Settings",
				isActive: path.includes("settings"),
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
										<SubMenu item={item} projectId={projectId} path={path}/>
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
						<SubMenu item={data.projectSupport.items.pages} projectId={projectId} path={path}/>
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
