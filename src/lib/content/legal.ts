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

const lastUpdated = "April 19, 2026";

export const privacyPolicy: LegalDocumentData = {
	eyebrow: "Legal",
	title: "Privacy Policy",
	description:
		"This Privacy Policy describes how ProjectBook collects, uses, and protects your information when you use the Platform.",
	lastUpdated,
	reviewNotice:
		"For general privacy communication, contact contact@projectbook.dev. For security concerns, contact security@projectbook.dev.",
	relatedLinks: [
		{ href: "/terms-and-conditions", label: "Read the Terms and Conditions" }
	],
	sections: [
		{
			id: "introduction",
			title: "1. Introduction",
			paragraphs: [
				"This Privacy Policy describes how ProjectBook (\"we\", \"us\", \"our\") collects, uses, and protects your information when you use the Platform."
			]
		},
		{
			id: "information-collected",
			title: "2. Information We Collect",
			paragraphs: [
				"We collect account, usage, and technical information required to operate and protect the Platform."
			],
			cards: [
				{
					title: "a. Account Information",
					description: "Name, email address, and authentication-related data."
				},
				{
					title: "b. Usage Information",
					description:
						"Actions performed within the Platform, feature interaction data, and system activity logs."
				},
				{
					title: "c. Technical Information",
					description:
						"IP address, device and browser details, timestamps, and request metadata."
				}
			]
		},
		{
			id: "how-we-use",
			title: "3. How We Use Information",
			paragraphs: [
				"We use collected data to provide and operate the Platform, authenticate users and manage sessions, maintain security and prevent abuse, monitor performance and improve functionality, and detect and respond to unauthorized or harmful activity."
			],
			bullets: [
				"Provide and operate the Platform",
				"Authenticate users and manage sessions",
				"Maintain security and prevent abuse",
				"Monitor performance and improve functionality",
				"Detect and respond to unauthorized or harmful activity"
			]
		},
		{
			id: "legal-basis",
			title: "4. Legal Basis for Processing (Where Applicable)",
			paragraphs: [
				"Where required by law, we process personal data based on performance of a contract, legitimate interests (such as security and system improvement), and user consent where applicable."
			]
		},
		{
			id: "data-sharing",
			title: "5. Data Sharing",
			paragraphs: [
				"We do not sell user data.",
				"We may share data only with service providers necessary to operate the Platform (such as hosting infrastructure), when required by law or legal process, or to protect the rights, safety, or integrity of the Platform and its users."
			]
		},
		{
			id: "retention",
			title: "6. Data Retention",
			paragraphs: [
				"We retain data only for as long as necessary to provide the service, fulfill legal obligations, resolve disputes, and enforce agreements.",
				"You may request deletion of your data, subject to operational and legal constraints."
			]
		},
		{
			id: "security",
			title: "7. Data Security",
			paragraphs: [
				"We implement reasonable technical and organizational measures to protect your data. However, no system can guarantee absolute security.",
				"For security communication, contact security@projectbook.dev."
			]
		},
		{
			id: "user-rights",
			title: "8. User Rights",
			paragraphs: [
				"Depending on your jurisdiction, you may have rights to access your personal data, request correction of inaccurate data, request deletion of your data, and object to or restrict certain processing.",
				"To exercise these rights, contact contact@projectbook.dev."
			],
			bullets: [
				"Access your personal data",
				"Request correction of inaccurate data",
				"Request deletion of your data",
				"Object to or restrict certain processing"
			]
		},
		{
			id: "cookies",
			title: "9. Cookies and Session Management",
			paragraphs: [
				"We use essential cookies and session mechanisms required for authentication, security, and performance.",
				"We do not use unnecessary tracking or profiling technologies."
			],
			bullets: ["Authentication", "Security", "Performance"]
		},
		{
			id: "third-party",
			title: "10. Third-Party Services",
			paragraphs: [
				"We may rely on third-party infrastructure providers to operate the Platform. These providers process data only as necessary to deliver their services."
			]
		},
		{
			id: "children",
			title: "11. Children's Privacy",
			paragraphs: [
				"The Platform is not intended for individuals under the age of 13, or the minimum legal age in their jurisdiction.",
				"We do not knowingly collect personal data from such individuals. If such data is identified, it will be deleted."
			]
		},
		{
			id: "changes",
			title: "12. Changes to This Policy",
			paragraphs: [
				"We may update this Privacy Policy from time to time.",
				"Continued use of the Platform after updates constitutes acceptance of the revised Policy."
			]
		},
		{
			id: "contact",
			title: "13. Contact",
			paragraphs: [
				"For privacy-related inquiries, contact contact@projectbook.dev.",
				"For security matters, contact security@projectbook.dev."
			]
		}
	]
};

