import { getCalendarData } from "$lib/remote/calendar.remote";

export async function load({ params }: { params: { projectId: string } }) {
	const calendarData = await getCalendarData(params.projectId);
	return {
		events: calendarData.events,
		reference: calendarData.reference
	};
}
