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
      el.textContent = live ? 'On air now' : `${lead}${d ? d + 'd\u00A0' : ''}${pad(h)}h\u00A0${pad(m)}m\u00A0${pad(s)}s`; // non-breaking spaces: the time wraps as 1 piece
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

// Phone menu: the button opens and closes the links; Escape or a tap outside closes them.
const menuBtn = document.querySelector('[data-menu]'), menu = document.getElementById('nav-links');
if (menuBtn && menu) {
  const set = (open) => { menuBtn.setAttribute('aria-expanded', String(open)); menu.classList.toggle('open', open); };
  menuBtn.addEventListener('click', () => set(menuBtn.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) { set(false); menuBtn.focus(); } });
  document.addEventListener('click', (e) => { if (menu.classList.contains('open') && !e.target.closest('.site-nav')) set(false); });
}

// Nav: sticks to the top, slides away on the way down the page and comes back on the way up.
const navEl = document.querySelector('.site-nav');
if (navEl) {
  let last = Math.max(0, scrollY), queued = false;
  const upd = () => {
    queued = false;
    const y = Math.max(0, scrollY);
    navEl.classList.toggle('stuck', y > 24);
    if (y < 160 || (menu && menu.classList.contains('open')) || navEl.querySelector(':focus-visible')) navEl.classList.remove('away');
    else if (y > last + 8) navEl.classList.add('away');
    else if (y < last - 8) navEl.classList.remove('away');
    if (Math.abs(y - last) > 8) last = y;
  };
  // Keyboard focus landing in the nav brings it back at once.
  navEl.addEventListener('focusin', () => navEl.classList.remove('away'));
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(upd); } }, { passive: true });
  upd();
}

// Reveals: each block fades up 1 time when it scrolls into view, then stays. Anything already on screen (or above it)
// is left alone, and .mo goes on <html> only after that check, so nothing visible ever blinks out.
const rv = $$('.rv, .rows > *, .ci');
if (rv.length && !reduce && 'IntersectionObserver' in window) {
  rv.forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); });
  document.documentElement.classList.add('mo');
  const io = new IntersectionObserver((es) => {
    let n = 0;
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.style.setProperty('--d', `${Math.min(n++, 5) * 70}ms`);
      e.target.classList.add('in');
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 }); // 0, not a ratio: a fully clipped .ci image has no visible area to measure
  rv.filter((el) => !el.classList.contains('in')).forEach((el) => io.observe(el));
}

// Blog: topic filter. The buttons only show with JavaScript; every post is in the page either way.
const chipBox = document.querySelector('[data-chips]'), chips = $$('[data-filter]');
if (chipBox) chipBox.hidden = false;
chips.forEach((c) => c.addEventListener('click', () => {
  chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
  const f = c.dataset.filter, tag = f.startsWith('tag:') ? f.slice(4) : '';
  // Rows a filter brings back show at once: they must not wait for a scroll to fade in.
  $$('[data-cat]').forEach((r) => { r.hidden = f !== 'all' && (tag ? !(r.dataset.tags || '').split(' ').includes(tag) : r.dataset.cat !== f); if (!r.hidden) r.classList.add('in'); });
}));

// Posts: share. Phones get the system share sheet; everyone gets copy link.
$$('[data-share]').forEach((b) => {
  const native = b.dataset.share === 'native';
  if (native) { if (!navigator.share) return; b.hidden = false; }
  b.addEventListener('click', async () => {
    const url = location.origin + location.pathname, h1 = document.querySelector('h1');
    if (native) { try { await navigator.share({ title: h1 ? h1.textContent.trim() : document.title, url }); } catch {} return; }
    const label = b.querySelector('[data-share-label]');
    try { await navigator.clipboard.writeText(url); label.textContent = 'Link copied'; } catch { label.textContent = 'Copy failed'; }
    setTimeout(() => { label.textContent = 'Copy link'; }, 2200);
  });
});

// Home: arrow buttons for the video row. They move 1 screen of cards and grey out at either end.
const vrow = document.querySelector('[data-vrow]'), vnav = document.querySelector('[data-vnav]');
if (vrow && vnav) {
  const prev = vnav.querySelector('[data-vprev]'), next = vnav.querySelector('[data-vnext]');
  // aria-disabled, not disabled: a disabled button would drop keyboard focus to the top of the page.
  const off = (btn, v) => btn.setAttribute('aria-disabled', String(v));
  const sync = () => { off(prev, vrow.scrollLeft < 8); off(next, vrow.scrollLeft + vrow.clientWidth > vrow.scrollWidth - 8); };
  const move = (btn, dir) => { if (btn.getAttribute('aria-disabled') !== 'true') vrow.scrollBy({ left: dir * Math.max(320, vrow.clientWidth * 0.8), behavior: reduce ? 'auto' : 'smooth' }); };
  prev.addEventListener('click', () => move(prev, -1));
  next.addEventListener('click', () => move(next, 1));
  vrow.addEventListener('scroll', sync, { passive: true });
  // Tabbing to a card brings the whole card into view.
  vrow.addEventListener('focusin', (e) => { const c = e.target.closest('[data-vrow] > *'); if (c) c.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); });
  addEventListener('resize', sync);
  vnav.hidden = false;
  sync();
}

