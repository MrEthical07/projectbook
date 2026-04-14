export type LegalCard = {
	title: string;
	description: string;
};

export type LegalSection = {
	id: string;
	title: string;
	paragraphs: string[];
	bullets?: string[];
	cards?: LegalCard[];
};

export type LegalLink = {
	href: string;
	label: string;
};

export type LegalDocumentData = {
	eyebrow: string;
	title: string;
	description: string;
	lastUpdated: string;
	reviewNotice: string;
	relatedLinks: LegalLink[];
	sections: LegalSection[];
};

const lastUpdated = "April 5, 2026";

export const privacyPolicy: LegalDocumentData = {
	eyebrow: "Legal",
	title: "Privacy Policy",
	description:
		"ProjectBook is built for collaborative design-thinking work. This policy explains what information the service handles, why it is used, how cookies support core product behavior, and what choices users and deployment operators should review before a production release.",
	lastUpdated,
	reviewNotice:
		"This page is a branded ProjectBook template based on the current repository behavior. It should be reviewed by legal counsel before production use.",
	relatedLinks: [
		{ href: "/terms-and-conditions", label: "Read the Terms and Conditions" }
	],
	sections: [
		{
			id: "scope",
			title: "Scope and purpose",
			paragraphs: [
				"This Privacy Policy describes how ProjectBook handles information when people sign in, create accounts, collaborate in projects, and use project tools across the application.",
				"It is written for the current ProjectBook repository, which is a SvelteKit application with account authentication, project collaboration, project artifacts, and browser cookies that support sign-in, notices, sidebar preferences.",
				"If a specific deployment of ProjectBook adds third-party services, integrations, or regulatory disclosures that are not present in this repository, that deployment should publish supplemental privacy details."
			]
		},
		{
			id: "information-collected",
			title: "Information ProjectBook may collect",
			paragraphs: [
				"ProjectBook may handle information that users provide directly, information created while using the product, and limited technical data needed to secure and operate the service.",
				"The current repository behavior supports the following categories of information."
			],
			cards: [
				{
					title: "Account and profile information",
					description:
						"Examples include name, email address, login credentials, account verification state, and password-reset related records."
				},
				{
					title: "Project content",
					description:
						"Examples include projects, stories, journeys, problem statements, ideas, tasks, feedback, pages, resources, calendars, notifications, invites, and other collaboration records users create or view in the product."
				},
				{
					title: "Authentication and security data",
					description:
						"Examples include session identifiers, verification tokens, reset tokens, rate-limit events, request IDs, and security-related metadata used to prevent abuse or maintain access control."
				},
				{
					title: "Browser, device, and usage context",
					description:
						"Examples include IP-based request limiting, browser cookie state, navigation context, and preference information needed to keep the interface usable."
				}
			]
		},
		{
			id: "cookies",
			title: "Cookies and browser technologies",
			paragraphs: [
				"ProjectBook uses cookies and similar browser state to provide core application behavior. Some of these technologies are essential for authentication or state continuity, while others support interface preferences.",
				"This repository does not currently include a separate cookie banner or preference center. Users can use browser controls to manage cookies, but disabling essential cookies may prevent sign-in or break core workflows."
			],
			cards: [
				{
					title: "projectbook_session",
					description:
						"An HTTP-only session cookie used to keep an authenticated browser signed in. In the current implementation, it lasts about 7 days by default or up to 30 days when the user selects remember me."
				},
				{
					title: "projectbook_auth_notice",
					description:
						"A short-lived notice cookie used to pass one-time auth messages between pages, such as password reset or verification confirmations."
				},
				{
					title: "sidebar:state",
					description:
						"A browser cookie used to remember whether the sidebar is expanded or collapsed so the interface returns in the preferred layout."
				}
			],
			bullets: [
				"Essential cookies support login, session continuity, and protected-route access.",
				"Preference cookies support interface behavior such as sidebar state.",
				"Cookie names, durations, and purposes should be reviewed again if the deployment model changes."
			]
		},
		{
			id: "use-of-information",
			title: "How ProjectBook may use information",
			paragraphs: [
				"ProjectBook may use information to create and manage accounts, authenticate sessions, protect the application from abuse, and make project collaboration possible.",
				"Information may also be used to render dashboards, load project artifacts, support password reset and email verification flows, enforce permissions, and preserve product state that users expect across requests.",
				"Where a deployment adds support, operational teams may also use information to troubleshoot service issues, respond to support requests, maintain reliability, or comply with legal obligations."
			]
		},
		{
			id: "sharing",
			title: "How information may be shared",
			paragraphs: [
				"Within the product, information is shared with authorized project participants according to account permissions, role assignments, and the pages they can access.",
				"Outside the product, information may be disclosed when reasonably necessary to host, secure, maintain, investigate, or legally protect a ProjectBook deployment.",
				"This repository does not describe selling personal information. If a production deployment introduces third-party processors, analytics, or other integrations, the operator of that deployment should disclose them clearly."
			]
		},
		{
			id: "retention",
			title: "Retention",
			paragraphs: [
				"ProjectBook retains information for as long as needed to operate the service, maintain account continuity, support collaboration records, and satisfy security or legal needs appropriate for the deployment.",
				"Production operators should align retention schedules with contractual requirements, legal obligations, and the practical need to preserve project history."
			]
		},
		{
			id: "security",
			title: "Security",
			paragraphs: [
				"ProjectBook uses reasonable technical measures in the current codebase to protect accounts and sessions, including password hashing, HTTP-only session cookies for core authentication, permission checks, and rate limiting.",
				"No internet service can guarantee absolute security, and deployment choices matter. Operators should evaluate hosting, transport security, backup practices, access logging, and incident response procedures before using ProjectBook in production."
			]
		},
		{
			id: "choices-rights",
			title: "User choices and privacy rights",
			paragraphs: [
				"Users may have choices regarding account information, cookie controls, and the content they create or remove inside the product, subject to organizational settings and legal obligations.",
				"Depending on the jurisdiction and deployment, users may also have rights to request access, correction, deletion, or portability of certain personal information. ProjectBook does not make jurisdiction-specific promises in this template.",
				"If a deployment collects personal information in ways that trigger additional notice, consent, or opt-out obligations, that deployment should publish the required disclosures and request-handling process."
			]
		},
		{
			id: "children",
			title: "Children's privacy",
			paragraphs: [
				"ProjectBook is intended for professional, educational, or organizational collaboration use and is not designed as a service directed to children.",
				"If an operator learns that personal information was submitted in a way that conflicts with applicable rules for children, that operator should review the submission and remove or remediate it as appropriate."
			]
		},
		{
			id: "updates-contact",
			title: "Policy updates and contact",
			paragraphs: [
				"ProjectBook may update this Privacy Policy as the service, legal obligations, or deployment model changes. When that happens, the updated version should be posted with a new effective or last-updated date.",
				"This repository does not publish a dedicated legal or privacy contact email. Questions should be directed through the support, administrator, or account-management channel made available in the relevant ProjectBook deployment until a specific legal contact is published."
			]
		}
	]
};

