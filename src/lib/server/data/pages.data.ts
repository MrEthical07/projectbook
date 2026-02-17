import { datastore } from "./datastore";

export const pagesData: PageRow[] = [
	{
		id: "research-notes",
		title: "Research notes",
		owner: "Avery Patel",
		lastEdited: "2026-02-06",
		linkedArtifactsCount: 2,
		status: "Draft",
		isOrphan: false
	},
	{
		id: "stakeholder-brief",
		title: "Stakeholder brief",
		owner: "Nia Clark",
		lastEdited: "2026-01-29",
		linkedArtifactsCount: 0,
		status: "Archived",
		isOrphan: true
	},
	{
		id: "pilot-summary",
		title: "Pilot summary",
		owner: "Dr. Ramos",
		lastEdited: "2026-02-04",
		linkedArtifactsCount: 1,
		status: "Draft",
		isOrphan: false
	}
];

export const pageDetailData = {
	tagOptions: ["Research", "Alignment", "Notes", "Strategy"],
	linkedArtifactOptions: [
		"User Story - Streamline checkout",
		"Problem Statement - Reduce abandonment",
		"Idea - Timeline reminders",
		"Task - Prototype timeline",
		"Feedback - Reminder test",
		"Resource - Survey synthesis"
	],
	defaultValues: {
		status: "Draft",
		title: "Untitled Page",
		owner: "Avery Patel",
		createdAt: "Jan 10, 2026",
		lastEdited: "Jan 12, 2026",
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
			title: "Capture key observations",
			status: "Backlog",
			date: "2026-01-12",
			owner: "Avery Patel",
			tag: "Research",
			docHeading: "Notes",
			docBody: "Capture the key observations from the session."
		},
		{
			id: "item-2",
			title: "Draft summary insights",
			status: "In progress",
			date: "2026-01-14",
			owner: "Nia Clark",
			tag: "Notes",
			docHeading: "Summary",
			docBody: "Draft the summary of findings and insights."
		}
	]
};

for (const page of pagesData) {
	page.projectId ??= "atlas-2026";
}

datastore.pages = pagesData;
