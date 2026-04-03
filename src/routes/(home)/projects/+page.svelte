<script lang="ts">
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Button } from "$lib/components/ui/button";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { FolderKanban, Plus } from "@lucide/svelte";

	let { data } = $props();

	type ProjectItem = {
		id: string;
		name: string;
		status: "Active" | "Archived";
		updatedAt: string;
		url: string;
	};

	const requiredString = (value: unknown, path: string): string => {
		if (typeof value !== "string" || value.trim().length === 0) {
			throw new Error(`Invalid or missing '${path}' in projects payload.`);
		}
		return value.trim();
	};

	const requiredStatus = (value: unknown, path: string): "Active" | "Archived" => {
		if (value !== "Active" && value !== "Archived") {
			throw new Error(`Invalid '${path}' in projects payload. Expected Active or Archived.`);
		}
		return value;
	};

	let projects = $derived.by<ProjectItem[]>(() => {
		const rawProjects = structuredClone(data.projects);
		if (!Array.isArray(rawProjects)) {
			throw new Error("Projects payload must be an array.");
		}

		return rawProjects.map((project, index) => {
			if (!project || typeof project !== "object") {
				throw new Error(`Invalid project row at index ${index}.`);
			}
			const row = project as unknown as Record<string, unknown>;
			const id = requiredString(row.id, `projects[${index}].id`);
			return {
				id,
				name: requiredString(row.name, `projects[${index}].name`),
				status: requiredStatus(row.status, `projects[${index}].status`),
				updatedAt: `Updated ${requiredString(row.lastUpdatedAt, `projects[${index}].lastUpdatedAt`)}`,
				url: `/project/${id}`
			};
		});
	});
</script>

<svelte:head>
	<title>Projects • ProjectBook</title>
	<meta name="description" content="Browse your projects and access their current status and progress." />
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<div class="flex flex-col gap-2 rounded-lg border bg-white p-2">
	<header
		class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex w-full items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page>Projects</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<section class="flex flex-col gap-4 p-3 md:px-16">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<FolderKanban class="h-5 w-5 text-muted-foreground" />
				<h1 class="text-2xl font-semibold">All Projects</h1>
			</div>
			<Button href="/projects/new">
				<Plus class="mr-2 h-4 w-4" />
				Create Project
			</Button>
		</div>

		<div class="grid gap-3">
			{#each projects as project (project.id)}
				<a
					href={project.url}
					class="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/40"
				>
					<div class="flex flex-col gap-1">
						<span class="font-medium">{project.name}</span>
						<span class="text-xs text-muted-foreground">{project.updatedAt}</span>
					</div>
					<span class="text-xs text-muted-foreground">{project.status}</span>
				</a>
			{/each}
		</div>
	</section>
</div>
