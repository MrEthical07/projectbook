import { datastore } from "./datastore";

export const resourcesData: ResourceRow[] = [
	{
		id: "res-1",
		name: "Student survey synthesis",
		fileType: "PDF",
		docType: "Research Paper",
		owner: "Avery Patel",
		version: "v3",
		lastUpdated: "Jan 12, 2026",
		linkedCount: 3,
		status: "Active"
	},
	{
		id: "res-2",
		name: "Prototype narrative deck",
		fileType: "PPTX",
		docType: "Pitch Deck",
		owner: "Nia Clark",
		version: "v1",
		lastUpdated: "Jan 8, 2026",
		linkedCount: 1,
		status: "Archived"
	}
];

export const resourcesReferenceData = {
	docTypes: ["Pitch Deck", "Research Paper", "Specification", "Design File", "Other"],
	fileTypes: ["PDF", "PPTX", "DOCX"],
	owners: ["Avery Patel", "Nia Clark", "Dr. Ramos"],
	sortOptions: ["Last Updated", "Name", "Upload Date"],
	storyOptions: ["Avery Patel - First-year student", "Nia Clark - Working parent"],
	problemOptions: ["Students miss assignment requirements", "Deadline shifts create confusion"],
	ideaOptions: ["Visual deadline timeline for assignments", "Assignment checklist reminders"],
	taskOptions: ["Prototype timeline for assignment deadlines", "Test reminder notification flow"]
};

export const resourceDetailData = {
	name: "Student survey synthesis",
	fileType: "PDF",
	docType: "Research Paper",
	status: "Active",
	description: "Survey synthesis across 24 student interviews.",
	owner: "Avery Patel",
	createdAt: "Jan 2, 2026",
	updatedAt: "Jan 12, 2026",
	fileSize: "4.2 MB",
	linkedArtifacts: [
		{
			id: "story-7",
			title: "Avery Patel - First-year student",
			type: "User Story",
			phase: "Empathize",
			href: "/project/alpha/stories/avery-patel"
		},
		{
			id: "idea-31",
			title: "Visual deadline timeline for assignments",
			type: "Idea",
			phase: "Ideate",
			href: "/project/alpha/ideas/deadline-timeline"
		}
	],
	versions: [
		{
			version: "v3",
			uploadedBy: "Avery Patel",
			uploadDate: "Jan 12, 2026",
			description: "Added follow-up insights"
		},
		{
			version: "v2",
			uploadedBy: "Avery Patel",
			uploadDate: "Jan 5, 2026",
			description: "Updated summary charts"
		}
	]
};

for (const resource of resourcesData) {
	resource.projectId ??= "atlas-2026";
}

datastore.resources = resourcesData;
