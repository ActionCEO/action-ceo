// Single-file Worker for a Pages Direct Upload (no Git). It routes the same two endpoints as functions/
// and hands every other request to the static site. When the site moves to Git builds, functions/ is used instead.
import * as contact from '../functions/api/contact.js';
import * as geo from '../functions/api/geo.js';
import * as cmsAuth from '../functions/cms-auth/[[path]].js';

const routes = { '/api/contact': contact, '/api/geo': geo };

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    // CMS sign-in owns everything under /cms-auth.
    const mod = pathname.startsWith('/cms-auth/') ? cmsAuth : routes[pathname];
    if (!mod) return env.ASSETS.fetch(request);
    const method = request.method.charAt(0) + request.method.slice(1).toLowerCase();
    const handler = mod[`onRequest${method}`] ?? mod.onRequest;
    if (!handler) return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, POST' } });
    return handler({ request, env, params: {}, data: {}, waitUntil: (p) => ctx.waitUntil(p), next: () => env.ASSETS.fetch(request) });
  },
};
