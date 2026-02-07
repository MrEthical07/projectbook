<script lang="ts">
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
	import { Textarea } from "$lib/components/ui/textarea";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { Archive, Download, ExternalLink, Plus, ChevronDown } from "@lucide/svelte";

	type DocType = "Pitch Deck" | "Research Paper" | "Specification" | "Design File" | "Other";
	type FileType = string;
	type SortOption = "Last Updated" | "Name" | "Upload Date";

	type ResourceRow = {
		id: string;
		name: string;
		fileType: FileType;
		docType: DocType;
		owner: string;
		version: string;
		lastUpdated: string;
		linkedCount: number;
		status: "Active" | "Archived";
	};

	const docTypes: DocType[] = [
		"Pitch Deck",
		"Research Paper",
		"Specification",
		"Design File",
		"Other",
	];

	const fileTypes: FileType[] = ["PDF", "PPTX", "DOCX"];
	const owners = ["Avery Patel", "Nia Clark", "Dr. Ramos"];
	const sortOptions: SortOption[] = ["Last Updated", "Name", "Upload Date"];

	let uploadOpen = $state(false);
	let addSectionOpen = $state(false);
	let search = $state("");
	let filterDocType = $state<DocType | "All">("All");
	let filterFileType = $state<FileType | "All">("All");
	let filterOwner = $state<string>("All");
	let sortBy = $state<SortOption>("Last Updated");

	let resourceName = $state("");
	let resourceDocType = $state<DocType | "">("");
	let resourceDescription = $state("");
	let resourceOwner = $state("Avery Patel");
	let resourceDocTypeCustom = $state("");
	let uploadDragActive = $state(false);
	let uploadFileName = $state("");
	let relatedStory = $state("");
	let relatedProblem = $state("");
	let relatedIdea = $state("");
	let relatedTask = $state("");
	let relatedOpen = $state(false);
	let pendingArchiveId = $state("");
	let archiveDialogOpen = $state(false);

	let resources = $state<ResourceRow[]>([
		{
			id: "res-1",
			name: "Student survey synthesis",
			fileType: "PDF",
			docType: "Research Paper",
			owner: "Avery Patel",
			version: "v3",
			lastUpdated: "Jan 12, 2026",
			linkedCount: 3,
			status: "Active",
		},
		{
			id: "res-2",
			name: "Prototype narrative deck",
			fileType: "PPTX",
			docType: "Pitch Deck",
			owner: "Nia Clark",
			version: "v1",
			lastUpdated: "Jan 8, 2026",
			linkedCount: 1,
			status: "Archived",
		},
	]);

	const filteredResources = $derived.by(() => {
		return resources.filter((row) => {
			const matchesSearch = row.name.toLowerCase().includes(search.toLowerCase());
			const matchesDoc =
				filterDocType === "All" || row.docType === filterDocType;
			const matchesFile =
				filterFileType === "All" || row.fileType === filterFileType;
			const matchesOwner = filterOwner === "All" || row.owner === filterOwner;
			return matchesSearch && matchesDoc && matchesFile && matchesOwner;
		});
	});

	const dynamicDocTypes = $derived.by(() => {
		const fromResources = resources.map((row) => row.docType);
		const all = [...docTypes, ...fromResources];
		return Array.from(new Set(all));
	});

	const dynamicFileTypes = $derived.by(() => {
		const fromResources = resources.map((row) => row.fileType);
		const all = [...fileTypes, ...fromResources];
		return Array.from(new Set(all));
	});

	const storyOptions = [
		"Avery Patel - First-year student",
		"Nia Clark - Working parent",
	];
	const problemOptions = [
		"Students miss assignment requirements",
		"Deadline shifts create confusion",
	];
	const ideaOptions = [
		"Visual deadline timeline for assignments",
		"Assignment checklist reminders",
	];
	const taskOptions = [
		"Prototype timeline for assignment deadlines",
		"Test reminder notification flow",
	];

	const requestArchive = (resourceId: string) => {
		pendingArchiveId = resourceId;
		archiveDialogOpen = true;
	};

	const confirmArchive = () => {
		archiveDialogOpen = false;
		pendingArchiveId = "";
	};

	const handleFileDrop = (event: DragEvent) => {
		event.preventDefault();
		uploadDragActive = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) {
			uploadFileName = file.name;
		}
	};

</script>

