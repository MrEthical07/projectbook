import { datastore } from "./datastore";

export const ideasData: IdeaRow[] = [
	{
		id: "deadline-lane-view",
		title: "Deadline lane view",
		linkedProblemStatement: "Students need a clear way to track assignment deadlines.",
		persona: "Avery Patel",
		status: "Selected",
		tasksCount: 2,
		owner: "Avery Patel",
		lastUpdated: "2026-02-06",
		linkedProblemLocked: true,
		isOrphan: false
	},
	{
		id: "smart-reminder-bundles",
		title: "Smart reminder bundles",
		linkedProblemStatement: "New creators need confidence during setup.",
		persona: "Liam Gomez",
		status: "Considered",
		tasksCount: 0,
		owner: "Nia Clark",
		lastUpdated: "2026-02-02",
		linkedProblemLocked: false,
		isOrphan: false
	},
	{
		id: "assistant-chat-coach",
		title: "Assistant chat coach",
		linkedProblemStatement: "",
		persona: "Priya Sharma",
		status: "Rejected",
		tasksCount: 0,
		owner: "Dr. Ramos",
		lastUpdated: "2026-01-28",
		linkedProblemLocked: false,
		isOrphan: true
	}
];

export const ideasDetailData = {
	problemOptions: [
		{
			id: "problem-41",
			title: "Students miss assignment requirements",
			phase: "Define",
			href: "/project/alpha/problem-statement/missed-requirements",
			status: "Locked"
		},
		{
			id: "problem-42",
			title: "Deadline shifts create confusion",
			phase: "Define",
			href: "/project/alpha/problem-statement/deadline-shifts",
			status: "Draft"
		}
	],
	linkedStories: [
		{
			id: "story-7",
			title: "Avery Patel - First-year student",
			phase: "Empathize",
			href: "/project/alpha/stories/avery-patel"
		}
	],
	derivedPersonas: ["Avery Patel"]
};

for (const idea of ideasData) {
	idea.projectId ??= "atlas-2026";
}

datastore.ideas = ideasData;
