<script lang="ts">
	import * as Alert from "$lib/components/ui/alert";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Textarea } from "$lib/components/ui/textarea";
	import * as Card from "$lib/components/ui/card";

	type ProblemStatus = "Draft" | "Locked" | "Archived";

	type LinkedSource = {
		id: string;
		title: string;
		type: "User Story" | "User Journey";
		phase: "Empathize";
		href: string;
	};

	type SourcePainPoint = {
		id: string;
		text: string;
		sourceLabel: string;
	};

	type OptionalModuleKey =
		| "why"
		| "constraints"
		| "success"
		| "assumptions"
		| "notes";

	const statusOptions: ProblemStatus[] = ["Draft", "Locked", "Archived"];

	const linkedSources: LinkedSource[] = [
		{
			id: "story-1",
			title: "Streamline the checkout experience",
			type: "User Story",
			phase: "Empathize",
			href: "/project/alpha/stories/streamline-checkout",
		},
		{
			id: "journey-1",
			title: "Checkout journey map",
			type: "User Journey",
			phase: "Empathize",
			href: "/project/alpha/journeys/checkout-journey",
		},
	];

	const sourcePainPoints: SourcePainPoint[] = [
		{
			id: "pain-1",
			text: "Users abandon checkout when the form asks for repeated information.",
			sourceLabel: "User Story · Avery Patel",
		},
		{
			id: "pain-2",
			text: "Payment errors leave customers unsure if the order went through.",
			sourceLabel: "User Journey · Payment stage",
		},
		{
			id: "pain-3",
			text: "Shipping options are buried and hard to compare quickly.",
			sourceLabel: "User Story · Avery Patel",
		},
	];

	const optionalModules: {
		key: OptionalModuleKey;
		title: string;
		description: string;
		placeholder: string;
	}[] = [
		{
			key: "why",
			title: "Why This Matters",
			description: "Clarify the human or business impact without metrics.",
			placeholder: "Explain why this problem needs to be solved now.",
		},
		{
			key: "constraints",
			title: "Constraints",
			description: "Call out boundaries, exclusions, or non-negotiables.",
			placeholder: "List scope limits, policy constraints, or dependencies.",
		},
		{
			key: "success",
			title: "Success Criteria",
			description: "Qualitative signals that the problem is improving.",
			placeholder: "Describe behaviors or outcomes you want to see.",
		},
		{
			key: "assumptions",
			title: "Assumptions",
			description: "State beliefs that still need validation.",
			placeholder: "List risky assumptions tied to this problem.",
		},
		{
			key: "notes",
			title: "Notes",
			description: "Capture additional context without changing the statement.",
			placeholder: "Add anything else the team should remember.",
		},
	];

	let status = $state<ProblemStatus>("Draft");
	let title = $state("");
	let finalStatement = $state("");
	let orphanAcknowledged = $state(false);
	let selectedPainPoints = $state<string[]>([]);
	let isInsightsOpen = $state(true);
	let addSectionOpen = $state(false);
	let activeModules = $state<OptionalModuleKey[]>(["why"]);
	let moduleContent = $state<Record<OptionalModuleKey, string>>({
		why: "",
		constraints: "",
		success: "",
		assumptions: "",
		notes: "",
	});
	let notesOpen = $state(true);

	/**
	 * Keep the title synced with the statement while in draft mode.
	 */
	$effect(() => {
		if (status !== "Draft") {
			return;
		}

		if (!title && finalStatement) {
			title = finalStatement;
		}
	});

	/**
	 * Map status to the appropriate badge variant.
	 */
	const statusVariant = (currentStatus: ProblemStatus) => {
		if (currentStatus === "Locked") {
			return "secondary";
		}

		if (currentStatus === "Archived") {
			return "destructive";
		}

		return "default";
	};

	/**
	 * Toggle a pain point selection for the locked statement requirements.
	 */
	const togglePainPoint = (id: string) => {
		if (selectedPainPoints.includes(id)) {
			selectedPainPoints = selectedPainPoints.filter((pointId) => pointId !== id);
			return;
		}

		selectedPainPoints = [...selectedPainPoints, id];
	};

	/**
	 * Check if the lock criteria are satisfied before allowing confirmation.
	 */
	const canLock = () => {
		const hasSources = linkedSources.length > 0;
		const hasPainPoints = selectedPainPoints.length > 0;
		const hasStatement = Boolean(finalStatement.trim());
		const hasOrphanApproval = hasSources || orphanAcknowledged;

		return hasPainPoints && hasStatement && hasOrphanApproval;
	};

	/**
	 * Mark the problem statement as locked after confirmation.
	 */
	const confirmLock = () => {
		status = "Locked";
	};

	/**
	 * Add an optional module to the page.
	 */
	const addModule = (moduleKey: OptionalModuleKey) => {
		if (!activeModules.includes(moduleKey)) {
			activeModules = [...activeModules, moduleKey];
		}
	};
