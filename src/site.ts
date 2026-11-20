// One place for every fact and link the site repeats. Facts come from the design master prompt only.
export const SITE = {
  url: 'https://action.ceo',
  name: 'Action',
  formalName: 'Victor Gazio',
  // The company that owns the site. Used only for the copyright line and the legal page.
  company: 'Action Enterprise Solutions',
  // Share images (og:image) are served from here until action.ceo points at this site. At DNS cutover set this to ''.
  shareImageBase: 'https://action-ceo.pages.dev',
  email: 'web@action.ceo',
  // Channel name lives here so a rename touches 1 line.
  channel: 'Action Crypto',
  youtube: 'https://www.youtube.com/@ActionCrypto',
  youtubeLfg: 'https://www.youtube.com/@LFGAction',
  x: 'https://x.com/ActionCEO',
  xLfg: 'https://x.com/LFGAction',
  twitterHandle: '@LFGAction',
  linkedin: 'https://www.linkedin.com/in/vic-action-crypto',
  instagram: 'https://www.instagram.com/actioncryptoceo',
  telegram: '', // TODO: Telegram group link. Empty hides every Telegram mention.
  lfgUrl: 'https://laissezfairegroup.com',
  genzioUrl: 'https://www.genzio.co',
  ga4Id: '', // TODO: GA4 measurement ID (G-XXXXXXX). Empty turns analytics off.
  turnstileSiteKey: '0x4AAAAAAGH9wIco4yTHXkii',
  consentVersion: '2026-11-15',
  indexNowKey: '2dfe00ab9adf93cea3f2c1cfdddf3ac0', // Public key. The file public/<key>.txt holds the same value.
};

export const PAGES: Record<string, { title: string; description: string; path: string; og: string; ogSub?: string }> = {
  home: { path: '/', title: 'Action | Crypto and AI YouTuber, Host and Speaker', description: 'Action ran a company for 6 years. Now he explains AI, DePIN and crypto in plain English on YouTube. Watch the latest video or catch him live Fridays.', og: 'I ran the company. Now I break it down.', ogSub: 'AI, DePIN and crypto in plain English' },
  about: { path: '/about', title: 'About Action | Crypto YouTuber, Host and Former COO', description: 'Tech since 2005, 6 years as a COO, crypto since 2012. How Action went from running a company to explaining AI and crypto on YouTube.', og: 'I ran a company. Then I started a channel.', ogSub: 'About Action' },
  work: { path: '/work', title: 'Work | Action, Crypto YouTuber, Host and Producer', description: '2 YouTube channels, a weekly live show, DePIN Day: Seattle, Karate Combat livestreams and a go-to-market firm. See what Action runs, hosts and has built.', og: 'Work.', ogSub: 'Channels, shows, events and LFG' },
  project: { path: '/work/depin-day-seattle', title: 'DePIN Day: Seattle | Action, Co-Organizer and Host', description: 'Action co-organized and hosted DePIN Day: Seattle in 2024 and 2025. T-Mobile, HP and Borderless Capital on stage. 65,000+ livestream viewers on X.', og: 'DePIN Day: Seattle', ogSub: 'Co-organized and hosted by Action' },
  shows: { path: '/shows', title: 'Shows Hosted by Action | Live Crypto and AI Host', description: 'Action Items live Fridays at 9:30am Pacific, the Genzio Roundtable on X Spaces and founder interviews on LFG Action. See when Action is on and where.', og: 'On air.', ogSub: 'Action Items, live Fridays 9:30am Pacific' },
  speaking: { path: '/speaking', title: 'Book Action | Crypto, AI and DePIN Speaker and Host', description: 'Action hosts and speaks on AI, DePIN and crypto in plain English. He co-organized and hosted DePIN Day: Seattle. Send a booking request.', og: 'Put me on stage.', ogSub: 'Book Action to speak or host' },
  lfg: { path: '/lfg', title: 'Laissez-Faire Group: Web3 GTM | Action, Crypto Host', description: 'Laissez-Faire Group runs go-to-market, marketing, PR and partnerships for Web3, DePIN, fintech and AI teams. Action is a Partner and its CCO.', og: 'LFG gets Web3 and AI teams to market.', ogSub: 'Go-to-market, marketing, PR and partnerships' },
  blog: { path: '/blog', title: 'AI, DePIN and Crypto Video Blog | Action, YouTuber', description: 'Every Action video gets its own page here: the video, chapters, the key points and the full transcript. Search by topic or browse the latest.', og: 'Every video, written out.', ogSub: 'The video blog' },
  contact: { path: '/contact', title: 'Contact Action | Crypto and AI Host, Speaker, Partner', description: 'Book Action to speak or host, pitch a sponsorship, or ask about go-to-market work with Laissez-Faire Group. Use the form or email web@action.ceo.', og: "Don't be shy, say\u00a0hi.", ogSub: 'Speaking, press and partnerships' },
  privacy: { path: '/privacy', title: 'Terms and Privacy | action.ceo, Crypto YouTuber Action', description: 'Terms of use, privacy and cookies for action.ceo: what the site collects, what you can do with the content, and why nothing here is financial advice.', og: 'Terms and privacy.', ogSub: 'Terms, privacy and cookies' },
  notfound: { path: '/404', title: 'Page Not Found | Action, Crypto and AI YouTuber', description: 'No action here. That page moved or never existed. Watch the latest breakdown on YouTube or see when Action is live next.', og: 'No action here.', ogSub: 'Page not found' },
};
