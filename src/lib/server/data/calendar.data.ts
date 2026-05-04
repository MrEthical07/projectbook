import { datastore } from "./datastore";

export const calendarEventsData: CalendarEvent[] = [
	{
		id: "evt-1",
		title: "Sample prototype review",
		type: "Manual",
		start: "2026-02-18",
		end: "2026-02-18",
		allDay: true,
		owner: "ProjectBook User",
		phase: "Prototype",
		artifactType: "Manual",
		description: "Review sample artifact progress.",
		location: "Remote",
		eventKind: "Review",
		createdAt: "2026-02-14"
	}
];

export const calendarReferenceData = {
	phaseChoices: ["None", "Empathize", "Define", "Ideate", "Prototype", "Test"],
	manualKinds: ["Workshop", "Review", "Testing Session", "Meeting", "Other"],
	linkedArtifactOptions: [
		"User Story - Sample Story",
		"Problem Statement - Sample Problem",
		"Idea - Sample Idea",
		"Task - Sample Task",
		"Feedback - Sample Feedback",
		"Resource - Sample Resource",
		"Page - Sample Notes"
	]
};

export const calendarEventDetailData = {
	id: "evt-1",
	title: "Sample prototype review",
	type: "Manual",
	date: "2026-02-18",
	allDay: true,
	owner: "ProjectBook User",
	eventKind: "Review",
	description: "Review sample artifact progress.",
	location: "Remote",
	linkedArtifacts: ["Task - Prototype onboarding checklist flow"],
	tags: [],
	createdAt: "2026-02-14",
	lastEdited: "2026-02-14"
};

for (const event of calendarEventsData) {
	event.projectId ??= "atlas-2026";
}

datastore.calendar = calendarEventsData;
