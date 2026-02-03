<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Separator } from "$lib/components/ui/separator/index.js";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Textarea } from "$lib/components/ui/textarea";
    import { X } from "@lucide/svelte"
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";

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
            edu: "",
        },
        context: "",
        empathyMap: {
            says: "",
            thinks: "",
            does: "",
            feels: "",
        },
        painPoints: [
            "Point 1",
        ],
        hypothesis: [
            "hypothesis 1",
            "hypothesis 2"
        ],
        notes: ""
    })

    function removePainPoint(index : number) {
        story.painPoints.splice(index, 1);
        story.painPoints = story.painPoints;
    }

    let newPoint = $state("");
    function addPainPoint() {
        story.painPoints.push(newPoint);
        newPoint = "";
        story.painPoints = story.painPoints;
    }

    function removeHypothesis(index : number) {
        story.hypothesis.splice(index, 1);
        story.hypothesis = story.hypothesis;
    }

    let newHypothesis = $state("");
    function addHypothesis() {
        story.hypothesis.push(newHypothesis);
        newHypothesis = "";
        story.hypothesis = story.hypothesis;
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
        <div class="flex mt-2 flex-col  bg-white rounded-lg gap-2 p-2">
            <Input type="text" bind:value={story.title} class="bg-transparent outline-0 shadow-none border-0 text-4xl! h-fit py-4 px-3" placeholder="Title Goes Here"></Input>
            <Input type="text" bind:value={story.description} class="bg-transparent outline-0 shadow-none border-0 text-lg! h-fit py-2 px-3" placeholder="Story description"></Input>
            <div class="flex w-full flex-row justify-between items-center mt-2 px-2">
                <div class="bg-accent px-2 py-1 w-fit rounded-lg text-sm font-medium">{story.status.toUpperCase()}</div>
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
                    <span class="font-medium text-nowrap">Persona Profile</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-6 p-2 py-4">
                    <div class="flex flex-row gap-6">
                        <div class="flex flex-col gap-2 max-w-sm w-full">
                            <Label class="text-muted-foreground" for="personaName">Persona Name</Label>
                            <Input bind:value={story.persona.name} id="personaName" type="text" placeholder="John Doe"></Input>
                        </div>
                        <div class="flex flex-col gap-2 max-w-sm w-full">
                            <Label class="text-muted-foreground" for="personaRole">Archtype / Role</Label>
                            <Input bind:value={story.persona.role} id="personaRole" type="text" placeholder="Ex. Student"></Input>
                        </div>
                    </div>
                    <div class="flex flex-col gap-3">
                        <div class="text-sm text-muted-foreground leading-none font-medium">Demographics</div>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-4 w-full">
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaAge">Age: </Label>
                                <Input bind:value={story.persona.age} id="personaAge" class="w-full" type="number" placeholder="26"></Input>
                            </div>
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaJob">Job: </Label>
                                <Input bind:value={story.persona.job} id="personaJob" class="w-full" type="number" placeholder="Ex. Software Engineer"></Input>
                            </div>
                            <div class="flex flex-row gap-1 w-full">
                                <Label class="text-muted-foreground" for="personaEdu">Education: </Label>
                                <Input bind:value={story.persona.edu} id="personaEdu" class="w-full" type="text" placeholder="Ex. B.Tech in CSE"></Input>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="personaBio">Bio / About</Label>
                        <Textarea bind:value={story.persona.bio} id="personaBio"  placeholder="Persona Bio"></Textarea>
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
                        <Textarea bind:value={story.context} id="userContext"  placeholder="User Context"></Textarea>
                    </div>
                </div>
            </div>
            
            <div class="stdf flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Says / Thinks / Does / Feels</span>
                    <Separator></Separator>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 p-2 py-4">
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="userContext">Says</Label>
                        <Textarea bind:value={story.empathyMap.says} id="userContext"  placeholder="What user says."></Textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="userContext">Thinks</Label>
                        <Textarea bind:value={story.empathyMap.thinks} id="userContext"  placeholder="What user thinks."></Textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="userContext">Does</Label>
                        <Textarea bind:value={story.empathyMap.does} id="userContext"  placeholder="What user does."></Textarea>
                    </div>
                    <div class="flex flex-col gap-2">
                        <Label class="text-muted-foreground" for="userContext">Feels</Label>
                        <Textarea bind:value={story.empathyMap.feels} id="userContext"  placeholder="What user feels."></Textarea>
                    </div>
                </div>
            </div>
            <div class="painPoints flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Pain Points</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-2">
                    <div class="grid grid-cols-1 gap-2">
                    {#each story.painPoints as painPoint, index}
                        <div class="bg-destructive/5 px-4 py-2 border border-destructive/50 text-destructive rounded-lg text-sm flex flex-row justify-between items-center">
                            {painPoint}
                            <X class="w-4 h-4 cursor-pointer" onclick={() => removePainPoint(index)}></X>
                        </div>
                    {:else}
                        <div class="bg-orange-500/5 px-4 py-2 border border-orange-500/50 text-orange-500 rounded-lg text-sm flex flex-row justify-between items-center">
                            No Pain Points. Click Add to add one.
                        </div>
                    {/each}
                    </div>
                    <div class="flex flex-row items-center justify-between gap-2">
                        <Input id="painPoint" bind:value={newPoint} class="w-full" type="text" placeholder="Add a Pain Point"></Input>
                        <Button onclick={addPainPoint}>Add</Button>
                    </div>
                </div>
            </div>
            <div class="problemHypothesis flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Problem Hypothesis</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-2">
                    <div class="grid grid-cols-1 gap-2">
                        {#each story.hypothesis as point, index}
                            <div class="bg-primary/5 px-4 py-2 border border-primary/50 text-primary rounded-lg text-sm flex flex-row justify-between items-center">
                                {point}
                                <X class="w-4 h-4 cursor-pointer" onclick={() => removeHypothesis(index)}></X>
                            </div>
                        {:else}
                            <div class="bg-orange-500/5 px-4 py-2 border border-orange-500/50 text-orange-500 rounded-lg text-sm flex flex-row justify-between items-center">
                                No problem hypothesis. Click Add to add one.
                            </div>
                        {/each}
                    </div>
                    <div class="flex flex-row items-center justify-between gap-2">
                        <Input id="hypothesis" bind:value={newHypothesis} class="w-full" type="text" placeholder="Add a Hypothesis"></Input>
                        <Button onclick={addHypothesis}>Add</Button>
                    </div>
                </div>
            </div>
            <div class="notes flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
                <div class="flex flex-row gap-2 items-center w-full">
                    <span class="font-medium text-nowrap">Additional Notes</span>
                    <Separator></Separator>
                </div>
                <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-2">
                        <Textarea id="notes" bind:value={story.notes}  placeholder="Additional Notes"></Textarea>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>