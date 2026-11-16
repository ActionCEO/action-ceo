import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';

const SITE_URL = process.env.SITE_URL || 'https://action.ceo';
const lastmod = (() => { try { return new Date(execSync('git log -1 --format=%cI').toString().trim()); } catch { return new Date(); } })();

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  integrations: [sitemap({
    filter: (page) => !/\/(404|admin|shows\/interviews)/.test(page),
    serialize: (item) => ({ ...item, lastmod: lastmod.toISOString() }),
  })],
});
