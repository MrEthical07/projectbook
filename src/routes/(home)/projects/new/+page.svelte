<script lang="ts">
	import { goto } from "$app/navigation";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Textarea } from "$lib/components/ui/textarea";
	import {
		createProject,
		sendProjectInvites
	} from "$lib/remote/user-home.remote";
	import { defaultProjectIconKey } from "$lib/constants/project-icons";
	import { projectIconOptions } from "$lib/utils/project-icons";
	import { Check, MailPlus, Plus, Trash2 } from "@lucide/svelte";

	type Step = "details" | "invite";
	type SavePhase = "idle" | "saving" | "saved";

	let { data } = $props();
	const reference = () => data.reference;
	const existingProjects = structuredClone(reference().existingProjects) as string[];
	const existingUsers = structuredClone(reference().existingUsers) as string[];

	let step = $state<Step>("details");
	let projectName = $state("");
	let projectDescription = $state("");
	let nameError = $state("");
	let emailErrors = $state<string[]>([]);
	let inviteEmails = $state([""]);
	let createConfirmOpen = $state(false);
	let skipConfirmOpen = $state(false);
	let savePhase = $state<SavePhase>("idle");
	let actionError = $state("");
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;
	let createdProjectId = $state<string | null>(null);
	let selectedIcon = $state<ProjectIconKey>(defaultProjectIconKey);
	let iconSearch = $state("");

	let normalizedIconSearch = $derived(iconSearch.trim().toLowerCase());
	let filteredIconOptions = $derived.by(() => {
		if (!normalizedIconSearch) {
			return projectIconOptions;
		}
		return projectIconOptions.filter((option) => {
			return (
				option.label.toLowerCase().includes(normalizedIconSearch) ||
				option.key.toLowerCase().includes(normalizedIconSearch)
			);
		});
	});
	let selectedIconOption = $derived.by(() => {
		return (
			projectIconOptions.find((option) => option.key === selectedIcon) ??
			projectIconOptions[0]
		);
	});

	const maxNameLength = 60;
	const isNameValid = $derived(projectName.trim().length > 0);

	const normalizeName = (value: string) => value.trim().toLowerCase();
	const isUniqueName = (value: string) =>
		!existingProjects.some((name) => normalizeName(name) === normalizeName(value));

	const validateName = () => {
		nameError = "";
		const trimmed = projectName.trim();
		if (!trimmed) {
			nameError = "Project name is required.";
			return false;
		}
		if (trimmed.length > maxNameLength) {
			nameError = `Project name must be under ${maxNameLength} characters.`;
			return false;
		}
		if (!isUniqueName(trimmed)) {
			nameError = "You already have a project with this name.";
			return false;
		}
		return true;
	};

	const startSave = (onDone: () => void) => {
		if (saveTimer) clearTimeout(saveTimer);
		if (savedBadgeTimer) clearTimeout(savedBadgeTimer);
		savePhase = "saving";
		saveTimer = setTimeout(() => {
			savePhase = "saved";
			onDone();
			savedBadgeTimer = setTimeout(() => {
				savePhase = "idle";
			}, 1200);
		}, 900);
	};

	const createProjectAction = async () => {
		actionError = "";
		if (!validateName()) return;
		const trimmed = projectName.trim();
		const description = projectDescription.trim();
		const result = await createProject({ name: trimmed, description, icon: selectedIcon });
		if (!result.success) {
			actionError = result.error;
			return;
		}
		const created = result.data as { projectId: string };
		createdProjectId = created.projectId;
		projectName = trimmed;
		projectDescription = description;
		startSave(() => {
			step = "invite";
		});
	};

	const addInviteRow = () => {
		inviteEmails = [...inviteEmails, ""];
		emailErrors = [...emailErrors, ""];
	};

	const removeInviteRow = (index: number) => {
		inviteEmails = inviteEmails.filter((_, idx) => idx !== index);
		emailErrors = emailErrors.filter((_, idx) => idx !== index);
	};

	const validateEmails = () => {
		emailErrors = inviteEmails.map((email) => {
			const trimmed = email.trim();
			if (!trimmed) return "";
			const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
			if (!isValidFormat) return "Invalid email format.";
			if (!existingUsers.includes(trimmed)) return "User not found.";
			return "";
		});
		return emailErrors.every((err) => !err);
	};

	const sendInvites = async () => {
		actionError = "";
		if (!validateEmails() || !createdProjectId) return;
		const inviteList = inviteEmails
			.map((value) => value.trim().toLowerCase())
			.filter(Boolean)
			.map((email) => ({
				email,
				role: "Limited Access" as const
			}));

		if (!inviteList.length) {
			startSave(() => {});
			return;
		}

		const result = await sendProjectInvites({ projectId: createdProjectId, invites: inviteList });
		if (!result.success) {
			actionError = result.error;
			emailErrors = inviteEmails.map((email) => (email.trim() ? result.error : ""));
			return;
		}

		startSave(() => {});
	};

	const finishCreation = async () => {
		if (!createdProjectId) {
			await goto("/projects");
			return;
		}
		await goto(`/project/${createdProjectId}`);
	};
</script>

