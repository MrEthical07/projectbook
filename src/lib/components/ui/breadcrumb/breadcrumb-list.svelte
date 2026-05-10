<script lang="ts">
	import type { HTMLOlAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLOlAttributes> = $props();

	const setRef = (node: HTMLOListElement) => {
		ref = node;
		return {
			destroy() {
				if (ref === node) {
					ref = null;
				}
			}
		};
	};
</script>

<ol
	{@attach setRef}
	data-slot="breadcrumb-list"
	class={cn(
		'flex max-w-full min-w-0 flex-row items-center gap-1.5 overflow-hidden text-sm text-muted-foreground sm:gap-2.5',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</ol>
