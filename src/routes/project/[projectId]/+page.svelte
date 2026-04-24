<script lang="ts">
	import { page } from "$app/state";
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
	import { resolveIconComponent } from "$lib/utils/icon-fallback";
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
	type DashboardTask = {
		id: string;
		title: string;
		status: TaskStatus;
		deadline: string;
	};
	type DashboardFeedback = {
		id: string;
		title: string;
		outcome: FeedbackOutcome;
	};
	type DashboardSummary = {
		stories: number;
		journeys: number;
		problems: number;
		ideas: number;
		tasks: number;
		feedback: number;
		orphanStories: number;
		orphanJourneys: number;
		lockedProblems: number;
		problemsWithoutIdeas: number;
		selectedIdeas: number;
		selectedIdeasWithoutTasks: number;
		openTasks: number;
		overdueTasks: number;
		completedTasks: number;
		blockedOrAbandonedTasks: number;
		completedTasksNoFeedback: number;
		feedbackNeedsIteration: number;
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

	let projectId = $derived(page.params.projectId);
	let project = $derived(data.dashboard.project);
	let me = $derived(data.dashboard.me);
	let summary = $derived(data.dashboard.summary as DashboardSummary);
	let now = $derived.by(() => new Date(data.dashboard.now));
	let myTaskFocus = $derived(data.dashboard.myTasks as DashboardTask[]);
	let myFeedbackFocus = $derived(data.dashboard.myFeedback as DashboardFeedback[]);
	let recentEdits = $derived(data.dashboard.recentEdits);

	let totalArtifacts = $derived.by(
		() =>
			summary.stories +
			summary.journeys +
			summary.problems +
			summary.ideas +
			summary.tasks +
			summary.feedback
	);

	let stats = $derived.by(
		() =>
			[
				{
					label: "Total Artifacts",
					value: totalArtifacts,
					description: "Across Design Thinking phases",
					href: `/project/${projectId}/pages`,
					icon: FolderOpen,
					tone: "normal"
				},
				{
					label: "Open Tasks",
					value: summary.openTasks,
					description: "Not completed or abandoned",
					href: `/project/${projectId}/tasks?status=open`,
					icon: ListChecks,
					tone: summary.overdueTasks > 0 ? "warning" : "normal"
				},
				{
					label: "Locked Problems",
					value: summary.lockedProblems,
					description: "Ready for execution",
					href: `/project/${projectId}/problem-statement?status=locked`,
					icon: LockKeyhole,
					tone: "normal"
				},
				{
					label: "Selected Ideas",
					value: summary.selectedIdeas,
					description: "Chosen for prototype",
					href: `/project/${projectId}/ideas?status=selected`,
					icon: Lightbulb,
					tone: summary.selectedIdeasWithoutTasks > 0 ? "warning" : "normal"
				},
				{
					label: "Feedback Entries",
					value: summary.feedback,
					description: "Signals from testing",
					href: `/project/${projectId}/feedback`,
					icon: CalendarClock,
					tone: summary.feedbackNeedsIteration > 0 ? "warning" : "normal"
				}
			] as const
	);

	let phaseRows = $derived.by(
		() =>
			[
				{
					name: "Empathize",
					total: summary.stories + summary.journeys,
					descriptor: `${summary.stories} Stories, ${summary.journeys} Journeys`,
					readiness: "Coverage is strong across core personas.",
					href: `/project/${projectId}/stories`
				},
				{
					name: "Define",
					total: summary.problems,
					descriptor: `${summary.problems} Problems (${summary.lockedProblems} Locked)`,
					readiness: "Locked statements are ready to execute.",
					href: `/project/${projectId}/problem-statement`
				},
				{
					name: "Ideate",
					total: summary.ideas,
					descriptor: `${summary.ideas} Ideas (${summary.selectedIdeas} Selected)`,
					readiness: "Selected concepts need fuller task conversion.",
					href: `/project/${projectId}/ideas`
				},
				{
					name: "Prototype",
					total: summary.tasks,
					descriptor: `${summary.tasks} Tasks (${summary.completedTasks} Completed)`,
					readiness: "Delivery is active with a small blocked queue.",
					href: `/project/${projectId}/tasks`
				},
				{
					name: "Test",
					total: summary.feedback,
					descriptor: `${summary.feedback} Feedback (${summary.feedbackNeedsIteration} Needs Iteration)`,
					readiness: "Validation loop is running with open outcomes.",
					href: `/project/${projectId}/feedback`
				}
			] as const
	);

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

	let phaseChartData = $derived.by(
		(): PhaseChartDatum[] => [
			{
				phase: "Empathize",
				phaseHref: `/project/${projectId}/stories`,
				stories: summary.stories,
				journeys: summary.journeys,
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
				problems: summary.problems,
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
				ideas: summary.ideas,
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
				tasks: summary.tasks,
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
				feedback: summary.feedback,
				links: {
					stories: `/project/${projectId}/stories`,
					journeys: `/project/${projectId}/journeys`,
					problems: `/project/${projectId}/problem-statement`,
					ideas: `/project/${projectId}/ideas`,
					tasks: `/project/${projectId}/tasks`,
					feedback: `/project/${projectId}/feedback`
				}
			}
		]
	);

	let myTasks = $derived.by(() => myTaskFocus.slice(0, 5));
	let myFeedback = $derived.by(() => myFeedbackFocus.slice(0, 5));
	let myEdits = $derived.by(() =>
		recentEdits
			.slice()
			.sort((a, b) => +new Date(b.at) - +new Date(a.at))
			.slice(0, 5)
	);

	let alerts = $derived.by(() =>
		([
			{
				label: "Orphan Artifacts",
				count: summary.orphanStories + summary.orphanJourneys,
				description: "Artifacts not linked to downstream work.",
				severity: "amber",
				href: `/project/${projectId}/pages?filter=orphan`
			},
			{
				label: "Overdue Tasks",
				count: summary.overdueTasks,
				description: "Open tasks past due date.",
				severity: "red",
				href: `/project/${projectId}/tasks?status=overdue`
			},
			{
				label: "Blocked / Abandoned Tasks",
				count: summary.blockedOrAbandonedTasks,
				description: "Tasks that cannot progress.",
				severity: "red",
				href: `/project/${projectId}/tasks?status=blocked,abandoned`
			},
			{
				label: "Problems With No Ideas",
				count: summary.problemsWithoutIdeas,
				description: "Define phase gaps requiring ideation.",
				severity: "amber",
				href: `/project/${projectId}/problem-statement?filter=no-ideas`
			},
			{
				label: "Selected Ideas With No Tasks",
				count: summary.selectedIdeasWithoutTasks,
				description: "Chosen ideas missing implementation tasks.",
				severity: "amber",
				href: `/project/${projectId}/ideas?filter=no-tasks`
			},
			{
				label: "Completed Tasks With No Feedback",
				count: summary.completedTasksNoFeedback,
				description: "Completed work without test evidence.",
				severity: "amber",
				href: `/project/${projectId}/tasks?filter=completed-without-feedback`
			}
		] satisfies AlertItem[]).filter((a) => a.count > 0)
	);

	const toneCardClass = {
		normal: "border-border bg-card",
		warning: "border-amber-500/20 bg-amber-500/10 dark:border-amber-500/20 dark:bg-amber-500/10",
		critical: "border-red-500/20 bg-red-500/10 dark:border-red-500/20 dark:bg-red-500/10"
	} as const;
	const toneValueClass = {
		normal: "text-foreground",
		warning: "text-amber-700 dark:text-amber-300",
		critical: "text-red-700 dark:text-red-300"
	} as const;
	const alertClass = {
		amber: "border-amber-500/20 bg-amber-500/10 dark:border-amber-500/20 dark:bg-amber-500/10",
		red: "border-red-500/20 bg-red-500/10 dark:border-red-500/20 dark:bg-red-500/10"
	} as const;

	const parseDate = (value: string): Date | null => {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	};

	const fmtDue = (value: string) => {
		const parsed = parseDate(value);
		if (!parsed) {
			return "No due date";
		}
		return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(parsed);
	};
	const fmtAgo = (v: string) => {
		const parsed = parseDate(v);
		if (!parsed) {
			return "just now";
		}
		const minutes = Math.round((+now - +parsed) / 60000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.round(hours / 24)}d ago`;
	};
	const overdue = (t: DashboardTask) => {
		const dueDate = parseDate(t.deadline);
		if (!dueDate) {
			return false;
		}
		return t.status !== "Completed" && t.status !== "Abandoned" && +dueDate < +now;
	};

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

<svelte:head>
	<title>Dashboard • {project?.name ?? "Project"} • ProjectBook</title>
	<meta
		name="description"
		content="Overview of project progress, phase coverage, and recent activity."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

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
					{@const StatIcon = resolveIconComponent(stat.icon, FolderOpen)}
					<a
						href={stat.href}
						class={`group rounded-xl border p-4 transition-colors hover:bg-accent/60 ${toneCardClass[stat.tone]}`}
					>
						<div class="mb-3 flex items-start justify-between gap-3">
							<p class="text-sm font-medium text-muted-foreground">{stat.label}</p>
							<StatIcon class="size-4 text-muted-foreground" />
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
					<Card.Title>Timeline Views</Card.Title>
					<Card.Description>Calendar events and activity logs are available on dedicated pages.</Card.Description>
				</Card.Header>
				<Card.Content class="grid gap-3 sm:grid-cols-2">
					<a
						href={`/project/${projectId}/calendar`}
						class="rounded-lg border border-border p-3 transition-colors hover:bg-accent/60"
					>
						<p class="text-sm font-semibold">Calendar</p>
						<p class="mt-1 text-xs text-muted-foreground">View upcoming events, deadlines, and reminders.</p>
					</a>
					<a
						href={`/project/${projectId}/activity`}
						class="rounded-lg border border-border p-3 transition-colors hover:bg-accent/60"
					>
						<p class="text-sm font-semibold">Activity Log</p>
						<p class="mt-1 text-xs text-muted-foreground">Review project-wide actions and recent updates.</p>
					</a>
				</Card.Content>
			</Card.Root>
		</section>
	</div>
</div>