<div class="flex flex-col gap-2 p-2 bg-white border rounded-lg w-full">
	<header
		class="flex h-12 shrink-0 w-full items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex items-center gap-2 px-4 w-full">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="../resources">Resources</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Resources</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col md:px-20 gap-4 py-2">
		<div class="flex mt-2 flex-col bg-white rounded-lg gap-2 p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				Resources - All project files and reference materials
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-col gap-1">
					<div class="text-3xl font-semibold">Resources</div>
					<div class="text-sm text-muted-foreground">
						All project files and reference materials
					</div>
				</div>
				<Dialog.Root bind:open={uploadOpen}>
					<Dialog.Trigger class={buttonVariants()}>
						<Plus class="mr-2 h-4 w-4" />
						Upload Resource
					</Dialog.Trigger>
					<Dialog.Content class="max-w-xl">
						<Dialog.Header>
							<Dialog.Title>Upload resource</Dialog.Title>
							<Dialog.Description>
								Add a new resource and capture its metadata before upload.
							</Dialog.Description>
						</Dialog.Header>
						<div class="grid gap-3">
							<div class="grid gap-2">
								<Label for="resource-file">File</Label>
								<div
									class={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition ${
										uploadDragActive ? "border-primary bg-primary/5" : "border-border"
									}`}
									role="button"
									tabindex="0"
									aria-label="Upload resource file"
									ondragenter={(event) => {
										event.preventDefault();
										uploadDragActive = true;
									}}
									ondragover={(event) => {
										event.preventDefault();
										uploadDragActive = true;
									}}
									ondragleave={() => {
										uploadDragActive = false;
									}}
									ondrop={handleFileDrop}
								>
									<div class="text-sm font-medium">
										{uploadFileName || "Drag and drop a file here"}
									</div>
									<div class="text-xs text-muted-foreground">
										or click to browse
									</div>
									<Input
										id="resource-file"
										type="file"
										class="hidden"
										onchange={(event) => {
											const file = (event.currentTarget as HTMLInputElement).files?.[0];
											if (file) {
												uploadFileName = file.name;
											}
										}}
									/>
									<label
										for="resource-file"
										class={buttonVariants({ variant: "outline", size: "sm" })}
									>
										Select file
									</label>
								</div>
							</div>
							<div class="grid gap-2">
								<Label for="resource-name">Resource name</Label>
								<Input id="resource-name" bind:value={resourceName} placeholder="Name" />
							</div>
						<div class="grid gap-2">
							<Label for="resource-doc-type">Document type</Label>
							<Select.Root type="single" bind:value={resourceDocType}>
								<Select.Trigger id="resource-doc-type">
									{resourceDocType || "Select type"}
								</Select.Trigger>
								<Select.Content>
									{#each dynamicDocTypes as type (type)}
										<Select.Item value={type} label={type}>
											{type}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
						{#if resourceDocType === "Other"}
							<div class="grid gap-2">
								<Label for="resource-doc-type-custom">Custom type</Label>
								<Input
									id="resource-doc-type-custom"
									bind:value={resourceDocTypeCustom}
									placeholder="Enter document type"
								/>
							</div>
						{/if}
							<div class="grid gap-2">
								<Label for="resource-description">Description</Label>
								<Textarea
									id="resource-description"
									bind:value={resourceDescription}
									placeholder="Optional description"
								/>
							</div>
							<div class="grid gap-2">
								<Label>Owner</Label>
								<Input value={resourceOwner} disabled />
							</div>
						<div class="grid gap-2">
							<button
								type="button"
								class="flex items-center gap-2 text-left text-sm font-medium"
								onclick={() => {
									relatedOpen = !relatedOpen;
								}}
							>
								<ChevronDown
									class={`h-4 w-4 transition-transform ${
										relatedOpen ? "rotate-180" : ""
									}`}
								/>
								Related artifacts
							</button>
							{#if relatedOpen}
								<div class="grid gap-3">
									<div class="grid gap-2">
										<Label for="related-story">User Story</Label>
										<Select.Root type="single" bind:value={relatedStory}>
											<Select.Trigger id="related-story">
												{relatedStory || "Select story"}
											</Select.Trigger>
											<Select.Content>
												{#each storyOptions as option (option)}
													<Select.Item value={option} label={option}>
														{option}
													</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
									</div>
									<div class="grid gap-2">
										<Label for="related-problem">Problem Statement</Label>
										<Select.Root type="single" bind:value={relatedProblem}>
											<Select.Trigger id="related-problem">
												{relatedProblem || "Select problem"}
											</Select.Trigger>
											<Select.Content>
												{#each problemOptions as option (option)}
													<Select.Item value={option} label={option}>
														{option}
													</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
									</div>
									<div class="grid gap-2">
										<Label for="related-idea">Idea</Label>
										<Select.Root type="single" bind:value={relatedIdea}>
											<Select.Trigger id="related-idea">
												{relatedIdea || "Select idea"}
											</Select.Trigger>
											<Select.Content>
												{#each ideaOptions as option (option)}
													<Select.Item value={option} label={option}>
														{option}
													</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
									</div>
									<div class="grid gap-2">
										<Label for="related-task">Task</Label>
										<Select.Root type="single" bind:value={relatedTask}>
											<Select.Trigger id="related-task">
												{relatedTask || "Select task"}
											</Select.Trigger>
											<Select.Content>
												{#each taskOptions as option (option)}
													<Select.Item value={option} label={option}>
														{option}
													</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
									</div>
								</div>
							{/if}
						</div>
							<div class="grid gap-2">
								<Label>Visibility</Label>
								<Input value="Project-wide" disabled />
							</div>
						</div>
						<Dialog.Footer>
							<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
							<Button class={buttonVariants()}>Upload</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</div>

		<Separator class="mt-2 px-2"></Separator>

		<section class="flex flex-col gap-3 p-4 w-full bg-white rounded-lg">
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-3">
					<Input
						placeholder="Search resources"
						bind:value={search}
						class="w-60"
					/>
					<Select.Root type="single" bind:value={filterDocType}>
						<Select.Trigger class="w-40">Doc type</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							{#each docTypes as type (type)}
								<Select.Item value={type} label={type}>
									{type}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Select.Root type="single" bind:value={filterFileType}>
						<Select.Trigger class="w-32">File type</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							{#each dynamicFileTypes as type (type)}
								<Select.Item value={type} label={type}>
									{type}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Select.Root type="single" bind:value={filterOwner}>
						<Select.Trigger class="w-40">Owner</Select.Trigger>
						<Select.Content>
							<Select.Item value="All" label="All">All</Select.Item>
							{#each owners as owner (owner)}
								<Select.Item value={owner} label={owner}>
									{owner}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Select.Root type="single" bind:value={sortBy}>
						<Select.Trigger class="w-40">Sort by</Select.Trigger>
						<Select.Content>
							{#each sortOptions as option (option)}
								<Select.Item value={option} label={option}>
									{option}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-2 p-4 w-full bg-white rounded-lg">
			<div class="flex flex-row gap-2 items-center w-full">
				<span class="font-medium text-nowrap">Resources</span>
				<Separator></Separator>
			</div>
			{#if filteredResources.length === 0}
				<div class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
					<div class="text-lg font-semibold">No resources yet</div>
					<div class="text-sm text-muted-foreground">
						Resources are the centralized registry of project files and references.
					</div>
					<Button class={buttonVariants()} onclick={() => (uploadOpen = true)}>
						Upload your first resource
					</Button>
				</div>
			{:else}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Resource Name</TableHead>
							<TableHead>File Type</TableHead>
							<TableHead>Document Type</TableHead>
							<TableHead>Owner</TableHead>
							<TableHead>Version</TableHead>
							<TableHead>Last Updated</TableHead>
					<TableHead>Linked</TableHead>
					<TableHead class="text-center">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{#each filteredResources as row (row.id)}
					<TableRow>
								<TableCell>
								<div class="flex items-center gap-2">
									<a class="text-sm font-medium hover:underline" href={`./resources/${row.id}`}>
										{row.name}
									</a>
									{#if row.status === "Archived"}
										<Badge class="bg-amber-100 text-amber-700 border-amber-200" variant="outline">
											Archived
										</Badge>
									{/if}
								</div>
								</TableCell>
								<TableCell>{row.fileType}</TableCell>
								<TableCell>{row.docType}</TableCell>
						<TableCell>
							<div class="flex items-center gap-2">
								<Avatar.Root class="h-7 w-7">
									<Avatar.Fallback>
										{row.owner
											.split(" ")
											.map((part) => part[0])
											.join("")
											.slice(0, 2)}
									</Avatar.Fallback>
								</Avatar.Root>
								<span>{row.owner}</span>
							</div>
						</TableCell>
						<TableCell>{row.version}</TableCell>
						<TableCell>{row.lastUpdated}</TableCell>
						<TableCell>
							<Badge variant="secondary">{row.linkedCount}</Badge>
						</TableCell>
						<TableCell>
							<div class="flex w-full justify-evenly items-center gap-2">
								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button variant="ghost" size="sm" class="h-8 w-8 p-0">
											<Download class="h-4 w-4" />
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content>Download</Tooltip.Content>
								</Tooltip.Root>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button
											variant="ghost"
											size="sm"
											class="h-8 w-8 p-0"
											onclick={() => requestArchive(row.id)}
										>
											<Archive class="h-4 w-4" />
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content>Archive</Tooltip.Content>
								</Tooltip.Root>
								
								<Tooltip.Root>
									<Tooltip.Trigger>
										<Button
											variant="ghost"
											size="sm"
											class="h-8 w-8 p-0"
												href={`./resources/${row.id}`}
												aria-label="Open resource"
											>
												<ExternalLink class="h-4 w-4" />
										</Button>
									</Tooltip.Trigger>
									<Tooltip.Content>View</Tooltip.Content>
								</Tooltip.Root>
							</div>
						</TableCell>
					</TableRow>
				{/each}
			</TableBody>
		</Table>
	{/if}
		</section>
	</div>
</div>

<Dialog.Root bind:open={archiveDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Archive this resource?</Dialog.Title>
			<Dialog.Description>
				Archived resources are read-only and kept for history.
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-lg border border-border px-3 py-2 text-sm">
			Resource ID: {pendingArchiveId || "None"}
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Dialog.Close class={buttonVariants()} onclick={confirmArchive}>
				Confirm archive
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
