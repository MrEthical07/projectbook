import { datastore } from "./datastore";

export const ideasData: IdeaRow[] = [
	{
		id: "sample-idea-1",
		title: "Progressive onboarding checklist",
		linkedProblemStatement: "New users need clearer onboarding guidance.",
		persona: "Participant 1",
		status: "Considered",
		tasksCount: 1,
		owner: "ProjectBook User",
		lastUpdated: "2026-02-14",
		linkedProblemLocked: false,
		isOrphan: false
	}
];

export const ideasDetailData = {
	problemOptions: [
		{
			id: "problem-41",
			title: "New users need clearer onboarding guidance",
			phase: "Define",
			href: "/project/atlas-2026/problem-statement/sample-problem-1",
			status: "Draft"
		}
	],
	linkedStories: [
		{
			id: "story-7",
			title: "Participant 1 - New user",
			phase: "Empathize",
			href: "/project/atlas-2026/stories/sample-story-1"
		}
	],
	derivedPersonas: ["Participant 1"]
};

for (const idea of ideasData) {
	idea.projectId ??= "atlas-2026";
}

datastore.ideas = ideasData;
