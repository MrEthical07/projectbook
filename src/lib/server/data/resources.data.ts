import { datastore } from "./datastore";

export const resourcesData: ResourceRow[] = [
	{
		id: "res-1",
		name: "Sample interview summary",
		fileType: "PDF",
		docType: "Research Paper",
		owner: "Workspace User",
		version: "v1",
		lastUpdated: "Feb 14, 2026",
		linkedCount: 1,
		status: "Active"
	}
];

export const resourcesReferenceData = {
	docTypes: ["Pitch Deck", "Research Paper", "Specification", "Design File", "Other"],
	fileTypes: ["PDF", "PPTX", "DOCX"],
	owners: ["Workspace User"],
	sortOptions: ["Last Updated", "Name", "Upload Date"],
	storyOptions: ["Participant 1 - New user"],
	problemOptions: ["New users need clearer onboarding guidance"],
	ideaOptions: ["Progressive onboarding checklist"],
	taskOptions: ["Prototype onboarding checklist flow"]
};

export const resourceDetailData = {
	name: "Sample interview summary",
	fileType: "PDF",
	docType: "Research Paper",
	status: "Active",
	description: "Condensed findings from sample onboarding interviews.",
	owner: "Workspace User",
	createdAt: "Feb 14, 2026",
	updatedAt: "Feb 14, 2026",
	fileSize: "1.1 MB",
	linkedArtifacts: [
		{
			id: "story-7",
			title: "Participant 1 - New user",
			type: "User Story",
			phase: "Empathize",
			href: "/project/atlas-2026/stories/sample-story-1"
		}
	],
	versions: [
		{
			version: "v1",
			uploadedBy: "Workspace User",
			uploadDate: "Feb 14, 2026",
			description: "Initial sample upload"
		}
	]
};

for (const resource of resourcesData) {
	resource.projectId ??= "atlas-2026";
}

datastore.resources = resourcesData;
