import { getCalendarEventData } from "$lib/remote/calendar.remote";

export async function load({ params }: { params: { projectId: string; eventId: string } }) {
	return {
		eventData: await getCalendarEventData({ projectId: params.projectId, eventId: params.eventId })
	};
}
