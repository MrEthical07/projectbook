import { journeyDraftTemplateData } from "./journeys.data";

export const journeyDetailsByKey = new Map<string, typeof journeyDraftTemplateData>();

export const journeyDetailKey = (projectId: string, journeyId: string) =>
	`${projectId}:${journeyId}`;

export const getJourneyCachedDetail = (projectId: string, journeyId: string) => {
	return journeyDetailsByKey.get(journeyDetailKey(projectId, journeyId));
};