<svelte:head>
	<title>New Project • ProjectBook</title>
	<meta
		name="description"
		content="Create a new project and invite collaborators to get started."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<div class="flex flex-col gap-2 p-2 bg-white border rounded-lg">
	<header
		class="flex h-12 shrink-0 w-full items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex items-center gap-2 px-4 w-full">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page>Add Project</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-5 py-2 md:px-20">
		<div class="flex flex-col gap-2 rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
					Add project - Create a new project
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<h1 class="text-3xl font-semibold">Add Project</h1>
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					{#if savePhase === "saving"}
						<span class="text-blue-600">Saving...</span>
					{:else if savePhase === "saved"}
						<span class="text-emerald-600">Saved</span>
					{/if}
				</div>
			</div>
		</div>

		{#if step === "details"}
			<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
				<div class="text-sm font-medium">Project details</div>
				<div class="grid gap-4">
					<div class="grid gap-2">
						<Label>Project name</Label>
						<Input
							bind:value={projectName}
							maxlength={maxNameLength}
							onblur={validateName}
						/>
						<div class="text-xs text-muted-foreground">
							Unique per creator. Max {maxNameLength} characters.
						</div>
						{#if nameError}
							<div class="text-xs text-destructive">{nameError}</div>
						{/if}
						{#if actionError}
							<div class="text-xs text-destructive">{actionError}</div>
						{/if}
					</div>
					<div class="grid gap-2">
						<Label>Project icon</Label>
						<Select.Root type="single" bind:value={selectedIcon}>
							<Select.Trigger class="w-full">
								<div class="flex items-center gap-2">
									<selectedIconOption.icon class="h-4 w-4" />
									<span>{selectedIconOption.label}</span>
								</div>
							</Select.Trigger>
							<Select.Content class="max-w-100">
								<div
									class="sticky top-0 z-10 border-b bg-popover p-2"
								>
									<Input
										bind:value={iconSearch}
										placeholder="Search icons..."
										onpointerdown={(event) => event.stopPropagation()}
										onkeydown={(event) => event.stopPropagation()}
									/>
								</div>
								{#if filteredIconOptions.length === 0}
									<div class="px-3 py-2 text-xs text-muted-foreground">No icons found.</div>
								{:else}
									<div class="grid max-h-72 grid-cols-3 max-w-100 gap-2 overflow-y-auto p-2">
										{#each filteredIconOptions as option (option.key)}
											<Select.Item
												value={option.key}
												label={option.label}
												class="h-auto min-h-16 justify-center rounded-md border px-2 py-2 text-center "
											>
												<div class="flex w-full flex-col items-center gap-1">
													<option.icon class="h-4 w-4" />
													<span class="text-[10px] leading-tight">{option.label}</span>
												</div>
											</Select.Item>
										{/each}
									</div>
								{/if}
							</Select.Content>
						</Select.Root>
						<div class="text-xs text-muted-foreground">
							Shown in project switchers and sidebars.
						</div>
					</div>
					<div class="grid gap-2">
						<Label>Description (optional)</Label>
						<Textarea rows={4} bind:value={projectDescription} />
					</div>
				</div>
				<div class="flex items-center justify-end gap-2">
					<Dialog.Root bind:open={createConfirmOpen}>
						<Dialog.Trigger class={buttonVariants()} disabled={!isNameValid}>
							Create Project
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Create this project?</Dialog.Title>
								<Dialog.Description>
									The project will be created immediately and you can invite members next.
								</Dialog.Description>
							</Dialog.Header>
							<Dialog.Footer>
								<Dialog.Close class={buttonVariants({ variant: "outline" })}>
									Cancel
								</Dialog.Close>
								<Dialog.Close class={buttonVariants()} onclick={createProjectAction}>
									Create project
								</Dialog.Close>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
				</div>
			</section>
		{:else}
			<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
				<div class="flex flex-col gap-2">
					<div class="text-sm font-medium">Invite members</div>
					<div class="text-xs text-muted-foreground">
						Invite team members (optional). You can do this later from project settings.
					</div>
				</div>
				<div class="grid gap-3">
					{#each inviteEmails as email, index (index)}
						<div class="grid gap-2 md:grid-cols-[1fr_auto] md:items-start">
							<div class="grid gap-2">
								<Label>Email</Label>
								<Input bind:value={inviteEmails[index]} placeholder="name@company.com" />
								{#if emailErrors[index]}
									<div class="text-xs text-destructive">{emailErrors[index]}</div>
								{/if}
							</div>
							{#if inviteEmails.length > 1}
								<Button
									variant="ghost"
									size="sm"
									class="mt-6 text-destructive hover:text-destructive"
									onclick={() => removeInviteRow(index)}
								>
									<Trash2 class="mr-2 h-4 w-4" />
									Remove
								</Button>
							{/if}
						</div>
					{/each}
					<Button variant="outline" size="sm" class="w-fit" onclick={addInviteRow}>
						<Plus class="mr-2 h-4 w-4" />
						Add another email
					</Button>
				</div>
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						{#if savePhase === "saving"}
							<span class="text-blue-600">Saving...</span>
						{:else if savePhase === "saved"}
							<span class="text-emerald-600">Saved</span>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<Dialog.Root bind:open={skipConfirmOpen}>
							<Dialog.Trigger class={buttonVariants({ variant: "outline" })}>
								Skip
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>Skip invitations?</Dialog.Title>
									<Dialog.Description>
										You can invite team members later from project settings.
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close class={buttonVariants({ variant: "outline" })}>
										Cancel
									</Dialog.Close>
									<Dialog.Close class={buttonVariants()} onclick={finishCreation}>
										Finish
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
						<Button onclick={sendInvites}>
							<MailPlus class="mr-2 h-4 w-4" />
							Invite
						</Button>
					</div>
				</div>
				{#if actionError}
					<div class="text-xs text-destructive">{actionError}</div>
				{/if}
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<Check class="h-4 w-4 text-emerald-600" />
					<span>
						Invites are processed after project creation. Skipping keeps you as the sole member.
					</span>
				</div>
			</section>
		{/if}
	</div>
</div>