</script>

<div class="flex flex-col gap-6 rounded-lg bg-background p-4">
	<header
		class="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-5"
	>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<Sidebar.Trigger class="-ms-1" />
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<div>
					<div class="text-xs uppercase tracking-wide text-muted-foreground">
						Problem Statement · Define
					</div>
					<h1 class="text-2xl font-semibold">{title || "Untitled problem"}</h1>
				</div>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant={statusVariant(status)}>{status}</Badge>
				{#if linkedSources.length === 0}
					<Badge variant="destructive">Orphan</Badge>
				{/if}
				<Button variant="outline" size="sm">Archive</Button>
				<Button variant="ghost" size="sm">Change history</Button>
			</div>
		</div>
		<div class="grid gap-2">
			<Label for="problem-title">Problem Statement Title</Label>
			<Input
				id="problem-title"
				placeholder="Auto-generated from the final problem statement"
				bind:value={title}
				disabled={status !== "Draft"}
			/>
		</div>
	</header>

	<section class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">Linked Sources</h2>
			<div class="flex gap-2">
				<Button variant="outline" size="sm">+ Link User Story</Button>
				<Button variant="ghost" size="sm">+ Link User Journey</Button>
			</div>
		</div>
		{#if linkedSources.length === 0}
			<Alert.Root variant="destructive">
				<Alert.Title>Orphan problem statement</Alert.Title>
				<Alert.Description>
					This problem is not connected to any empathy artifact.
				</Alert.Description>
			</Alert.Root>
		{/if}
		<div class="grid gap-3 md:grid-cols-2">
			{#each linkedSources as source}
				<Card.Root class="border border-border">
					<Card.Header class="gap-2">
						<Card.Title class="text-base">{source.title}</Card.Title>
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<Badge variant="secondary">{source.phase}</Badge>
							<span>{source.type}</span>
						</div>
					</Card.Header>
					<Card.Content>
						<Button variant="link" href={source.href}>View source</Button>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="text-lg font-semibold">Source Insights</h2>
		<Collapsible.Root bind:open={isInsightsOpen} class="rounded-lg border border-border">
			<Collapsible.Trigger class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium">
				<span>Reference only</span>
				<span class="text-xs text-muted-foreground">{isInsightsOpen ? "Hide" : "Show"}</span>
			</Collapsible.Trigger>
			<Collapsible.Content class="border-t border-border px-4 py-4 text-sm text-muted-foreground">
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<div class="text-xs font-semibold uppercase text-muted-foreground">Persona</div>
						<div class="mt-2 text-sm text-foreground">Avery Patel</div>
						<div class="mt-1 text-xs">Busy parent balancing family logistics.</div>
					</div>
					<div>
						<div class="text-xs font-semibold uppercase text-muted-foreground">Context</div>
						<div class="mt-2 text-sm text-foreground">
							Shopping on mobile while managing multiple errands.
						</div>
					</div>
					<div>
						<div class="text-xs font-semibold uppercase text-muted-foreground">Key observations</div>
						<ul class="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">
							<li>Needs to move quickly between checkout steps.</li>
							<li>Feels uncertainty when payment errors appear.</li>
							<li>Wants reassurance that shipping choices are correct.</li>
						</ul>
					</div>
					<div>
						<div class="text-xs font-semibold uppercase text-muted-foreground">
							Journey highlights
						</div>
						<ul class="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">
							<li>Lowest emotional point during payment confirmation.</li>
							<li>High friction when comparing shipping options.</li>
						</ul>
					</div>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="text-lg font-semibold">Source Pain Points</h2>
		<div class="grid gap-3">
			{#each sourcePainPoints as painPoint}
				<Card.Root class="border border-border">
					<Card.Content class="flex items-start gap-3 py-4">
						<Checkbox
							checked={selectedPainPoints.includes(painPoint.id)}
							onclick={() => togglePainPoint(painPoint.id)}
						/>
						<div class="flex flex-col gap-1">
							<div class="text-sm font-medium text-foreground">{painPoint.text}</div>
							<div class="text-xs text-muted-foreground">{painPoint.sourceLabel}</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="text-lg font-semibold">Final Problem Statement</h2>
		<div class="rounded-lg border border-primary/40 bg-primary/5 p-4">
			<Label for="final-problem" class="text-sm font-medium">
				Final Problem Statement
			</Label>
			<Textarea
				id="final-problem"
				placeholder="[User] needs a way to [need] because [insight]."
				bind:value={finalStatement}
				disabled={status !== "Draft"}
				class="mt-2 min-h-28"
			/>
		</div>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="text-lg font-semibold">Status &amp; Locking</h2>
		<Card.Root>
			<Card.Content class="flex flex-col gap-4 py-4">
				<div class="flex flex-wrap items-center gap-2">
					{#each statusOptions as option}
						<Button
							variant={status === option ? "default" : "outline"}
							onclick={() => {
								status = option;
							}}
							disabled={status === "Locked" && option === "Draft"}
						>
							{option}
						</Button>
					{/each}
				</div>
				<Separator />
				<div class="flex flex-col gap-2">
					<div class="text-sm text-muted-foreground">
						Locking freezes the statement and references. Unlocking is not supported.
					</div>
					{#if linkedSources.length === 0}
						<div class="flex items-center gap-2">
							<Checkbox bind:checked={orphanAcknowledged} />
							<span class="text-xs text-muted-foreground">
								I understand this problem has no linked sources.
							</span>
						</div>
					{/if}
					<Dialog.Root>
					<Dialog.Trigger class={buttonVariants()} disabled={status !== "Draft"}>
						Lock Problem Statement
					</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Lock this problem statement?</Dialog.Title>
								<Dialog.Description>
									Locking will freeze the definition. Ideas can now be created from it.
								</Dialog.Description>
							</Dialog.Header>
							<div class="grid gap-2 text-sm">
								<div class="flex items-center gap-2">
									<span class={canLock() ? "text-foreground" : "text-muted-foreground"}>
										Linked sources or confirmation
									</span>
								</div>
								<div class="flex items-center gap-2">
									<span class={selectedPainPoints.length > 0 ? "text-foreground" : "text-muted-foreground"}>
										Selected pain points
									</span>
								</div>
								<div class="flex items-center gap-2">
									<span class={finalStatement.trim() ? "text-foreground" : "text-muted-foreground"}>
										Final problem statement
									</span>
								</div>
							</div>
						<Dialog.Footer>
							<Dialog.Close class={buttonVariants({ variant: "outline" })}>
								Cancel
							</Dialog.Close>
							<Dialog.Close
								class={buttonVariants()}
								disabled={!canLock()}
								onclick={confirmLock}
							>
								Confirm Lock
							</Dialog.Close>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			</div>
			</Card.Content>
		</Card.Root>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="text-lg font-semibold">Add Section</h2>
		<Dialog.Root bind:open={addSectionOpen}>
			<Dialog.Trigger class={buttonVariants({ variant: "outline" })}>
				+ Add Section
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Add optional module</Dialog.Title>
					<Dialog.Description>
						Choose extra context to capture without changing the main statement.
					</Dialog.Description>
				</Dialog.Header>
				<div class="grid gap-3">
					{#each optionalModules as module}
						<Card.Root class="border border-border">
							<Card.Content class="flex items-start justify-between gap-4 py-4">
								<div>
									<div class="text-sm font-medium">{module.title}</div>
									<div class="text-xs text-muted-foreground">{module.description}</div>
								</div>
								<Button
									variant="outline"
									size="sm"
									onclick={() => addModule(module.key)}
									disabled={activeModules.includes(module.key)}
								>
									{activeModules.includes(module.key) ? "Added" : "Add"}
								</Button>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</Dialog.Content>
		</Dialog.Root>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="text-lg font-semibold">Optional Modules</h2>
		<div class="grid gap-4">
			{#each optionalModules as module}
				{#if activeModules.includes(module.key) && module.key !== "notes"}
					<Collapsible.Root class="rounded-lg border border-border">
						<Collapsible.Trigger class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium">
							<span>{module.title}</span>
							<span class="text-xs text-muted-foreground">Toggle</span>
						</Collapsible.Trigger>
						<Collapsible.Content class="border-t border-border px-4 py-4">
							<Textarea
								placeholder={module.placeholder}
								bind:value={moduleContent[module.key]}
							/>
						</Collapsible.Content>
					</Collapsible.Root>
				{/if}
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-4">
		<h2 class="text-lg font-semibold">Notes</h2>
		<Collapsible.Root bind:open={notesOpen} class="rounded-lg border border-border">
			<Collapsible.Trigger class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium">
				<span>Notes</span>
				<span class="text-xs text-muted-foreground">{notesOpen ? "Hide" : "Show"}</span>
			</Collapsible.Trigger>
			<Collapsible.Content class="border-t border-border px-4 py-4">
				<Textarea placeholder="Additional notes" bind:value={moduleContent.notes} />
			</Collapsible.Content>
		</Collapsible.Root>
	</section>
</div>
