import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
	return json(
		{
			status: "ok"
		},
		{
			status: 200,
			headers: {
				"Cache-Control": "no-store"
			}
		}
	);
};
