import type { Component } from "svelte";
import {
	BookOpen,
	Briefcase,
	ChartLine,
	Code,
	Compass,
	Cpu,
	Database,
	Flag,
	FlaskConical,
	FolderKanban,
	Globe,
	GraduationCap,
	Handshake,
	LayoutGrid,
	Lightbulb,
	Megaphone,
	NotebookPen,
	Palette,
	Rocket,
	ShieldCheck,
	Sparkles,
	Target,
	Users,
	Wrench,
	Zap
} from "@lucide/svelte";
import {
	defaultProjectIconKey,
	projectIconKeys,
	projectIconLabels,
	type ProjectIconKey
} from "$lib/constants/project-icons";

export const projectIconComponentMap: Record<ProjectIconKey, Component> = {
	folderKanban: FolderKanban,
	rocket: Rocket,
	lightbulb: Lightbulb,
	flaskConical: FlaskConical,
	compass: Compass,
	target: Target,
	briefcase: Briefcase,
	layoutGrid: LayoutGrid,
	notebookPen: NotebookPen,
	sparkles: Sparkles,
	code: Code,
	palette: Palette,
	zap: Zap,
	shieldCheck: ShieldCheck,
	chartLine: ChartLine,
	database: Database,
	globe: Globe,
	megaphone: Megaphone,
	users: Users,
	graduationCap: GraduationCap,
	handshake: Handshake,
	wrench: Wrench,
	cpu: Cpu,
	bookOpen: BookOpen,
	flag: Flag
};

export const projectIconOptions = projectIconKeys.map((key) => ({
	key,
	label: projectIconLabels[key],
	icon: projectIconComponentMap[key]
}));

const isProjectIconKey = (value: string): value is ProjectIconKey =>
	Object.prototype.hasOwnProperty.call(projectIconComponentMap, value);

export const resolveProjectIcon = (value: string | null | undefined): Component => {
	if (!value || !isProjectIconKey(value)) {
		return projectIconComponentMap[defaultProjectIconKey];
	}
	return projectIconComponentMap[value];
};
