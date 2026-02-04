export interface Persona {
	id: string;
	name: string;
	role: string;
}

export interface ProblemStatement {
	id: string;
	statement: string;
	status: 'Active' | 'Locked' | 'Archived';
	personas: Persona[];
}

export interface Idea {
	id: string;
	title: string;
	phase: 'Discovery' | 'Definition' | 'Prototyping' | 'Testing' | 'Rejected';
	problemStatement: ProblemStatement;
}

export type TaskStatus = 'Planned' | 'In Progress' | 'Completed' | 'Abandoned';

export interface TaskArtifact {
	id: string;
	name: string;
	url: string;
	type: 'Figma' | 'Doc' | 'Prototype' | 'Other';
}

export interface Task {
	id: string;
	title: string;
	slug: string;
	status: TaskStatus;
	linkedIdea: Idea;
	hypothesis: string;
	plan: string;
	owner: { name: string; avatar?: string } | null;
	deadline: string | null; // ISO Date string
	artifacts: TaskArtifact[];
	notes: string;
}

export const mockTask: Task = {
	id: 'task-123',
	title: 'Visual Deadline Tracker',
	slug: 'visual-deadline-tracker',
	status: 'Planned',
	linkedIdea: {
		id: 'idea-456',
		title: 'Student Dashboard Redesign',
		phase: 'Prototyping',
		problemStatement: {
			id: 'prob-789',
			statement: 'Students struggle to track assignment requirements and deadlines, leading to late submissions.',
			status: 'Locked',
			personas: [
				{ id: 'pers-1', name: 'Alex', role: 'Undergrad Student' },
				{ id: 'pers-2', name: 'Sarah', role: 'TA' }
			]
		}
	},
	hypothesis: 'We believe that showing assignment deadlines visually will reduce confusion for students because they struggle to track requirements in list views.',
	plan: '1. Create a timeline view component.\n2. Integrate with the assignment API.\n3. User test with 5 students.',
	owner: { name: 'Jules Agent' },
	deadline: '2023-12-31',
	artifacts: [
		{ id: 'art-1', name: 'Figma Prototype', url: '#', type: 'Figma' }
	],
	notes: 'Remember to check accessibility contrast ratios for the timeline bars.'
};
