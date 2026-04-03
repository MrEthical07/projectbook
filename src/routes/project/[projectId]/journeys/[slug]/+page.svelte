<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Separator } from "$lib/components/ui/separator/index.js";
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Info, Plus, X } from "@lucide/svelte"
    import { buttonVariants } from "$lib/components/ui/button/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Select from "$lib/components/ui/select";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { page } from "$app/state";
	import { updateJourney } from "$lib/remote/journey.remote";
	import { can } from "$lib/utils/permission";
    import { getContext, onDestroy, untrack } from "svelte";
	import { toast } from "svelte-sonner";

    let { data } = $props();
    let projectId = $derived(page.params.projectId);
    let journeyId = $derived(page.params.slug);
    const access = getContext<ProjectAccess | undefined>("access");
    const permissions = access?.permissions;
    const canEditJourney = can(permissions, "story", "edit");
    const canChangeJourneyStatus = can(permissions, "story", "statusChange");
    const statusOptions = ["draft", "archived"] as const;
    type JourneyStatus = typeof statusOptions[number];
    type JourneyStage = {
        name: string;
        actions: string[];
        emotion: string;
        painPoints: string[];
    };
    type JourneyDraft = {
        title: string;
        description: string;
        status: JourneyStatus;
        persona: {
            name: string;
            bio: string;
            role: string;
            age: number;
            job: string;
            edu: string;
        };
        context: string;
        stages: JourneyStage[];
        notes: string;
    };
    let journey = $state<JourneyDraft>({
        title: "",
        description: "",
        status: "draft",
        persona: {
            name: "",
            bio: "",
            role: "",
            age: 0,
            job: "",
            edu: ""
        },
        context: "",
        stages: [],
        notes: ""
    });
    const isReadOnly = $derived(journey.status === "archived" || !canEditJourney);
    let emotions = $state<string[]>([]);

    let isAddingStage = $state(false);
    let metadataOpen = $state(false);
    let savePhase = $state<"idle" | "saving" | "saved">("idle");
    let saveBadgeTimer: ReturnType<typeof setTimeout> | null = null;
    let statusConfirmOpen = $state(false);
    let pendingStatus = $state<JourneyStatus | null>(null);
    let savedSignature = $state("");
    let saveReady = $state(false);
    let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;

    let currentSignature = $derived(
        JSON.stringify({
            title: journey.title,
            description: journey.description,
            persona: journey.persona,
            context: journey.context,
            stages: journey.stages,
            notes: journey.notes
        })
    );
    let isDirty = $derived(saveReady && currentSignature !== savedSignature);
    let saveIndicator = $derived.by(() => {
        if (savePhase === "saving") return "saving";
        if (isDirty) return "edited";
        if (savePhase === "saved") return "saved";
        return "idle";
    });

    function removeStage(index : number) {
        journey.stages.splice(index, 1);
        journey.stages = journey.stages;
    }
    let newStageName = $state("");
    function addStage() {
        if (!newStageName.trim()) return;
        journey.stages.push({
            name: newStageName,
            actions: [],
            emotion: "",
            painPoints: [],
        });
        journey.stages = journey.stages;
        isAddingStage = false;
    }

    let newActionByStage = $state<Record<number, string>>({});
    function addAction(stageIndex : number) {
        const value = newActionByStage[stageIndex] ?? "";
        if(value.trim() === "") return;
        journey.stages[stageIndex].actions.push(value);
        journey.stages = journey.stages;
        newActionByStage[stageIndex] = "";
    }

    let newPainPointByStage = $state<Record<number, string>>({});
    function addPainPoint(stageIndex : number) {
        const value = newPainPointByStage[stageIndex] ?? "";
        if(value.trim() === "") return;
        journey.stages[stageIndex].painPoints.push(value);
        journey.stages = journey.stages;
        newPainPointByStage[stageIndex] = "";
    }

    function removeAction(stageIndex : number, actionIndex : number) {
        journey.stages[stageIndex].actions.splice(actionIndex, 1);
        journey.stages = journey.stages;
    }

    function removePainPoint(stageIndex : number, painPointIndex : number) {
        journey.stages[stageIndex].painPoints.splice(painPointIndex, 1);
        journey.stages = journey.stages;
    }

    const triggerSave = async () => {
        if (!permissions || !canEditJourney) return;
        if (savePhase === "saving" || !isDirty) return;
        if (saveBadgeTimer) clearTimeout(saveBadgeTimer);
        if (savedBadgeTimer) clearTimeout(savedBadgeTimer);
        savePhase = "saving";
        const result = await updateJourney({
            input: {
                projectId,
                journeyId,
                journey
            },
            permissions
        });
        if (!result.success) {
            savePhase = "idle";
            return;
        }
        savedSignature = currentSignature;
        savePhase = "saved";
        toast.success("Changes saved");
        savedBadgeTimer = setTimeout(() => {
            if (!isDirty) {
                savePhase = "idle";
            }
        }, 1400);
    };

    const statusVariant = (s: string) => {
        if (s === "archived") return "destructive";
        return "default";
    };

    const requestStatusChange = (nextStatus: JourneyStatus) => {
        if (nextStatus === journey.status) return;
        pendingStatus = nextStatus;
        statusConfirmOpen = true;
    };

    const confirmStatusChange = async () => {
        if (!pendingStatus || !permissions || !canChangeJourneyStatus) return;
        const result = await updateJourney({
            input: {
                projectId,
                journeyId,
                journey: {
                    ...journey,
                    status: pendingStatus
                }
            },
            permissions
        });
        if (!result.success) return;
        journey.status = pendingStatus;
        savedSignature = JSON.stringify({
            title: journey.title,
            description: journey.description,
            persona: journey.persona,
            context: journey.context,
            stages: journey.stages,
            notes: journey.notes
        });
        pendingStatus = null;
        statusConfirmOpen = false;
        toast.success("Status updated");
    };

    onDestroy(() => {
        if (saveBadgeTimer) clearTimeout(saveBadgeTimer);
        if (savedBadgeTimer) clearTimeout(savedBadgeTimer);
    });

    $effect(() => {
        const d = data;
        untrack(() => {
            const j = structuredClone(d.journey) as JourneyDraft;
            journey = j;
            emotions = structuredClone(d.emotions) as string[];
            savePhase = "idle";
            pendingStatus = null;
            statusConfirmOpen = false;
            isAddingStage = false;
            newStageName = "";
            newActionByStage = {};
            newPainPointByStage = {};
            savedSignature = JSON.stringify({
                title: j.title,
                description: j.description,
                persona: j.persona,
                context: j.context,
                stages: j.stages,
                notes: j.notes
            });
            saveReady = true;
        });
    });

