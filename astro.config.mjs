import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.arbazsiddiqui.me',
  trailingSlash: 'ignore',
  integrations: [sitemap({
    // the Slop Corner games are static pages in public/, outside Astro's routes
    customPages: ['tight-spot/', 'tight-spot/how-to-play/', 'tight-spot/about/', 'double-yellow/', 'double-yellow/how-to-play/', 'double-yellow/about/',
      'lollipop/', 'lollipop/how-to-play/', 'lollipop/about/', 'kerb-appeal/', 'kerb-appeal/privacy/']
      .map((p) => `https://www.arbazsiddiqui.me/slop-corner/${p}`)
      .concat(['ios/iris/', 'ios/iris/support.html', 'ios/iris/privacy.html'].map((p) => `https://www.arbazsiddiqui.me/${p}`)),
  })],
  build: { inlineStylesheets: 'always' },
  compressHTML: true,
  markdown: {
    shikiConfig: { theme: 'github-dark-high-contrast' },
  },
});
