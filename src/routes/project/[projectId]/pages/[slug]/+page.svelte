<script lang="ts">
	import { getContext, onDestroy } from "svelte";
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
	import { page } from "$app/state";
	import { updatePageEditor } from "$lib/remote/page.remote";
	import { can } from "$lib/utils/permission";

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

	let { data } = $props();
	const required = <T>(value: T | null | undefined, field: string): T => {
		if (value === undefined || value === null) {
			throw new Error(`Page payload is missing '${field}'.`);
		}
		return value;
	};
	const projectId = page.params.projectId;
	const pageId = page.params.slug;
	const access = getContext<ProjectAccess | undefined>("access");
	const permissions = access?.permissions;
	const canEditPage = can(permissions, "page", "edit");
	const defaultView: View = { id: "view-default", name: "Document", type: "Document" };
	let tagOptions = $derived.by(() => structuredClone(data.editor.tagOptions) as string[]);
	let linkedArtifactOptions = $derived.by(
		() => structuredClone(data.editor.linkedArtifactOptions) as string[]
	);

	let status = $state<PageStatus>("Draft");
	let title = $state("");
	let owner = $state("");
	let createdAt = $state("");
	let lastEdited = $state("");
	let description = $state("");
	let tags = $state<string[]>([]);
	let linkedArtifacts = $state<string[]>([]);
	let blockDialogOpen = $state(false);
	let archiveDialogOpen = $state(false);
	let unarchiveDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let readOnlyView = $state(false);
	let fullWidth = $state(false);
	let dragId = $state("");
	let views = $state<View[]>([defaultView]);
	let activeViewId = $state(defaultView.id);
	let addViewOpen = $state(false);
	let newViewName = $state("");
	let newViewType = $state<PageContentType>("Table");
	let viewWarningOpen = $state(false);
	let viewWarningMessage = $state("");
	let renameColumnOpen = $state(false);
	let renameColumnId = $state("");
	let renameColumnValue = $state("");

	let docHeading = $state("");
	let docBody = $state("");
	let blocks = $state<PageBlock[]>([]);
	let tableColumns = $state<TableColumn[]>([]);
	let tableRows = $state<TableRow[]>([]);
	let databaseItems = $state<DatabaseItem[]>([]);

	type SavePhase = "idle" | "saving" | "saved";
	let savePhase = $state<SavePhase>("idle");
	let savedSignature = $state("");
	let saveReady = $state(false);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;

	let currentSignature = $derived(
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

	let isDirty = $derived(saveReady && currentSignature !== savedSignature);
	let isReadOnly = $derived(status === "Archived" || readOnlyView || !canEditPage);
	let activeView = $derived.by(() => {
		const resolvedView = views.find((view) => view.id === activeViewId);
		if (!resolvedView) {
			throw new Error(`Active page view '${activeViewId}' was not found.`);
		}
		return resolvedView;
	});
	let isDatabaseView = $derived(activeView?.type !== "Document");
	let saveIndicator = $derived.by(() => {
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
		const nextValue = renameColumnValue.trim();
		if (!nextValue) {
			return;
		}
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

	let activeGalleryItem = $derived(
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

	const triggerSave = async () => {
		if (!permissions || !canEditPage) return;
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
		const result = await updatePageEditor({
			input: {
				projectId,
				pageId,
				state: {
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
					databaseItems
				}
			},
			permissions
		});
		if (!result.success) {
			savePhase = "idle";
			return;
		}
		lastEdited = new Date().toISOString().slice(0, 10);
		savedSignature = currentSignature;
		savePhase = "saved";
		savedBadgeTimer = setTimeout(() => {
			if (!isDirty) {
				savePhase = "idle";
			}
		}, 1400);
	};

	onDestroy(() => {
		if (saveTimer) {
			clearTimeout(saveTimer);
		}

		if (savedBadgeTimer) {
			clearTimeout(savedBadgeTimer);
		}
	});

	$effect(() => {
		const editor = data.editor;
		if (!Array.isArray(editor.tags)) {
			throw new Error("Page payload is missing 'editor.tags'.");
		}
		if (!Array.isArray(editor.linkedArtifacts)) {
			throw new Error("Page payload is missing 'editor.linkedArtifacts'.");
		}
		if (!Array.isArray(editor.defaultViews)) {
			throw new Error("Page payload is missing 'editor.defaultViews'.");
		}
		if (!Array.isArray(editor.tableColumns)) {
			throw new Error("Page payload is missing 'editor.tableColumns'.");
		}
		if (!Array.isArray(editor.tableRows)) {
			throw new Error("Page payload is missing 'editor.tableRows'.");
		}

		const nextStatus = editor.defaultValues.status as PageStatus;
		const nextTitle = required(editor.defaultValues.title, "editor.defaultValues.title");
		const nextOwner = required(editor.defaultValues.owner, "editor.defaultValues.owner");
		const nextCreatedAt = required(
			editor.defaultValues.createdAt,
			"editor.defaultValues.createdAt"
		);
		const nextLastEdited = required(
			editor.defaultValues.lastEdited,
			"editor.defaultValues.lastEdited"
		);
		const nextDescription = required(
			editor.defaultValues.description,
			"editor.defaultValues.description"
		);
		const nextTags = structuredClone(editor.tags) as string[];
		const nextLinkedArtifacts = structuredClone(editor.linkedArtifacts) as string[];
		const nextViews = structuredClone(editor.defaultViews) as View[];
		const normalizedViews = nextViews.length > 0 ? nextViews : [defaultView];
		const requestedViewId = required(editor.activeViewId, "editor.activeViewId");
		const resolvedViewId = normalizedViews.some((view) => view.id === requestedViewId)
			? requestedViewId
			: normalizedViews[0].id;
		const nextDocHeading = required(editor.docHeading, "editor.docHeading");
		const nextDocBody = required(editor.docBody, "editor.docBody");
		const nextTableColumns = structuredClone(editor.tableColumns) as TableColumn[];
		const nextTableRows = structuredClone(editor.tableRows) as TableRow[];
		const nextDatabaseItems = Array.isArray(editor.databaseItems)
			? (structuredClone(editor.databaseItems) as DatabaseItem[])
			: [];

		status = nextStatus;
		title = nextTitle;
		owner = nextOwner;
		createdAt = nextCreatedAt;
		lastEdited = nextLastEdited;
		description = nextDescription;
		tags = nextTags;
		linkedArtifacts = nextLinkedArtifacts;
		blockDialogOpen = false;
		archiveDialogOpen = false;
		unarchiveDialogOpen = false;
		deleteDialogOpen = false;
		readOnlyView = false;
		dragId = "";
		views = normalizedViews;
		activeViewId = resolvedViewId;
		addViewOpen = false;
		newViewName = "";
		newViewType = "Table";
		viewWarningOpen = false;
		viewWarningMessage = "";
		renameColumnOpen = false;
		renameColumnId = "";
		renameColumnValue = "";
		docHeading = nextDocHeading;
		docBody = nextDocBody;
		blocks = [];
		tableColumns = nextTableColumns;
		tableRows = nextTableRows;
		databaseItems = nextDatabaseItems;
		savePhase = "idle";
		savedSignature = JSON.stringify({
			status: nextStatus,
			title: nextTitle,
			owner: nextOwner,
			description: nextDescription,
			tags: nextTags,
			linkedArtifacts: nextLinkedArtifacts,
			docHeading: nextDocHeading,
			docBody: nextDocBody,
			views: normalizedViews,
			activeViewId: resolvedViewId,
			tableColumns: nextTableColumns,
			tableRows: nextTableRows,
			databaseItems: nextDatabaseItems,
		});
		saveReady = true;
	});
</script>

<svelte:head>
	<title>{title || "Page"} • Pages • ProjectBook</title>
	<meta
		name="description"
		content="Edit this project page and linked content blocks."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

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
						disabled={!canEditPage || savePhase === "saving" || !isDirty}
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
										<button
											type="button"
											class="rounded-md border border-border px-3 py-2 text-left hover:bg-muted/40"
											onclick={() => openGalleryItem(item.id)}
										>
											<div class="text-sm font-medium">{item.title}</div>
											<div class="text-xs text-muted-foreground">{item.tag}</div>
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{:else if activeView?.type === "List"}
					<div class="flex flex-col gap-2">
						{#each databaseItems as item (item.id)}
							<button
								type="button"
								class="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/40"
								onclick={() => openGalleryItem(item.id)}
							>
								<div>
									<div class="text-sm font-medium">{item.title}</div>
									<div class="text-xs text-muted-foreground">{item.tag}</div>
								</div>
								<Badge variant="secondary">{item.status}</Badge>
							</button>
						{/each}
					</div>
				{:else if activeView?.type === "Calendar"}
					<div class="grid gap-2 md:grid-cols-3">
						{#each databaseItems as item (item.id)}
							<button
								type="button"
								class="rounded-lg border border-border p-3 text-left hover:bg-muted/40"
								onclick={() => openGalleryItem(item.id)}
							>
								<div class="text-xs text-muted-foreground">{item.date}</div>
								<div class="mt-2 text-sm font-medium">{item.title}</div>
								<div class="text-xs text-muted-foreground">{item.status}</div>
							</button>
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
								<button
									type="button"
									class="flex-1 rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/40"
									onclick={() => openGalleryItem(item.id)}
								>
									<div class="text-sm font-medium">{item.title}</div>
									<div class="text-xs text-muted-foreground">{item.status}</div>
								</button>
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
				<div class="grid gap-2">
					<Label for="edit-item-title">Title</Label>
					<Input
						id="edit-item-title"
						bind:value={activeGalleryItem.title}
						disabled={isReadOnly}
						oninput={(event) => updateDatabaseItem(activeGalleryItem.id, { title: event.currentTarget.value })}
					/>
				</div>
				<div class="grid gap-2 md:grid-cols-2">
					<div class="grid gap-2">
						<Label for="edit-item-status">Status</Label>
						<Select.Root type="single" value={activeGalleryItem.status} onValueChange={(value) => updateDatabaseItem(activeGalleryItem.id, { status: value as DatabaseItem["status"] })}>
							<Select.Trigger id="edit-item-status">{activeGalleryItem.status}</Select.Trigger>
							<Select.Content>
								<Select.Item value="Backlog" label="Backlog">Backlog</Select.Item>
								<Select.Item value="In progress" label="In progress">In progress</Select.Item>
								<Select.Item value="Done" label="Done">Done</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="grid gap-2">
						<Label for="edit-item-date">Date</Label>
						<Input id="edit-item-date" type="date" value={activeGalleryItem.date} disabled={isReadOnly} oninput={(event) => updateDatabaseItem(activeGalleryItem.id, { date: event.currentTarget.value })} />
					</div>
				</div>
				<div class="grid gap-2 md:grid-cols-2">
					<div class="grid gap-2">
						<Label for="edit-item-owner">Owner</Label>
						<Input id="edit-item-owner" value={activeGalleryItem.owner} disabled={isReadOnly} oninput={(event) => updateDatabaseItem(activeGalleryItem.id, { owner: event.currentTarget.value })} />
					</div>
					<div class="grid gap-2">
						<Label for="edit-item-tag">Tag</Label>
						<Input id="edit-item-tag" value={activeGalleryItem.tag} disabled={isReadOnly} oninput={(event) => updateDatabaseItem(activeGalleryItem.id, { tag: event.currentTarget.value })} />
					</div>
				</div>
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


