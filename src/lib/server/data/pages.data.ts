import { datastore } from "./datastore";

export const pagesData: PageRow[] = [
	{
		id: "sample-page-1",
		title: "Sample research notes",
		owner: "ProjectBook User",
		lastEdited: "2026-02-14",
		linkedArtifactsCount: 1,
		status: "Draft",
		isOrphan: false
	}
];

export const pageDetailData = {
	tagOptions: ["Research", "Alignment", "Notes", "Strategy"],
	linkedArtifactOptions: [
		"User Story - Sample Story",
		"Problem Statement - Sample Problem",
		"Idea - Sample Idea",
		"Task - Sample Task",
		"Feedback - Sample Feedback",
		"Resource - Sample Resource"
	],
	defaultValues: {
		status: "Draft",
		title: "Untitled Page",
		owner: "ProjectBook User",
		createdAt: "Feb 14, 2026",
		lastEdited: "Feb 14, 2026",
		description: ""
	},
	defaultViews: [
		{ id: "view-doc", name: "Document", type: "Document" },
		{ id: "view-table", name: "Table", type: "Table" },
		{ id: "view-board", name: "Board", type: "Board" },
		{ id: "view-list", name: "List", type: "List" },
		{ id: "view-calendar", name: "Calendar", type: "Calendar" },
		{ id: "view-gallery", name: "Gallery", type: "Gallery" },
		{ id: "view-timeline", name: "Timeline", type: "Timeline" }
	],
	databaseItems: [
		{
			id: "item-1",
			title: "Capture onboarding observations",
			status: "Backlog",
			date: "2026-02-14",
			owner: "ProjectBook User",
			tag: "Research",
			docHeading: "Notes",
			docBody: "Capture the key observations from the session."
		}
	]
};

for (const page of pagesData) {
	page.projectId ??= "atlas-2026";
}

datastore.pages = pagesData;
