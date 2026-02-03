<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Separator } from "$lib/components/ui/separator/index.js";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea";
    import { X, Plus } from "@lucide/svelte"
    import { buttonVariants } from "$lib/components/ui/button/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Select from "$lib/components/ui/select";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";

    let journey = $state({
        title: "",
        description: "",
        status: "draft",
        persona: {
            name: "",
            bio: "",
            role: "",
            age: 0,
            job: "",
            edu: "",
        },
        context: "",
        stages: [
            {
                name: 'Discovery',
                actions: ['Sees coffee shop', 'Checks line'],
                emotion: 'Neutral',
                painPoints: [],
            },
            {
                name: 'Ordering',
                actions: ['Waits in line', 'Orders drink'],
                emotion: 'Frustrated',
                painPoints: ['Line is slow'],
            },
            {
                name: 'Payment',
                actions: ['Taps card', 'Waits for receipt'],
                emotion: 'Anxious',
                painPoints: ['Reader slow'],
            },
            {
                name: 'Pickup',
                actions: ['Waits for name', 'Grabs drink'],
                emotion: 'Relieved',
                painPoints: [],
            },
        ],
        notes: ""
    })

    let emotions: string[] = [
        'Neutral',
        'Frustrated',
        'Anxious',
        'Relieved',
    ]

    let isAddingStage = $state(false);

    function removeStage(index : number) {
        journey.stages.splice(index, 1);
        journey.stages = journey.stages;
    }
    let newStageName = $state("");
    function addStage() {
        journey.stages.push({
            name: newStageName,
            actions: [],
            emotion: "",
            painPoints: [],
        });
        journey.stages = journey.stages;
        isAddingStage = false;
    }

    let newAction = $state("");
    function addAction(stageIndex : number) {
        if(newAction == "") return;
        journey.stages[stageIndex].actions.push(newAction);
        journey.stages = journey.stages;
        newAction = "";
    }

    let newPainPoint = $state("");
    function addPainPoint(stageIndex : number) {
        if(newPainPoint == "") return;
        journey.stages[stageIndex].painPoints.push(newPainPoint);
        journey.stages = journey.stages;
        newPainPoint = "";
    }

    function removeAction(stageIndex : number, actionIndex : number) {
        journey.stages[stageIndex].actions.splice(actionIndex, 1);
        journey.stages = journey.stages;
    }

    function removePainPoint(stageIndex : number, painPointIndex : number) {
        journey.stages[stageIndex].painPoints.splice(painPointIndex, 1);
        journey.stages = journey.stages;
    }

</script>

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
            <Input type="text" bind:value={journey.title} class="bg-transparent outline-0 shadow-none border-0 text-4xl! h-fit py-4 px-3" placeholder="Title Goes Here"></Input>
            <Input type="text" bind:value={journey.description} class="bg-transparent outline-0 shadow-none border-0 text-lg! h-fit py-2 px-3" placeholder="Journey description"></Input>
            <div class="flex w-full flex-row justify-between items-center mt-2 px-2">
                <div class="bg-accent px-2 py-1 w-fit rounded-lg text-sm font-medium">{journey.status.toUpperCase()}</div>
                <div class="flex flex-row gap-2">
                    <Button>Save Changes</Button>
                    <Button variant="outline">Change Status</Button>
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
                            <Input bind:value={journey.persona.name} id="personaName" type="text" placeholder="John Doe"></Input>
                        </div>
                        <div class="flex flex-col gap-2 max-w-sm w-full">
                            <Label class="text-muted-foreground" for="personaRole">Archtype / Role</Label>
                            <Input bind:value={journey.persona.role} id="personaRole" type="text" placeholder="Ex. Student"></Input>
                        </div>
                    </div>
                    <div class="flex flex-col gap-3">
                        <div class="text-sm text-muted-foreground leading-none font-medium">Demographics</div>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-4 w-full">
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaAge">Age: </Label>
                                <Input bind:value={journey.persona.age} id="personaAge" class="w-full" type="number" placeholder="26"></Input>
                            </div>
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaJob">Job: </Label>
                                <Input bind:value={journey.persona.job} id="personaJob" class="w-full" type="number" placeholder="Ex. Software Engineer"></Input>
                            </div>
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaEdu">Education: </Label>
                                <Input bind:value={journey.persona.edu} id="personaEdu" class="w-full" type="text" placeholder="Ex. B.Tech in CSE"></Input>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="personaBio">Bio / About</Label>
                        <Textarea bind:value={journey.persona.bio} id="personaBio"  placeholder="Persona Bio"></Textarea>
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
                        <Textarea bind:value={journey.context} id="userContext"  placeholder="User Context"></Textarea>
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
                                        <Select.Root type="single" name="emotion" bind:value={stage.emotion}>
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
                                        <button
                                            onclick={() => removeStage(index)}
                                            class="p-1 text-destructive opacity-50 hover:opacity-100 transition-opacity"
                                        >
                                            <X size={16}/>
                                        </button>
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
                                                        <Input id="action" name="action" bind:value={newAction} defaultValue="New Action" />
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
                                                    <button
                                                        class="hidden group-hover:flex text-destructive opacity-50 hover:opacity-100 transition-opacity"
                                                        onclick={() => removeAction(index, i)}>
                                                        <X size={16}/>
                                                    </button>
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
                                                        <Input id="painpoint" name="painpoint" bind:value={newPainPoint} defaultValue="New Pain Point" />
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
                                                    <button
                                                        class="hidden group-hover:flex text-destructive opacity-50 hover:opacity-100 transition-opacity"
                                                        onclick={() => removePainPoint(index, i)}>
                                                        <X size={16}/>
                                                    </button>
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
                </div>
            </div>


            <div class="notes flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Additional Notes</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-2">
                        <Textarea id="notes" bind:value={journey.notes}  placeholder="Additional Notes"></Textarea>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>