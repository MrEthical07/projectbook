<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Separator } from "$lib/components/ui/separator/index.js";
    import { Button, buttonVariants } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Select from "$lib/components/ui/select";
    import { ChevronDown, ChevronRight, Info, Plus, Trash2, X } from "@lucide/svelte"
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import { invalidate } from "$app/navigation";
	import { page } from "$app/state";
	import { updateStory } from "$lib/remote/story.remote";
	import { can } from "$lib/utils/permission";
	import { getContext, onDestroy, untrack } from "svelte";
	import { toast } from "svelte-sonner";

    type AddOnType =
        | "goals_success"
        | "jtbd"
        | "assumptions"
        | "constraints"
        | "risks_unknowns"
        | "evidence"
        | "scenarios";

    type AddOnSection = {
        section_type: AddOnType;
        section_id: string;
        position: number;
        created_at: string;
        collapsed: boolean;
        content: Record<string, unknown>;
    };

    type ArtifactMetadata = {
        owner: string;
        createdBy: string;
        createdAt: string;
        lastEditedBy: string;
        lastEditedAt: string;
        lastUpdated: string;
    };

    let { data } = $props();
    let projectId = $derived(page.params.projectId);
    const routeParams = page.params as Record<string, string | undefined>;
    let storyId = $derived(routeParams.storyId ?? "");
    const access = getContext<ProjectAccess | undefined>("access");
    const permissions = access?.permissions;
    const canEditStory = can(permissions, "story", "edit");
    const canChangeStoryStatus = can(permissions, "story", "statusChange");
    const statusOptions = ["draft", "locked", "archived"] as const;
    type StoryStatus = typeof statusOptions[number];
    let addOnCatalog = $state<Array<{
        type: AddOnType;
        name: string;
        description: string;
        tag: string;
    }>>([]);
    let story = $state({
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
        empathyMap: {
            says: "",
            thinks: "",
            does: "",
            feels: ""
        },
        painPoints: [""],
        hypothesis: [""],
        notes: ""
    });
    const isReadOnly = $derived(story.status === "locked" || story.status === "archived" || !canEditStory);
    let addOnSections = $state<AddOnSection[]>([]);
    let metadata = $state<ArtifactMetadata>({
        owner: "",
        createdBy: "",
        createdAt: "",
        lastEditedBy: "",
        lastEditedAt: "",
        lastUpdated: ""
    });
    let addSectionOpen = $state(false);
    let removeSectionOpen = $state(false);
    let removeTarget = $state<AddOnSection | null>(null);
    let metadataOpen = $state(false);
    let savePhase = $state<"idle" | "saving" | "saved">("idle");
    let saveBadgeTimer: ReturnType<typeof setTimeout> | null = null;
    let statusConfirmOpen = $state(false);
    let pendingStatus = $state<StoryStatus | null>(null);
    let statusMutationPending = $state(false);
    let savedSignature = $state("");
    let saveReady = $state(false);
    let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;

    let currentSignature = $derived(
        JSON.stringify({
            title: story.title,
            description: story.description,
            persona: story.persona,
            context: story.context,
            empathyMap: story.empathyMap,
            painPoints: story.painPoints,
            hypothesis: story.hypothesis,
            notes: story.notes,
            addOnSections
        })
    );
    let isDirty = $derived(saveReady && currentSignature !== savedSignature);
    let saveIndicator = $derived.by(() => {
        if (savePhase === "saving") return "saving";
        if (isDirty) return "edited";
        if (savePhase === "saved") return "saved";
        return "idle";
    });

    const isSectionAdded = (type: AddOnType) =>
        addOnSections.some((section) => section.section_type === type);

    const createSectionContent = (type: AddOnType) => {
        switch (type) {
            case "goals_success":
                return { goal: "", successCriteria: [""] };
            case "jtbd":
                return { primaryJob: "", supportingJobs: [""], emotionalJobs: [""] };
            case "assumptions":
                return { assumptions: [{ text: "", confidence: "Medium" }] };
            case "constraints":
                return { constraints: [{ description: "", type: "Time" }] };
            case "risks_unknowns":
                return { risks: [{ text: "", impact: "Medium" }] };
            case "evidence":
                return { evidence: [{ source: "", summary: "", link: "" }] };
            case "scenarios":
                return { scenarios: [{ scenario: "", expected: "" }] };
        }
    };

    const addSection = (type: AddOnType) => {
        if (isSectionAdded(type)) return;
        const id = `${type}-${Math.random().toString(36).slice(2, 8)}`;
        const position = addOnSections.length + 1;
        const created_at = new Date().toISOString();
        const section: AddOnSection = {
            section_type: type,
            section_id: id,
            position,
            created_at,
            collapsed: false,
            content: createSectionContent(type)
        };
        addOnSections = [...addOnSections, section];
        addSectionOpen = false;
        setTimeout(() => {
            const el = document.getElementById(`section-${id}-primary`);
            if (el) (el as HTMLInputElement | HTMLTextAreaElement).focus();
        }, 0);
    };

    const toggleSection = (sectionId: string) => {
        addOnSections = addOnSections.map((section) =>
            section.section_id === sectionId
                ? { ...section, collapsed: !section.collapsed }
                : section
        );
    };

    const openRemoveSection = (section: AddOnSection) => {
        removeTarget = section;
        removeSectionOpen = true;
    };

    const removeSection = () => {
        if (!removeTarget) return;
        addOnSections = addOnSections.filter(
            (section) => section.section_id !== removeTarget!.section_id
        );
        removeTarget = null;
        removeSectionOpen = false;
    };

    const updateSectionContent = <T extends keyof AddOnSection["content"]>(
        sectionId: string,
        key: T,
        value: AddOnSection["content"][T]
    ) => {
        addOnSections = addOnSections.map((section) =>
            section.section_id === sectionId
                ? { ...section, content: { ...section.content, [key]: value } }
                : section
        );
    };

    function removePainPoint(index: number) {
        story.painPoints.splice(index, 1);
        story.painPoints = [...story.painPoints];
    }

    let newPoint = $state("");
    function addPainPoint() {
        if (!newPoint.trim()) return;
        story.painPoints.push(newPoint);
        newPoint = "";
        story.painPoints = [...story.painPoints];
    }

    function removeHypothesis(index: number) {
        story.hypothesis.splice(index, 1);
        story.hypothesis = [...story.hypothesis];
    }

    let newHypothesis = $state("");
    function addHypothesis() {
        if (!newHypothesis.trim()) return;
        story.hypothesis.push(newHypothesis);
        newHypothesis = "";
        story.hypothesis = [...story.hypothesis];
    }

    const triggerSave = async () => {
        if (!permissions || !canEditStory) return;
        if (savePhase === "saving" || !isDirty) return;
        if (saveBadgeTimer) clearTimeout(saveBadgeTimer);
        if (savedBadgeTimer) clearTimeout(savedBadgeTimer);
        savePhase = "saving";
        const result = await updateStory({
            input: {
                projectId,
                storyId,
                story: {
                    ...story,
                    addOnSections
                }
            }
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
        if (s === "locked") return "secondary";
        if (s === "archived") return "destructive";
        return "default";
    };

    const canSelectStatusOption = (nextStatus: StoryStatus): boolean => {
        if (story.status === "locked") {
            return nextStatus === "archived";
        }
        if (story.status === "archived") {
            return nextStatus === "draft";
        }
        return true;
    };

    const requestStatusChange = (nextStatus: StoryStatus) => {
        if (!canSelectStatusOption(nextStatus)) return;
        if (nextStatus === story.status) return;
        pendingStatus = nextStatus;
        statusConfirmOpen = true;
    };

    const confirmStatusChange = async () => {
        if (!pendingStatus || !permissions || !canChangeStoryStatus || statusMutationPending) return;
        const targetStatus = pendingStatus;
        statusMutationPending = true;
        try {
            const result = await updateStory({
                input: {
                    projectId,
                    storyId,
                    story: {
                        status: targetStatus,
                    }
                }
    });
            if (!result.success) {
                toast.error("error" in result ? result.error : "Status update failed.");
                return;
            }
            story.status = targetStatus;
            await invalidate((url) => url.pathname === page.url.pathname);
            savedSignature = JSON.stringify({
                title: story.title,
                description: story.description,
                persona: story.persona,
                context: story.context,
                empathyMap: story.empathyMap,
                painPoints: story.painPoints,
                hypothesis: story.hypothesis,
                notes: story.notes,
                addOnSections
            });
            pendingStatus = null;
            statusConfirmOpen = false;
            toast.success("Status updated");
        } finally {
            statusMutationPending = false;
        }
    };

    onDestroy(() => {
        if (saveBadgeTimer) clearTimeout(saveBadgeTimer);
        if (savedBadgeTimer) clearTimeout(savedBadgeTimer);
    });

    $effect(() => {
        const d = data;
        untrack(() => {
            const s = structuredClone(d.story);
            const a = structuredClone(d.addOnSections ?? []) as AddOnSection[];
            addOnCatalog = structuredClone(d.addOnCatalog) as Array<{
                type: AddOnType;
                name: string;
                description: string;
                tag: string;
            }>;
            const incomingMetadata = (d.metadata ?? {}) as Partial<ArtifactMetadata>;
            metadata = {
                owner: incomingMetadata.owner ?? "",
                createdBy: incomingMetadata.createdBy ?? incomingMetadata.owner ?? "",
                createdAt: incomingMetadata.createdAt ?? "",
                lastEditedBy: incomingMetadata.lastEditedBy ?? incomingMetadata.owner ?? "",
                lastEditedAt: incomingMetadata.lastEditedAt ?? incomingMetadata.lastUpdated ?? "",
                lastUpdated: incomingMetadata.lastUpdated ?? ""
            };
            story = s;
            addOnSections = a;
            savePhase = "idle";
            pendingStatus = null;
            statusConfirmOpen = false;
            statusMutationPending = false;
            newPoint = "";
            newHypothesis = "";
            savedSignature = JSON.stringify({
                title: s.title,
                description: s.description,
                persona: s.persona,
                context: s.context,
                empathyMap: s.empathyMap,
                painPoints: s.painPoints,
                hypothesis: s.hypothesis,
                notes: s.notes,
                addOnSections: a
            });
            saveReady = true;
        });
    });

</script>

<svelte:head>
    <title>{story.title || "Story"} • Stories • ProjectBook</title>
    <meta
        name="description"
        content="View and edit this user story, persona, and supporting evidence."
    />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

{#key storyId}
<div class="flex flex-col gap-2 p-2 bg-background border rounded-lg">
    <header
			class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
		>
			<div class="flex items-center gap-2 px-4">
				<Sidebar.Trigger class="-ms-1" />
				<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item class="hidden md:block">
							<Breadcrumb.Link href="../stories">User Stories</Breadcrumb.Link>
						</Breadcrumb.Item>
						<Breadcrumb.Separator class="hidden md:block" />
						<Breadcrumb.Item>
							<Breadcrumb.Page>{story.title ? story.title : "New User Story"}</Breadcrumb.Page>
						</Breadcrumb.Item>
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
		</header>
    <div class="flex flex-col md:px-20 gap-4 py-2">
        <div class="flex mt-2 flex-col  bg-background rounded-lg gap-2 p-2">
            <Input type="text" bind:value={story.title} disabled={isReadOnly} class="bg-transparent outline-0 shadow-none border-0 text-4xl! h-fit py-4 px-3" placeholder="Title Goes Here"></Input>
            <Input type="text" bind:value={story.description} disabled={isReadOnly} class="bg-transparent outline-0 shadow-none border-0 text-lg! h-fit py-2 px-3" placeholder="Story description"></Input>
            <div class="flex w-full flex-row justify-between items-center mt-2 px-2">
                <div class="flex items-center gap-2">
                    <Badge variant={statusVariant(story.status)}>{story.status.toUpperCase()}</Badge>
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
                    <Button variant="outline" size="icon" onclick={() => (metadataOpen = true)} aria-label="Open story metadata">
                        <Info class="h-4 w-4" />
                    </Button>
                    <Button onclick={triggerSave} disabled={isReadOnly || savePhase === "saving" || !isDirty}>
                        {savePhase === "saving" ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onclick={() => (statusConfirmOpen = true)} disabled={!canChangeStoryStatus}>Change Status</Button>
                </div>
            </div>
        </div>
        <Separator class="mt-2 px-2"></Separator>
        <div class="py-2 w-full flex flex-col gap-4">
            <div class="personaDetails flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Persona Profile</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-6 p-2 py-4">
                    <div class="flex flex-row gap-6">
                        <div class="flex flex-col gap-2 max-w-sm w-full">
                            <Label class="text-muted-foreground" for="personaName">Persona Name</Label>
                            <Input bind:value={story.persona.name} disabled={isReadOnly} id="personaName" type="text" placeholder="John Doe"></Input>
                        </div>
                        <div class="flex flex-col gap-2 max-w-sm w-full">
                            <Label class="text-muted-foreground" for="personaRole">Archtype / Role</Label>
                            <Input bind:value={story.persona.role} disabled={isReadOnly} id="personaRole" type="text" placeholder="Ex. Student"></Input>
                        </div>
                    </div>
                    <div class="flex flex-col gap-3">
                        <div class="text-sm text-muted-foreground leading-none font-medium">Demographics</div>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-4 w-full">
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaAge">Age: </Label>
                                <Input bind:value={story.persona.age} disabled={isReadOnly} id="personaAge" class="w-full" type="number" placeholder="26"></Input>
                            </div>
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaJob">Job: </Label>
                                <Input bind:value={story.persona.job} disabled={isReadOnly} id="personaJob" class="w-full" type="text" placeholder="Ex. Software Engineer"></Input>
                            </div>
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaEdu">Education: </Label>
                                <Input bind:value={story.persona.edu} disabled={isReadOnly} id="personaEdu" class="w-full" type="text" placeholder="Ex. B.Tech in CSE"></Input>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="personaBio">Bio / About</Label>
                        <Textarea bind:value={story.persona.bio} disabled={isReadOnly} id="personaBio"  placeholder="Persona Bio"></Textarea>
                    </div>
                </div>
            </div>

            <div class="context flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Context / Environment</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-6 p-2 py-4">
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="userContext">User Context or Environment</Label>
                        <Textarea bind:value={story.context} disabled={isReadOnly} id="userContext"  placeholder="User Context"></Textarea>
                    </div>
                </div>
            </div>

            <div class="stdf flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Says / Thinks / Does / Feels</span>
                    <Separator></Separator>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 p-2 py-4">
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="empathySays">Says</Label>
                        <Textarea bind:value={story.empathyMap.says} disabled={isReadOnly} id="empathySays"  placeholder="What user says."></Textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="empathyThinks">Thinks</Label>
                        <Textarea bind:value={story.empathyMap.thinks} disabled={isReadOnly} id="empathyThinks"  placeholder="What user thinks."></Textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="empathyDoes">Does</Label>
                        <Textarea bind:value={story.empathyMap.does} disabled={isReadOnly} id="empathyDoes"  placeholder="What user does."></Textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="empathyFeels">Feels</Label>
                        <Textarea bind:value={story.empathyMap.feels} disabled={isReadOnly} id="empathyFeels"  placeholder="What user feels."></Textarea>
                    </div>
                </div>
            </div>
            <div class="painPoints flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Pain Points</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-2">
                    <div class="grid grid-cols-1 gap-2">
                    {#each story.painPoints as painPoint, index (index)}
                        <div class="bg-destructive/5 px-4 py-2 border border-destructive/50 text-destructive rounded-lg text-sm flex flex-row justify-between items-center">
                            {painPoint}
                            {#if !isReadOnly}
                                <X class="w-4 h-4 cursor-pointer" onclick={() => removePainPoint(index)}></X>
                            {/if}
                        </div>
                    {:else}
                        <div class="bg-orange-500/5 px-4 py-2 border border-orange-500/50 text-orange-500 rounded-lg text-sm flex flex-row justify-between items-center">
                            No Pain Points. Click Add to add one.
                        </div>
                    {/each}
                    </div>
                    {#if !isReadOnly}
                        <div class="flex flex-row items-center justify-between gap-2">
                            <Input id="painPoint" bind:value={newPoint} class="w-full" type="text" placeholder="Add a Pain Point"></Input>
                            <Button onclick={addPainPoint}>Add</Button>
                        </div>
                    {/if}
                </div>
            </div>
            <div class="problemHypothesis flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Problem Hypothesis</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-2">
                    <div class="grid grid-cols-1 gap-2">
                        {#each story.hypothesis as point, index (index)}
                            <div class="bg-primary/5 px-4 py-2 border border-primary/50 text-primary rounded-lg text-sm flex flex-row justify-between items-center">
                                {point}
                                {#if !isReadOnly}
                                    <X class="w-4 h-4 cursor-pointer" onclick={() => removeHypothesis(index)}></X>
                                {/if}
                            </div>
                        {:else}
                            <div class="bg-orange-500/5 px-4 py-2 border border-orange-500/50 text-orange-500 rounded-lg text-sm flex flex-row justify-between items-center">
                                No problem hypothesis. Click Add to add one.
                            </div>
                        {/each}
                    </div>
                    {#if !isReadOnly}
                        <div class="flex flex-row items-center justify-between gap-2">
                            <Input id="hypothesis" bind:value={newHypothesis} class="w-full" type="text" placeholder="Add a Hypothesis"></Input>
                            <Button onclick={addHypothesis}>Add</Button>
                        </div>
                    {/if}
                </div>
            </div>
            {#if addOnSections.length > 0}
                <div class="flex flex-col gap-4">
                    {#each addOnSections as section (section.section_id)}
                        <div class="flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
                            <div class="flex flex-row gap-2 items-center w-full">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="h-7 w-7"
                                    onclick={() => toggleSection(section.section_id)}
                                >
                                    {#if section.collapsed}
                                        <ChevronRight class="h-4 w-4" />
                                    {:else}
                                        <ChevronDown class="h-4 w-4" />
                                    {/if}
                                </Button>
                                <span class="font-medium text-nowrap">
                                    {addOnCatalog.find((item) => item.type === section.section_type)?.name}
                                </span>
                                <Separator></Separator>
                                {#if !isReadOnly}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="h-7 w-7 text-destructive hover:text-destructive"
                                        onclick={() => openRemoveSection(section)}
                                    >
                                        <Trash2 class="h-4 w-4" />
                                    </Button>
                                {/if}
                            </div>
                            {#if !section.collapsed}
                                {#if section.section_type === "goals_success"}
                                    <div class="flex flex-col gap-3 py-2">
                                        <div class="flex flex-col gap-2">
                                            <Label class="text-muted-foreground">User Goal</Label>
                                            <Input
                                                id={`section-${section.section_id}-primary`}
                                                bind:value={(section.content as { goal: string }).goal}
                                                disabled={isReadOnly}
                                                oninput={(e) =>
                                                    updateSectionContent(section.section_id, "goal", (e.currentTarget as HTMLInputElement).value)
                                                }
                                                placeholder="What does the user want to achieve?"
                                            />
                                        </div>
                                        <div class="flex flex-col gap-2">
                                            <Label class="text-muted-foreground">Success Criteria</Label>
                                            <div class="flex flex-col gap-2">
                                                {#each (section.content as { successCriteria: string[] }).successCriteria as item, idx (idx)}
                                                    <div class="flex items-center gap-2">
                                                        <Input
                                                            bind:value={(section.content as { successCriteria: string[] }).successCriteria[idx]}
                                                            disabled={isReadOnly}
                                                            oninput={(e) => {
                                                                const updated = [...(section.content as { successCriteria: string[] }).successCriteria];
                                                                updated[idx] = (e.currentTarget as HTMLInputElement).value;
                                                                updateSectionContent(section.section_id, "successCriteria", updated);
                                                            }}
                                                            placeholder="Success criteria"
                                                        />
                                                        {#if !isReadOnly}
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                class="h-8 w-8 text-destructive"
                                                                onclick={() => {
                                                                    const updated = [...(section.content as { successCriteria: string[] }).successCriteria];
                                                                    updated.splice(idx, 1);
                                                                    updateSectionContent(section.section_id, "successCriteria", updated);
                                                                }}
                                                            >
                                                                <X class="h-4 w-4" />
                                                            </Button>
                                                        {/if}
                                                    </div>
                                                {/each}
                                                {#if !isReadOnly}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        class="w-fit"
                                                        onclick={() => {
                                                            const updated = [...(section.content as { successCriteria: string[] }).successCriteria, ""];
                                                            updateSectionContent(section.section_id, "successCriteria", updated);
                                                        }}
                                                    >
                                                        <Plus class="mr-2 h-4 w-4" />
                                                        Add success criteria
                                                    </Button>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                {:else if section.section_type === "jtbd"}
                                    <div class="flex flex-col gap-3 py-2">
                                        <div class="flex flex-col gap-2">
                                            <Label class="text-muted-foreground">Primary Job</Label>
                                            <Input
                                                id={`section-${section.section_id}-primary`}
                                                bind:value={(section.content as { primaryJob: string }).primaryJob}
                                                disabled={isReadOnly}
                                                oninput={(e) =>
                                                    updateSectionContent(section.section_id, "primaryJob", (e.currentTarget as HTMLInputElement).value)
                                                }
                                                placeholder="Primary job to be done"
                                            />
                                        </div>
                                        <div class="flex flex-col gap-2">
                                            <Label class="text-muted-foreground">Supporting Jobs</Label>
                                            <div class="flex flex-col gap-2">
                                                {#each (section.content as { supportingJobs: string[] }).supportingJobs as item, idx (idx)}
                                                    <div class="flex items-center gap-2">
                                                        <Input
                                                            bind:value={(section.content as { supportingJobs: string[] }).supportingJobs[idx]}
                                                            disabled={isReadOnly}
                                                            oninput={(e) => {
                                                                const updated = [...(section.content as { supportingJobs: string[] }).supportingJobs];
                                                                updated[idx] = (e.currentTarget as HTMLInputElement).value;
                                                                updateSectionContent(section.section_id, "supportingJobs", updated);
                                                            }}
                                                            placeholder="Supporting job"
                                                        />
                                                        {#if !isReadOnly}
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                class="h-8 w-8 text-destructive"
                                                                onclick={() => {
                                                                    const updated = [...(section.content as { supportingJobs: string[] }).supportingJobs];
                                                                    updated.splice(idx, 1);
                                                                    updateSectionContent(section.section_id, "supportingJobs", updated);
                                                                }}
                                                            >
                                                                <X class="h-4 w-4" />
                                                            </Button>
                                                        {/if}
                                                    </div>
                                                {/each}
                                                {#if !isReadOnly}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        class="w-fit"
                                                        onclick={() => {
                                                            const updated = [...(section.content as { supportingJobs: string[] }).supportingJobs, ""];
                                                            updateSectionContent(section.section_id, "supportingJobs", updated);
                                                        }}
                                                    >
                                                        <Plus class="mr-2 h-4 w-4" />
                                                        Add supporting job
                                                    </Button>
                                                {/if}
                                            </div>
                                        </div>
                                        <div class="flex flex-col gap-2">
                                            <Label class="text-muted-foreground">Emotional / Social Jobs</Label>
                                            <div class="flex flex-col gap-2">
                                                {#each (section.content as { emotionalJobs: string[] }).emotionalJobs as item, idx (idx)}
                                                    <div class="flex items-center gap-2">
                                                        <Input
                                                            bind:value={(section.content as { emotionalJobs: string[] }).emotionalJobs[idx]}
                                                            disabled={isReadOnly}
                                                            oninput={(e) => {
                                                                const updated = [...(section.content as { emotionalJobs: string[] }).emotionalJobs];
                                                                updated[idx] = (e.currentTarget as HTMLInputElement).value;
                                                                updateSectionContent(section.section_id, "emotionalJobs", updated);
                                                            }}
                                                            placeholder="Emotional or social job"
                                                        />
                                                        {#if !isReadOnly}
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                class="h-8 w-8 text-destructive"
                                                                onclick={() => {
                                                                    const updated = [...(section.content as { emotionalJobs: string[] }).emotionalJobs];
                                                                    updated.splice(idx, 1);
                                                                    updateSectionContent(section.section_id, "emotionalJobs", updated);
                                                                }}
                                                            >
                                                                <X class="h-4 w-4" />
                                                            </Button>
                                                        {/if}
                                                    </div>
                                                {/each}
                                                {#if !isReadOnly}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        class="w-fit"
                                                        onclick={() => {
                                                            const updated = [...(section.content as { emotionalJobs: string[] }).emotionalJobs, ""];
                                                            updateSectionContent(section.section_id, "emotionalJobs", updated);
                                                        }}
                                                    >
                                                        <Plus class="mr-2 h-4 w-4" />
                                                        Add emotional job
                                                    </Button>
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                {:else if section.section_type === "assumptions"}
                                    <div class="flex flex-col gap-3 py-2">
                                        <Label class="text-muted-foreground">Assumptions</Label>
                                        <div class="flex flex-col gap-2">
                                            {#each (section.content as { assumptions: { text: string; confidence: string }[] }).assumptions as item, idx (idx)}
                                                <div class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_auto]">
                                                    <Input
                                                        id={idx === 0 ? `section-${section.section_id}-primary` : undefined}
                                                        bind:value={item.text}
                                                        disabled={isReadOnly}
                                                        oninput={(e) => {
                                                            const updated = [...(section.content as { assumptions: { text: string; confidence: string }[] }).assumptions];
                                                            updated[idx] = { ...updated[idx], text: (e.currentTarget as HTMLInputElement).value };
                                                            updateSectionContent(section.section_id, "assumptions", updated);
                                                        }}
                                                        placeholder="Assumption"
                                                    />
                                                    <Select.Root
                                                        type="single"
                                                        disabled={isReadOnly}
                                                        value={item.confidence}
                                                        onValueChange={(value) => {
                                                            const updated = [...(section.content as { assumptions: { text: string; confidence: string }[] }).assumptions];
                                                            updated[idx] = { ...updated[idx], confidence: value ?? "Medium" };
                                                            updateSectionContent(section.section_id, "assumptions", updated);
                                                        }}
                                                    >
                                                        <Select.Trigger>{item.confidence}</Select.Trigger>
                                                        <Select.Content>
                                                            <Select.Item value="Low" label="Low">Low</Select.Item>
                                                            <Select.Item value="Medium" label="Medium">Medium</Select.Item>
                                                            <Select.Item value="High" label="High">High</Select.Item>
                                                        </Select.Content>
                                                    </Select.Root>
                                                    {#if !isReadOnly}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            class="h-8 w-8 text-destructive"
                                                            onclick={() => {
                                                                const updated = [...(section.content as { assumptions: { text: string; confidence: string }[] }).assumptions];
                                                                updated.splice(idx, 1);
                                                                updateSectionContent(section.section_id, "assumptions", updated);
                                                            }}
                                                        >
                                                            <X class="h-4 w-4" />
                                                        </Button>
                                                    {/if}
                                                </div>
                                            {/each}
                                            {#if !isReadOnly}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    class="w-fit"
                                                    onclick={() => {
                                                        const updated = [...(section.content as { assumptions: { text: string; confidence: string }[] }).assumptions, { text: "", confidence: "Medium" }];
                                                        updateSectionContent(section.section_id, "assumptions", updated);
                                                    }}
                                                >
                                                    <Plus class="mr-2 h-4 w-4" />
                                                    Add assumption
                                                </Button>
                                            {/if}
                                        </div>
                                    </div>
                                {:else if section.section_type === "constraints"}
                                    <div class="flex flex-col gap-3 py-2">
                                        <Label class="text-muted-foreground">Constraints</Label>
                                        <div class="flex flex-col gap-2">
                                            {#each (section.content as { constraints: { description: string; type: string }[] }).constraints as item, idx (idx)}
                                                <div class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_auto]">
                                                    <Input
                                                        id={idx === 0 ? `section-${section.section_id}-primary` : undefined}
                                                        bind:value={item.description}
                                                        disabled={isReadOnly}
                                                        oninput={(e) => {
                                                            const updated = [...(section.content as { constraints: { description: string; type: string }[] }).constraints];
                                                            updated[idx] = { ...updated[idx], description: (e.currentTarget as HTMLInputElement).value };
                                                            updateSectionContent(section.section_id, "constraints", updated);
                                                        }}
                                                        placeholder="Constraint description"
                                                    />
                                                    <Select.Root
                                                        type="single"
                                                        disabled={isReadOnly}
                                                        value={item.type}
                                                        onValueChange={(value) => {
                                                            const updated = [...(section.content as { constraints: { description: string; type: string }[] }).constraints];
                                                            updated[idx] = { ...updated[idx], type: value ?? "Time" };
                                                            updateSectionContent(section.section_id, "constraints", updated);
                                                        }}
                                                    >
                                                        <Select.Trigger>{item.type}</Select.Trigger>
                                                        <Select.Content>
                                                            <Select.Item value="Time" label="Time">Time</Select.Item>
                                                            <Select.Item value="Tech" label="Tech">Tech</Select.Item>
                                                            <Select.Item value="Policy" label="Policy">Policy</Select.Item>
                                                            <Select.Item value="User" label="User">User</Select.Item>
                                                        </Select.Content>
                                                    </Select.Root>
                                                    {#if !isReadOnly}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            class="h-8 w-8 text-destructive"
                                                            onclick={() => {
                                                                const updated = [...(section.content as { constraints: { description: string; type: string }[] }).constraints];
                                                                updated.splice(idx, 1);
                                                                updateSectionContent(section.section_id, "constraints", updated);
                                                            }}
                                                        >
                                                            <X class="h-4 w-4" />
                                                        </Button>
                                                    {/if}
                                                </div>
                                            {/each}
                                            {#if !isReadOnly}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    class="w-fit"
                                                    onclick={() => {
                                                        const updated = [...(section.content as { constraints: { description: string; type: string }[] }).constraints, { description: "", type: "Time" }];
                                                        updateSectionContent(section.section_id, "constraints", updated);
                                                    }}
                                                >
                                                    <Plus class="mr-2 h-4 w-4" />
                                                    Add constraint
                                                </Button>
                                            {/if}
                                        </div>
                                    </div>
                                {:else if section.section_type === "risks_unknowns"}
                                    <div class="flex flex-col gap-3 py-2">
                                        <Label class="text-muted-foreground">Risks & Unknowns</Label>
                                        <div class="flex flex-col gap-2">
                                            {#each (section.content as { risks: { text: string; impact: string }[] }).risks as item, idx (idx)}
                                                <div class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_auto]">
                                                    <Input
                                                        id={idx === 0 ? `section-${section.section_id}-primary` : undefined}
                                                        bind:value={item.text}
                                                        disabled={isReadOnly}
                                                        oninput={(e) => {
                                                            const updated = [...(section.content as { risks: { text: string; impact: string }[] }).risks];
                                                            updated[idx] = { ...updated[idx], text: (e.currentTarget as HTMLInputElement).value };
                                                            updateSectionContent(section.section_id, "risks", updated);
                                                        }}
                                                        placeholder="Risk or unknown"
                                                    />
                                                    <Select.Root
                                                        type="single"
                                                        disabled={isReadOnly}
                                                        value={item.impact}
                                                        onValueChange={(value) => {
                                                            const updated = [...(section.content as { risks: { text: string; impact: string }[] }).risks];
                                                            updated[idx] = { ...updated[idx], impact: value ?? "Medium" };
                                                            updateSectionContent(section.section_id, "risks", updated);
                                                        }}
                                                    >
                                                        <Select.Trigger>{item.impact}</Select.Trigger>
                                                        <Select.Content>
                                                            <Select.Item value="Low" label="Low">Low</Select.Item>
                                                            <Select.Item value="Medium" label="Medium">Medium</Select.Item>
                                                            <Select.Item value="High" label="High">High</Select.Item>
                                                        </Select.Content>
                                                    </Select.Root>
                                                    {#if !isReadOnly}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            class="h-8 w-8 text-destructive"
                                                            onclick={() => {
                                                                const updated = [...(section.content as { risks: { text: string; impact: string }[] }).risks];
                                                                updated.splice(idx, 1);
                                                                updateSectionContent(section.section_id, "risks", updated);
                                                            }}
                                                        >
                                                            <X class="h-4 w-4" />
                                                        </Button>
                                                    {/if}
                                                </div>
                                            {/each}
                                            {#if !isReadOnly}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    class="w-fit"
                                                    onclick={() => {
                                                        const updated = [...(section.content as { risks: { text: string; impact: string }[] }).risks, { text: "", impact: "Medium" }];
                                                        updateSectionContent(section.section_id, "risks", updated);
                                                    }}
                                                >
                                                    <Plus class="mr-2 h-4 w-4" />
                                                    Add risk
                                                </Button>
                                            {/if}
                                        </div>
                                    </div>
                                {:else if section.section_type === "evidence"}
                                    <div class="flex flex-col gap-3 py-2">
                                        <Label class="text-muted-foreground">Evidence / Research References</Label>
                                        <div class="flex flex-col gap-3">
                                            {#each (section.content as { evidence: { source: string; summary: string; link: string }[] }).evidence as item, idx (idx)}
                                                <div class="grid gap-2 rounded-md border border-border p-3">
                                                    <Input
                                                        id={idx === 0 ? `section-${section.section_id}-primary` : undefined}
                                                        bind:value={item.source}
                                                        disabled={isReadOnly}
                                                        oninput={(e) => {
                                                            const updated = [...(section.content as { evidence: { source: string; summary: string; link: string }[] }).evidence];
                                                            updated[idx] = { ...updated[idx], source: (e.currentTarget as HTMLInputElement).value };
                                                            updateSectionContent(section.section_id, "evidence", updated);
                                                        }}
                                                        placeholder="Source"
                                                    />
                                                    <Textarea
                                                        rows={2}
                                                        bind:value={item.summary}
                                                        disabled={isReadOnly}
                                                        oninput={(e) => {
                                                            const updated = [...(section.content as { evidence: { source: string; summary: string; link: string }[] }).evidence];
                                                            updated[idx] = { ...updated[idx], summary: (e.currentTarget as HTMLTextAreaElement).value };
                                                            updateSectionContent(section.section_id, "evidence", updated);
                                                        }}
                                                        placeholder="Insight summary"
                                                    />
                                                    <Input
                                                        bind:value={item.link}
                                                        disabled={isReadOnly}
                                                        oninput={(e) => {
                                                            const updated = [...(section.content as { evidence: { source: string; summary: string; link: string }[] }).evidence];
                                                            updated[idx] = { ...updated[idx], link: (e.currentTarget as HTMLInputElement).value };
                                                            updateSectionContent(section.section_id, "evidence", updated);
                                                        }}
                                                        placeholder="Link or reference ID"
                                                    />
                                                    {#if !isReadOnly}
                                                        <div class="flex justify-end">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                class="text-destructive"
                                                                onclick={() => {
                                                                    const updated = [...(section.content as { evidence: { source: string; summary: string; link: string }[] }).evidence];
                                                                    updated.splice(idx, 1);
                                                                    updateSectionContent(section.section_id, "evidence", updated);
                                                                }}
                                                            >
                                                                <X class="mr-2 h-4 w-4" />
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    {/if}
                                                </div>
                                            {/each}
                                            {#if !isReadOnly}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    class="w-fit"
                                                    onclick={() => {
                                                        const updated = [...(section.content as { evidence: { source: string; summary: string; link: string }[] }).evidence, { source: "", summary: "", link: "" }];
                                                        updateSectionContent(section.section_id, "evidence", updated);
                                                    }}
                                                >
                                                    <Plus class="mr-2 h-4 w-4" />
                                                    Add evidence
                                                </Button>
                                            {/if}
                                        </div>
                                    </div>
                                {:else if section.section_type === "scenarios"}
                                    <div class="flex flex-col gap-3 py-2">
                                        <Label class="text-muted-foreground">Scenarios / Edge Cases</Label>
                                        <div class="flex flex-col gap-3">
                                            {#each (section.content as { scenarios: { scenario: string; expected: string }[] }).scenarios as item, idx (idx)}
                                                <div class="grid gap-2 rounded-md border border-border p-3">
                                                    <Input
                                                        id={idx === 0 ? `section-${section.section_id}-primary` : undefined}
                                                        bind:value={item.scenario}
                                                        disabled={isReadOnly}
                                                        oninput={(e) => {
                                                            const updated = [...(section.content as { scenarios: { scenario: string; expected: string }[] }).scenarios];
                                                            updated[idx] = { ...updated[idx], scenario: (e.currentTarget as HTMLInputElement).value };
                                                            updateSectionContent(section.section_id, "scenarios", updated);
                                                        }}
                                                        placeholder="Scenario description"
                                                    />
                                                    <Textarea
                                                        rows={2}
                                                        bind:value={item.expected}
                                                        disabled={isReadOnly}
                                                        oninput={(e) => {
                                                            const updated = [...(section.content as { scenarios: { scenario: string; expected: string }[] }).scenarios];
                                                            updated[idx] = { ...updated[idx], expected: (e.currentTarget as HTMLTextAreaElement).value };
                                                            updateSectionContent(section.section_id, "scenarios", updated);
                                                        }}
                                                        placeholder="Expected behavior"
                                                    />
                                                    {#if !isReadOnly}
                                                        <div class="flex justify-end">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                class="text-destructive"
                                                                onclick={() => {
                                                                    const updated = [...(section.content as { scenarios: { scenario: string; expected: string }[] }).scenarios];
                                                                    updated.splice(idx, 1);
                                                                    updateSectionContent(section.section_id, "scenarios", updated);
                                                                }}
                                                            >
                                                                <X class="mr-2 h-4 w-4" />
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    {/if}
                                                </div>
                                            {/each}
                                            {#if !isReadOnly}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    class="w-fit"
                                                    onclick={() => {
                                                        const updated = [...(section.content as { scenarios: { scenario: string; expected: string }[] }).scenarios, { scenario: "", expected: "" }];
                                                        updateSectionContent(section.section_id, "scenarios", updated);
                                                    }}
                                                >
                                                    <Plus class="mr-2 h-4 w-4" />
                                                    Add scenario
                                                </Button>
                                            {/if}
                                        </div>
                                    </div>
                            {/if}
                        {/if}
                        </div>
                    {/each}
                </div>
            {/if}
            {#if !isReadOnly}
                <div class="flex justify-center items-center p-4">
                    <Separator></Separator>
                    <Button variant="outline" size="sm" class="gap-2" onclick={() => (addSectionOpen = true)}>
                        <Plus class="h-4 w-4" />
                        Add Section
                    </Button>
                    <Separator></Separator>
                </div>
            {/if}
            <div class="notes flex flex-col gap-2 p-4 w-full bg-background rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Additional Notes</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-2">
                        <Textarea id="notes" bind:value={story.notes} disabled={isReadOnly} placeholder="Additional Notes"></Textarea>
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
            <Dialog.Description>Read-only metadata for this story.</Dialog.Description>
        </Dialog.Header>
        <div class="grid gap-2 text-sm">
            <div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Created by</span><span>{metadata.createdBy || "Unknown"}</span></div>
            <div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Created at</span><span>{metadata.createdAt || "Unknown"}</span></div>
            <div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Last edited by</span><span>{metadata.lastEditedBy || "Unknown"}</span></div>
            <div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Last edited at</span><span>{metadata.lastEditedAt || metadata.lastUpdated || "Unknown"}</span></div>
            <div class="flex items-center justify-between rounded-md border px-3 py-2"><span class="text-muted-foreground">Status</span><span>{story.status.toUpperCase()}</span></div>
        </div>
        <Dialog.Footer>
            <Dialog.Close class={buttonVariants({ variant: "outline" })}>Close</Dialog.Close>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={addSectionOpen}>
    <Dialog.Content class="max-h-[80vh] overflow-y-auto">
        <Dialog.Header>
            <Dialog.Title>Add a Section</Dialog.Title>
            <Dialog.Description>
                Choose an additional section to enrich this user story.
            </Dialog.Description>
        </Dialog.Header>
        <div class="grid gap-3 py-2">
            {#each addOnCatalog as item (item.type)}
                <div class="flex flex-col gap-2 rounded-md border border-border p-3">
                    <div class="flex items-center justify-between gap-2">
                        <div>
                            <div class="text-sm font-medium">{item.name}</div>
                            <div class="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                        <div class="text-xs text-muted-foreground">{item.tag}</div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isSectionAdded(item.type)}
                        onclick={() => addSection(item.type)}
                    >
                        {isSectionAdded(item.type) ? "Already added" : "Add section"}
                    </Button>
                </div>
            {/each}
        </div>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={removeSectionOpen} onOpenChange={(open) => open || (removeTarget = null)}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Remove this section?</Dialog.Title>
            <Dialog.Description>
                Remove this section? All content inside will be lost.
            </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
            <Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
            <Button variant="destructive" onclick={removeSection}>
                Remove section
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={statusConfirmOpen} onOpenChange={(open) => { statusConfirmOpen = open; if (!open) pendingStatus = null; }}>
    <Dialog.Content>
        <Dialog.Header>
            <Dialog.Title>Change status</Dialog.Title>
            <Dialog.Description>
                {#if pendingStatus === "locked"}
                    Locking makes this story read-only and cannot be undone.
                {:else if pendingStatus === "archived"}
                    Archiving hides this story from active work. You can unarchive later.
                {:else if pendingStatus === "draft"}
                    Moving back to Draft will reopen the story for edits.
                {:else}
                    Select a new status for this story.
                {/if}
            </Dialog.Description>
        </Dialog.Header>
        {#if !pendingStatus}
            <div class="flex items-center gap-2 py-2">
                {#each statusOptions as option (option)}
                    <Button
                        variant={story.status === option ? "default" : "outline"}
                        onclick={() => requestStatusChange(option)}
                        disabled={story.status === option || statusMutationPending || !canSelectStatusOption(option)}
                    >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Button>
                {/each}
            </div>
        {/if}
        <Dialog.Footer>
            <Dialog.Close class={buttonVariants({ variant: "outline" })} disabled={statusMutationPending}>
                Cancel
            </Dialog.Close>
            {#if pendingStatus}
                <Button
                    disabled={!canChangeStoryStatus || statusMutationPending}
                    onclick={confirmStatusChange}
                >
                    {statusMutationPending ? "Saving..." : "Confirm"}
                </Button>
            {/if}
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
{/key}
