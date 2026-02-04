<script lang="ts">
	import { mockTask, type TaskStatus } from '$lib/mocks/task-data';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import * as Collapsible from '$lib/components/ui/collapsible';
    import * as Alert from '$lib/components/ui/alert';

	import {
		Archive,
		MoreHorizontal,
		Plus,
		ChevronDown,
		ChevronRight,
		User,
		Calendar,
		Link as LinkIcon,
        TriangleAlert
	} from '@lucide/svelte';

	// State
	let task = $state({ ...mockTask });
	let planOpen = $state(true);

    // Derived State
    let isReadOnly = $derived(task.status === 'Completed' || task.status === 'Abandoned');

	// Handlers
	function updateStatus(newStatus: TaskStatus) {
		task.status = newStatus;
	}
</script>

<div class="container max-w-3xl py-8 space-y-12">
    <!-- Page Header -->
    <div class="space-y-4">
       <Breadcrumb.Root>
           <Breadcrumb.List>
               <Breadcrumb.Item>
                   <Breadcrumb.Link href="#">Prototype</Breadcrumb.Link>
               </Breadcrumb.Item>
               <Breadcrumb.Separator />
               <Breadcrumb.Item>
                   <Breadcrumb.Link href="#">Taskboard</Breadcrumb.Link>
               </Breadcrumb.Item>
               <Breadcrumb.Separator />
               <Breadcrumb.Item>
                   <Breadcrumb.Page>{task.title}</Breadcrumb.Page>
               </Breadcrumb.Item>
           </Breadcrumb.List>
       </Breadcrumb.Root>

       <div class="flex items-start justify-between gap-4">
           <div class="space-y-2 flex-1">
               <Input
                   class="text-3xl font-semibold tracking-tight h-auto p-0 border-0 focus-visible:ring-0 px-0 bg-transparent placeholder:text-muted-foreground w-full disabled:opacity-100 disabled:cursor-text"
                   bind:value={task.title}
                   disabled={isReadOnly}
               />
               <Badge variant="outline" class="text-muted-foreground font-normal rounded-sm">Experiment · Prototype</Badge>
           </div>

           <div class="flex items-center gap-2">
                <Badge variant="secondary" class="capitalize">{task.status}</Badge>

                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        {#snippet child({ props })}
                            <Button {...props} variant="ghost" size="icon">
                                <MoreHorizontal class="h-4 w-4" />
                            </Button>
                        {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                        <DropdownMenu.Item>
                            <Archive class="mr-2 h-4 w-4" />
                            <span>Archive</span>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
           </div>
       </div>
    </div>

    <!-- Warnings -->
    {#if task.linkedIdea.phase === 'Rejected'}
        <Alert.Root variant="destructive">
            <TriangleAlert class="h-4 w-4" />
            <Alert.Title>Idea Rejected</Alert.Title>
            <Alert.Description>
                The linked idea has been rejected. This experiment may no longer be relevant.
            </Alert.Description>
        </Alert.Root>
    {/if}

    {#if task.linkedIdea.problemStatement.status === 'Archived'}
        <Alert.Root variant="destructive">
            <TriangleAlert class="h-4 w-4" />
            <Alert.Title>Problem Archived</Alert.Title>
            <Alert.Description>
                The linked problem statement has been archived.
            </Alert.Description>
        </Alert.Root>
    {/if}

    <!-- Linked Idea & Context -->
    <section class="space-y-4">
        <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Context</h3>
        <div class="grid gap-2">
            <!-- Linked Idea (Primary) -->
            <Card.Root class="bg-muted/30">
                <Card.Header class="p-4 flex flex-row items-center justify-between space-y-0">
                    <div class="space-y-1">
                        <div class="text-xs font-medium text-muted-foreground">Linked Idea</div>
                        <div class="font-medium flex items-center gap-2">
                            {task.linkedIdea.title}
                            <LinkIcon class="h-3 w-3 text-muted-foreground" />
                        </div>
                    </div>
                    <Badge variant="outline">{task.linkedIdea.phase}</Badge>
                </Card.Header>
            </Card.Root>

            <!-- Linked Problem Statement -->
            <Card.Root class="bg-muted/10 border-dashed">
                <Card.Header class="p-4 flex flex-row items-start justify-between space-y-0">
                    <div class="space-y-1">
                        <div class="text-xs font-medium text-muted-foreground">Problem Statement</div>
                        <div class="text-sm text-muted-foreground">
                            "{task.linkedIdea.problemStatement.statement}"
                        </div>
                    </div>
                     {#if task.linkedIdea.problemStatement.status === 'Locked'}
                        <Badge variant="secondary" class="text-xs">Locked</Badge>
                     {/if}
                     {#if task.linkedIdea.problemStatement.status === 'Archived'}
                        <Badge variant="destructive" class="text-xs">Archived</Badge>
                     {/if}
                </Card.Header>
            </Card.Root>

            <!-- Personas -->
            <div class="flex gap-2">
                {#each task.linkedIdea.problemStatement.personas as persona}
                     <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background text-sm text-muted-foreground">
                        <User class="h-3 w-3" />
                        <span>{persona.name} ({persona.role})</span>
                     </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- Experiment Hypothesis (Mandatory, Primary) -->
    <section class="space-y-4">
        <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Experiment Hypothesis</h3>
        <div class="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <Label for="hypothesis" class="sr-only">Hypothesis</Label>
            <Textarea
                id="hypothesis"
                class="min-h-[120px] text-lg leading-relaxed bg-transparent border-none resize-none focus-visible:ring-0 p-0 shadow-none placeholder:text-muted-foreground/70 disabled:opacity-100 disabled:cursor-text"
                placeholder="We believe that [doing X] for [user] will result in [expected outcome] because [reasoning]."
                bind:value={task.hypothesis}
                disabled={isReadOnly}
            />
        </div>
    </section>

    <!-- Experiment Plan (Optional but Recommended) -->
    <Collapsible.Root bind:open={planOpen} class="space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Experiment Plan</h3>
            <Collapsible.Trigger>
                {#snippet child({ props })}
                    <Button {...props} variant="ghost" size="sm" class="h-8 w-8 p-0">
                         {#if planOpen}
                             <ChevronDown class="h-4 w-4" />
                         {:else}
                             <ChevronRight class="h-4 w-4" />
                         {/if}
                        <span class="sr-only">Toggle Plan</span>
                    </Button>
                {/snippet}
            </Collapsible.Trigger>
        </div>

        <Collapsible.Content>
            <div class="space-y-2">
                 <Textarea
                    class="min-h-[150px] resize-none disabled:opacity-100 disabled:cursor-text disabled:bg-muted/10"
                    placeholder="What will we do? Who will be involved? What artifact will be created?"
                    bind:value={task.plan}
                    disabled={isReadOnly}
                />
            </div>
        </Collapsible.Content>
    </Collapsible.Root>

    <!-- Execution Meta (Optional) -->
    <section class="flex flex-wrap gap-6 text-sm">
        <!-- Owner -->
        {#if task.owner}
            <div class="flex items-center gap-2">
                <span class="text-muted-foreground">Owner</span>
                <div class="flex items-center gap-1.5 font-medium">
                    <div class="h-5 w-5 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {#if task.owner.avatar}
                             <img src={task.owner.avatar} alt={task.owner.name} class="h-full w-full object-cover" />
                        {:else}
                             <User class="h-3 w-3 text-muted-foreground" />
                        {/if}
                    </div>
                    {task.owner.name}
                </div>
            </div>
        {/if}

        <!-- Deadline -->
        {#if task.deadline}
            <div class="flex items-center gap-2">
                <span class="text-muted-foreground">Deadline</span>
                <div class="flex items-center gap-1.5 font-medium">
                    <Calendar class="h-4 w-4 text-muted-foreground" />
                    {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
            </div>
        {/if}

        <!-- Artifacts -->
        {#if task.artifacts.length > 0}
            <div class="flex items-center gap-2">
                <span class="text-muted-foreground">Artifacts</span>
                <div class="flex items-center gap-3">
                    {#each task.artifacts as artifact}
                        <a href={artifact.url} class="flex items-center gap-1.5 font-medium hover:underline">
                            <LinkIcon class="h-3.5 w-3.5 text-muted-foreground" />
                            {artifact.name}
                        </a>
                    {/each}
                </div>
            </div>
        {/if}
    </section>

    <!-- Status (Mandatory) -->
    <section class="space-y-4">
        <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            {#each ['Planned', 'In Progress', 'Completed', 'Abandoned'] as const as statusOption}
                <button
                    type="button"
                    class="flex items-center justify-center p-3 rounded-md border text-sm font-medium transition-colors
                    {task.status === statusOption
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted text-muted-foreground border-border'}"
                    onclick={() => updateStatus(statusOption)}
                >
                    {statusOption}
                </button>
            {/each}
        </div>
    </section>

    <!-- Add Section -->
    <div>
        <Button variant="outline" class="w-full border-dashed text-muted-foreground" disabled={isReadOnly}>
            <Plus class="mr-2 h-4 w-4" />
            Add Section
        </Button>
    </div>

    <Separator />

    <!-- Notes (Optional, Always Last) -->
    <section class="space-y-4">
        <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">Notes</h3>
        <Textarea
            class="min-h-[100px]"
            placeholder="Observations, execution quirks, random thoughts..."
            bind:value={task.notes}
        />
    </section>
</div>
