// All page behaviour. Loads after the page is visible; every page is complete without it.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Countdown to the next Action Items: Fridays, 9:30am Pacific.
function nextShow() {
  // Pacific wall clock for "now", then find the real instant of the next Friday 9:30am Pacific.
  const parts = (d) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(d).map((x) => [x.type, x.value]));
  const now = new Date(), p = parts(now), dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), mins = +p.hour * 60 + +p.minute;
  const live = dow === 5 && mins >= 570 && mins < 660;
  let add = (5 - dow + 7) % 7; if (add === 0 && mins >= 570) add = 7;
  // Noon UTC on the target Pacific date, then step to the instant whose Pacific clock reads 9:30.
  let t = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + add, 17, 30));
  const q = parts(t); t = new Date(t.getTime() - ((+q.hour * 60 + +q.minute) - 570) * 60000);
  return { s: Math.max(0, Math.floor((t - now) / 1000)), live };
}
const cds = $$('[data-countdown]');
if (cds.length) {
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    let { s, live } = nextShow();
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    for (const el of cds) {
      const lead = el.dataset.countdown || 'Next show in ';
      el.textContent = live ? 'On air now' : `${lead}${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    }
  };
  tick(); setInterval(tick, 1000);
}

// Count-up on first view. Final values are in the HTML.
const counts = $$('[data-count]');
if (counts.length && !reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const [to, dec, suf] = e.target.dataset.count.split('|');
    const end = e.target.textContent, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 1400), v = Number(to) * (1 - Math.pow(1 - p, 3));
      e.target.textContent = p < 1 ? (Number(dec) ? v.toFixed(Number(dec)) : Math.round(v).toLocaleString('en-US')) + suf : end;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.2 });
  counts.forEach((c) => io.observe(c));
}

// About: story chapters.
const steps = $$('[data-step]'), panels = $$('[data-panel]');
if (steps.length) panels.forEach((p, i) => { p.hidden = i !== 0; });
steps.forEach((b) => b.addEventListener('click', () => {
  steps.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  panels.forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.step; });
}));

// Work: preview image follows hover and keyboard focus.
const rows = $$('[data-pv]'), pvs = $$('[data-pv-img]');
const show = (row) => {
  rows.forEach((r) => r.classList.toggle('on', r === row));
  pvs.forEach((i) => { i.style.opacity = i.dataset.pvImg === row.dataset.pv ? 1 : 0; });
};
rows.forEach((r) => { r.addEventListener('mouseenter', () => show(r)); r.addEventListener('focus', () => show(r)); });

// Country lookup: 1 request per page view, shared by the player and analytics. 'XX' means unknown.
// Visitors in the EU, EEA, UK and Switzerland, and anyone whose country is unknown, are asked first.
const ASK = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH'.split(' ');
const mustAsk = (c) => !c || c === 'XX' || ASK.includes(c);
let geoP = null;
const geo = () => geoP || (geoP = (async () => {
  let c = null; try { c = sessionStorage.getItem('geo'); } catch {}
  if (c) return c;
  try { c = (await (await fetch('/api/geo')).json()).country || 'XX'; } catch { return 'XX'; }
  try { sessionStorage.setItem('geo', c); } catch {}
  return c;
})());

// YouTube: the poster and a "Load video" button paint first. The real player is added with no autoplay, so the
// first play is YouTube's own button. YouTube sets cookies when its player loads, so visitors who must be asked
// (see above) get the player only when they press the button, whatever they answered about analytics.
// Everyone else also gets it when the box is near the screen or once the page is idle, whichever is first.
const boxes = $$('[data-yt]');
function mount(box, start) {
  const old = box.querySelector('iframe');
  if (old && start == null) return old;
  const f = document.createElement('iframe');
  f.src = `https://www.youtube.com/embed/${box.dataset.yt}?rel=0&start=${parseInt(start ?? box.dataset.start, 10) || 0}`;
  f.title = `YouTube video: ${box.dataset.title || 'player'}`;
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
  f.allowFullscreen = true;
  f.loading = 'lazy';
  f.referrerPolicy = 'strict-origin-when-cross-origin';
  f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
  // A fresh iframe, not a new src on the old one, so chapter jumps do not pile up in the back button.
  if (old) old.replaceWith(f); else box.append(f);
  const play = box.querySelector('[data-yt-play]');
  if (play) play.remove();
  return f;
}
if (boxes.length) {
  boxes.forEach((b) => {
    const play = b.querySelector('[data-yt-play]');
    if (!play) return;
    play.hidden = false;
    // Keyboard users land on the player, not back at the top of the page.
    play.addEventListener('click', () => { const f = mount(b); f.tabIndex = -1; f.focus(); });
  });
  const auto = () => {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); mount(e.target); } }), { rootMargin: '400px' });
      boxes.forEach((b) => io.observe(b));
    }
    const all = () => boxes.forEach((b) => mount(b));
    const idle = () => (window.requestIdleCallback ? requestIdleCallback(all, { timeout: 3000 }) : setTimeout(all, 1200));
    if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
  };
  geo().then((c) => { if (!mustAsk(c)) auto(); });
}
// Chapters: load the player at that time (still no autoplay) and keep the ?t= URL in the address bar.
// If the player has not loaded yet, the chapter time is saved and the visitor is sent to the "Load video" button.
$$('[data-ch]').forEach((b) => b.addEventListener('click', (e) => {
  e.preventDefault();
  if (b.href) history.replaceState(null, '', b.href);
  $$('[data-ch]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const box = boxes[0];
  if (!box) return;
  const play = box.querySelector('[data-yt-play]');
  if (box.querySelector('iframe') || !play) mount(box, b.dataset.ch);
  else { box.dataset.start = b.dataset.ch; play.focus({ preventScroll: true }); }
  box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
}));

// Forms: post to the Pages Function, show the result in place.
$$('form[data-form]').forEach((form) => {
  if ($$('.cf-turnstile', form).length && !document.querySelector('script[data-ts]')) {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; s.defer = true; s.dataset.ts = '1';
    document.head.append(s);
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = form.querySelector('[data-form-status]'), btn = form.querySelector('button[type="submit"]');
    if (!form.reportValidity()) return;
    btn.disabled = true; status.textContent = 'Sending...';
    try {
      const r = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { accept: 'application/json' } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Something went wrong.');
      form.reset(); status.textContent = "Got it. I'll get back to you.";
    } catch (err) {
      status.textContent = `${err.message} You can also email me@action.ceo.`;
    } finally { btn.disabled = false; try { window.turnstile?.reset(); } catch {} }
  });
});

