import { datastore } from "./datastore";

export const tasksData: TaskRow[] = [
	{
		id: "sample-task-1",
		title: "Prototype onboarding checklist flow",
		linkedIdea: "Progressive onboarding checklist",
		linkedProblemStatement: "New users need clearer onboarding guidance.",
		persona: "Participant 1",
		owner: "Workspace User",
		deadline: "2026-02-18",
		lastUpdated: "2026-02-14",
		status: "Planned",
		ideaRejected: false,
		hasFeedback: false,
		isOrphan: false
	}
];

export const taskDetailData = {
	assigneeOptions: [
		{ id: "user-1", name: "Workspace User", role: "Product" }
	],
	ideaOptions: [
		{
			id: "idea-31",
			title: "Progressive onboarding checklist",
			phase: "Ideate",
			href: "/project/atlas-2026/ideas/sample-idea-1",
			status: "Active",
			problem: {
				id: "problem-7",
				title: "New users need clearer onboarding guidance",
				phase: "Define",
				href: "/project/atlas-2026/problem-statement/sample-problem-1",
				status: "Draft"
			},
			context: {
				type: "Persona",
				title: "Participant 1",
				detail: "New user onboarding the product for the first time.",
				phase: "Empathize",
				href: "/project/atlas-2026/stories/sample-story-1",
				status: "Active"
			}
		}
	]
};

for (const task of tasksData) {
	task.projectId ??= "atlas-2026";
}

datastore.tasks = tasksData;
