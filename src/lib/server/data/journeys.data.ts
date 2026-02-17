import { datastore } from "./datastore";

export const journeysData: JourneyRow[] = [
	{
		id: "student-assignment-journey",
		title: "Student assignment journey",
		linkedPersonas: ["Avery Patel"],
		stagesCount: 6,
		painPointsCount: 3,
		owner: "Avery Patel",
		lastUpdated: "2026-02-04",
		status: "Draft",
		isOrphan: false
	},
	{
		id: "creator-publish-journey",
		title: "Creator publish journey",
		linkedPersonas: [],
		stagesCount: 5,
		painPointsCount: 2,
		owner: "Nia Clark",
		lastUpdated: "2026-01-30",
		status: "Draft",
		isOrphan: true
	},
	{
		id: "onboarding-first-week",
		title: "Onboarding first week",
		linkedPersonas: ["Liam Gomez"],
		stagesCount: 4,
		painPointsCount: 0,
		owner: "Dr. Ramos",
		lastUpdated: "2026-01-22",
		status: "Archived",
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