// GA4 with Consent Mode v2. Denied by default in the EU, EEA, UK and Switzerland; granted elsewhere.
// Storage can be blocked (private mode, strict settings). Every read and write is guarded so nothing below stops.
const GA = document.body.dataset.ga;
if (GA) {
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  const state = (v) => ({ ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: v });
  let on = false;
  const load = () => { on = true; const s = document.createElement('script'); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${GA}`; document.head.append(s); gtag('js', new Date()); gtag('config', GA); };
  const banner = document.querySelector('[data-consent-banner]');
  let choice = null; try { choice = localStorage.getItem('consent'); } catch {}
  const start = (needsBanner) => {
    if (!needsBanner || choice === 'yes') { gtag('consent', 'default', state('granted')); load(); return; }
    gtag('consent', 'default', state('denied'));
    if (choice === 'no' || !banner) return;
    banner.hidden = false;
    $$('[data-consent]', banner).forEach((b) => b.addEventListener('click', () => {
      try { localStorage.setItem('consent', b.dataset.consent); } catch {}
      banner.hidden = true;
      if (b.dataset.consent === 'yes') { gtag('consent', 'update', state('granted')); load(); }
    }));
  };
  // Outbound clicks to YouTube, only once analytics is allowed and loaded.
  document.addEventListener('click', (e) => {
    const a = on && e.target.closest && e.target.closest('a[href]');
    if (a && /(^|\.)(youtube\.com|youtu\.be)$/.test(a.hostname)) gtag('event', 'youtube_click', { link_url: a.href, link_text: (a.textContent || '').trim().slice(0, 80), page_path: location.pathname, transport_type: 'beacon' });
  });
  geo().then((c) => start(mustAsk(c)));
}

// Hero background video: desktop only, never with reduced motion or data saver. The still stays underneath as the fallback.
const hv = document.querySelector('[data-hero-video]');
if (hv && !reduce && innerWidth > 800 && !(navigator.connection && navigator.connection.saveData)) {
  hv.addEventListener('playing', () => { hv.style.opacity = 1; }, { once: true });
  hv.src = hv.dataset.src;
  hv.play().catch(() => {});
}
