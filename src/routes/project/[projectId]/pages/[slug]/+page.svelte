<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Popover from "$lib/components/ui/popover";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table";
	import { Textarea } from "$lib/components/ui/textarea";
	import {
		Archive,
		ArrowDown,
		ArrowUp,
		ChevronDown,
		Copy,
		GripVertical,
		Info,
		MoreHorizontal,
		Plus,
		Trash2,
	} from "@lucide/svelte";

	type PageStatus = "Draft" | "Archived";
	type PageContentType = "Document" | "Table" | "Board" | "List" | "Calendar" | "Gallery" | "Timeline";

	type PageBlockType =
		| "Paragraph"
		| "Heading 1"
		| "Heading 2"
		| "Heading 3"
		| "Quote"
		| "Callout"
		| "Divider"
		| "Bulleted List"
		| "Numbered List"
		| "Checklist"
		| "Code Block"
		| "Image"
		| "Video"
		| "File Embed"
		| "Table"
		| "Toggle List"
		| "Page Link"
		| "Link Preview";

	type PageBlock = {
		id: string;
		type: PageBlockType;
		content: string;
	};

	type TableColumn = {
		id: string;
		name: string;
	};

	type TableRow = {
		id: string;
		cells: Record<string, string>;
	};

	type View = {
		id: string;
		name: string;
		type: PageContentType;
	};

	type DatabaseItem = {
		id: string;
		title: string;
		status: "Backlog" | "In progress" | "Done";
		date: string;
		owner: string;
		tag: string;
		docHeading: string;
		docBody: string;
	};

	const blockOptions: { type: PageBlockType; label: string }[] = [
		{ type: "Paragraph", label: "Paragraph" },
		{ type: "Heading 1", label: "Heading 1" },
		{ type: "Heading 2", label: "Heading 2" },
		{ type: "Heading 3", label: "Heading 3" },
		{ type: "Quote", label: "Quote" },
		{ type: "Callout", label: "Callout" },
		{ type: "Divider", label: "Divider" },
		{ type: "Bulleted List", label: "Bulleted list" },
		{ type: "Numbered List", label: "Numbered list" },
		{ type: "Checklist", label: "Checklist" },
		{ type: "Code Block", label: "Code block" },
		{ type: "Image", label: "Image" },
		{ type: "Video", label: "Video embed" },
		{ type: "File Embed", label: "File embed" },
		{ type: "Table", label: "Inline table" },
		{ type: "Toggle List", label: "Toggle list" },
		{ type: "Page Link", label: "Page link" },
		{ type: "Link Preview", label: "Link preview" },
	];

	const tagOptions = ["Research", "Alignment", "Notes", "Strategy"];
	const linkedArtifactOptions = [
		"User Story - Streamline checkout",
		"Problem Statement - Reduce abandonment",
		"Idea - Timeline reminders",
		"Task - Prototype timeline",
		"Feedback - Reminder test",
		"Resource - Survey synthesis",
	];

	let status = $state<PageStatus>("Draft");
	let title = $state("Untitled Page");
	let owner = $state("Avery Patel");
	let createdAt = $state("Jan 10, 2026");
	let lastEdited = $state("Jan 12, 2026");
	let description = $state("");
	let tags = $state<string[]>(["Research"]);
	let linkedArtifacts = $state<string[]>([]);
	let blockDialogOpen = $state(false);
	let archiveDialogOpen = $state(false);
	let unarchiveDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let readOnlyView = $state(false);
	let fullWidth = $state(false);
	let dragId = $state("");
	let views = $state<View[]>([
		{ id: "view-doc", name: "Document", type: "Document" },
		{ id: "view-table", name: "Table", type: "Table" },
		{ id: "view-board", name: "Board", type: "Board" },
		{ id: "view-list", name: "List", type: "List" },
		{ id: "view-calendar", name: "Calendar", type: "Calendar" },
		{ id: "view-gallery", name: "Gallery", type: "Gallery" },
		{ id: "view-timeline", name: "Timeline", type: "Timeline" },
	]);
	let activeViewId = $state("view-doc");
	let addViewOpen = $state(false);
	let newViewName = $state("");
	let newViewType = $state<PageContentType>("Table");
	let viewWarningOpen = $state(false);
	let viewWarningMessage = $state("");
	let renameColumnOpen = $state(false);
	let renameColumnId = $state("");
	let renameColumnValue = $state("");

	let docHeading = $state("Context");
	let docBody = $state("Summarize the intent of this page and the key takeaways.");
	let blocks = $state<PageBlock[]>([]);

	let tableColumns = $state<TableColumn[]>([
		{ id: "col-1", name: "Item" },
		{ id: "col-2", name: "Notes" },
	]);

	let tableRows = $state<TableRow[]>([
		{
			id: "row-1",
			cells: {
				"col-1": "First entry",
				"col-2": "Add your notes here.",
			},
		},
	]);

	let databaseItems = $state<DatabaseItem[]>([
		{
			id: "item-1",
			title: "Capture key observations",
			status: "Backlog",
			date: "2026-01-12",
			owner: "Avery Patel",
			tag: "Research",
			docHeading: "Notes",
			docBody: "Capture the key observations from the session.",
		},
		{
			id: "item-2",
			title: "Draft summary insights",
			status: "In progress",
			date: "2026-01-14",
			owner: "Nia Clark",
			tag: "Notes",
			docHeading: "Summary",
			docBody: "Draft the summary of findings and insights.",
		},
		{
			id: "item-3",
			title: "Align on next steps",
			status: "Done",
			date: "2026-01-16",
			owner: "Dr. Ramos",
			tag: "Alignment",
			docHeading: "Next steps",
			docBody: "Confirm the next actions with stakeholders.",
		},
	]);

	type SavePhase = "idle" | "saving" | "saved";
	let savePhase = $state<SavePhase>("idle");
	let savedSignature = $state("");
	let saveReady = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;

	const currentSignature = $derived(
		JSON.stringify({
			status,
			title,
			owner,
			description,
			tags,
			linkedArtifacts,
			docHeading,
			docBody,
			views,
			activeViewId,
			tableColumns,
			tableRows,
			databaseItems,
		})
	);

	const isDirty = $derived(saveReady && currentSignature !== savedSignature);
	const isReadOnly = $derived(status === "Archived" || readOnlyView);
	const activeView = $derived(views.find((view) => view.id === activeViewId) ?? views[0]);
	const isDatabaseView = $derived(activeView?.type !== "Document");
	const saveIndicator = $derived.by(() => {
		if (savePhase === "saving") {
			return "saving";
		}

		if (isDirty) {
			return "edited";
		}

		if (savePhase === "saved") {
			return "saved";
		}

		return "idle";
	});

	const statusClass = (value: PageStatus) =>
		value === "Archived"
			? "bg-amber-100 text-amber-700 border-amber-200"
			: "bg-emerald-100 text-emerald-700 border-emerald-200";

	const addBlock = (type: PageBlockType) => {
		blocks = [
			...blocks,
			{
				id: `block-${Date.now()}`,
				type,
				content: "",
			},
		];
		blockDialogOpen = false;
	};

	const isCompatibleView = (nextType: PageContentType) => {
		const hasDocContent =
			Boolean(docHeading.trim()) || Boolean(docBody.trim());
		const hasDatabaseContent =
			databaseItems.length > 0 ||
			tableRows.length > 0 ||
			tableColumns.length > 0;
		if (nextType === "Document") {
			return !hasDatabaseContent;
		}
		return !hasDocContent;
	};


	const selectView = (view: View) => {
		if (activeViewId === view.id) {
			return;
		}
		if (!isCompatibleView(view.type)) {
			viewWarningMessage =
				"That view is not compatible with the current content and could cause data loss. Create a new page if you need a different view type.";
			viewWarningOpen = true;
			return;
		}
		activeViewId = view.id;
	};

	const addView = () => {
		if (!newViewName.trim()) {
			return;
		}
		const nextId = `view-${Date.now()}`;
		views = [...views, { id: nextId, name: newViewName.trim(), type: newViewType }];
		activeViewId = nextId;
		newViewName = "";
		newViewType = "Table";
		addViewOpen = false;
	};

	const addColumn = () => {
		const nextId = `col-${Date.now()}`;
		tableColumns = [...tableColumns, { id: nextId, name: "New column" }];
		tableRows = tableRows.map((row) => ({
			...row,
			cells: { ...row.cells, [nextId]: "" },
		}));
	};

	const updateColumnName = (columnId: string, value: string) => {
		tableColumns = tableColumns.map((column) =>
			column.id === columnId ? { ...column, name: value } : column
		);
	};

	const openRenameColumn = (column: TableColumn) => {
		renameColumnId = column.id;
		renameColumnValue = column.name;
		renameColumnOpen = true;
	};

	const confirmRenameColumn = () => {
		if (!renameColumnId) {
			return;
		}
		const nextValue = renameColumnValue.trim() || "Untitled";
		updateColumnName(renameColumnId, nextValue);
		renameColumnOpen = false;
	};

	const removeColumn = (columnId: string) => {
		if (tableColumns.length <= 1) {
			return;
		}
		tableColumns = tableColumns.filter((column) => column.id !== columnId);
		tableRows = tableRows.map((row) => {
			const nextCells = { ...row.cells };
			delete nextCells[columnId];
			return { ...row, cells: nextCells };
		});
	};

	const addRow = () => {
		const rowId = `row-${Date.now()}`;
		const cells: Record<string, string> = {};
		for (const column of tableColumns) {
			cells[column.id] = "";
		}
		tableRows = [...tableRows, { id: rowId, cells }];
	};

	const removeRow = (rowId: string) => {
		if (tableRows.length <= 1) {
			return;
		}
		tableRows = tableRows.filter((row) => row.id !== rowId);
	};

	const updateCell = (rowId: string, columnId: string, value: string) => {
		tableRows = tableRows.map((row) =>
			row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row
		);
	};

	const addDatabaseItem = () => {
		const nextId = `item-${Date.now()}`;
		databaseItems = [
			...databaseItems,
			{
				id: nextId,
				title: "New item",
				status: "Backlog",
				date: "2026-01-18",
				owner,
				tag: "Notes",
				docHeading: "Notes",
				docBody: "",
			},
		];
	};

	const updateDatabaseItem = (itemId: string, updates: Partial<DatabaseItem>) => {
		databaseItems = databaseItems.map((item) =>
			item.id === itemId ? { ...item, ...updates } : item
		);
	};

	const deleteBlock = (id: string) => {
		blocks = blocks.filter((block) => block.id !== id);
	};

	const duplicateBlock = (block: PageBlock) => {
		blocks = [
			...blocks,
			{
				...block,
				id: `block-${Date.now()}`,
			},
		];
	};

	let newItemOpen = $state(false);
	let newItemTitle = $state("");
	let newItemStatus = $state<DatabaseItem["status"]>("Backlog");
	let newItemDate = $state("2026-01-18");
	let newItemOwner = $state("");
	let newItemTag = $state("Notes");

	const openNewItemDialog = () => {
		newItemTitle = "";
		newItemStatus = "Backlog";
		newItemDate = "2026-01-18";
		newItemOwner = owner;
		newItemTag = "Notes";
		newItemOpen = true;
	};

	const confirmNewItem = () => {
		if (!newItemTitle.trim()) {
			return;
		}
		const nextId = `item-${Date.now()}`;
		databaseItems = [
			...databaseItems,
			{
				id: nextId,
				title: newItemTitle.trim(),
				status: newItemStatus,
				date: newItemDate,
				owner: newItemOwner,
				tag: newItemTag,
				docHeading: "Notes",
				docBody: "",
			},
		];
		newItemOpen = false;
	};

	let galleryOpen = $state(false);
	let galleryItemId = $state("");

	const openGalleryItem = (itemId: string) => {
		galleryItemId = itemId;
		galleryOpen = true;
	};

	const activeGalleryItem = $derived(
		databaseItems.find((item) => item.id === galleryItemId) ?? null
	);

	let discussion = $state([
		{
			id: "msg-1",
			author: "Avery Patel",
			message: "Noted the key customer reactions from the session.",
			time: "09:42",
		},
		{
			id: "msg-2",
			author: "Nia Clark",
			message: "Agree - especially the confusion around deadlines.",
			time: "09:45",
		},
	]);

	let newMessage = $state("");

	const sendMessage = () => {
		if (!newMessage.trim()) {
			return;
		}
		discussion = [
			...discussion,
			{
				id: `msg-${Date.now()}`,
				author: owner,
				message: newMessage.trim(),
				time: "Now",
			},
		];
		newMessage = "";
	};

	const moveBlock = (fromId: string, toId: string) => {
		if (fromId === toId) {
			return;
		}

		const fromIndex = blocks.findIndex((block) => block.id === fromId);
		const toIndex = blocks.findIndex((block) => block.id === toId);
		if (fromIndex === -1 || toIndex === -1) {
			return;
		}

		const updated = [...blocks];
		const [moved] = updated.splice(fromIndex, 1);
		updated.splice(toIndex, 0, moved);
		blocks = updated;
	};

	const moveBlockByIndex = (index: number, direction: "up" | "down") => {
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= blocks.length) {
			return;
		}
		moveBlock(blocks[index].id, blocks[targetIndex].id);
	};

	const addTag = (value: string) => {
		if (!tags.includes(value)) {
			tags = [...tags, value];
		}
	};

	const removeTag = (value: string) => {
		tags = tags.filter((tag) => tag !== value);
	};

	const addLinkedArtifact = (value: string) => {
		if (!linkedArtifacts.includes(value)) {
			linkedArtifacts = [...linkedArtifacts, value];
		}
	};

	const removeLinkedArtifact = (value: string) => {
		linkedArtifacts = linkedArtifacts.filter((item) => item !== value);
	};

	const triggerSave = () => {
		if (savePhase === "saving" || !isDirty) {
			return;
		}

		if (saveTimer) {
			clearTimeout(saveTimer);
		}

		if (savedBadgeTimer) {
			clearTimeout(savedBadgeTimer);
		}

		savePhase = "saving";
		saveTimer = setTimeout(() => {
			savedSignature = currentSignature;
			savePhase = "saved";
			savedBadgeTimer = setTimeout(() => {
				if (!isDirty) {
					savePhase = "idle";
				}
			}, 1400);
		}, 900);
	};

	onDestroy(() => {
		if (saveTimer) {
			clearTimeout(saveTimer);
		}

		if (savedBadgeTimer) {
			clearTimeout(savedBadgeTimer);
		}
	});

	onMount(() => {
		savedSignature = currentSignature;
		saveReady = true;
	});
