export const projectIconKeys = [
	"folderKanban",
	"rocket",
	"lightbulb",
	"flaskConical",
	"compass",
	"target",
	"briefcase",
	"layoutGrid",
	"notebookPen",
	"sparkles",
	"code",
	"palette",
	"zap",
	"shieldCheck",
	"chartLine",
	"database",
	"globe",
	"megaphone",
	"users",
	"graduationCap",
	"handshake",
	"wrench",
	"cpu",
	"bookOpen",
	"flag"
] as const;

export type ProjectIconKey = (typeof projectIconKeys)[number];

export const defaultProjectIconKey: ProjectIconKey = "folderKanban";

export const projectIconLabels: Record<ProjectIconKey, string> = {
	folderKanban: "Kanban",
	rocket: "Rocket",
	lightbulb: "Lightbulb",
	flaskConical: "Flask",
	compass: "Compass",
	target: "Target",
	briefcase: "Briefcase",
	layoutGrid: "Grid",
	notebookPen: "Notebook",
	sparkles: "Sparkles",
	code: "Code",
	palette: "Palette",
	zap: "Zap",
	shieldCheck: "Shield",
	chartLine: "Chart",
	database: "Database",
	globe: "Globe",
	megaphone: "Megaphone",
	users: "Users",
	graduationCap: "Graduation",
	handshake: "Handshake",
	wrench: "Wrench",
	cpu: "CPU",
	bookOpen: "Book",
	flag: "Flag"
};
