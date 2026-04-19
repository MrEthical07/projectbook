<script lang="ts">
	import AppSidebar from "$lib/components/sidebar/app-sidebar.svelte";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as Card from "$lib/components/ui/card";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Popover from "$lib/components/ui/popover";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";
	import { Toaster } from "$lib/components/ui/sonner";
	import { submitGlobalFeedback, searchProject, type ProjectSearchResultItem } from "$lib/remote/project.remote";
	import { can } from "$lib/utils/permission";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { mode, setMode } from "mode-watcher";
	import { onMount } from "svelte";
	import {
		Moon,
		Sun,
		Search,
		Command,
		FileText,
		Book,
		Lightbulb,
		MessageSquare,
		ListChecks,
		Calendar,
		Wrench,
		CircleHelp
	} from "@lucide/svelte";
	import { setContext } from "svelte";
	import { toast } from "svelte-sonner";
	import type { LayoutProps } from "./$types";
	import type { ProjectNavigationData } from "$lib/remote/project-navigation.remote";
	import { Button } from "$lib/components/ui/button";

	type ProjectLayoutData = LayoutProps["data"] & {
		access: ProjectAccess;
		navigationData: ProjectNavigationData;
	};

	let { data, children }: LayoutProps = $props();
	let layoutData = $derived(data as ProjectLayoutData);
	const accessContext: ProjectAccess = {
		get user() {
			return layoutData.access.user;
		},
		get role() {
			return layoutData.access.role;
		},
		get permissionMask() {
			return layoutData.access.permissionMask;
		},
		get permissions() {
			return layoutData.access.permissions;
		}
	};
	setContext("access", accessContext);

	const resolveDomain = (pathname: string, projectId: string): PermissionDomain => {
		const marker = `/project/${projectId}/`;
		const scoped = pathname.startsWith(marker) ? pathname.slice(marker.length) : "";
		const segment = scoped.split("/")[0] ?? "";

		if (segment === "stories" || segment === "journeys") return "story";
		if (segment === "problem-statement") return "problem";
		if (segment === "ideas" || segment === "whiteboard") return "idea";
		if (segment === "tasks") return "task";
		if (segment === "feedback") return "feedback";
		if (segment === "resources") return "resource";
		if (segment === "pages") return "page";
		if (segment === "calendar") return "calendar";
		if (segment === "team") return "member";
		return "project";
	};

	const domainLabel = (domain: PermissionDomain): string => {
		if (domain === "member") return "Team";
		return domain.charAt(0).toUpperCase() + domain.slice(1);
	};

	let currentDomain = $derived(resolveDomain(page.url.pathname, page.params.projectId as string));
	let canViewCurrentDomain = $derived(can(layoutData.access?.permissions, currentDomain, "view"));

	let searchQuery = $state("");
	let searchInput = $state<HTMLInputElement | null>(null);
	let searchPopoverAnchor = $state<HTMLDivElement | null>(null);
	let searchPopoverOpen = $state(false);
	let debouncedSearchQuery = $state("");
	let searchResults = $state<ProjectSearchResultItem[]>([]);
	let searching = $state(false);
	let activeSearchIndex = $state(-1);
	let hoveredResultId = $state("");
	let searchRequestToken = 0;

	let feedbackDialogOpen = $state(false);
	let feedbackSubmitting = $state(false);
	let feedbackSubject = $state("");
	let feedbackMessage = $state("");

	let modeValue = $state<"light" | "dark">("light");

	let sidebarState = $state(true);

	const toggleSidebar = () => {
		sidebarState = !sidebarState;
		localStorage.setItem("sidebarState", sidebarState.toString());
	};
	
	onMount(() => {
		modeValue =
			localStorage.modeValue ||
			(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'light');
		document.documentElement.classList.toggle('dark', modeValue === 'dark');

		sidebarState = localStorage.sidebarState === "false" ? false : true;
	});

	const searchTypeIconMap: Record<string, typeof FileText> = {
		story: FileText,
		journey: Book,
		problem: CircleHelp,
		idea: Lightbulb,
		task: ListChecks,
		feedback: MessageSquare,
		resource: Wrench,
		page: FileText,
		calendar: Calendar
	};

	const formatUpdatedDate = (value?: string): string => {
		if (!value) return "Updated recently";
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return "Updated recently";
		return parsed.toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	};

	const resultTypeLabel = (typeValue: string): string => {
		if (!typeValue) return "Artifact";
		return typeValue.charAt(0).toUpperCase() + typeValue.slice(1);
	};

	const openSearchPopover = () => {
		if (searchQuery.trim().length < 2) {
			searchPopoverOpen = false;
			return;
		}
		searchPopoverOpen = true;
	};

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			searchInput?.focus();
			openSearchPopover();
			return;
		}

		if (!searchPopoverOpen || searchResults.length === 0) {
			return;
		}

		if (e.key === "ArrowDown") {
			e.preventDefault();
			activeSearchIndex = (activeSearchIndex + 1 + searchResults.length) % searchResults.length;
			hoveredResultId = searchResults[activeSearchIndex]?.id ?? "";
		}

		if (e.key === "ArrowUp") {
			e.preventDefault();
			activeSearchIndex = (activeSearchIndex - 1 + searchResults.length) % searchResults.length;
			hoveredResultId = searchResults[activeSearchIndex]?.id ?? "";
		}

		if (e.key === "Enter" && activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
			e.preventDefault();
			void navigateToSearchResult(searchResults[activeSearchIndex]);
		}

		if (e.key === "Escape") {
			searchPopoverOpen = false;
		}
	}

	const navigateToSearchResult = async (result: ProjectSearchResultItem) => {
		searchPopoverOpen = false;
		searchQuery = "";
		debouncedSearchQuery = "";
		searchResults = [];
		activeSearchIndex = -1;
		hoveredResultId = "";
		try {
			await goto(result.href);
		} catch (error) {
			console.error("Search navigation failed", error);
			toast.error("Unable to open the selected result.");
		}
	};

	const clearSearchState = () => {
		searchRequestToken += 1;
		searchResults = [];
		searchPopoverOpen = false;
		searching = false;
		activeSearchIndex = -1;
		hoveredResultId = "";
	};

	const submitFeedback = async () => {
		if (feedbackSubmitting) return;
		const subject = feedbackSubject.trim();
		const message = feedbackMessage.trim();
		if (subject.length === 0) {
			toast.error("Please add a subject.");
			return;
		}
		if (message.length === 0) {
			toast.error("Please add feedback details.");
			return;
		}

		feedbackSubmitting = true;
		try {
			const result = await submitGlobalFeedback({
				input: {
					subject,
					message,
					context: {
						projectId: page.params.projectId,
						path: page.url.pathname,
						userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
						mode: modeValue,
						submittedAt: new Date().toISOString()
					}
				}
			});

			if (!result.success) {
				toast.error(result.error);
				return;
			}

			feedbackDialogOpen = false;
			feedbackSubject = "";
			feedbackMessage = "";
			toast.success("Feedback submitted. Thank you.");
		} catch (error) {
			console.error("Failed to submit feedback", error);
			toast.error("Unable to submit feedback right now.");
		} finally {
			feedbackSubmitting = false;
		}
	};

	const toggleMode = () => {
		const nextMode = modeValue === "dark" ? "light" : "dark";
		document.documentElement.classList.toggle('dark', nextMode === 'dark');
		setMode(nextMode);
		localStorage.setItem('modeValue', nextMode);
		modeValue = nextMode;
	};

	$effect(() => {
		modeValue = mode.current === "dark" ? "dark" : "light";
	});

	$effect(() => {
		const normalized = searchQuery.trim();
		const timeout = setTimeout(() => {
			debouncedSearchQuery = normalized;
		}, 250);
		return () => clearTimeout(timeout);
	});

	$effect(() => {
		const scopedProjectId = page.params.projectId?.trim() ?? "";
		if (debouncedSearchQuery.length < 2 || scopedProjectId.length === 0) {
			clearSearchState();
			return;
		}

		const token = ++searchRequestToken;
		searching = true;
		if (document.activeElement === searchInput) {
			searchPopoverOpen = true;
		}

		void searchProject({ projectId: scopedProjectId, q: debouncedSearchQuery, limit: 10 })
			.then((payload) => {
				if (token !== searchRequestToken) return;
				searchResults = Array.isArray(payload.items) ? payload.items.slice(0, 10) : [];
				// only open if input is still focused
				if (document.activeElement === searchInput) {
					searchPopoverOpen = true;
				}

				activeSearchIndex = searchResults.length > 0 ? 0 : -1;
				hoveredResultId = searchResults[0]?.id ?? "";
			})
			.catch(() => {
				if (token !== searchRequestToken) return;
				searchResults = [];
				if (document.activeElement === searchInput && debouncedSearchQuery.length >= 2) {
					searchPopoverOpen = true;
				}
			})
			.finally(() => {
				if (token !== searchRequestToken) return;
				searching = false;
			});
	});


