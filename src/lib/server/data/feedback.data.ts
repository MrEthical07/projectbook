import { datastore } from "./datastore";

export const feedbackData: FeedbackRow[] = [
	{
		id: "deadline-lane-session-1",
		title: "Deadline lane usability session",
		linkedArtifacts: ["Task: Deadline lane view", "Idea: Deadline lane view"],
		outcome: "Validated",
		linkedTaskOrIdea: "Task: Deadline lane view",
		owner: "Avery Patel",
		createdDate: "2026-02-06",
		hasTaskLink: true,
		isOrphan: false
	},
	{
		id: "creator-flow-feedback",
		title: "Creator setup walkthrough findings",
		linkedArtifacts: ["Idea: Smart reminder bundles"],
		outcome: "Needs Iteration",
		linkedTaskOrIdea: "Idea: Smart reminder bundles",
		owner: "Nia Clark",
		createdDate: "2026-02-03",
		hasTaskLink: false,
		isOrphan: false
	},
	{
		id: "pilot-alpha-notes",
		title: "Pilot alpha notes",
		linkedArtifacts: [],
		outcome: "Invalidated",
		linkedTaskOrIdea: "",
		owner: "Dr. Ramos",
		createdDate: "2026-01-26",
		hasTaskLink: false,
		isOrphan: true
	}
];

export const feedbackDetailData = {
	taskOptions: [
		{
			id: "task-21",
			title: "Prototype timeline for assignment deadlines",
			type: "Task",
			phase: "Prototype",
			href: "/project/alpha/tasks/deadline-timeline",
			status: "Active"
		}
	],
	ideaOptions: [
		{
			id: "idea-31",
			title: "Visual deadline timeline for assignments",
			type: "Idea",
			phase: "Ideate",
			href: "/project/alpha/ideas/deadline-timeline",
			status: "Active"
		}
	],
	problemOptions: [
		{
			id: "problem-7",
			title: "Students miss assignment requirements",
			type: "Problem Statement",
			phase: "Define",
			href: "/project/alpha/problem-statement/missed-requirements",
			status: "Archived"
		}
	]
};

for (const feedback of feedbackData) {
	feedback.projectId ??= "atlas-2026";
}

datastore.feedback = feedbackData;