</script>

<div class={`flex flex-col gap-2 p-2 bg-white border rounded-lg ${fullWidth ? "w-full" : "w-full"}`}>
	<header
		class="flex h-12 shrink-0 w-full items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex items-center gap-2 px-4 w-full">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="../pages">Pages</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{title}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class={`flex flex-col ${fullWidth ? "md:px-8" : "md:px-20"} gap-4 py-2`}>
		<div class="flex mt-2 flex-col bg-white rounded-lg gap-2 p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				Pages - {status}
			</div>
			<Input
				type="text"
				bind:value={title}
				class="bg-transparent outline-0 shadow-none border-0 text-4xl! h-fit py-4 px-3"
				placeholder="Page Title"
				disabled={isReadOnly}
			/>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="outline" class={statusClass(status)}>{status}</Badge>
					<Popover.Root>
						<Popover.Trigger class={buttonVariants({ variant: "ghost", size: "icon" })}>
							<Info class="h-4 w-4" />
						</Popover.Trigger>
						<Popover.Content align="start" class="w-90">
							<div class="text-sm font-semibold">Page properties</div>
							<div class="mt-3 grid gap-4 text-sm">
								<div class="grid gap-2">
									<Label>Owner</Label>
									<div class="flex items-center gap-2 text-sm">
										<Avatar.Root class="h-7 w-7">
											<Avatar.Fallback>
												{owner
													.split(" ")
													.map((part) => part[0])
													.join("")
													.slice(0, 2)}
											</Avatar.Fallback>
										</Avatar.Root>
										<span>{owner}</span>
									</div>
								</div>
								<div class="grid gap-2">
									<Label>Created at</Label>
									<div class="text-sm text-muted-foreground">{createdAt}</div>
								</div>
								<div class="grid gap-2">
									<Label>Last edited</Label>
									<div class="text-sm text-muted-foreground">{lastEdited}</div>
								</div>
								<div class="grid gap-2">
									<Label>Description</Label>
									<Input
										placeholder="Short description"
										bind:value={description}
										disabled={isReadOnly}
									/>
								</div>
								<div class="grid gap-2">
									<Label>Tags</Label>
									<div class="flex flex-wrap items-center gap-2">
										{#each tags as tag (tag)}
											<Badge variant="secondary">
												{tag}
												<Button
													variant="ghost"
													size="sm"
													class="h-6 px-2 text-destructive hover:text-destructive"
													onclick={() => removeTag(tag)}
													disabled={isReadOnly}
												>
													Remove
												</Button>
											</Badge>
										{/each}
									</div>
									<Select.Root
										type="multiple"
										disabled={isReadOnly}
										bind:value={tags}
									>
										<Select.Trigger class="w-40">Add tag</Select.Trigger>
										<Select.Content>
											{#each tagOptions as option (option)}
												<Select.Item value={option} label={option}>
													{option}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
								<div class="grid gap-2">
									<Label>Linked artifacts</Label>
									<div class="flex flex-wrap items-center gap-2">
										{#each linkedArtifacts as item (item)}
											<Badge variant="outline">
												{item}
												<Button
													variant="ghost"
													size="sm"
													class="h-6 px-2 text-destructive hover:text-destructive"
													onclick={() => removeLinkedArtifact(item)}
													disabled={isReadOnly}
												>
													Remove
												</Button>
											</Badge>
										{/each}
									</div>
									<Select.Root
										type="multiple"
										disabled={isReadOnly}
										bind:value={linkedArtifacts}
									>
										<Select.Trigger class="w-52">Link artifact</Select.Trigger>
										<Select.Content>
											{#each linkedArtifactOptions as option (option)}
												<Select.Item value={option} label={option}>
													{option}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							</div>
						</Popover.Content>
					</Popover.Root>
					{#if status === "Archived"}
						<Dialog.Root bind:open={unarchiveDialogOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })}>
								Unarchive
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Unarchive this page?</Dialog.Title>
									<Dialog.Description>
										This will make the page editable again.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants()}
										onclick={() => {
											status = "Draft";
										}}
									>
										Unarchive
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					{:else}
						<Dialog.Root bind:open={archiveDialogOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })}>
								Archive
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Archive this page?</Dialog.Title>
									<Dialog.Description>
										Archived pages are read-only and hidden from the default list.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close
										class={buttonVariants()}
										onclick={() => {
											status = "Archived";
										}}
									>
										Archive
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					{/if}
					<Dialog.Root bind:open={deleteDialogOpen}>
						<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })}>
							Delete
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Delete this page?</Dialog.Title>
								<Dialog.Description>
									This will permanently remove the page. This action cannot be undone.
								</Dialog.Description>
							</Dialog.Header>
							<Dialog.Footer>
								<Dialog.Close class={buttonVariants({ variant: "outline" })}>
									Cancel
								</Dialog.Close>
								<Dialog.Close class={buttonVariants()} onclick={() => {}}>
									Delete
								</Dialog.Close>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
				</div>
				<div class="flex items-center gap-3">
					<Button
						variant="outline"
						size="sm"
						onclick={() => (readOnlyView = !readOnlyView)}
					>
						{readOnlyView ? "Editable view" : "Read-only view"}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => (fullWidth = !fullWidth)}
					>
						{fullWidth ? "Standard width" : "Full width"}
					</Button>
					<div class="flex flex-col items-end text-xs text-muted-foreground leading-tight min-h-6">
						{#if saveIndicator === "edited"}
							<span class="text-amber-600">Edited</span>
						{:else if saveIndicator === "saving"}
							<span class="text-blue-600">Saving...</span>
						{:else if saveIndicator === "saved"}
							<span class="text-emerald-600">Saved</span>
						{/if}
					</div>
					<Button
						size="sm"
						onclick={triggerSave}
						disabled={savePhase === "saving" || !isDirty}
					>
						{savePhase === "saving" ? "Saving..." : "Save changes"}
					</Button>
				</div>
			</div>
		</div>

		<Separator class="mt-2 px-2"></Separator>

		<div class="py-2 w-full flex flex-col gap-4">
			<section class="flex flex-col gap-3 py-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Page Content</span>
					<Separator></Separator>
				</div>
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex flex-wrap items-center gap-2">
						{#each views as view (view.id)}
							<Button
								variant={activeViewId === view.id ? "default" : "outline"}
								size="sm"
								onclick={() => selectView(view)}
							>
								{view.name}
							</Button>
						{/each}
						<Dialog.Root bind:open={addViewOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })}>
								+ Add view
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Add a view</Dialog.Title>
									<Dialog.Description>
										Create a Notion-style view for this page.
									</Dialog.Description>
								</Dialog.Header>
								<div class="grid gap-3">
									<div class="grid gap-2">
										<Label for="view-name">View name</Label>
										<Input id="view-name" bind:value={newViewName} placeholder="New view" />
									</div>
									<div class="grid gap-2">
										<Label for="view-type">View type</Label>
										<Select.Root type="single" bind:value={newViewType}>
											<Select.Trigger id="view-type">Select type</Select.Trigger>
											<Select.Content>
												<Select.Item value="Document" label="Document">Document</Select.Item>
												<Select.Item value="Table" label="Table">Table</Select.Item>
												<Select.Item value="Board" label="Board">Board</Select.Item>
												<Select.Item value="List" label="List">List</Select.Item>
												<Select.Item value="Calendar" label="Calendar">Calendar</Select.Item>
												<Select.Item value="Gallery" label="Gallery">Gallery</Select.Item>
												<Select.Item value="Timeline" label="Timeline">Timeline</Select.Item>
											</Select.Content>
										</Select.Root>
									</div>
								</div>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Button class={buttonVariants()} onclick={addView} disabled={!newViewName.trim()}>
										Add view
									</Button>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					</div>
					<div class="flex items-center gap-2">
						{#if activeView?.type === "Document"}
							<Button
								variant="outline"
								size="sm"
								disabled={isReadOnly}
								onclick={() => (blockDialogOpen = true)}
							>
								<Plus class="mr-2 h-4 w-4" />
								Add block
							</Button>
						{:else if activeView?.type === "Table"}
							<Button variant="outline" size="sm" disabled={isReadOnly} onclick={addColumn}>
								+ Column
							</Button>
							<Button variant="outline" size="sm" disabled={isReadOnly} onclick={addRow}>
								+ Row
							</Button>
						{:else}
							<Button variant="outline" size="sm" disabled={isReadOnly} onclick={openNewItemDialog}>
								+ New
							</Button>
						{/if}
					</div>
				</div>
				{#if activeView?.type === "Document"}
					<div class="flex flex-col border rounded-md p-2">
						<Input
							bind:value={docHeading}
							placeholder="Untitled"
							disabled={isReadOnly}
							class="text-4xl font-semibold border-none shadow-none px-2"
						/>
						<Textarea
							bind:value={docBody}
							placeholder="Start writing..."
							disabled={isReadOnly}
							class="min-h-56 border-none shadow-none px-2"
						/>
					</div>
				{:else if activeView?.type === "Table"}
					<div class="flex flex-col gap-3">
						<div class="text-sm text-muted-foreground">
							Use a lightweight database table for structured notes.
						</div>
						<div class="rounded-lg border border-border">
							<Table>
								<TableHeader>
									<TableRow>
										{#each tableColumns as column (column.id)}
											<TableHead class="min-w-45">
												<DropdownMenu.Root>
													<DropdownMenu.Trigger
														class="flex items-center gap-2 text-sm font-medium hover:text-foreground"
													>
														<span>{column.name}</span>
														<ChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
													</DropdownMenu.Trigger>
													<DropdownMenu.Content align="start">
														<DropdownMenu.Item onselect={() => openRenameColumn(column)}>
															Rename
														</DropdownMenu.Item>
														<DropdownMenu.Item
															class="text-destructive"
															onselect={() => removeColumn(column.id)}
															disabled={isReadOnly || tableColumns.length <= 1}
														>
															Delete column
														</DropdownMenu.Item>
													</DropdownMenu.Content>
												</DropdownMenu.Root>
											</TableHead>
										{/each}
										<TableHead class="w-12"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each tableRows as row (row.id)}
										<TableRow class="group">
											{#each tableColumns as column (column.id)}
												<TableCell>
													<Input
														class="h-8"
														value={row.cells[column.id]}
														disabled={isReadOnly}
														oninput={(event) =>
															updateCell(row.id, column.id, event.currentTarget.value)}
													/>
												</TableCell>
											{/each}
											<TableCell class="text-right">
												<DropdownMenu.Root>
													<DropdownMenu.Trigger
														class={`${buttonVariants({ variant: "ghost", size: "icon" })} opacity-0 group-hover:opacity-100 transition`}
													>
														<MoreHorizontal class="h-4 w-4" />
													</DropdownMenu.Trigger>
													<DropdownMenu.Content align="end">
														<DropdownMenu.Item
															class="text-destructive"
															onselect={() => removeRow(row.id)}
															disabled={isReadOnly || tableRows.length <= 1}
														>
															Delete row
														</DropdownMenu.Item>
													</DropdownMenu.Content>
												</DropdownMenu.Root>
											</TableCell>
										</TableRow>
									{/each}
								</TableBody>
							</Table>
						</div>
					</div>
				{:else if activeView?.type === "Board"}
					<div class="grid gap-3 md:grid-cols-3">
					{#each ["Backlog", "In progress", "Done"] as lane (lane)}
							<div class="rounded-lg border border-border p-3">
								<div class="text-sm font-medium">{lane}</div>
								<div class="mt-3 flex flex-col gap-2">
									{#each databaseItems.filter((item) => item.status === lane) as item (item.id)}
										<div class="rounded-md border border-border px-3 py-2">
											<div class="text-sm font-medium">{item.title}</div>
											<div class="text-xs text-muted-foreground">{item.tag}</div>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{:else if activeView?.type === "List"}
					<div class="flex flex-col gap-2">
						{#each databaseItems as item (item.id)}
							<div class="flex items-center justify-between rounded-lg border border-border px-3 py-2">
								<div>
									<div class="text-sm font-medium">{item.title}</div>
									<div class="text-xs text-muted-foreground">{item.tag}</div>
								</div>
								<Badge variant="secondary">{item.status}</Badge>
							</div>
						{/each}
					</div>
				{:else if activeView?.type === "Calendar"}
					<div class="grid gap-2 md:grid-cols-3">
						{#each databaseItems as item (item.id)}
							<div class="rounded-lg border border-border p-3">
								<div class="text-xs text-muted-foreground">{item.date}</div>
								<div class="mt-2 text-sm font-medium">{item.title}</div>
								<div class="text-xs text-muted-foreground">{item.status}</div>
							</div>
						{/each}
					</div>
				{:else if activeView?.type === "Gallery"}
					<div class="grid gap-3 md:grid-cols-3">
						{#each databaseItems as item (item.id)}
							<button
								type="button"
								class="rounded-lg border border-border p-4 text-left hover:bg-muted/40"
								onclick={() => openGalleryItem(item.id)}
							>
								<div class="text-xs text-muted-foreground">{item.tag}</div>
								<div class="mt-2 text-base font-semibold">{item.title}</div>
								<div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
									<div class="flex items-center gap-2">
										<Avatar.Root class="h-5 w-5">
											<Avatar.Fallback class="text-[10px]">
												{item.owner
													.split(" ")
													.map((part) => part[0])
													.join("")
													.slice(0, 2)}
											</Avatar.Fallback>
										</Avatar.Root>
										<span>{item.owner}</span>
									</div>
									<span>-</span>
									<span>{item.date}</span>
								</div>
							</button>
						{/each}
					</div>
				{:else if activeView?.type === "Timeline"}
					<div class="flex flex-col gap-3">
						{#each databaseItems as item (item.id)}
							<div class="flex items-start gap-3">
								<div class="text-xs text-muted-foreground w-24">{item.date}</div>
								<div class="flex-1 rounded-lg border border-border px-3 py-2">
									<div class="text-sm font-medium">{item.title}</div>
									<div class="text-xs text-muted-foreground">{item.status}</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<section class="flex flex-col gap-3 py-4 w-full bg-white rounded-lg">
				<div class="flex flex-row gap-2 items-center w-full">
					<span class="font-medium text-nowrap">Discussion</span>
					<Separator></Separator>
				</div>
				<div class="flex flex-col gap-3">
					{#each discussion as message (message.id)}
						<div class={`flex ${message.author === owner ? "justify-end" : "justify-start"}`}>
							<div class="max-w-[70%] rounded-2xl border border-border px-3 py-2 text-sm">
								<div class="flex items-center gap-2 text-xs text-muted-foreground">
									<Avatar.Root class="h-5 w-5">
										<Avatar.Fallback class="text-[10px]">
											{message.author
												.split(" ")
												.map((part) => part[0])
												.join("")
												.slice(0, 2)}
										</Avatar.Fallback>
									</Avatar.Root>
									<span>{message.author}</span>
								</div>
								<div>{message.message}</div>
								<div class="text-[10px] text-muted-foreground text-right">{message.time}</div>
							</div>
						</div>
					{/each}
				</div>
				<div class="flex items-center gap-2">
					<Input
						placeholder="Write a reply..."
						bind:value={newMessage}
						disabled={isReadOnly}
					/>
					<Button size="sm" disabled={isReadOnly} onclick={sendMessage}>
						Send
					</Button>
				</div>
			</section>
		</div>
	</div>
</div>

<Dialog.Root bind:open={blockDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add a block</Dialog.Title>
			<Dialog.Description>
				Choose a block type to insert into this page.
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-2">
			{#each blockOptions as option (option.type)}
				<button
					type="button"
					class="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm"
					onclick={() => addBlock(option.type)}
				>
					<span>{option.label}</span>
					<Plus class="h-4 w-4 text-muted-foreground" />
				</button>
			{/each}
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>
				Cancel
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={newItemOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add item</Dialog.Title>
			<Dialog.Description>Provide the details for this view entry.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-3">
			<div class="grid gap-2">
				<Label for="item-title">Title</Label>
				<Input id="item-title" bind:value={newItemTitle} />
			</div>
			<div class="grid gap-2">
				<Label for="item-status">Status</Label>
				<Select.Root type="single" bind:value={newItemStatus}>
					<Select.Trigger id="item-status">{newItemStatus}</Select.Trigger>
					<Select.Content>
						<Select.Item value="Backlog" label="Backlog">Backlog</Select.Item>
						<Select.Item value="In progress" label="In progress">In progress</Select.Item>
						<Select.Item value="Done" label="Done">Done</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="grid gap-2">
				<Label for="item-date">Date</Label>
				<Input id="item-date" type="date" bind:value={newItemDate} />
			</div>
			<div class="grid gap-2">
				<Label for="item-owner">Owner</Label>
				<Input id="item-owner" bind:value={newItemOwner} />
			</div>
			<div class="grid gap-2">
				<Label for="item-tag">Tag</Label>
				<Input id="item-tag" bind:value={newItemTag} />
			</div>
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Button class={buttonVariants()} onclick={confirmNewItem} disabled={!newItemTitle.trim()}>
				Add item
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={galleryOpen}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>{activeGalleryItem?.title || "Page"}</Dialog.Title>
			<Dialog.Description>Gallery item document</Dialog.Description>
		</Dialog.Header>
		{#if activeGalleryItem}
			<div class="grid gap-3">
				<Input
					bind:value={activeGalleryItem.docHeading}
					disabled={isReadOnly}
					oninput={(event) =>
						updateDatabaseItem(activeGalleryItem.id, {
							docHeading: event.currentTarget.value,
						})}
					class="text-xl font-semibold"
				/>
				<Textarea
					bind:value={activeGalleryItem.docBody}
					disabled={isReadOnly}
					oninput={(event) =>
						updateDatabaseItem(activeGalleryItem.id, {
							docBody: event.currentTarget.value,
						})}
					class="min-h-40"
				/>
			</div>
		{/if}
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Close</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={viewWarningOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>View not compatible</Dialog.Title>
			<Dialog.Description>{viewWarningMessage}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Close</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={renameColumnOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Rename column</Dialog.Title>
			<Dialog.Description>Update the column label.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-2">
			<Label for="rename-column">Column name</Label>
			<Input id="rename-column" bind:value={renameColumnValue} />
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Button class={buttonVariants()} onclick={confirmRenameColumn} disabled={!renameColumnValue.trim()}>
				Save
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>


