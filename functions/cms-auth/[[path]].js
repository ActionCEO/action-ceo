// CMS sign-in. Runs the stock Sveltia authenticator (vendor/sveltia-cms-auth) as a Pages Function, so there is no
// separate Worker to look after. /cms-auth/auth starts the GitHub sign-in, /cms-auth/callback finishes it, and a
// POST to /cms-auth/auth refreshes an expired token. The authenticator expects to live at the site root, so the
// /cms-auth prefix is stripped before it sees the request.
// Needs GITHUB_CLIENT_ID and ALLOWED_DOMAINS (wrangler.toml) and the secret GITHUB_CLIENT_SECRET (Pages settings).
import auth from '../../vendor/sveltia-cms-auth/index.js';

export const onRequest = ({ request, env }) => {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/^\/cms-auth(?=\/|$)/, '') || '/';
  return auth.fetch(new Request(url, request), env);
};
