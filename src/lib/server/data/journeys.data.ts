import { datastore } from "./datastore";

export const journeysData: JourneyRow[] = [
	{
		id: "sample-journey-1",
		title: "New-user onboarding journey",
		linkedPersonas: ["Participant 1"],
		stagesCount: 3,
		painPointsCount: 1,
		owner: "Workspace User",
		lastUpdated: "2026-02-14",
		status: "Draft",
		isOrphan: false
	}
];

export const journeyDraftTemplateData = {
	title: "",
	description: "",
	status: "draft",
	persona: {
		name: "",
		bio: "",
		role: "",
		age: 0,
		job: "",
		edu: ""
	},
	context: "",
	stages: [
		{
			name: "Discovery",
			actions: ["Sees coffee shop", "Checks line"],
			emotion: "Neutral",
			painPoints: []
		},
		{
			name: "Ordering",
			actions: ["Waits in line", "Orders drink"],
			emotion: "Frustrated",
			painPoints: ["Line is slow"]
		}
	],
	notes: ""
};

export const journeyEmotionsData = ["Neutral", "Frustrated", "Anxious", "Relieved"];

for (const journey of journeysData) {
	journey.projectId ??= "atlas-2026";
}

datastore.journeys = journeysData;