export const termsAndConditions: LegalDocumentData = {
	eyebrow: "Legal",
	title: "Terms and Conditions",
	description:
		"These Terms and Conditions govern access to and use of ProjectBook. They explain account responsibilities, acceptable use, service limits, cookie-related product behavior, and the contractual guardrails users should understand before relying on the service.",
	lastUpdated,
	reviewNotice:
		"This page is a ProjectBook template for the current repository behavior. It should be reviewed and adapted by counsel before production use.",
	relatedLinks: [{ href: "/privacy-policy", label: "Read the Privacy Policy" }],
	sections: [
		{
			id: "acceptance",
			title: "Acceptance of the terms",
			paragraphs: [
				"By accessing or using ProjectBook, you agree to these Terms and Conditions. If you use ProjectBook on behalf of an organization, you represent that you have authority to bind that organization to these terms.",
				"If you do not agree to these terms, you should not access or use the service."
			]
		},
		{
			id: "eligibility-account",
			title: "Eligibility and account responsibilities",
			paragraphs: [
				"You must provide accurate account information and keep your login credentials reasonably secure. You are responsible for activity that occurs through your account unless the activity results from the service operator's own failure to protect access controls.",
				"ProjectBook may require account verification, password controls, session management, and other security steps before granting or restoring access."
			]
		},
		{
			id: "acceptable-use",
			title: "Acceptable use",
			paragraphs: [
				"You may use ProjectBook only for lawful purposes and in a way that does not interfere with the service, other users, or the security of the environment.",
				"You may not attempt to bypass permissions, misuse another person's account, introduce harmful code, reverse engineer protected parts of the service beyond what law permits, or use ProjectBook to store or distribute unlawful or infringing material."
			],
			bullets: [
				"Do not attempt unauthorized access to projects or accounts.",
				"Do not use the service to disrupt availability, abuse rate limits, or degrade other users' experience.",
				"Do not upload or publish material you do not have the right to use."
			]
		},
		{
			id: "content-license",
			title: "User content and service license",
			paragraphs: [
				"Users retain responsibility for the content they submit to ProjectBook, including project records, project artifacts, uploaded resources, and collaboration notes.",
				"To operate the service, users grant ProjectBook and the relevant deployment operator a limited license to host, process, display, back up, and transmit submitted content as necessary to provide the product's features and maintain the environment.",
				"That license ends when the content is deleted or the account relationship ends, except where retention is reasonably required for backups, legal obligations, dispute resolution, or security review."
			]
		},
		{
			id: "intellectual-property",
			title: "Intellectual property",
			paragraphs: [
				"ProjectBook, including its interface, software, branding, and documentation, is protected by applicable intellectual property laws except where rights are granted by open-source licenses or other written terms.",
				"These terms do not transfer ownership of the service itself. They only grant a limited right to use ProjectBook in accordance with the published features and rules of the relevant deployment."
			]
		},
		{
			id: "cookies-browser-tech",
			title: "Cookies and browser technologies",
			paragraphs: [
				"ProjectBook uses cookies and related browser state as part of normal service operation, including session continuity, one-time auth notices, sidebar preferences, and scoped application state.",
				"Examples in this repository include `projectbook_session`, `projectbook_auth_notice`, `sidebar:state`, and `projectbook_scope_state*`. Some are essential for access and core functionality, so disabling them may prevent normal use of the service.",
				"For a fuller explanation of how these technologies are used, please review the Privacy Policy."
			]
		},
		{
			id: "availability-changes",
			title: "Service availability and changes",
			paragraphs: [
				"ProjectBook may evolve over time. Features may be added, changed, limited, or removed as the product, infrastructure, or compliance needs change.",
				"The service may be unavailable from time to time because of maintenance, outages, upgrades, security responses, or third-party infrastructure issues. ProjectBook does not promise uninterrupted availability unless a separate written agreement says otherwise."
			]
		},
		{
			id: "suspension-termination",
			title: "Suspension and termination",
			paragraphs: [
				"ProjectBook may suspend or terminate access if a user violates these terms, creates security risk, misuses the service, or if continued access would expose the operator or other users to harm.",
				"Users may also stop using the service at any time, subject to any organization-specific access or recordkeeping obligations that apply to their projects."
			]
		},
		{
			id: "disclaimers",
			title: "Disclaimers",
			paragraphs: [
				"Unless a separate written agreement states otherwise, ProjectBook is provided on an as-is and as-available basis. To the extent permitted by law, warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted service are disclaimed.",
			]
		},
		{
			id: "liability",
			title: "Limitation of liability",
			paragraphs: [
				"To the extent permitted by law, ProjectBook and its operators are not liable for indirect, incidental, special, consequential, exemplary, or punitive damages arising from or related to use of the service.",
				"To the extent a limitation of liability may be applied, total liability should not exceed the amount paid for the service during the applicable claim period or, if no amount was paid, a nominal amount consistent with applicable law and the governing agreement for the deployment."
			]
		},
		{
			id: "updates-contact",
			title: "Updates and contact",
			paragraphs: [
				"ProjectBook may revise these terms as the product and its legal or operational requirements change. Updated terms should be posted with a revised effective or last-updated date.",
				"This template does not publish a dedicated legal contact or governing-law clause. Questions should be directed through the support, administrator, or account-management channel provided by the relevant ProjectBook deployment until those details are formally published."
			]
		}
	]
};