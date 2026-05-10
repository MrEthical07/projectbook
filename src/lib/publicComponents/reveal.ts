/**
 * Svelte action: reveals an element when it enters the viewport.
 * Applies the `.reveal` → `.in-view` CSS pair defined in app.css.
 *
 * Usage:  <div use:reveal={{ delay: 150 }}>…</div>
 */
export function reveal(node: HTMLElement, params: { delay?: number } = {}) {
	node.classList.add('reveal');
	if (params.delay) node.style.transitionDelay = `${params.delay}ms`;

	const io = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting) {
				node.classList.add('in-view');
				io.disconnect();
			}
		},
		{ threshold: 0.08 }
	);

	io.observe(node);
	return { destroy: () => io.disconnect() };
}
