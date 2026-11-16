// Country lookup for the consent banner. Called once per visit; the answer is kept in sessionStorage.
export const onRequestGet = ({ request }) =>
  new Response(JSON.stringify({ country: request.cf?.country ?? null }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
