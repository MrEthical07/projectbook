<script lang="ts">
	import * as Avatar from "$lib/components/ui/avatar";
	import * as Badge from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { Switch } from "$lib/components/ui/switch";
	import { Textarea } from "$lib/components/ui/textarea";
	import { updateAccountSettings } from "$lib/remote/workspace.remote";
	import { onMount } from "svelte";
	import { LogOut, Shield, Trash2, UserCircle2 } from "@lucide/svelte";

	type ThemeMode = "Light" | "Dark" | "System";
	type Density = "Comfortable" | "Compact";
	type Landing = "Last Project" | "Project Selector";
	type TimeFormat = "12-hour" | "24-hour";

	type Session = {
		id: string;
		device: string;
		location: string;
		lastActive: string;
		current: boolean;
	};

	let { data } = $props();
	const actorId = $derived(data.userId);
	const initialAccount = () => data.account;
	const required = <T>(value: T | null | undefined, field: string): T => {
		if (value === undefined || value === null) {
			throw new Error(`Account data is missing '${field}'.`);
		}
		return value;
	};
	let displayName = $state(required(initialAccount().displayName, "displayName"));
	let handle = $state(required(initialAccount().handle, "handle"));
	let email = $state(required(initialAccount().email, "email"));
	let accountStatus = $state(required(initialAccount().accountStatus, "accountStatus"));
	let bio = $state(required(initialAccount().bio, "bio"));

	let theme = $state<ThemeMode>(required(initialAccount().theme as ThemeMode, "theme"));
	let density = $state<Density>(required(initialAccount().density as Density, "density"));
	let landing = $state<Landing>(required(initialAccount().landing as Landing, "landing"));
	let timeFormat = $state<TimeFormat>(required(initialAccount().timeFormat as TimeFormat, "timeFormat"));

	let inAppNotifications = $state(required(initialAccount().inAppNotifications, "inAppNotifications"));
	let emailNotifications = $state(required(initialAccount().emailNotifications, "emailNotifications"));

	let sessions = $state<Session[]>(structuredClone(initialAccount().sessions) as Session[]);

	let savePhase = $state<"idle" | "saving" | "saved">("idle");
	let savedSignature = $state("");
	let savedBadgeTimer: ReturnType<typeof setTimeout> | null = null;
	let actionError = $state("");

	let passwordDialogOpen = $state(false);
	let deleteOpen = $state(false);
	let photoDialogOpen = $state(false);

	let currentPassword = $state("");
	let newPassword = $state("");
	let confirmPassword = $state("");
	let deleteConfirm = $state("");

	const themeOptions: ThemeMode[] = ["Light", "Dark", "System"];
	const densityOptions: Density[] = ["Comfortable", "Compact"];
	const landingOptions: Landing[] = ["Last Project", "Project Selector"];
	const timeFormatOptions: TimeFormat[] = ["12-hour", "24-hour"];

	const deletePhrase = $derived("DELETE MY ACCOUNT");
	const canConfirmDelete = $derived(deleteConfirm === deletePhrase);

	const currentSignature = $derived(
		JSON.stringify({
			displayName,
			email,
			bio,
			theme,
			density,
			landing,
			timeFormat,
			inAppNotifications,
			emailNotifications,
		})
	);
	const isDirty = $derived(currentSignature !== savedSignature);
	const saveIndicator = $derived.by(() => {
		if (savePhase === "saving") return "saving";
		if (isDirty) return "edited";
		if (savePhase === "saved") return "saved";
		return "idle";
	});

	const triggerSave = async () => {
		if (savePhase === "saving" || !isDirty) return;
		actionError = "";
		if (!actorId) {
			actionError = "Active user id is missing.";
			return;
		}
		if (savedBadgeTimer) clearTimeout(savedBadgeTimer);
		savePhase = "saving";
		const result = await updateAccountSettings({
			actorId,
			settings: {
				displayName: displayName.trim(),
				bio: bio.trim(),
				theme,
				density,
				landing,
				timeFormat,
				inAppNotifications,
				emailNotifications
			}
		});

		if (!result.success) {
			actionError = result.error;
			savePhase = "idle";
			return;
		}

		displayName = displayName.trim();
		bio = bio.trim();
		savedSignature = currentSignature;
		savePhase = "saved";
		savedBadgeTimer = setTimeout(() => {
			if (!isDirty) savePhase = "idle";
		}, 1400);
	};

	onMount(() => {
		savedSignature = currentSignature;
	});
</script>

