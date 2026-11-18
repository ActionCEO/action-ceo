// Contact and booking forms. Turnstile check, write to D1, alert Action on Telegram.
// The raw IP is never stored: only a salted SHA-256 hash, with the salt version.
const TYPES = ['Speaking', 'Hosting or guest spot', 'LFG partnership', 'Sponsorship', 'Media', 'Other'];
const SALT_VERSION = 1;
const CONSENT_VERSION = '2026-11-15'; // must match SITE.consentVersion and a row in site_consent_texts
const asJson = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function onRequestPost(context) {
  const { request, env } = context;
  // A form posted without JavaScript does not ask for JSON. Send that visitor back to the Contact page instead of showing raw JSON.
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const json = (status, body) => (wantsJson ? asJson(status, body) : Response.redirect(new URL(status < 400 ? '/contact?sent=1' : '/contact?error=1', request.url).href, 303));
  let form;
  try { form = await request.formData(); } catch { return json(400, { error: 'Bad request.' }); }
  if (clean(form.get('website'), 200)) return json(200, { ok: true }); // honeypot: pretend it worked

  const type = clean(form.get('type'), 40), name = clean(form.get('name'), 120), email = clean(form.get('email'), 200).toLowerCase();
  const org = clean(form.get('org') || form.get('event'), 200);
  const extra = [['Need', form.get('need')], ['Event date', form.get('date')]].filter(([, v]) => v).map(([k, v]) => `${k}: ${clean(v, 120)}`).join('\n');
  const message = [extra, clean(form.get('message'), 5000)].filter(Boolean).join('\n\n');
  const consentVersion = CONSENT_VERSION;
  if (!form.get('consent')) return json(400, { error: 'Tick the box so I can reply to you.' });
  if (!TYPES.includes(type)) return json(400, { error: 'Pick what this is about.' });
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { error: 'Add your name and a working email.' });
  if (message.length < 5) return json(400, { error: 'Add a short message.' });

  const salt = env[`IP_HASH_SALT_${SALT_VERSION}`];
  if (!salt || !env.DB) { console.error('contact: IP_HASH_SALT or DB binding missing'); return json(500, { error: 'The form is not set up yet.' }); }
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  const ts = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY ?? '', response: clean(form.get('cf-turnstile-response'), 4000), remoteip: ip }),
  }).then((r) => r.json()).catch(() => ({ success: false }));
  if (!ts.success) return json(400, { error: 'The spam check did not pass. Reload and try again.' });

  const ipHash = await sha(`${salt}:${ip}`);
  const now = new Date().toISOString();
  try {
    const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM site_form_submissions WHERE ip_hash = ?1 AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 minutes')").bind(ipHash).first();
    if ((recent?.n ?? 0) >= 5) return json(429, { error: 'Too many messages. Try again in a few minutes.' });
    const contact = await env.DB.prepare('INSERT INTO site_contacts (email, name, org, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4) ON CONFLICT(email) DO UPDATE SET name = excluded.name, org = COALESCE(NULLIF(excluded.org, \'\'), site_contacts.org), updated_at = excluded.updated_at RETURNING id').bind(email, name, org, now).first();
    await env.DB.prepare('INSERT INTO site_form_submissions (contact_id, inquiry_type, message, consent_version, ip_hash, ip_hash_salt_version, user_agent, country, created_at) VALUES (?1, (SELECT id FROM site_inquiry_types WHERE label = ?2), ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
      .bind(contact.id, type, message, consentVersion, ipHash, SALT_VERSION, clean(request.headers.get('user-agent'), 300), request.cf?.country ?? null, now).run();
  } catch (e) {
    console.error('contact: D1 write failed', e);
    return json(500, { error: 'Could not save your message.' });
  }
  // Alert: type, name, first line. No email address in the alert, in the name or in the message line.
  // Sent after the reply when the platform allows it (waitUntil), so a slow Telegram never holds the visitor up.
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    const scrub = (s) => s.replace(/[^\s@]+@[^\s@]+/g, '[email]');
    const first = scrub(clean(form.get('message'), 5000).split('\n')[0].slice(0, 140));
    const send = fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: `New contact form\nType: ${type}\nName: ${scrub(name)}\n${first}`, disable_web_page_preview: true }) }).catch(() => {});
    if (typeof context.waitUntil === 'function') context.waitUntil(send); else await send;
  }
  return json(200, { ok: true });
}
export const onRequestGet = () => asJson(405, { error: 'POST only.' });