// About: story chapters. A tap brings the chapter list to the top of the screen so the text below is in view.
const steps = $$('[data-step]'), panels = $$('[data-panel]');
if (steps.length) panels.forEach((p, i) => { p.hidden = i !== 0; });
steps.forEach((b) => b.addEventListener('click', () => {
  steps.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  panels.forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.step; });
  const top = document.querySelector('[data-story]');
  if (top && top.getBoundingClientRect().top > 8) top.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  else { const panel = panels.find((p) => !p.hidden); if (panel && panel.getBoundingClientRect().top > innerHeight * 0.6) panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
}));

// Work: the preview panel shows the highlighted row. The highlight moves down the list on its own every 4 seconds,
// 2 times round, then rests on the first row. Hover, keyboard focus or a tap takes over and stops it for good.
const rows = $$('[data-pv]'), pvs = $$('[data-pv-img]');
const show = (row) => {
  rows.forEach((r) => r.classList.toggle('on', r === row));
  pvs.forEach((i) => { i.style.opacity = i.dataset.pvImg === row.dataset.pv ? 1 : 0; });
};
if (rows.length) {
  let at = 0, steps = 0, timer = 0, seen = false, paused = false;
  const pause = document.querySelector('[data-pv-pause]');
  const stop = () => { clearInterval(timer); timer = 0; steps = Infinity; if (pause) pause.hidden = true; };
  const tick = () => { if (document.hidden || !seen || paused) return; at = (at + 1) % rows.length; show(rows[at]); if (++steps >= rows.length * 2) stop(); };
  rows.forEach((r) => ['mouseenter', 'focus', 'touchstart'].forEach((ev) => r.addEventListener(ev, () => { stop(); show(r); }, { passive: true })));
  const panel = document.querySelector('.pvpanel');
  if (panel && !reduce && matchMedia('(min-width: 950px)').matches && 'IntersectionObserver' in window) {
    new IntersectionObserver((es) => { seen = es[0].isIntersecting; }, { threshold: 0.3 }).observe(panel);
    timer = setInterval(tick, 4000);
    // A visible way to hold the picture still while it is cycling.
    if (pause) { pause.hidden = false; pause.addEventListener('click', () => { paused = !paused; pause.textContent = paused ? 'Play' : 'Pause'; }); }
  }
}

// Pictures with a stand-in: if the first file is missing (some YouTube thumbnails are), show the stand-in.
$$('img[data-fallback]').forEach((img) => {
  const swap = () => { if (img.dataset.fallback) { img.src = img.dataset.fallback; delete img.dataset.fallback; } };
  img.addEventListener('error', swap);
  if (img.complete && !img.naturalWidth) swap();
});

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
      status.textContent = `${err.message} You can also email web@action.ceo.`;
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
  };
  // The banner's 2 buttons. They also work when the banner is reopened from "Cookie settings" in the footer.
  if (banner) $$('[data-consent]', banner).forEach((b) => b.addEventListener('click', () => {
    try { localStorage.setItem('consent', b.dataset.consent); } catch {}
    banner.hidden = true;
    gtag('consent', 'update', state(b.dataset.consent === 'yes' ? 'granted' : 'denied'));
    if (b.dataset.consent === 'yes' && !on) load();
  }));
  // Footer "Cookie settings": forget the saved answer and ask again, wherever the visitor is.
  $$('[data-consent-reset]').forEach((b) => { b.hidden = !banner; b.addEventListener('click', () => {
    try { localStorage.removeItem('consent'); } catch {}
    banner.hidden = false; banner.querySelector('button')?.focus();
  }); });
  // Outbound clicks to YouTube, only once analytics is allowed and loaded.
  document.addEventListener('click', (e) => {
    const a = on && e.target.closest && e.target.closest('a[href]');
    if (a && /(^|\.)(youtube\.com|youtu\.be)$/.test(a.hostname)) gtag('event', 'youtube_click', { link_url: a.href, link_text: (a.textContent || '').replace(/,? ?opens in a new tab/i, '').trim().slice(0, 80), page_path: location.pathname, transport_type: 'beacon' });
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

// "Pick what fits" buttons (Contact and Speaking): each one sets a field in the form next to it and takes you there.
// data-pick is the value to set; data-pick-for names the field (the Contact page's first field when absent).
(() => {
  const groups = new Map();
  document.querySelectorAll('[data-pick]').forEach((b) => { const id = b.dataset.pickFor || 'c-type'; if (!groups.has(id)) groups.set(id, []); groups.get(id).push(b); });
  groups.forEach((picks, id) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const sync = () => picks.forEach((b) => b.classList.toggle('is-on', b.dataset.pick === sel.value));
    picks.forEach((b) => { b.disabled = false; });
    sel.addEventListener('change', sync);
    sel.form.addEventListener('reset', () => setTimeout(sync));
    picks.forEach((b) => b.addEventListener('click', () => {
      sel.value = b.dataset.pick; sync();
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const r = sel.getBoundingClientRect();
      if (r.top < 90 || r.bottom > innerHeight) sel.form.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
      sel.focus({ preventScroll: true });
    }));
    sync();
  });
})();
