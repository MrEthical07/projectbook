import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    await request.text(); 
  } catch {
    // ignore malformed reports
  }

  return new Response(null, { status: 204 });
}