</script>

<svelte:document onkeydown={handleKeydown} />

<Sidebar.Provider onOpenChange={toggleSidebar} open={sidebarState}>
	<AppSidebar navigationData={layoutData.navigationData} access={layoutData.access} />
	<Sidebar.Inset>
		<div class="w-full p-2 bg-sidebar flex flex-row justify-between gap-2">
			<div class="w-full"></div>
			<Popover.Root bind:open={searchPopoverOpen}>
				<div bind:this={searchPopoverAnchor} class="w-full max-w-sm">
					<div
						class="bg-background max-w-100 focus-within:border-primary relative flex h-fit w-full items-center rounded-lg border px-2 focus-within:border"
					>
						<div class="pointer-events-none inset-y-0 left-0 flex items-center p-2 text-muted-foreground">
							<Search class="size-4" />
						</div>
						<Input
							type="text"
							class="bg-background block h-8.5 w-full rounded-lg border-0 py-1.5 pr-2 pl-0.5 shadow-none focus-visible:ring-0"
							placeholder="Search for artifacts, pages, and more..."
							bind:value={searchQuery}
							bind:ref={searchInput}
							onfocus={openSearchPopover}
						/>
						<div class="flex flex-row items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
							<Command class="text-muted-foreground" size="16" /> K
						</div>
					</div>
				</div>
				<Popover.Content
					customAnchor={searchPopoverAnchor}
					align="start"
					onOpenAutoFocus={(e) => e.preventDefault()}
					onCloseAutoFocus={(event) => event.preventDefault()}
					class="w-[min(42rem,calc(100vw-2rem))] p-2"
				>
					{#if searching}
						<div class="px-2 py-3 text-sm text-muted-foreground">Searching...</div>
					{:else if searchResults.length === 0 && searchQuery.length >= 2}
						<div class="px-2 py-3 text-sm text-muted-foreground">No results found.</div>
					{:else if searchResults.length === 0}
						<div class="px-2 py-3 text-sm text-muted-foreground">Type at least 3 characters to search.</div>
					{:else}
						<div class="space-y-1">
							{#each searchResults as result, index (result.type + ":" + result.id)}
								{@const ResultIcon = searchTypeIconMap[result.type] ?? FileText}
								<div
									class={`group flex items-start justify-between rounded-md border px-2 py-2 transition ${index === activeSearchIndex ? "border-primary bg-accent/50" : "border-transparent hover:border-border hover:bg-accent/40"}`}
								>
									<div class="flex min-w-0 flex-1 items-start gap-2">
										<div class="mt-0.5 rounded bg-muted p-1 text-muted-foreground">
											<ResultIcon class="size-3.5" />
										</div>
										<div class="min-w-0">
											<button
												type="button"
												class="line-clamp-1 text-left text-sm font-medium hover:underline"
												onmouseenter={() => {
													activeSearchIndex = index;
													hoveredResultId = result.id;
												}}
												onfocus={() => {
													activeSearchIndex = index;
													hoveredResultId = result.id;
												}}
												onclick={() => navigateToSearchResult(result)}
											>
												{result.title}
											</button>
											<div class="line-clamp-1 text-xs text-muted-foreground">
												{resultTypeLabel(result.type)}
												{#if result.description && hoveredResultId === result.id}
													• {result.description}
												{/if}
											</div>
										</div>
									</div>
									<div class="pl-2 pt-0.5 text-xs text-muted-foreground">
										{formatUpdatedDate(result.updatedAt)}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Popover.Content>
			</Popover.Root>
			<div class="flex flex-row gap-2 w-full justify-end">
				<Button
					variant="outline"
					class="hidden md:flex text-muted-foreground"
					onclick={() => (feedbackDialogOpen = true)}
				>
					Feedback
				</Button>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button
							variant="outline"
							size="icon"
							class="text-muted-foreground"
							onclick={toggleMode}
							aria-label="Toggle dark mode"
						>
							{#if modeValue === "dark"}
								<Sun class="size-4" />
							{:else}
								<Moon class="size-4" />
							{/if}
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content>
						Switch to {modeValue === "dark" ? "light" : "dark"} mode
					</Tooltip.Content>
				</Tooltip.Root>
			</div>

		</div>
		<div class="bg-sidebar p-2 pt-0 h-full">
			{#if canViewCurrentDomain}
				{@render children()}
			{:else}
				<div class="h-full rounded-lg bg-background p-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Access Denied</Card.Title>
							<Card.Description>
								You do not have permission to view the {domainLabel(currentDomain)} section.
								Contact your project administrator.
							</Card.Description>
						</Card.Header>
					</Card.Root>
				</div>
			{/if}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

<Dialog.Root bind:open={feedbackDialogOpen}>
	<Dialog.Content class="sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Send Feedback</Dialog.Title>
			<Dialog.Description>
				Share what is working well and what needs improvement.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<div class="grid gap-2">
				<Label for="feedback-subject">Subject</Label>
				<Input id="feedback-subject" placeholder="Short summary" bind:value={feedbackSubject} />
			</div>

			<div class="grid gap-2">
				<Label for="feedback-message">Feedback</Label>
				<Textarea id="feedback-message" rows={7} placeholder="Describe your feedback in detail" bind:value={feedbackMessage} />
			</div>

			<div class="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
				<div>User: {layoutData.access.user.name}</div>
				<div>Project: {page.params.projectId}</div>
				<div>Path: {page.url.pathname}</div>
				<div>Captured: {new Date().toLocaleString()}</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (feedbackDialogOpen = false)}>Cancel</Button>
			<Button onclick={submitFeedback} disabled={feedbackSubmitting}>
				{feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Toaster position="top-right" />
