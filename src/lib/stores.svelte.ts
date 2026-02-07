import { browser } from '$app/environment';
import type { GlobalState, Project, TaskRow, CalendarEvent, Notification, Invite, User, Artifact } from './types';

// Initial Mock Data
const initialUser: User = {
    id: "u-1",
    displayName: "Avery Patel",
    handle: "avery",
    email: "avery@league.dev",
    bio: "Product design lead exploring new workflow systems.",
    status: "Active",
    settings: {
        theme: "System",
        density: "Comfortable",
        landing: "Last Project",
        timeFormat: "24-hour",
        inAppNotifications: true,
        emailNotifications: true
    },
    sessions: [
        {
            id: "sess-1",
            device: "MacBook Pro · Chrome",
            location: "San Francisco, CA",
            lastActive: "Active now",
            current: true,
        },
        {
            id: "sess-2",
            device: "iPhone 15 · Safari",
            location: "San Francisco, CA",
            lastActive: "2 hours ago",
            current: false,
        },
        {
            id: "sess-3",
            device: "Windows PC · Edge",
            location: "Austin, TX",
            lastActive: "2 days ago",
            current: false,
        },
    ]
};

const initialProjects: Project[] = [
    {
        id: "atlas-2026", // Matching the ID used in settings mock
        name: "Atlas Research", // Matching notification mock
        description: "Core product research and prototype delivery.",
        status: "Active",
        members: [
            {
                id: "mem-1",
                name: "Avery Patel",
                email: "avery@league.dev",
                role: "Owner",
                status: "Active",
                joinedAt: "2026-02-04",
            },
            {
                id: "mem-2",
                name: "Nia Clark",
                email: "nia@league.dev",
                role: "Admin",
                status: "Active",
                joinedAt: "2026-02-05",
            },
            {
                id: "mem-3",
                name: "Jordan Lee",
                email: "jordan@league.dev",
                role: "Editor",
                status: "Invited",
                joinedAt: "2026-02-06",
            },
        ],
        features: {
            whiteboards: true,
            advancedDatabases: true,
            calendarManualEvents: true,
            resourceVersioning: true,
            feedbackAggregation: true,
        },
        notifications: {
            artifactCreated: true,
            artifactLocked: true,
            feedbackAdded: true,
            resourceUpdated: true,
            deliveryChannel: "In-app",
        },
        permissions: {
            create: { Owner: true, Admin: true, Editor: true, Viewer: false },
            edit: { Owner: true, Admin: true, Editor: true, Viewer: false },
            lock: { Owner: true, Admin: true, Editor: false, Viewer: false },
            archive: { Owner: true, Admin: false, Editor: false, Viewer: false },
            manage_members: { Owner: true, Admin: true, Editor: false, Viewer: false },
            edit_settings: { Owner: true, Admin: true, Editor: false, Viewer: false }
        }
    },
    {
        id: "northwind",
        name: "Northwind Revamp",
        description: "Reframe the testing experience and consolidate insight reports.",
        status: "Active",
        members: [],
        features: {
            whiteboards: true,
            advancedDatabases: false,
            calendarManualEvents: true,
            resourceVersioning: true,
            feedbackAggregation: false,
        },
        notifications: {
            artifactCreated: true,
            artifactLocked: false,
            feedbackAdded: true,
            resourceUpdated: false,
            deliveryChannel: "Email",
        }
    }
];

