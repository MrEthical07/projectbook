// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	enum MemberRole {
		Owner = "Owner",
		Admin = "Admin",
		Editor = "Editor",
		Viewer = "Viewer",
	}
	namespace App {
		
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