export const termsAndConditions: LegalDocumentData = {
	eyebrow: "Legal",
	title: "Terms and Conditions",
	description:
		"These Terms of Service govern your access to and use of ProjectBook. By using the Platform, you agree to these Terms.",
	lastUpdated,
	reviewNotice:
		"For all communication, use contact@projectbook.dev. For security communication, use security@projectbook.dev.",
	relatedLinks: [{ href: "/privacy-policy", label: "Read the Privacy Policy" }],
	sections: [
		{
			id: "introduction",
			title: "1. Introduction",
			paragraphs: [
				"Welcome to ProjectBook (\"Platform\", \"Service\", \"we\", \"us\", or \"our\"). These Terms of Service govern your access to and use of the Platform.",
				"By accessing or using ProjectBook, you agree to be bound by these Terms. If you do not agree, you must not use the Platform."
			]
		},
		{
			id: "eligibility",
			title: "2. Eligibility",
			paragraphs: [
				"You must be at least 13 years old, or the minimum legal age required in your jurisdiction, to use the Platform.",
				"By using the Platform, you represent and warrant that you meet this requirement."
			]
		},
		{
			id: "account-registration-security",
			title: "3. Account Registration and Security",
			paragraphs: [
				"To access certain features, you may be required to create an account.",
				"You agree to provide accurate and complete information, maintain the confidentiality of your login credentials, and be responsible for all activities under your account.",
				"We are not liable for any loss or damage resulting from unauthorized access due to your failure to secure your account."
			],
			bullets: [
				"Provide accurate and complete information",
				"Maintain the confidentiality of your login credentials",
				"Be responsible for all activities under your account"
			]
		},
		{
			id: "use-of-platform",
			title: "4. Use of the Platform",
			paragraphs: [
				"You agree to use the Platform only for lawful purposes and in accordance with these Terms."
			],
			bullets: [
				"Attempt to gain unauthorized access to systems, accounts, or data",
				"Interfere with or disrupt platform performance or availability",
				"Upload or distribute malicious code or harmful content",
				"Circumvent authentication, security measures, or system protections",
				"Engage in abusive, fraudulent, or harmful behavior"
			]
		},
		{
			id: "user-content",
			title: "5. User Content",
			paragraphs: [
				"You retain ownership of all content you create, upload, or store on the Platform.",
				"By using the Platform, you grant ProjectBook a limited, non-exclusive, worldwide license to store, process, and display your content solely for the purpose of operating, maintaining, and improving the service."
			],
			bullets: ["Store", "Process", "Display"]
		},
		{
			id: "system-integrity",
			title: "6. System Integrity and Abuse Prevention",
			paragraphs: [
				"You agree not to exploit vulnerabilities or system weaknesses, abuse system resources or platform functionality, or attempt to bypass safeguards such as authentication or access controls.",
				"We reserve the right to monitor usage and take appropriate action to maintain system integrity.",
				"For security-related reports, contact security@projectbook.dev."
			],
			bullets: [
				"Exploit vulnerabilities or system weaknesses",
				"Abuse system resources or platform functionality",
				"Attempt to bypass safeguards such as authentication or access controls"
			]
		},
		{
			id: "service-availability",
			title: "7. Service Availability",
			paragraphs: [
				"We aim to provide a reliable service; however, we do not guarantee uninterrupted or error-free availability.",
				"The Platform may be temporarily unavailable due to maintenance, updates, or technical issues beyond our control."
			],
			bullets: ["Maintenance", "Updates", "Technical issues beyond our control"]
		},
		{
			id: "termination",
			title: "8. Termination",
			paragraphs: [
				"We reserve the right to suspend or terminate your access to the Platform if you violate these Terms, if your activity poses a risk to the Platform or other users, or where necessary to protect system integrity.",
				"You may discontinue use of the Platform at any time."
			],
			bullets: [
				"If you violate these Terms",
				"If your activity poses a risk to the Platform or other users",
				"Where necessary to protect system integrity"
			]
		},
		{
			id: "disclaimer",
			title: "9. Disclaimer of Warranties",
			paragraphs: [
				"The Platform is provided on an as-is and as-available basis.",
				"We make no warranties, express or implied, regarding reliability, availability, accuracy, or fitness for a particular purpose."
			],
			bullets: ["Reliability", "Availability", "Accuracy", "Fitness for a particular purpose"]
		},
		{
			id: "liability",
			title: "10. Limitation of Liability",
			paragraphs: [
				"To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages.",
				"Our total liability shall not exceed the amount paid by you (if any) for using the Platform."
			],
			bullets: [
				"No liability for indirect, incidental, or consequential damages",
				"Total liability capped at the amount paid by you, if any"
			]
		},
		{
			id: "changes",
			title: "11. Changes to Terms",
			paragraphs: [
				"We may update these Terms from time to time.",
				"Continued use of the Platform after changes become effective constitutes acceptance of the revised Terms."
			]
		},
		{
			id: "governing-law",
			title: "12. Governing Law",
			paragraphs: [
				"These Terms shall be governed by and interpreted in accordance with the laws applicable in your jurisdiction."
			]
		},
		{
			id: "contact",
			title: "13. Contact",
			paragraphs: [
				"For questions regarding these Terms, contact contact@projectbook.dev.",
				"For security matters, contact security@projectbook.dev."
			]
		}
	]
};
