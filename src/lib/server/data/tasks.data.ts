import { datastore } from "./datastore";

export const tasksData: TaskRow[] = [
	{
		id: "deadline-lane-prototype",
		title: "Prototype deadline lane interaction",
		linkedIdea: "Deadline lane view",
		linkedProblemStatement: "Students need a clear way to track assignment deadlines.",
		persona: "Avery Patel",
		owner: "Avery Patel",
		deadline: "2026-02-09",
		status: "In Progress",
		ideaRejected: false,
		hasFeedback: false,
		isOrphan: false
	},
	{
		id: "reminder-card-test",
		title: "Test reminder card comprehension",
		linkedIdea: "Smart reminder bundles",
		linkedProblemStatement: "New creators need confidence during setup.",
		persona: "Liam Gomez",
		owner: "Nia Clark",
		deadline: "2026-02-11",
		status: "Planned",
		ideaRejected: true,
		hasFeedback: false,
		isOrphan: false
	},
	{
		id: "handoff-visibility-run",
		title: "Run handoff visibility experiment",
		linkedIdea: "Assistant chat coach",
		linkedProblemStatement: "Team leads need visibility into handoffs.",
		persona: "Priya Sharma",
		owner: "Dr. Ramos",
		deadline: "2026-02-01",
		status: "Completed",
		ideaRejected: false,
		hasFeedback: false,
		isOrphan: false
	}
];

export const taskDetailData = {
	assigneeOptions: [
		{ id: "user-1", name: "Nia Clark", role: "Designer" },
		{ id: "user-2", name: "Dr. Ramos", role: "Product" },
		{ id: "user-3", name: "Avery Patel", role: "Research" }
	],
	ideaOptions: [
		{
			id: "idea-31",
			title: "Visual deadline timeline for assignments",
			phase: "Ideate",
			href: "/project/alpha/ideas/deadline-timeline",
			status: "Active",
			problem: {
				id: "problem-7",
				title: "Students miss assignment requirements",
				phase: "Define",
				href: "/project/alpha/problem-statement/missed-requirements",
				status: "Locked"
			},
			context: {
				type: "Persona",
				title: "Nia Clark",
				detail: "First-year student balancing coursework and a part-time job.",
				phase: "Empathize",
				href: "/project/alpha/personas/nia-clark",
				status: "Active"
			}
		}
	]
};

for (const task of tasksData) {
	task.projectId ??= "atlas-2026";
}

datastore.tasks = tasksData;
