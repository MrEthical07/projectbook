<script lang="ts">
	import type { HTMLLiAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLLiAttributes> = $props();

	const setRef = (node: HTMLLIElement) => {
		ref = node;
		return {
			destroy() {
				if (ref === node) {
					ref = null;
				}
			},
		};
	};
</script>

<li
	{@attach setRef}
	data-slot="breadcrumb-item"
	class={cn("inline-flex min-w-0 items-center gap-1.5", className)}
	{...restProps}
>
	{@render children?.()}
</li>
