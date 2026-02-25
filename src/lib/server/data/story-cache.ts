import { storyDraftTemplateData } from "./stories.data";

export const storyDetailsByKey = new Map<string, typeof storyDraftTemplateData>();

export const storyDetailKey = (projectId: string, storyId: string) =>
	`${projectId}:${storyId}`;

export const getStoryCachedDetail = (projectId: string, storyId: string) => {
	return storyDetailsByKey.get(storyDetailKey(projectId, storyId));
};