const initialTasks: TaskRow[] = [
    {
        id: "deadline-lane-prototype",
        projectId: "atlas-2026",
        title: "Prototype deadline lane interaction",
        linkedIdea: "Deadline lane view",
        linkedProblemStatement: "Students need a clear way to track assignment deadlines.",
        persona: "Avery Patel",
        owner: "Avery Patel",
        deadline: "2026-02-09",
        status: "In Progress",
        ideaRejected: false,
        hasFeedback: false,
        isOrphan: false,
        planItems: [""],
        executionLinks: [""],
        hypothesis: "",
        notes: ""
    },
    {
        id: "reminder-card-test",
        projectId: "atlas-2026",
        title: "Test reminder card comprehension",
        linkedIdea: "Smart reminder bundles",
        linkedProblemStatement: "New creators need confidence during setup.",
        persona: "Liam Gomez",
        owner: "Nia Clark",
        deadline: "2026-02-11",
        status: "Planned",
        ideaRejected: true,
        hasFeedback: false,
        isOrphan: false,
        planItems: [""],
        executionLinks: [""],
        hypothesis: "",
        notes: ""
    },
    {
        id: "handoff-visibility-run",
        projectId: "atlas-2026",
        title: "Run handoff visibility experiment",
        linkedIdea: "Assistant chat coach",
        linkedProblemStatement: "Team leads need visibility into handoffs.",
        persona: "Priya Sharma",
        owner: "Dr. Ramos",
        deadline: "2026-02-01",
        status: "Completed",
        ideaRejected: false,
        hasFeedback: false,
        isOrphan: false,
        planItems: [""],
        executionLinks: [""],
        hypothesis: "",
        notes: ""
    },
    {
        id: "legacy-flow-audit",
        projectId: "atlas-2026",
        title: "Audit legacy flow assumptions",
        linkedIdea: "Legacy path review",
        linkedProblemStatement: "",
        persona: "Unknown",
        owner: "Avery Patel",
        deadline: "2026-01-27",
        status: "Abandoned",
        ideaRejected: false,
        hasFeedback: false,
        isOrphan: true,
        planItems: [""],
        executionLinks: [""],
        hypothesis: "",
        notes: ""
    }
];

const today = new Date().toISOString().split("T")[0];
const addDays = (date: string, amount: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + amount);
    return d.toISOString().split("T")[0];
};

const initialEvents: CalendarEvent[] = [
    {
        id: "evt-1",
        projectId: "atlas-2026",
        title: "Prototype deadline",
        type: "Derived",
        start: today,
        end: today,
        allDay: true,
        owner: "Avery Patel",
        phase: "Prototype",
        artifactType: "Task",
        sourceTitle: "Task - Timeline prototype",
        createdAt: today,
    },
    {
        id: "evt-2",
        projectId: "atlas-2026",
        title: "Usability testing session",
        type: "Derived",
        start: addDays(today, 4),
        end: addDays(today, 4),
        allDay: false,
        startTime: "14:00",
        endTime: "15:00",
        owner: "Nia Clark",
        phase: "Test",
        artifactType: "Feedback",
        sourceTitle: "Feedback - Reminder test",
        createdAt: today,
    },
    {
        id: "evt-3",
        projectId: "atlas-2026",
        title: "Weekly prototype review",
        type: "Manual",
        start: addDays(today, 2),
        end: addDays(today, 2),
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
        createdAt: today,
    }
];

const initialArtifacts: Artifact[] = [
    { id: "s1", projectId: "atlas-2026", kind: "story", title: "User 1", slug: "user-1", createdAt: today },
    { id: "j1", projectId: "atlas-2026", kind: "journey", title: "User 1", slug: "user-1", createdAt: today },
    { id: "p1", projectId: "atlas-2026", kind: "problem", title: "User 1", slug: "user-1", createdAt: today },
    { id: "i1", projectId: "atlas-2026", kind: "idea", title: "Idea 1", slug: "idea-1", createdAt: today },
    { id: "w1", projectId: "atlas-2026", kind: "whiteboard", title: "Whiteboard 1", slug: "whiteboard-1", createdAt: today },
    { id: "f1", projectId: "atlas-2026", kind: "feedback", title: "Feedback 1", slug: "feedback-1", createdAt: today },
    { id: "pg1", projectId: "atlas-2026", kind: "page", title: "Welcome", slug: "welcome", createdAt: today },
];

const initialNotifications: Notification[] = [
    {
        id: "n-1",
        title: "Task assigned",
        description: "You were assigned to “Prototype onboarding flow”.",
        project: "Atlas Research",
        projectId: "atlas-2026",
        sourceType: "Project Activity",
        read: false,
        timestamp: "2m ago",
    },
    {
        id: "n-2",
        title: "Invitation to project",
        description: "Join “Northwind revamp” as a Contributor.",
        project: "Northwind revamp",
        projectId: "northwind",
        sourceType: "Project Invitation",
        read: false,
        timestamp: "1h ago",
        inviter: "Maya Singh",
        role: "Member",
    },
    {
        id: "n-3",
        title: "Problem statement locked",
        description: "“Checkout anxiety in students” is now locked.",
        project: "Atlas Research",
        projectId: "atlas-2026",
        sourceType: "Project Activity",
        read: true,
        timestamp: "Yesterday",
    },
    {
        id: "n-4",
        title: "Security notice",
        description: "New login detected on MacBook Pro · Chrome.",
        sourceType: "System Notification",
        read: false,
        timestamp: "2 days ago",
    },
];

