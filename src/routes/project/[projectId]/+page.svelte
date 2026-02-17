<script lang="ts">
	import { page } from "$app/state";
	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import * as Card from "$lib/components/ui/card";
	import {
		ChartContainer,
		ChartTooltip,
		type ChartConfig
	} from "$lib/components/ui/chart/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { BarChart } from "layerchart";
	import {
		AlertTriangle,
		ArrowUpRight,
		CalendarClock,
		Clock3,
		FolderOpen,
		Lightbulb,
		LockKeyhole,
		ListChecks
	} from "@lucide/svelte";

	let { data } = $props();

	type TaskStatus = "Planned" | "In Progress" | "Blocked" | "Completed" | "Abandoned";
	type Task = {
		id: string;
		title: string;
		status: TaskStatus;
		deadline: string;
		owner: string;
		hasFeedback: boolean;
	};
	type AlertItem = {
		label: string;
		count: number;
		description: string;
		severity: "amber" | "red";
		href: string;
	};
	type PhaseSeriesKey = "stories" | "journeys" | "problems" | "ideas" | "tasks" | "feedback";
	type PhaseChartDatum = {
		phase: "Empathize" | "Define" | "Ideate" | "Prototype" | "Test";
		phaseHref: string;
		stories: number;
		journeys: number;
		problems: number;
		ideas: number;
		tasks: number;
		feedback: number;
		links: Record<PhaseSeriesKey, string>;
	};

	const projectId = page.params.projectId;
	const project = data.dashboard.project;
	const me = data.dashboard.me;
	const now = new Date(data.dashboard.now);
	const stories = data.dashboard.stories;
	const journeys = data.dashboard.journeys;
	const problems = data.dashboard.problems;
	const ideas = data.dashboard.ideas;
	const tasks: Task[] = data.dashboard.tasks as Task[];
	const feedback = data.dashboard.feedback;
	const events = data.dashboard.events;
	const activity = data.dashboard.activity;
	const recentEdits = data.dashboard.recentEdits;

	const openTasks = tasks.filter((t) => t.status !== "Completed" && t.status !== "Abandoned");
	const overdueTasks = tasks.filter(
		(t) => t.status !== "Completed" && t.status !== "Abandoned" && new Date(t.deadline) < now
	);
	const lockedProblems = problems.filter((p) => p.status === "Locked");
	const selectedIdeas = ideas.filter((i) => i.status === "Selected");

	const stats = [
		{
			label: "Total Artifacts",
			value: stories.length + journeys.length + problems.length + ideas.length + tasks.length + feedback.length,
			description: "Across Design Thinking phases",
			href: `/project/${projectId}/pages`,
			icon: FolderOpen,
			tone: "normal"
		},
		{
			label: "Open Tasks",
			value: openTasks.length,
			description: "Not completed or abandoned",
			href: `/project/${projectId}/tasks?status=open`,
			icon: ListChecks,
			tone: overdueTasks.length > 0 ? "warning" : "normal"
		},
		{
			label: "Locked Problems",
			value: lockedProblems.length,
			description: "Ready for execution",
			href: `/project/${projectId}/problem-statement?status=locked`,
			icon: LockKeyhole,
			tone: "normal"
		},
		{
			label: "Selected Ideas",
			value: selectedIdeas.length,
			description: "Chosen for prototype",
			href: `/project/${projectId}/ideas?status=selected`,
			icon: Lightbulb,
			tone: selectedIdeas.some((i) => i.tasksCount === 0) ? "warning" : "normal"
		},
		{
			label: "Feedback Entries",
			value: feedback.length,
			description: "Signals from testing",
			href: `/project/${projectId}/feedback`,
			icon: CalendarClock,
			tone: feedback.some((f) => f.outcome === "Needs Iteration") ? "warning" : "normal"
		}
	] as const;

	const phaseRows = [
		{ name: "Empathize", total: stories.length + journeys.length, descriptor: `${stories.length} Stories, ${journeys.length} Journeys`, readiness: "Coverage is strong across core personas.", href: `/project/${projectId}/stories` },
		{ name: "Define", total: problems.length, descriptor: `${problems.length} Problems (${lockedProblems.length} Locked)`, readiness: "Locked statements are ready to execute.", href: `/project/${projectId}/problem-statement` },
		{ name: "Ideate", total: ideas.length, descriptor: `${ideas.length} Ideas (${selectedIdeas.length} Selected)`, readiness: "Selected concepts need fuller task conversion.", href: `/project/${projectId}/ideas` },
		{ name: "Prototype", total: tasks.length, descriptor: `${tasks.length} Tasks (${tasks.filter((t) => t.status === "Completed").length} Completed)`, readiness: "Delivery is active with a small blocked queue.", href: `/project/${projectId}/tasks` },
		{ name: "Test", total: feedback.length, descriptor: `${feedback.length} Feedback (${feedback.filter((f) => f.outcome === "Needs Iteration").length} Needs Iteration)`, readiness: "Validation loop is running with open outcomes.", href: `/project/${projectId}/feedback` }
	] as const;

	const phaseChartConfig = {
		stories: { label: "Stories", color: "hsl(204 94% 56%)" },
		journeys: { label: "Journeys", color: "hsl(189 94% 43%)" },
		problems: { label: "Problems", color: "hsl(38 92% 50%)" },
		ideas: { label: "Ideas", color: "hsl(258 90% 66%)" },
		tasks: { label: "Tasks", color: "hsl(151 55% 41%)" },
		feedback: { label: "Feedback", color: "hsl(344 84% 60%)" }
	} satisfies ChartConfig;

	const phaseChartSeries: Array<{ key: PhaseSeriesKey; label: string; color: string }> = [
		{ key: "stories", label: "Stories", color: "var(--color-stories)" },
		{ key: "journeys", label: "Journeys", color: "var(--color-journeys)" },
		{ key: "problems", label: "Problems", color: "var(--color-problems)" },
		{ key: "ideas", label: "Ideas", color: "var(--color-ideas)" },
		{ key: "tasks", label: "Tasks", color: "var(--color-tasks)" },
		{ key: "feedback", label: "Feedback", color: "var(--color-feedback)" }
	];

	const phaseLegend = phaseChartSeries.map((series) => ({
		key: series.key,
		label: series.label
	}));

	const phaseChartData: PhaseChartDatum[] = [
		{
			phase: "Empathize",
			phaseHref: `/project/${projectId}/stories`,
			stories: stories.length,
			journeys: journeys.length,
			problems: 0,
			ideas: 0,
			tasks: 0,
			feedback: 0,
			links: {
				stories: `/project/${projectId}/stories`,
				journeys: `/project/${projectId}/journeys`,
				problems: `/project/${projectId}/problem-statement`,
				ideas: `/project/${projectId}/ideas`,
				tasks: `/project/${projectId}/tasks`,
				feedback: `/project/${projectId}/feedback`
			}
		},
		{
			phase: "Define",
			phaseHref: `/project/${projectId}/problem-statement`,
			stories: 0,
			journeys: 0,
			problems: problems.length,
			ideas: 0,
			tasks: 0,
			feedback: 0,
			links: {
				stories: `/project/${projectId}/stories`,
				journeys: `/project/${projectId}/journeys`,
				problems: `/project/${projectId}/problem-statement`,
				ideas: `/project/${projectId}/ideas`,
				tasks: `/project/${projectId}/tasks`,
				feedback: `/project/${projectId}/feedback`
			}
		},
		{
			phase: "Ideate",
			phaseHref: `/project/${projectId}/ideas`,
			stories: 0,
			journeys: 0,
			problems: 0,
			ideas: ideas.length,
			tasks: 0,
			feedback: 0,
			links: {
				stories: `/project/${projectId}/stories`,
				journeys: `/project/${projectId}/journeys`,
				problems: `/project/${projectId}/problem-statement`,
				ideas: `/project/${projectId}/ideas`,
				tasks: `/project/${projectId}/tasks`,
				feedback: `/project/${projectId}/feedback`
			}
		},
		{
			phase: "Prototype",
			phaseHref: `/project/${projectId}/tasks`,
			stories: 0,
			journeys: 0,
			problems: 0,
			ideas: 0,
			tasks: tasks.length,
			feedback: 0,
			links: {
				stories: `/project/${projectId}/stories`,
				journeys: `/project/${projectId}/journeys`,
				problems: `/project/${projectId}/problem-statement`,
				ideas: `/project/${projectId}/ideas`,
				tasks: `/project/${projectId}/tasks`,
				feedback: `/project/${projectId}/feedback`
			}
		},
		{
			phase: "Test",
			phaseHref: `/project/${projectId}/feedback`,
			stories: 0,
			journeys: 0,
			problems: 0,
			ideas: 0,
			tasks: 0,
			feedback: feedback.length,
			links: {
				stories: `/project/${projectId}/stories`,
				journeys: `/project/${projectId}/journeys`,
				problems: `/project/${projectId}/problem-statement`,
				ideas: `/project/${projectId}/ideas`,
				tasks: `/project/${projectId}/tasks`,
				feedback: `/project/${projectId}/feedback`
			}
		}
	];

	const myTasks = tasks
		.filter((t) => t.owner === me.name)
		.slice()
		.sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
		.slice(0, 5);
	const myFeedback = feedback.filter((f) => f.owner === me.name).slice(0, 5);
	const myEdits = recentEdits.slice().sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 5);

	const alerts = ([
		{
			label: "Orphan Artifacts",
			count: stories.filter((s) => s.isOrphan).length + journeys.filter((j) => j.isOrphan).length,
			description: "Artifacts not linked to downstream work.",
			severity: "amber",
			href: `/project/${projectId}/pages?filter=orphan`
		},
		{
			label: "Overdue Tasks",
			count: overdueTasks.length,
			description: "Open tasks past due date.",
			severity: "red",
			href: `/project/${projectId}/tasks?status=overdue`
		},
		{
			label: "Blocked / Abandoned Tasks",
			count: tasks.filter((t) => t.status === "Blocked" || t.status === "Abandoned").length,
			description: "Tasks that cannot progress.",
			severity: "red",
			href: `/project/${projectId}/tasks?status=blocked,abandoned`
		},
		{
			label: "Problems With No Ideas",
			count: problems.filter((p) => p.ideasCount === 0).length,
			description: "Define phase gaps requiring ideation.",
			severity: "amber",
			href: `/project/${projectId}/problem-statement?filter=no-ideas`
		},
		{
			label: "Selected Ideas With No Tasks",
			count: ideas.filter((i) => i.status === "Selected" && i.tasksCount === 0).length,
			description: "Chosen ideas missing implementation tasks.",
			severity: "amber",
			href: `/project/${projectId}/ideas?filter=no-tasks`
		},
		{
			label: "Completed Tasks With No Feedback",
			count: tasks.filter((t) => t.status === "Completed" && !t.hasFeedback).length,
			description: "Completed work without test evidence.",
			severity: "amber",
			href: `/project/${projectId}/tasks?filter=completed-without-feedback`
		}
	] satisfies AlertItem[]).filter((a) => a.count > 0);

	const upcomingEvents = events
		.filter((e) => +new Date(e.startAt) >= +now)
		.slice()
		.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
		.slice(0, 5);
	const recentActivity = activity.slice().sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 10);

	const toneCardClass = {
		normal: "border-border bg-card",
		warning: "border-amber-300/50 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-950/30",
		critical: "border-red-300/50 bg-red-50/70 dark:border-red-500/40 dark:bg-red-950/20"
	} as const;
	const toneValueClass = {
		normal: "text-foreground",
		warning: "text-amber-700 dark:text-amber-300",
		critical: "text-red-700 dark:text-red-300"
	} as const;
	const alertClass = {
		amber: "border-amber-300/50 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-950/30",
		red: "border-red-300/50 bg-red-50/70 dark:border-red-500/40 dark:bg-red-950/20"
	} as const;

	const fmtDateTime = (v: string) =>
		new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));
	const fmtDue = (v: string) =>
		new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(v));
	const fmtAgo = (v: string) => {
		const minutes = Math.round((+now - +new Date(v)) / 60000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.round(hours / 24)}d ago`;
	};
	const overdue = (t: Task) =>
		t.status !== "Completed" && t.status !== "Abandoned" && +new Date(t.deadline) < +now;

	const handlePhaseBarClick = (
		_event: MouseEvent,
		detail: { data: PhaseChartDatum; series: { key: string } }
	) => {
		const seriesKey = detail.series.key as PhaseSeriesKey;
		const href = detail.data.links[seriesKey] ?? detail.data.phaseHref;

		if (typeof window !== "undefined") {
			window.location.assign(href);
		}
	};
</script>

<div class="flex flex-col gap-4 rounded-lg bg-background p-4">
	<header
		class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex items-center gap-2 px-2 sm:px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href={`/project/${projectId}`}>{project.name}</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Project Dashboard</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-4 md:px-20">
		<section class="rounded-xl border border-border bg-card p-4 sm:p-6">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="space-y-1">
					<p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project Dashboard</p>
					<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h1>
				</div>
				<Badge variant={project.status === "Active" ? "default" : "secondary"}>{project.status}</Badge>
			</div>
		</section>

		<section class="space-y-3">
			<h2 class="text-lg font-semibold">Global Project Stats</h2>
			<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
				{#each stats as stat (stat.label)}
					<a
						href={stat.href}
						class={`group rounded-xl border p-4 transition-colors hover:bg-accent/60 ${toneCardClass[stat.tone]}`}
					>
						<div class="mb-3 flex items-start justify-between gap-3">
							<p class="text-sm font-medium text-muted-foreground">{stat.label}</p>
							<stat.icon class="size-4 text-muted-foreground" />
						</div>
						<div class={`text-3xl font-semibold tracking-tight ${toneValueClass[stat.tone]}`}>{stat.value}</div>
						<p class="mt-1 text-xs text-muted-foreground">{stat.description}</p>
						<div class="mt-3 inline-flex items-center text-xs font-medium text-primary">
							View <ArrowUpRight class="ml-1 size-3.5" />
						</div>
					</a>
				{/each}
			</div>
		</section>

		<section class="space-y-3">
			<h2 class="text-lg font-semibold">Design Thinking Phase Overview</h2>
			<div class="grid gap-4 xl:grid-cols-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Phase Stats</Card.Title>
						<Card.Description>Load and readiness by phase.</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-2">
						{#each phaseRows as phase (phase.name)}
							<a
								href={phase.href}
								class="flex flex-col gap-1 rounded-lg border border-border p-3 transition-colors hover:bg-accent/60"
							>
								<div class="flex items-center justify-between gap-2">
									<p class="text-sm font-semibold">{phase.name}</p>
									<p class="text-sm text-muted-foreground">{phase.total}</p>
								</div>
								<p class="text-sm text-muted-foreground">{phase.descriptor}</p>
								<p class="text-xs text-muted-foreground">{phase.readiness}</p>
							</a>
						{/each}
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Phase Chart</Card.Title>
						<Card.Description>Stacked bar view of artifact counts.</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
							{#each phaseLegend as legend (legend.key)}
								<div class="inline-flex items-center gap-1.5">
									<span
										class="size-2.5 rounded-full"
										style={`background-color: var(--color-${legend.key})`}
									></span>
									<span>{legend.label}</span>
								</div>
							{/each}
						</div>

						<ChartContainer config={phaseChartConfig} class="max-h-80 w-full">
							<BarChart
								data={phaseChartData}
								x="phase"
								series={phaseChartSeries}
								seriesLayout="stack"
								props={{ bars: { class: "cursor-pointer" } }}
								onBarClick={handlePhaseBarClick}
							>
								{#snippet tooltip()}
									<ChartTooltip />
								{/snippet}
							</BarChart>
						</ChartContainer>
						<p class="text-xs text-muted-foreground">
							Hover for counts and click a bar segment to open the matching filtered index.
						</p>
					</Card.Content>
				</Card.Root>
			</div>
		</section>

		<section class="grid gap-4 xl:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>My Work</Card.Title>
					<Card.Description>Read-only responsibilities for {me.name}.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-5">
					<div class="space-y-2">
						<h3 class="text-sm font-semibold">Assigned Tasks</h3>
						{#each myTasks as task (task.id)}
							<a
								href={`/project/${projectId}/tasks/${task.id}`}
								class="flex items-start justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/60"
							>
								<div class="space-y-1">
									<p class="text-sm font-medium">{task.title}</p>
									<p class="text-xs text-muted-foreground">Prototype - {task.status}</p>
								</div>
								<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
									<Clock3 class="size-3.5" />
									<span>{fmtDue(task.deadline)}</span>
									{#if overdue(task)}
										<AlertTriangle class="size-3.5 text-red-500" aria-label="Overdue task" />
									{/if}
								</div>
							</a>
						{/each}
					</div>

					<div class="space-y-2">
						<h3 class="text-sm font-semibold">Pending Feedback</h3>
						{#each myFeedback as item (item.id)}
							<a
								href={`/project/${projectId}/feedback/${item.id}`}
								class="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/60"
							>
								<p class="text-sm font-medium">{item.title}</p>
								<Badge variant={item.outcome === "Needs Iteration" ? "destructive" : "secondary"}>{item.outcome}</Badge>
							</a>
						{/each}
					</div>

					<div class="space-y-2">
						<h3 class="text-sm font-semibold">Recently Edited By Me</h3>
						{#each myEdits as edit (edit.id)}
							<a
								href={edit.href}
								class="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/60"
							>
								<div class="space-y-0.5">
									<p class="text-sm font-medium">{edit.title}</p>
									<p class="text-xs text-muted-foreground">{edit.type}</p>
								</div>
								<p class="text-xs text-muted-foreground">{fmtAgo(edit.at)}</p>
							</a>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			{#if alerts.length > 0}
				<Card.Root>
					<Card.Header>
						<Card.Title>Alerts &amp; Warnings</Card.Title>
						<Card.Description>Auto-generated risks and blockers.</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-2">
						{#each alerts as alert (alert.label)}
							<div class={`rounded-lg border p-3 ${alertClass[alert.severity]}`}>
								<div class="flex items-start justify-between gap-2">
									<div class="space-y-1">
										<p class="text-sm font-semibold">{alert.label}</p>
										<p class="text-xs text-muted-foreground">{alert.description}</p>
									</div>
									<p class="text-lg font-semibold">{alert.count}</p>
								</div>
								<a href={alert.href} class="mt-2 inline-flex items-center text-xs font-medium text-primary">
									View <ArrowUpRight class="ml-1 size-3.5" />
								</a>
							</div>
						{/each}
					</Card.Content>
				</Card.Root>
			{/if}
		</section>

		<section>
			<Card.Root>
				<Card.Header>
					<Card.Title>Upcoming Events</Card.Title>
					<Card.Description>Next 5 calendar events by date.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-2">
					{#each upcomingEvents as event (event.id)}
						<a
							href={`/project/${projectId}/calendar/${event.id}`}
							class="flex flex-col gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/60 sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="space-y-1">
								<p class="text-sm font-medium">{event.title}</p>
								<p class="text-xs text-muted-foreground">{fmtDateTime(event.startAt)} - {event.type}</p>
							</div>
							<div class="flex items-center gap-2">
								<Avatar.Root class="size-7 rounded-full">
									<Avatar.Fallback class="rounded-full text-[10px]">{event.initials}</Avatar.Fallback>
								</Avatar.Root>
								<span class="text-xs text-muted-foreground">{event.creator}</span>
							</div>
						</a>
					{/each}
				</Card.Content>
			</Card.Root>
		</section>

		<section>
			<Card.Root>
				<Card.Header>
					<Card.Title>Recent Activity</Card.Title>
					<Card.Description>Latest 10 project-wide actions.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#each recentActivity as item (item.id)}
						<div class="flex items-start gap-3 rounded-lg border border-border p-3">
							<Avatar.Root class="size-8 rounded-full">
								<Avatar.Fallback class="rounded-full text-[10px]">{item.initials}</Avatar.Fallback>
							</Avatar.Root>
							<div class="min-w-0 flex-1">
								<p class="text-sm leading-5">
									<span class="font-medium">{item.user}</span>
									<span class="text-muted-foreground"> {item.action} </span>
									<a href={item.href} class="font-medium text-primary hover:underline">{item.artifact}</a>
								</p>
								<p class="mt-1 text-xs text-muted-foreground">{fmtAgo(item.at)}</p>
							</div>
						</div>
					{/each}
					<div class="pt-1">
						<a href={`/project/${projectId}/activity`} class="text-sm font-medium text-primary hover:underline">View all activity</a>
					</div>
				</Card.Content>
			</Card.Root>
		</section>
	</div>
</div>



