// One place for every fact and link the site repeats. Facts come from the design master prompt only.
export const SITE = {
  url: 'https://action.ceo',
  name: 'Action',
  formalName: 'Victor Gazio',
  email: 'me@action.ceo',
  youtube: 'https://www.youtube.com/@ActionCrypto',
  youtubeLfg: 'https://www.youtube.com/@LFGAction',
  x: 'https://x.com/ActionCEO',
  xLfg: 'https://x.com/LFGAction',
  twitterHandle: '@LFGAction',
  linkedin: 'https://www.linkedin.com/in/vic-action-crypto',
  instagram: 'https://www.instagram.com/actioncryptoceo',
  telegram: '', // TODO: Telegram group link. Empty shows "link coming soon".
  lfgUrl: 'https://laissezfairegroup.com',
  ga4Id: '', // TODO: GA4 measurement ID (G-XXXXXXX). Empty turns analytics off.
  turnstileSiteKey: '1x00000000000000000000AA', // TODO: real Turnstile site key. This is Cloudflare's always-pass test key.
  consentVersion: '2026-11-15',
  indexNowKey: '', // TODO: IndexNow key. Also add public/<key>.txt.
};

export const PAGES: Record<string, { title: string; description: string; path: string; og: string; ogSub?: string }> = {
  home: { path: '/', title: 'Action | Crypto and AI YouTuber, Host and Speaker', description: 'Action breaks down AI, DePIN and crypto in plain English on YouTube, hosts Action Items live every Friday and is a Partner at Laissez-Faire Group.', og: 'I ran the company. Now I break it down.', ogSub: 'AI, DePIN and crypto in plain English' },
  about: { path: '/about', title: 'About Action | Host, Speaker and LFG Partner', description: 'Technologist since 2005, 6 years as a COO, in crypto since 2012. Now Action hosts shows, speaks on stage and is a Partner at Laissez-Faire Group.', og: 'I ran a company before I ran a channel.', ogSub: 'About Action' },
  work: { path: '/work', title: 'Work | Action, Host, Producer and GTM Partner', description: 'Action Crypto, DePIN Day: Seattle, Action Items, Laissez-Faire Group, Karate Combat and Genzio. The channels, shows and events Action runs.', og: 'Work.', ogSub: 'Channels, shows, events and LFG' },
  project: { path: '/work/depin-day-seattle', title: 'DePIN Day: Seattle | Created and Hosted by Action', description: 'DePIN Day: Seattle, created, produced and hosted by Action in 2024 and 2025. T-Mobile, HP and Borderless Capital on stage, 65,000+ viewers on X.', og: 'DePIN Day: Seattle', ogSub: 'Created, produced and hosted by Action' },
  shows: { path: '/shows', title: 'Action Items, Genzio Roundtable and Podcast | Action', description: 'Action Items live every Friday at 9:30am Pacific, the Genzio Roundtable on X Spaces and founder interviews on LFG Action. When and where to watch.', og: 'On air.', ogSub: 'Action Items, live Fridays 9:30am Pacific' },
  speaking: { path: '/speaking', title: 'Book Action | Web3, DeAI and Crypto Conference Speaker', description: 'Book Action to speak or host. Creator, producer and host of DePIN Day: Seattle and livestream host for Karate Combat. Send a booking request.', og: 'Put me on stage.', ogSub: 'Book Action to speak or host' },
  lfg: { path: '/lfg', title: 'Laissez-Faire Group: Web3 Marketing and GTM | Action', description: 'Laissez-Faire Group does go-to-market, PR and partnerships for teams in Web3, DePIN, fintech and decentralized AI, across 55+ countries.', og: "Need go-to-market help? That's Laissez-Faire Group.", ogSub: 'Go-to-market, PR and partnerships' },
  blog: { path: '/blog', title: 'Crypto and AI Video Breakdowns | Action', description: 'Every video Action publishes gets a written version: AI, DePIN and crypto breakdowns with chapters, takeaways and the full transcript.', og: 'Watch it or read it.', ogSub: 'Video breakdowns, written out' },
  contact: { path: '/contact', title: 'Contact Action | Speaking, Press, Partnerships', description: 'Get in touch with Action about speaking, hosting, press, sponsorship or go-to-market work with Laissez-Faire Group. Email me@action.ceo.', og: 'Say hi.', ogSub: 'Speaking, press and partnerships' },
  privacy: { path: '/privacy', title: 'Privacy | Action, Site Forms and Analytics', description: 'How action.ceo handles what you send through its forms, Google Analytics 4 and consent. Run by Victor Gazio. Contact me@action.ceo.', og: 'Privacy.', ogSub: 'Forms, analytics and consent' },
  notfound: { path: '/404', title: 'Page Not Found | Action, Host and Speaker', description: 'That page moved or never existed. Head home, read the latest breakdowns or see when Action is live next.', og: 'No action here.', ogSub: 'Page not found' },
};
