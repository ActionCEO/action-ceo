// All page behaviour. Loads after the page is visible; every page is complete without it.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Countdown to the next Action Items: Fridays, 9:30am Pacific.
function nextShow() {
  const la = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const t = new Date(la);
  t.setDate(la.getDate() + ((5 - la.getDay() + 7) % 7));
  t.setHours(9, 30, 0, 0);
  if (t <= la) t.setDate(t.getDate() + 7);
  const live = la.getDay() === 5 && la.getHours() * 60 + la.getMinutes() >= 570 && la.getHours() * 60 + la.getMinutes() < 660;
  return { s: Math.floor((t - la) / 1000), live };
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
$$('[data-ch]').forEach((b) => b.addEventListener('click', () => {
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
    } finally { btn.disabled = false; }
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
  if (cached) start(EU.includes(cached));
  else fetch('/api/geo').then((r) => r.json()).then((j) => { sessionStorage.setItem('geo', j.country || 'XX'); start(!j.country || EU.includes(j.country)); }).catch(() => start(true));
}
