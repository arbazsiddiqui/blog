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
      .concat(['app/iris/', 'app/iris/support', 'app/iris/privacy', 'app/iris/private-period-tracker/', 'app/iris/pcos-period-tracker/', 'app/iris/bbt-ovulation-tracker/', 'app/iris/period-tracker-apple-health/', 'app/iris/flo-alternative/', 'app/iris/clue-alternative/',
        'app/mercuro/', 'app/mercuro/how-to-play-thermometers/', 'app/mercuro/daily-logic-puzzle/', 'app/mercuro/puzzle-game-no-subscription/', 'app/mercuro/games-like-sudoku-and-nonograms/', 'app/mercuro/grids-of-thermometers-alternative/', 'app/mercuro/thermometers-logic-puzzles-alternative/'].map((p) => `https://www.arbazsiddiqui.me/${p}`)),
  })],
  build: { inlineStylesheets: 'always' },
  compressHTML: true,
  markdown: {
    shikiConfig: { theme: 'github-dark-high-contrast' },
  },
});
