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
const rows = $$('[data-pv]'), pvs = $$('[data-pv-img]'), pvLabel = document.querySelector('[data-pv-label]');
const show = (row) => {
  rows.forEach((r) => r.classList.toggle('on', r === row));
  pvs.forEach((i) => { i.style.opacity = i.dataset.pvImg === row.dataset.pv ? 1 : 0; });
  if (pvLabel) pvLabel.textContent = row.dataset.pv === '-1' ? `Photo coming: ${row.dataset.name}` : '';
};
rows.forEach((r) => { r.addEventListener('mouseenter', () => show(r)); r.addEventListener('focus', () => show(r)); });

// Click-to-play YouTube, with chapter jumps.
function play(box, start) {
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${box.dataset.yt}?autoplay=1&rel=0&start=${start || box.dataset.start || 0}`;
  f.title = 'YouTube video player';
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
  box.replaceChildren(f);
}
$$('[data-yt-play]').forEach((b) => b.addEventListener('click', () => play(b.closest('[data-yt]'))));
$$('[data-ch]').forEach((b) => b.addEventListener('click', (e) => {
  e.preventDefault();
  if (b.href) history.replaceState(null, '', b.href);
  $$('[data-ch]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const box = document.querySelector('[data-yt]');
  if (box) { play(box, b.dataset.ch); box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }
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
      form.reset(); status.textContent = 'Got it. I will get back to you.';
    } catch (err) {
      status.textContent = `${err.message} You can also email me@action.ceo.`;
    } finally { btn.disabled = false; try { window.turnstile?.reset(); } catch {} }
  });
});

// GA4 with Consent Mode v2. Denied by default in the EU, EEA, UK and Switzerland; granted elsewhere.
const GA = document.body.dataset.ga;
if (GA) {
  const EU = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH'.split(' ');
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  const state = (v) => ({ ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: v });
  const load = () => { const s = document.createElement('script'); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${GA}`; document.head.append(s); gtag('js', new Date()); gtag('config', GA); };
  const banner = document.querySelector('[data-consent-banner]');
  const choice = localStorage.getItem('consent');
  const start = (needsBanner) => {
    if (!needsBanner || choice === 'yes') { gtag('consent', 'default', state('granted')); load(); return; }
    gtag('consent', 'default', state('denied'));
    if (choice === 'no') return;
    banner.hidden = false;
    $$('[data-consent]', banner).forEach((b) => b.addEventListener('click', () => {
      localStorage.setItem('consent', b.dataset.consent); banner.hidden = true;
      if (b.dataset.consent === 'yes') { gtag('consent', 'update', state('granted')); load(); }
    }));
  };
  const cached = sessionStorage.getItem('geo');
  if (cached) start(cached === 'XX' || EU.includes(cached));
  else fetch('/api/geo').then((r) => r.json()).then((j) => { sessionStorage.setItem('geo', j.country || 'XX'); start(!j.country || EU.includes(j.country)); }).catch(() => start(true));
}
