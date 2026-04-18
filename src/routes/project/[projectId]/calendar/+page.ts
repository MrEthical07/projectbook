import { getCalendarData } from "$lib/remote/calendar.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const calendarData = await getCalendarData({ projectId: params.projectId, limit: 20 });
	return {
		events: calendarData.events,
		nextCursor: calendarData.nextCursor,
		reference: calendarData.reference
	};
}
