import { datastore } from "./datastore";

export const feedbackData: FeedbackRow[] = [
	{
		id: "sample-feedback-1",
		title: "Checklist prototype usability session",
		linkedArtifacts: ["Task: Prototype onboarding checklist flow"],
		outcome: "Validated",
		linkedTaskOrIdea: "Task: Prototype onboarding checklist flow",
		owner: "ProjectBook User",
		createdDate: "2026-02-14",
		hasTaskLink: true,
		isOrphan: false
	}
];

export const feedbackDetailData = {
	taskOptions: [
		{
			id: "task-21",
			title: "Prototype onboarding checklist flow",
			type: "Task",
			phase: "Prototype",
			href: "/project/atlas-2026/tasks/sample-task-1",
			status: "Active"
		}
	],
	ideaOptions: [
		{
			id: "idea-31",
			title: "Progressive onboarding checklist",
			type: "Idea",
			phase: "Ideate",
			href: "/project/atlas-2026/ideas/sample-idea-1",
			status: "Active"
		}
	],
	problemOptions: [
		{
			id: "problem-7",
			title: "New users need clearer onboarding guidance",
			type: "Problem Statement",
			phase: "Define",
			href: "/project/atlas-2026/problem-statement/sample-problem-1",
			status: "Draft"
		}
	]
};

for (const feedback of feedbackData) {
	feedback.projectId ??= "atlas-2026";
}

datastore.feedback = feedbackData;
