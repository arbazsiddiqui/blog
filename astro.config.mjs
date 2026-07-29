import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.arbazsiddiqui.me',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'always' },
  compressHTML: true,
  markdown: {
    shikiConfig: { theme: 'github-dark-high-contrast' },
  },
});
