import { datastore } from "./datastore";

export const problemsData: ProblemRow[] = [
	{
		id: "deadline-clarity-students",
		statement:
			"Students need a clear way to track assignment deadlines because requirements are fragmented across channels.",
		linkedSources: [
			"Story: Streamline checkout for first-time users",
			"Journey: Student assignment journey"
		],
		painPointsCount: 3,
		ideasCount: 2,
		status: "Locked",
		owner: "Avery Patel",
		lastUpdated: "2026-02-03",
		isOrphan: false
	},
	{
		id: "creator-setup-friction",
		statement:
			"New creators need confidence during setup because the first publish flow feels uncertain and high-risk.",
		linkedSources: [],
		painPointsCount: 1,
		ideasCount: 0,
		status: "Draft",
		owner: "Nia Clark",
		lastUpdated: "2026-02-01",
		isOrphan: true
	},
	{
		id: "handoff-visibility-gap",
		statement:
			"Team leads need visibility into handoffs because accountability drops between stages.",
		linkedSources: ["Journey: Onboarding first week"],
		painPointsCount: 2,
		ideasCount: 1,
		status: "Archived",
		owner: "Dr. Ramos",
		lastUpdated: "2026-01-25",
		isOrphan: false
	}
];

export const problemDetailData = {
	storyOptions: [
		{
			id: "story-1",
			title: "Streamline the checkout experience",
			phase: "Empathize",
			href: "/project/alpha/stories/streamline-checkout"
		},
		{
			id: "story-2",
			title: "Reduce cart abandonment",
			phase: "Empathize",
			href: "/project/alpha/stories/reduce-cart-abandonment"
		}
	],
	journeyOptions: [
		{
			id: "journey-1",
			title: "Checkout journey map",
			phase: "Empathize",
			href: "/project/alpha/journeys/checkout-journey"
		},
		{
			id: "journey-2",
			title: "Subscription renewal journey",
			phase: "Empathize",
			href: "/project/alpha/journeys/renewal-journey"
		}
	],
	sourcePainPoints: [
		{
			id: "pain-1",
			text: "Users abandon checkout when the form asks for repeated information.",
			sourceLabel: "User Story - Avery Patel"
		},
		{
			id: "pain-2",
			text: "Payment errors leave customers unsure if the order went through.",
			sourceLabel: "User Journey - Payment stage"
		}
	]
};

for (const problem of problemsData) {
	problem.projectId ??= "atlas-2026";
}

datastore.problems = problemsData;
