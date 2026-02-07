<script lang="ts">
	import { page } from "$app/state";
	import { AlertTriangle, ArrowUpRight, CircleSlash, Clock3, ListTodo } from "@lucide/svelte";
	import * as Alert from "$lib/components/ui/alert";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Badge from "$lib/components/ui/badge";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb";
	import { Button } from "$lib/components/ui/button";
	import { Progress } from "$lib/components/ui/progress";
	import { Separator } from "$lib/components/ui/separator";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import * as Tooltip from "$lib/components/ui/tooltip";

	type Phase = "Empathize" | "Define" | "Ideate" | "Prototype" | "Test";
	type TaskStatus = "Planned" | "In Progress" | "Completed" | "Abandoned";
	type TaskItem = {
		id: string;
		title: string;
		phase: Phase;
		status: TaskStatus;
		owner: string;
		assignee: string;
		dueDate: string;
		blocked: boolean;
		isOrphan: boolean;
		feedbackCount: number;
	};

	type CalendarEvent = {
		id: string;
		title: string;
		eventType: "Workshop" | "Review" | "Testing Session" | "Meeting" | "Milestone";
		phase: Phase | "No Phase";
		startAt: string;
		createdBy: string;
	};

	type ActivityItem = {
		id: string;
		actor: string;
		phase: Phase;
		description: string;
		target: string;
		targetHref: string;
		createdAt: string;
	};

	const phaseOrder: Phase[] = ["Empathize", "Define", "Ideate", "Prototype", "Test"];
	const currentUser = "Avery Patel";

	const toLocalIsoDate = (date: Date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	const addDaysIso = (offset: number) => {
		const date = new Date();
		date.setDate(date.getDate() + offset);
		return toLocalIsoDate(date);
	};

	const addHoursIso = (offset: number) => {
		const date = new Date();
		date.setHours(date.getHours() + offset);
		return date.toISOString();
	};

	const today = new Date();
	const todayIso = toLocalIsoDate(today);
	const todayStart = new Date(`${todayIso}T00:00:00`);

	let tasks = $state<TaskItem[]>([
		{
			id: "story-interview-synthesis",
			title: "Synthesize interview transcripts",
			phase: "Empathize",
			status: "In Progress",
			owner: "Nia Clark",
			assignee: "Avery Patel",
			dueDate: addDaysIso(-1),
			blocked: false,
			isOrphan: false,
			feedbackCount: 0,
		},
		{
			id: "persona-gap-review",
			title: "Review persona coverage gaps",
			phase: "Empathize",
			status: "Completed",
			owner: "Nia Clark",
			assignee: "Liam Gomez",
			dueDate: addDaysIso(-4),
			blocked: false,
			isOrphan: false,
			feedbackCount: 1,
		},
		{
			id: "problem-statement-freeze",
			title: "Lock final problem statement",
			phase: "Define",
			status: "Planned",
			owner: "Dr. Ramos",
			assignee: "Avery Patel",
			dueDate: addDaysIso(1),
			blocked: false,
			isOrphan: false,
			feedbackCount: 0,
		},
		{
			id: "source-link-repair",
			title: "Repair orphan source links",
			phase: "Define",
			status: "Planned",
			owner: "Dr. Ramos",
			assignee: "Avery Patel",
			dueDate: addDaysIso(2),
			blocked: false,
			isOrphan: true,
			feedbackCount: 0,
		},
		{
			id: "idea-divergence-pass",
			title: "Run divergence ideation pass",
			phase: "Ideate",
			status: "In Progress",
			owner: "Priya Sharma",
			assignee: "Avery Patel",
			dueDate: addDaysIso(3),
			blocked: false,
			isOrphan: false,
			feedbackCount: 0,
		},
		{
			id: "idea-shortlist",
			title: "Shortlist candidate ideas",
			phase: "Ideate",
			status: "Completed",
			owner: "Priya Sharma",
			assignee: "Liam Gomez",
			dueDate: addDaysIso(-2),
			blocked: false,
			isOrphan: false,
			feedbackCount: 2,
		},
		{
			id: "prototype-click-path",
			title: "Build clickable path prototype",
			phase: "Prototype",
			status: "In Progress",
			owner: "Avery Patel",
			assignee: "Avery Patel",
			dueDate: addDaysIso(4),
			blocked: true,
			isOrphan: false,
			feedbackCount: 0,
		},
		{
			id: "usability-prep",
			title: "Prepare usability test script",
			phase: "Prototype",
			status: "Planned",
			owner: "Avery Patel",
			assignee: "Nia Clark",
			dueDate: addDaysIso(6),
			blocked: false,
			isOrphan: false,
			feedbackCount: 0,
		},
		{
			id: "feedback-capture-cycle",
			title: "Capture first testing cycle feedback",
			phase: "Test",
			status: "Planned",
			owner: "Liam Gomez",
			assignee: "Avery Patel",
			dueDate: addDaysIso(2),
			blocked: false,
			isOrphan: false,
			feedbackCount: 0,
		},
		{
			id: "test-result-triage",
			title: "Triage invalidated hypotheses",
			phase: "Test",
			status: "Abandoned",
			owner: "Liam Gomez",
			assignee: "Priya Sharma",
			dueDate: addDaysIso(-1),
			blocked: false,
			isOrphan: false,
			feedbackCount: 3,
		},
	]);

	let events = $state<CalendarEvent[]>([
		{
			id: "event-empathy-workshop",
			title: "Empathy interview workshop",
			eventType: "Workshop",
			phase: "Empathize",
			startAt: addHoursIso(20),
			createdBy: "Nia Clark",
		},
		{
			id: "event-define-review",
			title: "Problem statement review",
			eventType: "Review",
			phase: "Define",
			startAt: addHoursIso(42),
			createdBy: "Dr. Ramos",
		},
		{
			id: "event-prototype-checkpoint",
			title: "Prototype checkpoint",
			eventType: "Meeting",
			phase: "Prototype",
			startAt: addHoursIso(68),
			createdBy: "Avery Patel",
		},
		{
			id: "event-testing-session",
			title: "Usability testing session",
			eventType: "Testing Session",
			phase: "Test",
			startAt: addHoursIso(94),
			createdBy: "Liam Gomez",
		},
		{
			id: "event-milestone-freeze",
			title: "Phase transition milestone",
			eventType: "Milestone",
			phase: "No Phase",
			startAt: addHoursIso(140),
			createdBy: "Dr. Ramos",
		},
	]);

	let activity = $state<ActivityItem[]>([
		{
			id: "act-1",
			actor: "Nia Clark",
			phase: "Empathize",
			description: "updated",
			target: "User Story: Interview synthesis",
			targetHref: `./stories/story-interview-synthesis`,
			createdAt: addHoursIso(-2),
		},
		{
			id: "act-2",
			actor: "Avery Patel",
			phase: "Define",
			description: "edited",
			target: "Problem Statement: Deadline clarity",
			targetHref: `./problem-statement/deadline-clarity`,
			createdAt: addHoursIso(-5),
		},
		{
			id: "act-3",
			actor: "Priya Sharma",
			phase: "Ideate",
			description: "selected",
			target: "Idea: Smart reminder bundles",
			targetHref: `./ideas/smart-reminder-bundles`,
			createdAt: addHoursIso(-9),
		},
		{
			id: "act-4",
			actor: "Liam Gomez",
			phase: "Prototype",
			description: "completed",
			target: "Task: Clickable path prototype",
			targetHref: `./tasks/prototype-click-path`,
			createdAt: addHoursIso(-16),
		},
		{
			id: "act-5",
			actor: "Dr. Ramos",
			phase: "Test",
			description: "commented on",
			target: "Feedback: First test cycle",
			targetHref: `./feedback/first-test-cycle`,
			createdAt: addHoursIso(-22),
		},
	]);

	const projectId = $derived(page.params.projectId ?? "project");
	const projectName = $derived(
		projectId
			.split("-")
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(" ")
	);

	const statusClass = (status: TaskStatus) => {
		if (status === "Planned") return "bg-blue-50 text-blue-700 border-blue-200";
		if (status === "In Progress") return "bg-indigo-50 text-indigo-700 border-indigo-200";
		if (status === "Completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
		return "bg-slate-100 text-slate-700 border-slate-300";
	};

	const phaseClass = (phase: Phase) => {
		if (phase === "Empathize") return "bg-sky-50 text-sky-700 border-sky-200";
		if (phase === "Define") return "bg-cyan-50 text-cyan-700 border-cyan-200";
		if (phase === "Ideate") return "bg-violet-50 text-violet-700 border-violet-200";
		if (phase === "Prototype") return "bg-orange-50 text-orange-700 border-orange-200";
		return "bg-emerald-50 text-emerald-700 border-emerald-200";
	};

	const isClosed = (status: TaskStatus) => status === "Completed" || status === "Abandoned";
	const isOverdue = (task: TaskItem) => task.dueDate < todayIso && !isClosed(task.status);

	const daysUntil = (isoDate: string) => {
		const target = new Date(`${isoDate}T00:00:00`);
		return Math.ceil((target.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
	};

	const avatarInitials = (name: string) =>
		name
			.split(" ")
			.map((part) => part[0] ?? "")
			.join("")
			.slice(0, 2)
			.toUpperCase();

	const formatDateTime = (value: string) =>
		new Date(value).toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});

	const relativeTime = (value: string) => {
		const diffMs = Date.now() - new Date(value).getTime();
		const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		const diffHours = Math.round(diffMinutes / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		const diffDays = Math.round(diffHours / 24);
		return `${diffDays}d ago`;
	};

	const phaseSummary = $derived(
		phaseOrder.map((phase) => {
			const phaseTasks = tasks.filter((task) => task.phase === phase);
			const total = phaseTasks.length;
			const completed = phaseTasks.filter((task) => task.status === "Completed").length;
			const remaining = total - completed;
			const blocked = phaseTasks.filter((task) => task.blocked && !isClosed(task.status)).length;
			const completion = total === 0 ? 0 : Math.round((completed / total) * 100);
			return {
				phase,
				total,
				completed,
				remaining,
				blocked,
				completion,
			};
		})
	);

	const maxPhaseTotal = $derived(Math.max(...phaseSummary.map((row) => row.total), 1));
	const totalTasks = $derived(tasks.length);
	const completedTasks = $derived(tasks.filter((task) => task.status === "Completed").length);
	const overdueTasks = $derived(tasks.filter((task) => isOverdue(task)).length);
	const blockedTasks = $derived(tasks.filter((task) => task.blocked && !isClosed(task.status)).length);
	const orphanTasks = $derived(tasks.filter((task) => task.isOrphan).length);
	const overallCompletion = $derived(totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100));

	const myOpenTasks = $derived(
		tasks.filter((task) => task.assignee === currentUser && !isClosed(task.status))
	);
	const myUrgent = $derived(
		myOpenTasks
			.filter((task) => isOverdue(task) || daysUntil(task.dueDate) <= 3)
			.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
	);
	const myToday = $derived(
		myOpenTasks
			.filter((task) => daysUntil(task.dueDate) === 0)
			.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
	);
	const myUpcoming = $derived(
		myOpenTasks
			.filter((task) => daysUntil(task.dueDate) > 0 && daysUntil(task.dueDate) <= 7)
			.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
	);

	const upcomingEvents = $derived(
		events
			.filter((event) => new Date(event.startAt).getTime() >= Date.now())
			.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
			.slice(0, 5)
	);

	const recentActivity = $derived(
		[...activity].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10)
	);

	const alerts = $derived.by(() => {
		const items: { key: string; title: string; detail: string; href: string; tone: string }[] = [];
		if (overdueTasks > 0) {
			items.push({
				key: "overdue",
				title: `${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"}`,
				detail: "Past due date and still open.",
				href: `./tasks?status=In+Progress&overdue=true`,
				tone: "border-red-300 bg-red-50 text-red-800",
			});
		}
		if (blockedTasks > 0) {
			items.push({
				key: "blocked",
				title: `${blockedTasks} blocked task${blockedTasks === 1 ? "" : "s"}`,
				detail: "Waiting on dependency or review.",
				href: `./tasks?blocked=true`,
				tone: "border-amber-300 bg-amber-50 text-amber-800",
			});
		}
		if (orphanTasks > 0) {
			items.push({
				key: "orphan",
				title: `${orphanTasks} orphan artifact${orphanTasks === 1 ? "" : "s"}`,
				detail: "Missing owner or upstream linkage.",
				href: `./tasks?orphan=true`,
				tone: "border-red-300 bg-red-50 text-red-800",
			});
		}
		return items;
	});

	const statCards = $derived([
		{
			label: "Total Tasks",
			value: totalTasks,
			tone: "text-slate-900",
			href: `./tasks`,
		},
		{
			label: "Overall Completion",
			value: `${overallCompletion}%`,
			tone: "text-emerald-700",
			href: `./tasks?status=Completed`,
		},
		{
			label: "Tasks Overdue",
			value: overdueTasks,
			tone: "text-red-700",
			href: `./tasks?overdue=true`,
		},
		{
			label: "Tasks Blocked",
			value: blockedTasks,
			tone: "text-amber-700",
			href: `./tasks?blocked=true`,
		},
		{
			label: "Orphan Items",
			value: orphanTasks,
			tone: "text-red-700",
			href: `./tasks?orphan=true`,
		},
	]);
</script>

<div class="flex flex-col gap-2 rounded-lg border bg-white p-2">
	<header
		class="flex h-12 w-full items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex w-full items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page>Dashboard</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<Tooltip.Provider>
		<div class="flex flex-col gap-4 py-2 md:px-20">
			<section class="rounded-lg bg-white p-2">
				<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">{projectName}</div>
				<div class="flex flex-wrap items-center justify-between gap-3 px-3">
					<div class="space-y-1">
						<h1 class="text-3xl font-semibold">Dashboard</h1>
						<p class="text-sm text-muted-foreground">
							Project overview aligned to Empathize, Define, Ideate, Prototype, and Test.
						</p>
					</div>
				</div>
			</section>

			<section class="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-5">
				{#each statCards as card (card.label)}
					<a href={card.href} class="rounded-md border p-3 transition-colors hover:bg-muted/40">
						<div class="text-xs text-muted-foreground">{card.label}</div>
						<div class={`text-2xl font-semibold ${card.tone}`}>{card.value}</div>
					</a>
				{/each}
			</section>

			<div class="grid gap-4 xl:grid-cols-[2fr_1fr]">
				<div class="space-y-4">
					{#if alerts.length > 0}
						<section class="space-y-3 rounded-lg bg-white p-4">
							<h2 class="text-sm font-medium">Attention Needed</h2>
							<div class="grid gap-3">
								{#each alerts as item (item.key)}
									<Alert.Root class={`border ${item.tone}`}>
										<AlertTriangle class="h-4 w-4" />
										<Alert.Title>{item.title}</Alert.Title>
										<Alert.Description class="flex items-center justify-between gap-2">
											<span>{item.detail}</span>
											<a href={item.href} class="inline-flex items-center gap-1 text-xs font-medium hover:underline">
												Open
												<ArrowUpRight class="h-3.5 w-3.5" />
											</a>
										</Alert.Description>
									</Alert.Root>
								{/each}
							</div>
						</section>
					{/if}

					<section class="space-y-4 rounded-lg bg-white p-4">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<h2 class="text-sm font-medium">Global Overview</h2>
							<a href="./tasks" class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
								Open tasks index
								<ArrowUpRight class="h-3.5 w-3.5" />
							</a>
						</div>

						<div class="rounded-md border p-4">
							<div class="mb-2 flex items-center justify-between">
								<div class="text-sm font-medium">Overall Completion</div>
								<div class="text-sm text-muted-foreground">{overallCompletion}%</div>
							</div>
							<Progress value={overallCompletion} max={100} />
							<div class="mt-3 text-xs text-muted-foreground">
								{completedTasks} of {totalTasks} tasks are completed across all design thinking phases.
							</div>
						</div>

						<div class="grid gap-3 md:grid-cols-5">
							{#each phaseSummary as row (row.phase)}
								<Tooltip.Root>
									<Tooltip.Trigger>
										<a
											href={`./tasks?phase=${encodeURIComponent(row.phase)}`}
											class="flex flex-col items-center rounded-md border p-2 transition-colors hover:bg-muted/40"
										>
											<div class="flex h-24 w-full items-end rounded-md border bg-muted/30 p-1">
												<div
													class="w-full rounded-sm bg-primary/70"
													style={`height: ${Math.max(Math.round((row.total / maxPhaseTotal) * 100), 8)}%`}
												></div>
											</div>
											<div class="mt-2 text-center text-xs font-medium">{row.phase}</div>
											<div class="text-xs text-muted-foreground">{row.total} tasks</div>
										</a>
									</Tooltip.Trigger>
									<Tooltip.Content>{row.total} total, {row.completed} completed in {row.phase}</Tooltip.Content>
								</Tooltip.Root>
							{/each}
						</div>

						<div class="flex flex-wrap items-center gap-3 text-xs">
							<div class="inline-flex items-center gap-1">
								<span class="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span>
								Completed
							</div>
							<div class="inline-flex items-center gap-1">
								<span class="h-2.5 w-2.5 rounded-sm bg-blue-300"></span>
								Remaining
							</div>
						</div>
					</section>

					<section class="space-y-3 rounded-lg bg-white p-4">
						<h2 class="text-sm font-medium">Phase Progress</h2>
						<div class="grid gap-3">
							{#each phaseSummary as row (row.phase)}
								<div class="rounded-md border p-3">
									<div class="mb-2 flex items-center justify-between gap-2">
										<a href={`./tasks?phase=${encodeURIComponent(row.phase)}`} class="text-sm font-medium hover:underline">
											{row.phase}
										</a>
										<div class="text-xs text-muted-foreground">
											{row.completed}/{row.total} completed
										</div>
									</div>
									<div class="h-3 w-full overflow-hidden rounded-full bg-muted">
										<div class="flex h-full w-full">
											<div
												class="h-full bg-emerald-500"
												style={`width: ${row.total === 0 ? 0 : Math.round((row.completed / row.total) * 100)}%`}
											></div>
											<div
												class="h-full bg-blue-200"
												style={`width: ${row.total === 0 ? 100 : Math.max(0, 100 - Math.round((row.completed / row.total) * 100))}%`}
											></div>
										</div>
									</div>
									<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
										<span>{row.remaining} open</span>
										{#if row.blocked > 0}
											<Badge.Badge class="border-amber-300 bg-amber-50 text-amber-700">
												{row.blocked} blocked
											</Badge.Badge>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</section>
				</div>

				<div class="space-y-4">
					<section class="space-y-3 rounded-lg bg-white p-4">
						<div class="flex items-center justify-between">
							<h2 class="text-sm font-medium">My Work</h2>
							<Badge.Badge class="border-blue-200 bg-blue-50 text-blue-700">{currentUser}</Badge.Badge>
						</div>

						<div class="space-y-3">
							<div class="rounded-md border p-3">
								<div class="mb-2 flex items-center gap-2 text-sm font-medium">
									<AlertTriangle class="h-4 w-4 text-amber-600" />
									Urgent
								</div>
								{#if myUrgent.length === 0}
									<div class="text-xs text-muted-foreground">No urgent tasks.</div>
								{:else}
									<ul class="space-y-2">
										{#each myUrgent as task (task.id)}
											<li class="rounded-md border p-2">
												<a href={`./tasks/${task.id}`} class="text-sm font-medium hover:underline">{task.title}</a>
												<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
													<Badge.Badge class={phaseClass(task.phase)}>{task.phase}</Badge.Badge>
													<Badge.Badge class={statusClass(task.status)}>{task.status}</Badge.Badge>
													<span>Due {task.dueDate}</span>
												</div>
											</li>
										{/each}
									</ul>
								{/if}
							</div>

							<div class="rounded-md border p-3">
								<div class="mb-2 flex items-center gap-2 text-sm font-medium">
									<Clock3 class="h-4 w-4 text-blue-700" />
									Today
								</div>
								{#if myToday.length === 0}
									<div class="text-xs text-muted-foreground">No tasks due today.</div>
								{:else}
									<ul class="space-y-2">
										{#each myToday as task (task.id)}
											<li class="rounded-md border p-2">
												<a href={`./tasks/${task.id}`} class="text-sm font-medium hover:underline">{task.title}</a>
											</li>
										{/each}
									</ul>
								{/if}
							</div>

							<div class="rounded-md border p-3">
								<div class="mb-2 flex items-center gap-2 text-sm font-medium">
									<ListTodo class="h-4 w-4 text-muted-foreground" />
									Upcoming (7 days)
								</div>
								{#if myUpcoming.length === 0}
									<div class="text-xs text-muted-foreground">No upcoming tasks in the next week.</div>
								{:else}
									<ul class="space-y-2">
										{#each myUpcoming as task (task.id)}
											<li class="rounded-md border p-2">
												<a href={`./tasks/${task.id}`} class="text-sm font-medium hover:underline">{task.title}</a>
												<div class="mt-1 text-xs text-muted-foreground">Due {task.dueDate}</div>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						</div>
					</section>

					<section class="space-y-3 rounded-lg bg-white p-4">
						<div class="flex items-center justify-between">
							<h2 class="text-sm font-medium">Upcoming Events</h2>
							<a href="./calendar" class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
								Open calendar
								<ArrowUpRight class="h-3.5 w-3.5" />
							</a>
						</div>
						{#if upcomingEvents.length === 0}
							<div class="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
								No upcoming events.
							</div>
						{:else}
							<ul class="space-y-2">
								{#each upcomingEvents as event (event.id)}
									<li class="rounded-md border p-3">
										<div class="flex items-start justify-between gap-2">
											<div class="min-w-0">
												<a href={`./calendar/${event.id}`} class="truncate text-sm font-medium hover:underline">
													{event.title}
												</a>
												<div class="mt-1 text-xs text-muted-foreground">{formatDateTime(event.startAt)}</div>
											</div>
											<Badge.Badge class="border-slate-300 bg-slate-100 text-slate-700">{event.eventType}</Badge.Badge>
										</div>
										<div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
											<Avatar.Root class="h-6 w-6">
												<Avatar.Fallback>{avatarInitials(event.createdBy)}</Avatar.Fallback>
											</Avatar.Root>
											<span>{event.createdBy}</span>
											{#if event.phase !== "No Phase"}
												<Badge.Badge class={phaseClass(event.phase)}>{event.phase}</Badge.Badge>
											{:else}
												<Badge.Badge class="border-slate-300 bg-slate-100 text-slate-700">No Phase</Badge.Badge>
											{/if}
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					<section class="space-y-3 rounded-lg bg-white p-4">
						<div class="flex items-center justify-between">
							<h2 class="text-sm font-medium">Recent Activity</h2>
							<a href="/notifications" class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
								See all activity
								<ArrowUpRight class="h-3.5 w-3.5" />
							</a>
						</div>
						<ul class="space-y-2">
							{#each recentActivity as item (item.id)}
								<li class="rounded-md border p-3">
									<div class="flex items-start gap-2">
										<Avatar.Root class="h-7 w-7">
											<Avatar.Fallback>{avatarInitials(item.actor)}</Avatar.Fallback>
										</Avatar.Root>
										<div class="min-w-0 flex-1">
											<div class="text-sm">
												<span class="font-medium">{item.actor}</span>
												<span class="text-muted-foreground"> {item.description} </span>
												<a href={item.targetHref} class="font-medium hover:underline">{item.target}</a>
											</div>
											<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
												<Badge.Badge class={phaseClass(item.phase)}>{item.phase}</Badge.Badge>
												<span>{relativeTime(item.createdAt)}</span>
											</div>
										</div>
									</div>
								</li>
							{/each}
						</ul>
					</section>
				</div>
			</div>

			<section class="rounded-lg bg-white p-4">
				<div class="mb-2 flex items-center gap-2 text-sm font-medium">
					<CircleSlash class="h-4 w-4 text-muted-foreground" />
					Dashboard Behavior
				</div>
				<ul class="space-y-1 text-xs text-muted-foreground">
					<li>This dashboard is read-only and only supports navigation.</li>
					<li>All links open detailed artifact pages for edits and status updates.</li>
					<li>Phase metrics are aggregated from project tasks for fast scanning.</li>
				</ul>
			</section>
		</div>
	</Tooltip.Provider>
</div>
