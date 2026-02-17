import { datastore } from "./datastore";

export const storiesData: StoryRow[] = [
	{
		id: "streamline-checkout",
		title: "Streamline checkout for first-time users",
		personaName: "Avery Patel",
		painPointsCount: 3,
		problemHypothesesCount: 2,
		owner: "Avery Patel",
		lastUpdated: "2026-02-05",
		status: "Locked",
		isOrphan: false
	},
	{
		id: "creator-onboarding",
		title: "Improve onboarding for new creators",
		personaName: "Liam Gomez",
		painPointsCount: 0,
		problemHypothesesCount: 1,
		owner: "Nia Clark",
		lastUpdated: "2026-02-02",
		status: "Draft",
		isOrphan: false
	},
	{
		id: "team-milestones",
		title: "Surface progress milestones for teams",
		personaName: "Priya Sharma",
		painPointsCount: 2,
		problemHypothesesCount: 0,
		owner: "Dr. Ramos",
		lastUpdated: "2026-01-27",
		status: "Archived",
		isOrphan: false
	}
];

export const storyAddOnCatalogData = [
	{
		type: "goals_success",
		name: "Goals & Success Criteria",
		description: "Define what success looks like from the user’s perspective.",
		tag: "Recommended"
	},
	{
		type: "jtbd",
		name: "Jobs To Be Done (JTBD)",
		description: "Capture functional, supporting, and emotional jobs.",
		tag: "Recommended"
	},
	{
		type: "assumptions",
		name: "Assumptions",
		description: "Make hidden assumptions explicit.",
		tag: "Optional"
	},
	{
		type: "constraints",
		name: "Constraints",
		description: "Capture environmental, technical, or behavioral limits.",
		tag: "Optional"
	},
	{
		type: "risks_unknowns",
		name: "Risks & Unknowns",
		description: "Identify uncertainty early.",
		tag: "Recommended"
	},
	{
		type: "evidence",
		name: "Evidence / Research References",
		description: "Ground the story in data and references.",
		tag: "Optional"
	},
	{
		type: "scenarios",
		name: "Scenarios / Edge Cases",
		description: "Capture non-happy paths and expectations.",
		tag: "Optional"
	}
];

export const storyDraftTemplateData = {
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
	empathyMap: {
		says: "",
		thinks: "",
		does: "",
		feels: ""
	},
	painPoints: ["Point 1"],
	hypothesis: ["hypothesis 1", "hypothesis 2"],
	notes: ""
};

for (const story of storiesData) {
	story.projectId ??= "atlas-2026";
}

datastore.stories = storiesData;