</script>

<svelte:head>
    <title>{journey.title || "Journey"} • Journeys • ProjectBook</title>
    <meta
        name="description"
        content="View and edit this journey's stages, emotions, and pain points."
    />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

{#key page.params.slug}
<div class="flex flex-col gap-2 p-2 bg-white border rounded-lg">
    <header
			class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
		>
			<div class="flex items-center gap-2 px-4">
				<Sidebar.Trigger class="-ms-1" />
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item class="hidden md:block">
							<Breadcrumb.Link href="../journeys">User Journeys</Breadcrumb.Link>
						</Breadcrumb.Item>
						<Breadcrumb.Separator class="hidden md:block" />
						<Breadcrumb.Item>
							<Breadcrumb.Page>{journey.title ? journey.title : "New Journey"}</Breadcrumb.Page>
						</Breadcrumb.Item>
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
		</header>
    <div class="flex flex-col md:px-20 gap-4 py-2">
        <div class="flex mt-2 flex-col  bg-white rounded-lg gap-2 p-2">
            <Input type="text" bind:value={journey.title} disabled={isReadOnly} class="bg-transparent outline-0 shadow-none border-0 text-4xl! h-fit py-4 px-3" placeholder="Title Goes Here"></Input>
            <Input type="text" bind:value={journey.description} disabled={isReadOnly} class="bg-transparent outline-0 shadow-none border-0 text-lg! h-fit py-2 px-3" placeholder="Journey description"></Input>
            <div class="flex w-full flex-row justify-between items-center mt-2 px-2">
                <div class="flex items-center gap-2">
                    <Badge variant={statusVariant(journey.status)}>{journey.status.toUpperCase()}</Badge>
                </div>
                <div class="flex flex-row gap-2 items-center">
                    <div class="flex flex-col items-end text-xs text-muted-foreground leading-tight min-h-6">
                        {#if saveIndicator === "edited"}
                            <span class="text-amber-600">Edited</span>
                        {:else if saveIndicator === "saving"}
                            <span class="text-blue-600">Saving...</span>
                        {:else if saveIndicator === "saved"}
                            <span class="text-emerald-600">Saved</span>
                        {/if}
                    </div>
                    <Button variant="outline" size="icon" onclick={() => (metadataOpen = true)} aria-label="Open journey metadata">
                        <Info class="h-4 w-4" />
                    </Button>
                    <Button onclick={triggerSave} disabled={isReadOnly || savePhase === "saving" || !isDirty}>
                        {savePhase === "saving" ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onclick={() => (statusConfirmOpen = true)} disabled={!canChangeJourneyStatus}>Change Status</Button>
                </div>
            </div>
        </div>
        <Separator class="mt-2 px-2"></Separator>
        <div class="py-2 w-full flex flex-col gap-4">
            <div class="personaDetails flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">User Profile</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-6 p-2 py-4">
                    <div class="flex flex-row gap-6">
                        <div class="flex flex-col gap-2 max-w-sm w-full">
                            <Label class="text-muted-foreground" for="personaName">User Name</Label>
                            <Input bind:value={journey.persona.name} disabled={isReadOnly} id="personaName" type="text" placeholder="John Doe"></Input>
                        </div>
                        <div class="flex flex-col gap-2 max-w-sm w-full">
                            <Label class="text-muted-foreground" for="personaRole">Archtype / Role</Label>
                            <Input bind:value={journey.persona.role} disabled={isReadOnly} id="personaRole" type="text" placeholder="Ex. Student"></Input>
                        </div>
                    </div>
                    <div class="flex flex-col gap-3">
                        <div class="text-sm text-muted-foreground leading-none font-medium">Demographics</div>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-4 w-full">
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaAge">Age: </Label>
                                <Input bind:value={journey.persona.age} disabled={isReadOnly} id="personaAge" class="w-full" type="number" placeholder="26"></Input>
                            </div>
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaJob">Job: </Label>
                                <Input bind:value={journey.persona.job} disabled={isReadOnly} id="personaJob" class="w-full" type="text" placeholder="Ex. Software Engineer"></Input>
                            </div>
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaEdu">Education: </Label>
                                <Input bind:value={journey.persona.edu} disabled={isReadOnly} id="personaEdu" class="w-full" type="text" placeholder="Ex. B.Tech in CSE"></Input>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="personaBio">Bio / About</Label>
                        <Textarea bind:value={journey.persona.bio} disabled={isReadOnly} id="personaBio"  placeholder="Persona Bio"></Textarea>
                    </div>
                </div>
            </div>
            
            <div class="context flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Context / Environment</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-6 p-2 py-4">
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="userContext">User Context or Environment</Label>
                        <Textarea bind:value={journey.context} disabled={isReadOnly} id="userContext"  placeholder="User Context"></Textarea>
                    </div>
                </div>
            </div>
            
            
            <div class="journey flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">User Journey Stages</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-4 p-2 py-4">
                        {#each journey.stages as stage, index}
                            <div
                                class="border border-border rounded-lg p-4 hover:bg-muted/50 transition-all duration-200"
                            >
                                <div class="flex flex-row items-center justify-between mb-2">
                                    <h4 class="font-semibold text-foreground">
                                    Stage {index + 1}: {stage.name}
                                    </h4>
                                    <div class="flex flex-row gap-4">
                                        <Select.Root type="single" name="emotion" bind:value={stage.emotion} disabled={isReadOnly}>
                                            <Select.Trigger size="sm" class="min-w-25 w-fit text-xs! font-medium text-muted-foreground px-2! py-0! ">
                                                {stage.emotion}
                                            </Select.Trigger>
                                            <Select.Content>
                                                <Select.Group>
                                                <Select.Label>User Emotion</Select.Label>
                                                {#each emotions as emotion (emotion)}
                                                    <Select.Item
                                                    value={emotion}
                                                    label={emotion}
                                                    >
                                                    {emotion}
                                                    </Select.Item>
                                                {/each}
                                                </Select.Group>
                                            </Select.Content>
                                            </Select.Root>
                                        {#if !isReadOnly}
                                        <button
                                            onclick={() => removeStage(index)}
                                            class="p-1 text-destructive opacity-50 hover:opacity-100 transition-opacity"
                                        >
                                            <X size={16}/>
                                        </button>
                                        {/if}
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div class="flex flex-col gap-1">
                                        <div class="flex items-center justify-between">
                                            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Actions
                                            </span>
                                            <Dialog.Root>
                                                <Dialog.Trigger  class="{buttonVariants({ variant: "ghost", size: "sm" })} mt-0"
                                                >Add</Dialog.Trigger
                                                >
                                                <Dialog.Content class="sm:max-w-100">
                                                    <Dialog.Header>
                                                        <Dialog.Title>Stage: {stage.name}</Dialog.Title>
                                                    </Dialog.Header>
                                                    <div class="grid gap-3">
                                                        <Label for="action">New Action</Label>
                                                        <Input id="action" name="action" bind:value={newActionByStage[index]} defaultValue="New Action" />
                                                    </div>
                                                    <Dialog.Footer>
                                                        <Dialog.Close class={buttonVariants({ variant: "outline" })}
                                                        >Cancel</Dialog.Close
                                                        >
                                                        <Button type="submit" onclick={() => addAction(index)}>Add Action</Button>
                                                    </Dialog.Footer>
                                                </Dialog.Content>
                                            </Dialog.Root>
                                        </div>
                                        <ul class="list-disc list-inside text-sm text-foreground">
                                            {#each stage.actions as action, i}
                                                <li class="flex flex-row justify-between group items-center">
                                                    {action}
                                                    {#if !isReadOnly}
                                                    <button
                                                        class="hidden group-hover:flex text-destructive opacity-50 hover:opacity-100 transition-opacity"
                                                        onclick={() => removeAction(index, i)}>
                                                        <X size={16}/>
                                                    </button>
                                                    {/if}
                                                </li>
                                            {:else}
                                                <li class="italic">No Action</li>
                                            {/each}
                                        </ul>
                                    </div>
                                    <div class="flex flex-col gap-1">
                                        <div class="flex items-center justify-between">
                                            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Pain Points
                                            </span>
                                            <Dialog.Root>
                                                <Dialog.Trigger  class="{buttonVariants({ variant: "ghost", size: "sm" })} mt-0"
                                                >Add</Dialog.Trigger
                                                >
                                                <Dialog.Content class="sm:max-w-100">
                                                    <Dialog.Header>
                                                        <Dialog.Title>Stage: {stage.name}</Dialog.Title>
                                                    </Dialog.Header>
                                                    <div class="grid gap-3">
                                                        <Label for="painpoint">New Pain Point</Label>
                                                        <Input id="painpoint" name="painpoint" bind:value={newPainPointByStage[index]} defaultValue="New Pain Point" />
                                                    </div>
                                                    <Dialog.Footer>
                                                        <Dialog.Close class={buttonVariants({ variant: "outline" })}
                                                        >Cancel</Dialog.Close
                                                        >
                                                        <Button type="submit" onclick={() => addPainPoint(index)}>Add Pain Point</Button>
                                                    </Dialog.Footer>
                                                </Dialog.Content>
                                            </Dialog.Root>
                                        </div>
                                        <div class="space-y-1">
                                            {#each stage.painPoints as point, i}
                                                <div
                                                class="text-sm text-red-700 bg-red-50 px-2 py-1 rounded border border-red-100 flex flex-row justify-between group items-center"
                                                >
                                                    {point}
                                                    {#if !isReadOnly}
                                                    <button
                                                        class="hidden group-hover:flex text-destructive opacity-50 hover:opacity-100 transition-opacity"
                                                        onclick={() => removePainPoint(index, i)}>
                                                        <X size={16}/>
                                                    </button>
                                                    {/if}
                                                </div>
                                            {:else}
                                            <span class="text-sm text-muted-foreground italic">
                                                None identified
                                            </span>
                                            {/each}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {:else}
                            <div class="flex bg-destructive/5 border border-destructive/50 px-4 py-2 text-destructive rounded-lg text-sm flex-row justify-between items-center">
                                No Journey Stages. Click Add to add one.
                            </div>   
                        {/each}
                        {#if !isReadOnly}
                        {#if isAddingStage}
                            <div class="flex gap-2 items-center p-4 border border-dashed rounded-lg">
                            <Input
                                placeholder="Stage Name"
                                bind:value={newStageName}
                            />
                            <Button onclick={addStage}>Add</Button>
                            <Button variant="ghost" onclick={() => isAddingStage = false}>
                                Cancel
                            </Button>
                            </div>
                        {:else}
                            <Button
                            variant="secondary"
                            class="w-full border-dashed"
                            onclick={() => isAddingStage = true}
                            >
                            <Plus size={16} class="mr-2" />
                            Add Journey Stage
                            </Button>
                        {/if}
                        {/if}
                </div>
            </div>


            <div class="notes flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Additional Notes</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-2">
                        <Textarea id="notes" bind:value={journey.notes} disabled={isReadOnly} placeholder="Additional Notes"></Textarea>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<Dialog.Root bind:open={metadataOpen}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Artifact Metadata</Dialog.Title>
            <Dialog.Description>Read-only metadata for this journey.</Dialog.Description>
        </Dialog.Header>
        <div class="grid gap-2 text-sm">
            <div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Created by</span><span>Avery Patel</span></div>
            <div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Created at</span><span>2026-02-02 11:00</span></div>
            <div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Last edited by</span><span>Dr. Ramos</span></div>
            <div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Last edited at</span><span>2026-02-09 08:40</span></div>
            <div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Status</span><span>{journey.status.toUpperCase()}</span></div>
        </div>
        <Dialog.Footer>
            <Dialog.Close class={buttonVariants({ variant: "outline" })}>Close</Dialog.Close>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={statusConfirmOpen} onOpenChange={(open) => { statusConfirmOpen = open; if (!open) pendingStatus = null; }}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Change status</Dialog.Title>
            <Dialog.Description>
                {#if pendingStatus === "archived"}
                    Archiving hides this journey from active work. You can unarchive later.
                {:else if pendingStatus === "draft"}
                    Moving back to Draft will reopen the journey for edits.
                {:else}
                    Select a new status for this journey.
                {/if}
            </Dialog.Description>
        </Dialog.Header>
        {#if !pendingStatus}
            <div class="flex items-center gap-2 py-2">
                {#each statusOptions as option (option)}
                    <Button
                        variant={journey.status === option ? "default" : "outline"}
                        onclick={() => requestStatusChange(option)}
                        disabled={journey.status === option}
                    >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Button>
                {/each}
            </div>
        {/if}
        <Dialog.Footer>
            <Dialog.Close class={buttonVariants({ variant: "outline" })}>
                Cancel
            </Dialog.Close>
            {#if pendingStatus}
                <Button
                    disabled={!canChangeJourneyStatus}
                    onclick={confirmStatusChange}
                >
                    Confirm
                </Button>
            {/if}
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
{/key}