<svelte:head>
	<title>Account Settings • ProjectBook</title>
	<meta
		name="description"
		content="Manage your profile, preferences, sessions, and notification settings."
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
						<Breadcrumb.Page>Account Settings</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<div class="flex flex-col gap-5 py-2 md:px-20">
		<div class="flex flex-col gap-2 rounded-lg bg-white p-2">
			<div class="px-3 text-xs uppercase tracking-wide text-muted-foreground">
				User account · Personal settings
			</div>
			<div class="flex flex-wrap items-center justify-between gap-3 px-3">
				<div class="flex flex-wrap items-center gap-3">
					<Avatar.Root class="h-10 w-10">
						<Avatar.Fallback>AP</Avatar.Fallback>
					</Avatar.Root>
					<div class="flex flex-col">
						<h1 class="text-3xl font-semibold">Account Settings</h1>
						<div class="text-sm text-muted-foreground">{displayName}</div>
					</div>
					<Badge.Badge variant="outline">{accountStatus}</Badge.Badge>
				</div>
				<div class="flex items-center gap-2">
					<div class="flex flex-col items-end text-xs text-muted-foreground leading-tight min-h-6">
						{#if saveIndicator === "edited"}
							<span class="text-amber-600">Edited</span>
						{:else if saveIndicator === "saving"}
							<span class="text-blue-600">Saving...</span>
						{:else if saveIndicator === "saved"}
							<span class="text-emerald-600">Saved</span>
						{/if}
					</div>
					<Button size="sm" onclick={triggerSave} disabled={!isDirty || savePhase === "saving"}>
						{savePhase === "saving" ? "Saving..." : "Save changes"}
					</Button>
				</div>
			</div>
			{#if actionError}
				<div class="px-3 text-xs text-destructive">{actionError}</div>
			{/if}
		</div>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Profile Information</div>
			<div class="grid gap-4 md:grid-cols-2">
				<div class="grid gap-2">
					<Label>Display name</Label>
					<Input bind:value={displayName} />
				</div>
				<div class="grid gap-2">
					<Label>Username</Label>
					<Input value={handle} disabled />
				</div>
				<div class="grid gap-2">
					<Label>Email address</Label>
					<Input value={email} disabled />
				</div>
				<div class="grid gap-2">
					<Label>Profile photo</Label>
					<Button
						variant="outline"
						class="justify-start gap-2"
						onclick={() => (photoDialogOpen = true)}
					>
						<UserCircle2 class="h-4 w-4" />
						Upload photo
					</Button>
				</div>
				<div class="grid gap-2 md:col-span-2">
					<Label>About</Label>
					<Textarea rows={3} bind:value={bio} />
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Account & Authentication</div>
			<div class="grid gap-3 md:grid-cols-2">
				<div class="rounded-md border border-border p-3">
					<div class="flex items-center justify-between gap-2">
						<div>
							<div class="text-sm font-medium">Primary email</div>
							<div class="text-xs text-muted-foreground">{email}</div>
						</div>
						<Badge.Badge variant="outline">Verified</Badge.Badge>
					</div>
				</div>
				<div class="rounded-md border border-border p-3">
					<div class="flex items-center justify-between gap-2">
						<div>
							<div class="text-sm font-medium">Password</div>
							<div class="text-xs text-muted-foreground">Last updated 3 months ago.</div>
						</div>
						<Button size="sm" variant="outline" onclick={() => (passwordDialogOpen = true)}>
							Change
						</Button>
					</div>
				</div>
				<div class="rounded-md border border-border p-3 md:col-span-2">
					<div class="text-sm font-medium">Authentication methods</div>
					<div class="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
						<span class="rounded-full border border-border px-2 py-1">Password</span>
						<span class="rounded-full border border-border px-2 py-1">OAuth · Google</span>
					</div>
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Notification Preferences</div>
			<div class="grid gap-3 md:grid-cols-2">
				<div class="flex items-center justify-between gap-2 rounded-md border border-border p-3">
					<div>
						<div class="text-sm font-medium">Email notifications</div>
						<div class="text-xs text-muted-foreground">Send alerts to your inbox.</div>
					</div>
					<Switch bind:checked={emailNotifications} />
				</div>
				<div class="flex items-center justify-between gap-2 rounded-md border border-border p-3">
					<div>
						<div class="text-sm font-medium">In-app notifications</div>
						<div class="text-xs text-muted-foreground">Show alerts inside the app.</div>
					</div>
					<Switch bind:checked={inAppNotifications} />
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Interface Preferences</div>
			<div class="grid gap-4 md:grid-cols-2">
				<div class="grid gap-2">
					<Label>Theme</Label>
					<Select.Root type="single" bind:value={theme}>
						<Select.Trigger>{theme}</Select.Trigger>
						<Select.Content>
							{#each themeOptions as option (option)}
								<Select.Item value={option} label={option}>{option}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label>Density</Label>
					<Select.Root type="single" bind:value={density}>
						<Select.Trigger>{density}</Select.Trigger>
						<Select.Content>
							{#each densityOptions as option (option)}
								<Select.Item value={option} label={option}>{option}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label>Default landing page</Label>
					<Select.Root type="single" bind:value={landing}>
						<Select.Trigger>{landing}</Select.Trigger>
						<Select.Content>
							{#each landingOptions as option (option)}
								<Select.Item value={option} label={option}>{option}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label>Time format</Label>
					<Select.Root type="single" bind:value={timeFormat}>
						<Select.Trigger>{timeFormat}</Select.Trigger>
						<Select.Content>
							{#each timeFormatOptions as option (option)}
								<Select.Item value={option} label={option}>{option}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</section>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Security & Sessions</div>
			<div class="grid gap-3">
				{#each sessions as session (session.id)}
					<div class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
						<div class="flex items-center gap-2">
							<Avatar.Root class="h-8 w-8">
								<Avatar.Fallback class="text-[10px]">AP</Avatar.Fallback>
							</Avatar.Root>
							<div>
								<div class="text-sm font-medium">{session.device}</div>
								<div class="text-xs text-muted-foreground">
									{session.location} · {session.lastActive}
								</div>
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							disabled={session.current}
							class="gap-2"
						>
							<LogOut class="h-4 w-4" />
							Log out
						</Button>
					</div>
				{/each}
			</div>
			<div>
				<Button variant="outline" class="gap-2">
					<Shield class="h-4 w-4" />
					Log out of all sessions
				</Button>
			</div>
		</section>

		<section class="flex flex-col gap-4 rounded-lg bg-white p-4">
			<div class="text-sm font-medium">Data & Account Lifecycle</div>
			<div class="grid gap-3 md:grid-cols-2">
				<div class="rounded-md border border-border p-3">
					<div class="text-sm font-medium">Export personal data</div>
					<div class="text-xs text-muted-foreground">
						Download a read-only snapshot of your account data.
					</div>
					<Button class="mt-3" size="sm" variant="outline">
						Export data
					</Button>
				</div>
				<div class="rounded-md border border-border p-3 md:col-span-2">
					<div class="text-sm font-medium">Delete account</div>
					<div class="text-xs text-muted-foreground">
						Permanently remove your account and revoke access to all projects.
					</div>
					<Button
						class="mt-3"
						size="sm"
						variant="destructive"
						onclick={() => (deleteOpen = true)}
					>
						Delete account
					</Button>
				</div>
			</div>
		</section>
	</div>
</div>

<Dialog.Root bind:open={photoDialogOpen} onOpenChange={(open) => open || (photoDialogOpen = false)}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Upload profile photo</Dialog.Title>
			<Dialog.Description>
				Choose a square image. Updates appear across your account.
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-3 py-2">
			<div class="grid gap-2">
				<Label>Photo file</Label>
				<Input type="file" accept="image/*" />
			</div>
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Dialog.Close class={buttonVariants()}>Upload</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root
	bind:open={passwordDialogOpen}
	onOpenChange={(open) => {
		if (open) {
			currentPassword = "";
			newPassword = "";
			confirmPassword = "";
		}
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Change password</Dialog.Title>
			<Dialog.Description>Use a strong password to protect your account.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-3 py-2">
			<div class="grid gap-2">
				<Label>Current password</Label>
				<Input type="password" bind:value={currentPassword} />
			</div>
			<div class="grid gap-2">
				<Label>New password</Label>
				<Input type="password" bind:value={newPassword} />
			</div>
			<div class="grid gap-2">
				<Label>Confirm new password</Label>
				<Input type="password" bind:value={confirmPassword} />
			</div>
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Dialog.Close class={buttonVariants()}>
				Update password
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteOpen} onOpenChange={(open) => open && (deleteConfirm = "")}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete your account permanently?</Dialog.Title>
			<Dialog.Description>
				This action is irreversible. Type the phrase below exactly to continue.
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-3 py-2">
			<div class="rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
				{deletePhrase}
			</div>
			<div class="grid gap-2">
				<Label>Confirmation phrase</Label>
				<Input bind:value={deleteConfirm} placeholder={deletePhrase} />
			</div>
		</div>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
			<Dialog.Close class={buttonVariants({ variant: "destructive" })} disabled={!canConfirmDelete}>
				Delete account
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
