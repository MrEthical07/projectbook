import { datastore } from "./datastore";

export const problemsData: ProblemRow[] = [
	{
		id: "sample-problem-1",
		statement:
			"New users need clearer onboarding guidance because key steps are easy to miss.",
		linkedSources: ["Story: Capture onboarding friction for new users"],
		painPointsCount: 1,
		ideasCount: 1,
		status: "Draft",
		owner: "ProjectBook User",
		lastUpdated: "2026-02-14",
		isOrphan: false
	}
];

export const problemDetailData = {
	storyOptions: [
		{
			id: "story-1",
			title: "Capture onboarding friction for new users",
			phase: "Empathize",
			href: "/project/atlas-2026/stories/sample-story-1"
		}
	],
	journeyOptions: [
		{
			id: "journey-1",
			title: "New-user onboarding journey",
			phase: "Empathize",
			href: "/project/atlas-2026/journeys/sample-journey-1"
		}
	],
	sourcePainPoints: [
		{
			id: "pain-1",
			text: "Users skip important setup steps when guidance is not visible.",
			sourceLabel: "User Story - Participant 1"
		}
	]
};

for (const problem of problemsData) {
	problem.projectId ??= "atlas-2026";
}

datastore.problems = problemsData;
