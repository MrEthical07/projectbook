import { datastore } from "./datastore";

export const calendarEventsData: CalendarEvent[] = [
	{
		id: "evt-1",
		title: "Prototype deadline",
		type: "Derived",
		start: "2026-02-14",
		end: "2026-02-14",
		allDay: true,
		owner: "Avery Patel",
		phase: "Prototype",
		artifactType: "Task",
		sourceTitle: "Task - Timeline prototype",
		createdAt: "2026-02-14"
	},
	{
		id: "evt-2",
		title: "Usability testing session",
		type: "Derived",
		start: "2026-02-18",
		end: "2026-02-18",
		allDay: false,
		startTime: "14:00",
		endTime: "15:00",
		owner: "Nia Clark",
		phase: "Test",
		artifactType: "Feedback",
		sourceTitle: "Feedback - Reminder test",
		createdAt: "2026-02-14"
	},
	{
		id: "evt-3",
		title: "Weekly prototype review",
		type: "Manual",
		start: "2026-02-16",
		end: "2026-02-16",
		allDay: false,
		startTime: "10:00",
		endTime: "11:00",
		owner: "Jordan Lee",
		phase: "Prototype",
		artifactType: "Manual",
		description: "Share progress and align on next steps.",
		location: "Project room",
		eventKind: "Review",
		linkedArtifacts: ["Task - Prototype timeline"],
		createdAt: "2026-02-14"
	}
];

export const calendarReferenceData = {
	phaseChoices: ["None", "Empathize", "Define", "Ideate", "Prototype", "Test"],
	manualKinds: ["Workshop", "Review", "Testing Session", "Meeting", "Other"],
	linkedArtifactOptions: [
		"User Story - Streamline checkout",
		"Problem Statement - Reduce abandonment",
		"Idea - Timeline reminders",
		"Task - Prototype timeline",
		"Feedback - Reminder test",
		"Resource - Survey synthesis",
		"Page - Opportunity notes"
	]
};

export const calendarEventDetailData = {
	id: "evt-3",
	title: "Weekly prototype review",
	type: "Manual",
	date: "2026-02-16",
	allDay: false,
	owner: "Jordan Lee",
	eventKind: "Review",
	description: "Share progress and align on next steps.",
	location: "Project room",
	linkedArtifacts: ["Task - Prototype timeline"],
	tags: [],
	createdAt: "2026-02-14",
	lastEdited: "2026-02-14"
};

for (const event of calendarEventsData) {
	event.projectId ??= "atlas-2026";
}

datastore.calendar = calendarEventsData;
