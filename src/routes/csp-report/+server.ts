import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    await request.text(); 
  } catch {
    // ignore malformed reports
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet'
    }
  });
}