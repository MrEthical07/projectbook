<script lang="ts">
	import { cn } from "$lib/utils.js";

	type LegalLinksTone = "muted" | "sidebar";

	let {
		tone = "muted",
		class: className
	}: {
		tone?: LegalLinksTone;
		class?: string;
	} = $props();

	let containerClass = $derived(
		cn(
			"flex flex-wrap items-center gap-x-2 gap-y-1 text-xs",
			tone === "sidebar" ? "text-sidebar-foreground/70" : "text-muted-foreground",
			className
		)
	);

	let linkClass = $derived(
		tone === "sidebar"
			? "underline-offset-4 transition hover:text-sidebar-foreground hover:underline"
			: "underline-offset-4 transition hover:text-foreground hover:underline"
	);

	let separatorClass = $derived(
		tone === "sidebar" ? "text-sidebar-foreground/40" : "text-border"
	);
</script>

<nav aria-label="Legal links" class={containerClass}>
	<a class={linkClass} href="/privacy-policy">Privacy Policy</a>
	<span aria-hidden="true" class={separatorClass}>/</span>
	<a class={linkClass} href="/terms-and-conditions">Terms and Conditions</a>
</nav>
