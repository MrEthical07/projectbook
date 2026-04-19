<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { resolveIconComponent } from "$lib/utils/icon-fallback";
	import { Ban, CircleHelp, ShieldAlert, TriangleAlert } from "@lucide/svelte";

	type ErrorCardProps = {
		status: number;
		message?: string;
		homeHref?: string;
		containerClass?: string;
	};

	type ErrorUiState = {
		title: string;
		description: string;
		primaryLabel: string;
		primaryHref: string;
		icon: unknown;
		iconContainerClass: string;
		iconClass: string;
		showRetry?: boolean;
		showBack?: boolean;
		showStatusText?: boolean;
	};

	let {
		status,
		message = "",
		homeHref = "/",
		containerClass = "flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/40 via-background to-muted/60 p-4"
	}: ErrorCardProps = $props();

	let uiState = $derived.by<ErrorUiState>(() => {
		switch (status) {
			case 401:
				return {
					title: "401 - Unauthorized",
					description: "You must sign in to access this page.",
					primaryLabel: "Go to Login",
					primaryHref: "/auth",
					icon: ShieldAlert,
					iconContainerClass: "bg-warning/20",
					iconClass: "text-warning-foreground"
				};
			case 403:
				return {
					title: "403 - Forbidden",
					description: "You do not have access to this resource.",
					primaryLabel: "Back to Dashboard",
					primaryHref: homeHref,
					icon: Ban,
					iconContainerClass: "bg-destructive/15",
					iconClass: "text-destructive"
				};
			case 404:
				return {
					title: "Page Not Found",
					description: "The page you're looking for doesn't exist.",
					primaryLabel: "Go Home",
					primaryHref: homeHref,
					icon: CircleHelp,
					iconContainerClass: "bg-primary/10",
					iconClass: "text-primary",
					showBack: true,
					showStatusText: true
				};
			case 500:
				return {
					title: "500 - Server Error",
					description: "Something went wrong.",
					primaryLabel: "Go Home",
					primaryHref: homeHref,
					icon: TriangleAlert,
					iconContainerClass: "bg-destructive/15",
					iconClass: "text-destructive",
					showRetry: true
				};
			default:
				return {
					title: `${status} - Error`,
					description: message || "An unexpected error occurred.",
					primaryLabel: "Go Home",
					primaryHref: homeHref,
					icon: CircleHelp,
					iconContainerClass: "bg-primary/10",
					iconClass: "text-primary"
				};
		}
	});

	let uiIcon = $derived.by(() => resolveIconComponent(uiState.icon, CircleHelp));

	const retry = () => {
		window.location.reload();
	};

	const goBack = () => {
		if (window.history.length > 1) {
			window.history.back();
			return;
		}
		window.location.href = homeHref;
	};
</script>

<main class={containerClass}>
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-2 text-center">
			{#if uiState.showStatusText}
				<div class="text-5xl font-bold tracking-tight text-primary">{status}</div>
			{:else}
				<div class={`mx-auto flex size-12 items-center justify-center rounded-full ${uiState.iconContainerClass}`}>
					<uiIcon class={`size-6 ${uiState.iconClass}`}></uiIcon>
				</div>
			{/if}
			<Card.Title>{uiState.title}</Card.Title>
			<Card.Description>{uiState.description}</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-2">
			<Button class="w-full" href={uiState.primaryHref}>{uiState.primaryLabel}</Button>
			{#if uiState.showRetry}
				<Button class="w-full" variant="outline" onclick={retry}>Retry</Button>
			{/if}
			{#if uiState.showBack}
				<Button class="w-full" variant="outline" onclick={goBack}>Back</Button>
			{/if}
		</Card.Content>
	</Card.Root>
</main>
