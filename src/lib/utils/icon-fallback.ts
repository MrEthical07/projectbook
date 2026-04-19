import type { Component } from "svelte";

const isRenderableComponent = (value: unknown): value is Component => {
	if (typeof value === "function") {
		return true;
	}
	if (!value || typeof value !== "object") {
		return false;
	}
	return "$$render" in value || "render" in value;
};

export const resolveOptionalIconComponent = (
	candidate: unknown
): Component | null => {
	return isRenderableComponent(candidate) ? candidate : null;
};

export const resolveIconComponent = (
	candidate: unknown,
	fallback: Component
): Component => {
	return resolveOptionalIconComponent(candidate) ?? fallback;
};
