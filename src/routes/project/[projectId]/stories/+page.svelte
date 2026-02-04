<script lang="ts">
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import * as Table from "$lib/components/ui/table";

	type StoryStatus = "draft" | "locked";

	type StorySummary = {
		title: string;
		status: StoryStatus;
		projectId: string;
		slug: string;
		persona: {
			name: string;
			role: string;
			age: number;
			job: string;
			education: string;
		};
	};

	const stories: StorySummary[] = [
		{
			title: "Streamline the checkout experience",
			status: "draft",
			projectId: "alpha",
			slug: "streamline-checkout",
			persona: {
				name: "Avery Patel",
				role: "Busy parent",
				age: 34,
				job: "Product manager",
				education: "MBA",
			}
		},
		{
			title: "Improve onboarding for new creators",
			status: "locked",
			projectId: "alpha",
			slug: "creator-onboarding",
			persona: {
				name: "Liam Gomez",
				role: "First-time creator",
				age: 26,
				job: "Content strategist",
				education: "B.A. in Media",
			}
		},
		{
			title: "Surface progress milestones for teams",
			status: "draft",
			projectId: "beta",
			slug: "team-milestones",
			persona: {
				name: "Priya Sharma",
				role: "Team lead",
				age: 41,
				job: "Engineering manager",
				education: "M.S. in CS",
			}
		}
	];

	/**
	 * Map story status values to badge variants for quick visual scanning.
	 */
	const statusVariant = (status: StoryStatus) => {
		if (status === "locked") {
			return "destructive";
		}

		return "secondary";
	};

	/**
	 * Build the story detail URL used by the table action.
	 */
	const storyHref = (story: StorySummary) => `/project/${story.projectId}/stories/${story.slug}`;
</script>

<div class="flex flex-col gap-4 rounded-lg bg-background p-4">
	<header
		class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
	>
		<div class="flex items-center gap-2 px-4">
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="/stories">Stories</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator class="hidden md:block" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Dashboard</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>Stories dashboard</Card.Title>
			<Card.Description>
				Quickly scan story health, personas, and jump into the full story detail pages.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Caption>Current user stories across active projects.</Table.Caption>
				<Table.Header>
					<Table.Row>
						<Table.Head>Title</Table.Head>
						<Table.Head>Persona</Table.Head>
						<Table.Head class="text-center">Age</Table.Head>
						<Table.Head>Role</Table.Head>
						<Table.Head>Job</Table.Head>
						<Table.Head>Education</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="text-center">Action</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each stories as story}
						<Table.Row>
							<Table.Cell class="font-medium">{story.title}</Table.Cell>
							<Table.Cell>
								<div class="flex flex-col">
									<span class="font-medium">{story.persona.name}</span>
									<span class="text-xs text-muted-foreground">{story.persona.role}</span>
								</div>
							</Table.Cell>
							<Table.Cell class="text-center">{story.persona.age}</Table.Cell>
							<Table.Cell>{story.persona.role}</Table.Cell>
							<Table.Cell>{story.persona.job}</Table.Cell>
							<Table.Cell>{story.persona.education}</Table.Cell>
							<Table.Cell>
								<Badge variant={statusVariant(story.status)}>
									{story.status.toUpperCase()}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-right items-center justify-center flex flex-row">
								<Button variant="link" href={storyHref(story)}>
									Click here
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