const initialInvites: Invite[] = [
    {
        id: "inv-1",
        projectName: "Atlas Research",
        projectDescription: "Prototype new onboarding flows for early-stage cohorts.",
        projectStatus: "Active",
        projectId: "atlas-2026",
        inviterName: "Maya Singh",
        inviterRole: "Owner",
        inviterEmail: "maya@league.dev",
        assignedRole: "Editor",
        sentAt: "Feb 3, 2026",
        expiresAt: "Feb 10, 2026",
    },
    {
        id: "inv-2",
        projectName: "Northwind Revamp",
        projectDescription: "Reframe the testing experience and consolidate insight reports.",
        projectStatus: "Active",
        inviterName: "Jordan Lee",
        inviterRole: "Admin",
        inviterEmail: "jordan@northwind.io",
        assignedRole: "Viewer",
        sentAt: "Jan 28, 2026",
        expired: true,
    },
];

const STORAGE_KEY = 'app-state-v1';

function createStore() {
    let state = $state<GlobalState>({
        user: initialUser,
        projects: initialProjects,
        tasks: initialTasks,
        events: initialEvents,
        artifacts: initialArtifacts,
        notifications: initialNotifications,
        invites: initialInvites
    });

    // Initialize from localStorage if available
    if (browser) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Merge with initial state to ensure structure is correct
                state = { ...state, ...parsed };
            } catch (e) {
                console.error("Failed to parse stored state", e);
            }
        }
    }

    // Persist to localStorage on change
    $effect.root(() => {
        $effect(() => {
            if (browser) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            }
        });
    });

    return {
        get user() { return state.user },
        set user(u) { state.user = u },

        get projects() { return state.projects },
        get tasks() { return state.tasks },
        get events() { return state.events },
        get artifacts() { return state.artifacts },
        get notifications() { return state.notifications },
        get invites() { return state.invites },

        // User Actions
        updateUser(updates: Partial<User>) {
            state.user = { ...state.user, ...updates };
        },
        updateUserSettings(updates: Partial<typeof state.user.settings>) {
            state.user.settings = { ...state.user.settings, ...updates };
        },
        logout() {
            // Reset to initial state or handle as needed.
            // For now, let's just clear user data effectively or redirect.
            // In a real app, this would clear tokens.
            localStorage.removeItem(STORAGE_KEY);
            // We might want to reload the page or redirect to /logout to handle the UI part
        },

        // Project Actions
        addProject(project: Project) {
            state.projects = [...state.projects, project];
        },
        updateProject(id: string, updates: Partial<Project>) {
            state.projects = state.projects.map(p => p.id === id ? { ...p, ...updates } : p);
        },
        deleteProject(id: string) {
            state.projects = state.projects.filter(p => p.id !== id);
        },

        // Task Actions
        addTask(task: TaskRow) {
            state.tasks = [task, ...state.tasks];
        },
        updateTask(id: string, updates: Partial<TaskRow>) {
            state.tasks = state.tasks.map(t => t.id === id ? { ...t, ...updates } : t);
        },
        deleteTask(id: string) {
            state.tasks = state.tasks.filter(t => t.id !== id);
        },

        // Event Actions
        addEvent(event: CalendarEvent) {
            state.events = [...state.events, event];
        },
        updateEvent(id: string, updates: Partial<CalendarEvent>) {
            state.events = state.events.map(e => e.id === id ? { ...e, ...updates } : e);
        },
        deleteEvent(id: string) {
            state.events = state.events.filter(e => e.id !== id);
        },

        // Artifact Actions
        addArtifact(artifact: Artifact) {
            state.artifacts = [...state.artifacts, artifact];
        },
        updateArtifact(id: string, updates: Partial<Artifact>) {
            state.artifacts = state.artifacts.map(a => a.id === id ? { ...a, ...updates } : a);
        },
        deleteArtifact(id: string) {
            state.artifacts = state.artifacts.filter(a => a.id !== id);
        },

        // Notification Actions
        markNotificationRead(id: string) {
            state.notifications = state.notifications.map(n => n.id === id ? { ...n, read: true } : n);
        },
        markAllNotificationsRead() {
            state.notifications = state.notifications.map(n => ({ ...n, read: true }));
        },
        dismissNotification(id: string) {
            state.notifications = state.notifications.map(n => n.id === id ? { ...n, dismissed: true } : n);
        },

        // Invite Actions
        removeInvite(id: string) {
            state.invites = state.invites.filter(i => i.id !== id);
        }
    };
}

export const store = createStore();
