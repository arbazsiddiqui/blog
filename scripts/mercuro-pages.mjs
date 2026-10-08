// The Mercuro landing page and its search pages: how to play Thermometers, a daily logic
// puzzle, a puzzle game with no subscription, a page for Sudoku and nonogram players, and two
// comparisons with other Thermometers apps people search for. Same approach as iris-pages.mjs.
// Claims about Mercuro come from context/projects/mercuro.md and the claims ledger; claims about
// other apps cite their App Store listing.
//
// The pages draw the app instead of showing pictures of it. scripts/mercuro-app.js holds the
// live components (board, hints, themes, ranks, badges); scripts/mercuro-data.json holds what
// they draw: real puzzles, theme palettes and achievements taken from the app source
// (~/vibeCoded/thermometerPuzzle). Every puzzle in it is checked here for exactly one solution.
//
// Writes public/app/mercuro/index.html, index.md, pages.json, assets/mercuro.js and
// <slug>/index.html + index.md.
//
//   node scripts/mercuro-pages.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const BASE = 'https://www.arbazsiddiqui.me';
const APP = `${BASE}/app/mercuro/`;
const STORE = 'https://apps.apple.com/app/id6762402072';
const OG = `${BASE}/og/mercuro.jpg`;
const OG_ALT = 'Mercuro logo: a red thermometer beside the words Mercuro, fill the heat';
const SUPPORT = '/ios/mercuro/support';
const PRIVACY = '/ios/mercuro/privacy';
const TERMS = '/ios/mercuro/terms';
// Bump UPDATED when page copy changes and CHECKED when the competitor listings are re-read.
const UPDATED = '2026-10-08';
const CHECKED = '2026-10-08';
const nb = (s) => s.replace(/ - /g, '&nbsp;- ');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const X = '×';

const SRC = {
  got: ['Grids of Thermometers on the App Store', 'https://apps.apple.com/us/app/grids-of-thermometers/id1071003654'],
  fx: ['Thermometers - Logic Puzzles on the App Store', 'https://apps.apple.com/us/app/thermometers-logic-puzzles/id6739959033'],
  lpt: ['Logic Puzzles - Thermometers on the App Store', 'https://apps.apple.com/us/app/logic-puzzles-thermometers/id6748007989'],
  sudoku: ['Wikipedia: Sudoku', 'https://en.wikipedia.org/wiki/Sudoku'],
  nonogram: ['Wikipedia: Nonogram', 'https://en.wikipedia.org/wiki/Nonogram'],
};
const cite = (k) => `<a href="${SRC[k][1]}" rel="noopener" target="_blank">${esc(SRC[k][0])}</a>`;

// ── Puzzle data, checked for exactly one solution ──

const DATA = JSON.parse(readFileSync(new URL('./mercuro-data.json', import.meta.url), 'utf8'));
const THEMES = DATA.themes;
delete DATA.themes;

// The 4x4 rules puzzle on /how-to-play-thermometers/. Thermometers run bulb to tip, as [row, column].
DATA.example = {
  id: 'example', n: 4, r: [3, 3, 0, 2], c: [2, 3, 1, 2],
  t: [[[0, 0], [0, 1], [0, 2]], [[0, 3], [1, 3], [2, 3], [3, 3]], [[1, 0], [2, 0], [3, 0]], [[1, 1], [1, 2]], [[3, 1], [2, 1]], [[3, 2], [2, 2]]],
  s: [2, 2, 1, 1, 1, 1],
};
const STEP_TEXT = [
  'Row 3 has a 0, so all four of its cells are empty.',
  'Column 2 needs 3 filled cells. Its row 3 cell is empty, which leaves exactly three cells (rows 1, 2 and 4), so all three fill.',
  'Row 1, column 2 is filled, and it sits in the top thermometer. Mercury can\'t skip a cell, so the bulb to its left fills too.',
  'An empty cell cuts off everything beyond it. The left thermometer starts in row 2 and is empty in row 3, so its row 4 cell is empty. The right thermometer is empty in row 3, so its row 4 cell is empty as well.',
  'Row 4 needs 2. Column 2 is already filled and columns 1 and 4 are empty, so column 3 fills.',
  'Column 1 needs 2, and rows 3 and 4 are empty, so rows 1 and 2 fill.',
  'Column 3 needs 1, and row 4 already has it, so rows 1 and 2 of column 3 are empty.',
  'Column 4 needs 2, and rows 3 and 4 are empty, so rows 1 and 2 fill. Rows 1 and 2 now have 3 each, which matches their numbers. Solved.',
];
const row3 = [[2, 0], [2, 1], [2, 2], [2, 3]];
DATA.exampleSteps = [
  { text: 'Six thermometers, row numbers down the left and column numbers along the top. Press play, or step through.', levels: [0, 0, 0, 0, 0, 0], marks: [] },
  { levels: [0, 0, 0, 0, 0, 0], marks: row3, line: [0, 2] },
  { levels: [0, 0, 0, 1, 1, 0], marks: row3, pending: [[0, 1]], line: [1, 1] },
  { levels: [2, 0, 0, 1, 1, 0], marks: row3, tubes: [0] },
  { levels: [2, 0, 0, 1, 1, 0], marks: [...row3, [3, 0], [3, 3]], tubes: [1, 2] },
  { levels: [2, 0, 0, 1, 1, 1], marks: [...row3, [3, 0], [3, 3]], line: [0, 3] },
  { levels: [2, 0, 1, 1, 1, 1], marks: [...row3, [3, 0], [3, 3]], line: [1, 0] },
  { levels: [2, 0, 1, 1, 1, 1], marks: [...row3, [3, 0], [3, 3], [0, 2], [1, 2]], line: [1, 2] },
  { levels: [2, 2, 1, 1, 1, 1], marks: [...row3, [3, 0], [3, 3], [0, 2], [1, 2]], line: [1, 3] },
].map((s, i) => ({ ...s, text: s.text || STEP_TEXT[i - 1] }));

// Exhaustive search over every fill level of every thermometer, pruned only by the line counts.
function countSolutions(p, cap = 2) {
  const n = p.n, rows = Array(n).fill(0), cols = Array(n).fill(0), found = [];
  const left = (axis, idx, from) => p.t.slice(from).reduce((a, cells) => a + cells.filter((c) => c[axis] === idx).length, 0);
  (function dfs(t, lv) {
    if (found.length >= cap) return;
    if (t === p.t.length) {
      if (rows.every((v, i) => v === p.r[i]) && cols.every((v, i) => v === p.c[i])) found.push([...lv]);
      return;
    }
    const cells = p.t[t];
    for (let k = 0; k <= cells.length; k++) {
      if (k > 0) { rows[cells[k - 1][0]]++; cols[cells[k - 1][1]]++; }
      let ok = true;
      for (let i = 0; i < n && ok; i++) {
        if (rows[i] > p.r[i] || cols[i] > p.c[i]) ok = false;
        else if (rows[i] + left(0, i, t + 1) < p.r[i] || cols[i] + left(1, i, t + 1) < p.c[i]) ok = false;
      }
      if (ok) { lv.push(k); dfs(t + 1, lv); lv.pop(); }
    }
    for (let k = cells.length; k > 0; k--) { rows[cells[k - 1][0]]--; cols[cells[k - 1][1]]--; }
  })(0, []);
  return found;
}
for (const p of [...DATA.hero, ...DATA.sizes, DATA.hint, ...DATA.daily, DATA.example]) {
  const sols = countSolutions(p);
  if (sols.length !== 1) throw new Error(`${p.id}: ${sols.length} solutions`);
  if (sols[0].join() !== p.s.join()) throw new Error(`${p.id}: stored solution differs from the search`);
}
{
  const s = DATA.exampleSteps.at(-1).levels;
  if (s.join() !== DATA.example.s.join()) throw new Error('example steps do not end solved');
}

// ── Shared page parts ──

const APP_LD = {
  '@type': 'MobileApplication',
  '@id': `${APP}#app`,
  name: 'Mercuro: Thermometers Puzzle',
  alternateName: 'Mercuro',
  operatingSystem: 'iOS 17 or later, iPadOS 17 or later',
  applicationCategory: 'GameApplication',
  applicationSubCategory: 'Logic puzzle',
  genre: 'Puzzle',
  keywords: 'thermometers puzzle, logic puzzle, daily puzzle, grid puzzle, brain game, no subscription',
  url: APP,
  downloadUrl: STORE,
  installUrl: STORE,
  sameAs: [STORE, `${BASE}/mercuro`],
  image: `${APP}assets/mercuro-icon.png`,
  screenshot: ['play', 'daily', 'solved', 'stats', 'achievements'].map((s) => `${APP}assets/screen-${s}.webp`),
  description: 'A Thermometers logic puzzle game for iPhone and iPad. Fill each thermometer from the bulb so every row and column matches its number. 660 curated puzzles across 8 board sizes, three new daily puzzles, 9 themes, 40 achievements and Game Center leaderboards. No subscription.',
  featureList: [
    '660 curated Thermometers puzzles, 330 free and 330 in Mercuro Pro',
    '8 board sizes, from 5x5 to 12x12',
    'Three new daily puzzles: Warm-Up, Daily and Challenge',
    'Archive of the last two weeks of daily puzzles',
    'Hints that name the next forced move and explain why it follows',
    '9 themes: 2 from the start, 7 earned by solving or unlocked with Pro',
    '40 achievements and Game Center leaderboards',
    'Plays offline',
    'No subscription: one-time Remove Ads and Mercuro Pro purchases',
  ],
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: STORE },
  author: { '@id': `${BASE}/#person` },
};

const hash = (f) => createHash('sha1').update(f).digest('hex').slice(0, 8);
let CSS_V = '', JS_V = '';

function head({ title, description, url, md, ld, landing }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="Arbaz Siddiqui">
<link rel="canonical" href="${url}">
<link rel="author" href="/about">
<link rel="alternate" type="text/markdown" href="${md}" title="This page as Markdown">
<meta name="apple-itunes-app" content="app-id=6762402072">
<link rel="icon" href="/app/mercuro/assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/app/mercuro/assets/favicon-64.png" sizes="64x64" type="image/png">
<link rel="apple-touch-icon" href="/app/mercuro/assets/apple-touch-icon.png">
<meta name="theme-color" content="#E9F1F6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#26282D" media="(prefers-color-scheme: dark)">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${OG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(OG_ALT)}">
<meta property="og:site_name" content="Arbaz Siddiqui">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${OG}">
<meta name="twitter:image:alt" content="${esc(OG_ALT)}">
<link rel="stylesheet" href="/app/mercuro/site.css?v=${CSS_V}">
<script src="/app/mercuro/assets/mercuro.js?v=${JS_V}" defer></script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': ld })}</script>
</head>
<body${landing ? ' class="landing"' : ''}>

<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="wrap">
    <a class="brand" href="/app/mercuro/"><img src="/app/mercuro/assets/mercuro-icon.webp" alt="" width="32" height="32"><span>Mercuro<b>.</b></span></a>
    <ul>
      <li><a href="/app/mercuro/how-to-play-thermometers/"${url.endsWith('how-to-play-thermometers/') ? ' aria-current="page"' : ''}>How to play</a></li>
      <li><a href="/app/mercuro/daily-logic-puzzle/"${url.endsWith('daily-logic-puzzle/') ? ' aria-current="page"' : ''}>Daily puzzles</a></li>
      <li><a href="/app/mercuro/puzzle-game-no-subscription/"${url.endsWith('no-subscription/') ? ' aria-current="page"' : ''}>Pricing</a></li>
      <li><a href="${SUPPORT}">Support</a></li>
    </ul>
    <div class="nav-right">
      <div class="gauge" data-m="gauge" aria-hidden="true"><svg viewBox="0 0 500 100"></svg></div>
      <a class="get" href="${STORE}">Download</a>
    </div>
  </div>
</header>
`;
}

const FOOT = `
<footer>
  <div class="wrap">
    <span>Made by <a href="/about">Arbaz Siddiqui</a>.</span>
    <nav aria-label="Mercuro">
      <a href="/mercuro">How Mercuro is built</a>
      <a href="${SUPPORT}">Support</a>
      <a href="${PRIVACY}">Privacy policy</a>
      <a href="${TERMS}">Terms</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;

const crumbs = (url, name) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
    { '@type': 'ListItem', position: 2, name: 'Projects', item: `${BASE}/projects/` },
    { '@type': 'ListItem', position: 3, name: 'Mercuro', item: APP },
    ...(name ? [{ '@type': 'ListItem', position: 4, name, item: url }] : []),
  ],
});
const faqLd = (url, faq) => ({ '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const badge = (eager) => `<a class="badge" href="${STORE}"><img src="/app/mercuro/assets/app-store-badge.svg" alt="Download on the App Store" width="156" height="52"${eager ? '' : ' loading="lazy"'}></a>`;

// ── Drawn pieces of the app ──

const ICON = {
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12" transform="translate(0 -3)"/></svg>',
  redo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 7 5 5-5 5m5-5H10a6 6 0 0 0 0 12" transform="translate(0 -3)"/></svg>',
  restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.1-5M5 4v4h4"/></svg>',
  hint: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M12 3a6 6 0 0 1 3.5 10.9V16h-7v-2.1A6 6 0 0 1 12 3Zm-3 15h6v1.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 19.5Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>',
  flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M12 2c2 3.5 6 5.6 6 11a6 6 0 0 1-12 0c0-3 1.6-4.6 2.6-6.4.6 1.5 1.3 2.3 2.2 2.8C11 7 11 4.6 12 2Z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M8 5.5v13l10-6.5Z"/></svg>',
  therm: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M7 4h10v3a5 5 0 0 1-3.5 4.8V15H16v3H8v-3h2.5v-3.2A5 5 0 0 1 7 7Zm-3 1h2v2.5A2.5 2.5 0 0 1 4 7Zm16 0v2a2.5 2.5 0 0 1-2 2.5V5Z"/></svg>',
};
const status = `<div class="ph-status" aria-hidden="true"><span>9:41</span><i class="island"></i><span class="ph-icons"><svg viewBox="0 0 18 12"><path d="M9 11.5 1 3.6a11.5 11.5 0 0 1 16 0Z"/></svg><svg viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3.2" fill="none" stroke="currentColor"/><rect x="2.5" y="2.5" width="18" height="7" rx="1.6"/><path d="M24 4v4a1.6 1.6 0 0 0 0-4Z"/></svg></span></div>`;

// The puzzle screen: header, level track, live board, hint banner, toolbar, solved card.
function playScreen({ size = 6, how = false } = {}) {
  return `<div class="ph-head">
          <span class="sq" aria-hidden="true">${ICON.close}</span>
          <b data-size>${size}${X}${size}</b>
          <span class="timer">${ICON.clock}<span data-time>0:00</span></span>
        </div>
        ${how ? '' : `<div class="ph-level"><div><small>Level</small><b data-level>1</b></div><div class="ph-chap"><small>Ch 1 <b>First Heat</b></small><span class="track" data-track>${'<i></i>'.repeat(10)}</span></div></div>`}
        <div class="play-board"></div>
        <div class="hint-banner" aria-live="polite"><b></b><span></span></div>
        <div class="ph-tools">
          <button type="button" class="sq" data-act="undo" aria-label="Undo">${ICON.undo}</button>
          <button type="button" class="sq" data-act="redo" aria-label="Redo">${ICON.redo}</button>
          <button type="button" class="sq" data-act="restart" aria-label="Start over">${ICON.restart}</button>
          <span class="gap"></span>
          <button type="button" class="sq blue" data-act="hint" aria-label="Hint">${ICON.hint}</button>
          <button type="button" class="sq red" data-act="check" aria-label="Check the board">${ICON.check}</button>
        </div>
        <div class="solved-card" role="dialog" aria-label="Solved">
          <div class="sc-in">
            <h3>Solved<b>.</b></h3>
            <div class="sc-time"><svg class="sc-svg" viewBox="0 0 100 400" aria-hidden="true"></svg><div><small>Your time</small><strong data-final>0:00</strong><dl><dt>Size</dt><dd>${size}${X}${size}</dd>${how ? '' : '<dt>Chapter</dt><dd>First Heat</dd>'}</dl></div></div>
            <button type="button" class="next" data-act="next">${how ? 'Play again' : 'Next level'} ${ICON.arrow}</button>
          </div>
        </div>
        <p class="sr-only" data-live aria-live="polite"></p>`;
}
const phonePlay = () => `<div class="phone hero-phone" data-m="play">
      <div class="ph-screen">
        ${status}
        ${playScreen()}
      </div>
    </div>`;
const playCard = (set) => `<div class="play-card" data-m="play"${set ? ` data-set="${set}"` : ''}>
        ${playScreen(set === 'how' ? { size: 4, how: true } : {})}
      </div>`;

const stepsWidget = () => `<div class="steps-w" data-m="steps">
        <div class="steps-board"></div>
        <div class="steps-ui">
          <p class="steps-n" data-step-n aria-live="polite">Start</p>
          <p class="steps-text" data-step-text aria-live="polite"></p>
          <div class="steps-btns">
            <button type="button" class="pill" data-act="prev">Back</button>
            <button type="button" class="pill solid" data-act="play" aria-pressed="false">Play</button>
            <button type="button" class="pill" data-act="next">Next</button>
          </div>
        </div>
      </div>`;

const KINDS = [['Warm-Up', 'green'], ['Daily', 'blue'], ['Challenge', 'red']];
const todayCard = () => {
  const d = DATA.daily;
  return `<div class="today">
          <div class="today-top"><div><b>Today</b><small>Today’s set</small></div><span class="streak">${ICON.flame}<span>0</span></span></div>
          <div class="tiles">${d.map((p, i) => `<span class="tile ${KINDS[i][1]}"><small>${ICON.therm}${KINDS[i][0]}</small><b>${p.n}${X}${p.n}</b><i>${ICON.play}</i></span>`).join('')}</div>
        </div>`;
};
const dailyWidget = () => `<div class="daily-w" data-m="daily">
        ${todayCard()}
        <div class="day-boards">${DATA.daily.map((p, i) => `
          <figure class="day-board ${KINDS[i][1]}"><figcaption><span>${KINDS[i][0]}</span><b>${p.n}${X}${p.n}</b><i class="stamp">${ICON.check}</i></figcaption><div class="mini-board"></div></figure>`).join('')}
        </div>
        <p class="caption">Real boards from one day of Mercuro’s daily calendar, solving in the order the clues allow.</p>
      </div>`;

const FREE = { 5: 50, 6: 50, 7: 50, 8: 40, 9: 40, 10: 40, 11: 30, 12: 30 };
const sizesWidget = () => `<div class="sizes-w" data-m="sizes">
        <div class="lv-head"><b class="app-title">Levels<i>.</i></b><span data-size-out aria-live="polite">5${X}5 · 50 free puzzles</span></div>
        <div class="chips" role="group" aria-label="Board size">${Object.entries(FREE).map(([n, f]) => `<button type="button" data-n="${n}" aria-pressed="${n === '5'}"><b>${n}${X}${n}</b><small>${f} free</small></button>`).join('')}</div>
        <div class="lv-body"><div class="size-board"></div><ol class="chapters" aria-label="Free chapters for this size"></ol></div>
      </div>`;

const hintsWidget = () => `<div class="hints-w" data-m="hints">
        <div class="hint-board"></div>
        <div class="hint-side">
          <div class="hint-banner" aria-live="polite"><b></b><span></span></div>
          <button type="button" class="pill solid" data-act="hint">${ICON.hint} Use hint</button>
          <ol class="hint-log" aria-label="Hints used so far"></ol>
        </div>
      </div>`;

const themesWidget = () => `<div class="themes-w" data-m="themes">
        <div class="theme-stage">
          <div class="theme-now"><small>Theme</small><b data-theme-name>Glacier</b><span data-theme-note>Yours from the start</span></div>
          <div class="theme-board"></div>
        </div>
        <div class="theme-pick">
          <b class="app-title small">Choose a look<i>.</i></b>
          <small class="app-sub">Tap a theme to apply</small>
          <div class="theme-grid"></div>
        </div>
      </div>`;

const RANKS = [[0, 'Novice', 'Glacier and Slate'], [50, 'Apprentice', 'Coral'], [100, 'Artisan', 'Plum'], [150, 'Journeyman', 'Matcha'], [200, 'Adept', 'Midnight'], [250, 'Expert', 'Porcelain'], [300, 'Sage', 'Forest'], [330, 'Virtuoso', 'Riso Paper']];
const swatch = (name) => {
  const t = THEMES.find((x) => x.name === name.split(' and ')[0]);
  const P = t.p, c = [P.bg, P.red, P.bg, P.green, P.bg, P.blue, P.bg, P.ink, P.bg];
  return `<span class="sw" aria-hidden="true">${c.map((x) => `<i style="background:${x}"></i>`).join('')}</span>`;
};
const ranksWidget = () => `<div class="ranks-w" data-m="ranks">
        <div class="rk-head"><b class="app-title">Rank journey<i>.</i></b><span><b data-you>Novice</b><small><span data-solved>0</span> solved</small></span></div>
        <div class="rk-body">
          <div class="rk-therm" aria-hidden="true"><svg class="rk-svg" viewBox="0 0 100 800"></svg>${RANKS.map(([at]) => `<em style="--at:${at}">${at}</em>`).join('')}</div>
          <ol class="rk-list" aria-label="Ranks from Virtuoso down to Novice">${RANKS.slice().reverse().map(([at, name, theme]) => `<li class="rk-row" data-at="${at}" data-name="${name}" style="--at:${at}"><span><b>${name}</b><small>${at ? `${at} solved` : 'Free to start'}</small><small>${at ? `Unlocks ${theme}` : theme}</small></span>${swatch(theme)}</li>`).join('')}</ol>
        </div>
        <p class="caption">A sample climb from 0 to 330 solves. Your own rank moves as you play.</p>
      </div>`;

// A sample week for the Stats panel: 1 = solved. Rows are Warm-Up, Daily, Hard; columns Monday to Sunday.
const WEEK = '1111111' + '1111101' + '1101100';
const statsWidget = () => `<div class="stats-w" data-m="stats" data-pattern="${WEEK}">
        <div class="st-head"><b class="app-title">Stats<i>.</i></b><small class="app-sub">Keep the heat</small></div>
        <div class="st-week"><small>This week</small><span><b class="red" data-wk-solved>0</b> solved <b data-wk-streak>0</b> day streak</span></div>
        <div class="wk" aria-label="A sample week of solved daily puzzles"><span></span>${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<span class="dow">${d}</span>`).join('')}${['Warm', 'Daily', 'Hard'].map((r) => `<span class="rl">${r}</span>${'<i></i>'.repeat(7)}`).join('')}</div>
        <div class="st-tiles"><div class="dark"><small>Leaderboard</small><b>Weekly Heat</b><small>Game Center</small></div><div class="teal"><small>Achievements</small><b>40</b><small>to earn</small></div></div>
        <p class="caption">A sample week. Your own grid fills in as you play.</p>
      </div>`;

const badgesWidget = () => `<div class="badges-w" data-m="badges">
        <div class="badge-info" aria-live="polite"><b></b><span></span><i></i></div>
        <div class="badges" role="group" aria-label="The 40 achievements"></div>
      </div>`;

// [label, free, remove ads, pro, which tiers count as the better side]
const TIERS = [
  ['Puzzles', '330 in chapters|330 in chapters|All 660', '001'],
  ['Daily puzzles', 'Three a day|Three a day|Three a day', '111'],
  ['Ads', 'A full-screen ad every third puzzle, at most 12 a day|None|None', '011'],
  ['Hints', 'Two a day, then one per short optional ad|Unlimited|Unlimited', '011'],
  ['Archive', 'Each past day opens after a short optional ad|Every day of the last two weeks open|Every day of the last two weeks open', '011'],
  ['Themes', 'Glacier and Slate, the other seven earned by solving|Glacier and Slate, the other seven earned by solving|All nine unlocked', '001'],
];
const tiersWidget = (start = 'free') => `<div class="tiers-w" data-m="tiers" data-start="${start}">
        <div class="tier-tabs" role="tablist" aria-label="Choose a tier"><button type="button" role="tab" data-tier="free">Free</button><button type="button" role="tab" data-tier="ads">Remove Ads</button><button type="button" role="tab" data-tier="pro">Mercuro Pro</button></div>
        <div class="tier-price"><b data-tier-price>$0</b><span data-tier-note>Supported by ads</span></div>
        <ul class="tier-rows">${TIERS.map(([k, v, g]) => `<li data-tiers="${esc(v)}" data-good="${g}"><span>${k}</span><em>${esc(v.split('|')[0])}</em></li>`).join('')}</ul>
        <p class="caption">US App Store prices. Your App Store shows the price in your own currency. Nothing renews.</p>
      </div>`;

const miniPanel = (size = 5) => `<div class="panel" data-m="mini" data-size="${size}">
        <div class="mini-board"></div>
        <div class="panel-copy"><p>Mercuro, the Thermometers puzzle for iPhone and iPad</p>${badge(true)}<p>Free to play. No subscription.</p></div>
      </div>`;

const videoPhone = () => `<div class="phone video-phone">
        <div class="ph-screen">
          <video data-m="video" muted loop playsinline preload="none" poster="/app/mercuro/assets/video/mercuro-preview-poster.webp" width="444" height="962" aria-label="The Mercuro App Store preview: a level solved, the daily set and the themes">
            <source data-src="/app/mercuro/assets/video/mercuro-preview.webm" type="video/webm">
            <source data-src="/app/mercuro/assets/video/mercuro-preview.mp4" type="video/mp4">
          </video>
        </div>
      </div>`;

// ── Search pages ──

const STEPS = `<ol>${STEP_TEXT.map((s) => `<li>${s}</li>`).join('')}</ol>`;
const MERCURO_PRICE = 'Free; $2.99 once to remove ads, or $4.99 once for Pro';
const MERCURO_PUZZLES = '660 curated, 330 of them free, on 8 board sizes from 5x5 to 12x12';
const FREE_ADS = 'In the free game a full-screen ad plays every third puzzle you start, at most 12 a day. You get two free hints a day, and after that a hint, or a past day in the archive, costs a short optional ad.';

// Sections are [heading, html, widget]. The widget is drawn after the html and is left out of index.md.
const PAGES = [
  {
    slug: 'how-to-play-thermometers',
    tag: 'Rules', colour: 'var(--red)', panel: 5,
    title: 'How to Play Thermometers Puzzles: Rules and a Worked Example',
    h1: 'How to play Thermometers puzzles',
    lede: 'Three rules, one small grid cracked move by move, and the habits that make a 12x12 feel like a 5x5.',
    description: 'The rules of the Thermometers logic puzzle in plain words, with a 4x4 example solved step by step. Then play 660 more in Mercuro, free on iPhone and iPad.',
    sections: [
      ['Three rules', `<ol><li>The number beside each row or column says how many of its cells hold mercury.</li><li>Mercury starts in the bulb, the round end, and rises toward the other end without gaps.</li><li>A thermometer can be empty, full or filled partway.</li></ol><p>A well-made puzzle has exactly one answer, and logic always reaches it. Guessing never comes into it.</p>`],
      ['Your first grid', `<p>Six thermometers on a 4x4 grid. Row numbers run down the left, column numbers along the top, and both count from the top-left corner. Solve it before you read the steps.</p><p class="note">Tap a cell and mercury rises from the bulb to it. Tap the top of the mercury to let it fall back. Row numbers 3, 3, 0, 2. Column numbers 2, 3, 1, 2.</p>`, () => playCard('how')],
      ['The solve, move by move', STEPS, stepsWidget],
      ['Habits of fast solvers', `<ul><li>Hunt the 0s and the full lines first. Each one settles a whole row or column in a single move.</li><li>A filled cell drags every cell between it and the bulb up with it.</li><li>An empty cell cuts off everything beyond it, away from the bulb.</li><li>Count what is left. A line that needs two more with two open cells fills both.</li></ul>`],
    ],
    faq: [
      ['Which end is the bulb?', 'The round end. Mercury always starts there, whichever way the thermometer points.'],
      ['Is there always exactly one solution?', 'In Mercuro, yes. Every board is checked by a solver to have exactly one answer.'],
      ['How is it different from a nonogram?', 'A nonogram clue describes runs of filled cells. A Thermometers clue is a single count, and the thermometer shapes decide which cells can fill first.'],
      ['Where can I play more?', 'Mercuro has 660 Thermometers puzzles on iPhone and iPad, 330 of them free, plus three new ones every day.'],
    ],
  },
  {
    slug: 'daily-logic-puzzle',
    tag: 'Daily', colour: 'var(--green)', panel: 6,
    title: 'Daily Logic Puzzle Game for iPhone: Three New Puzzles a Day',
    h1: 'Three new logic puzzles every day',
    lede: 'A Warm-Up, a Daily and a Challenge land every day in Mercuro. Three Thermometers puzzles, the same for every player, free.',
    description: 'Three new Thermometers puzzles a day on iPhone and iPad, the same for every player, with a two-week archive, streaks and Game Center leaderboards. Free.',
    sections: [
      ['Small, bigger, biggest', `<p>The Warm-Up is a 6x6 or 7x7 board, the Daily an 8x8 or 9x9, and the Challenge anything from 10x10 to 12x12. Take one with your coffee or run all three back to back.</p><p>New to the genre? The <a href="/app/mercuro/how-to-play-thermometers/">rules and a worked example</a> take two minutes.</p>`, dailyWidget],
      ['One set, every player', `<p>The dailies come from a calendar built into the app, so everyone playing on the same date solves the same three boards. Nothing downloads, so they play just as well on a plane.</p>`],
      ['Missed a day? It waits', `<p>The last two weeks of dailies stay in the archive, so a busy Tuesday never costs you a puzzle. In the free game a past day opens after a short optional ad. Either purchase opens every day in the archive.</p>`],
      ['Keep the streak alive', `<p>Stats tracks your current streak and a weekly grid of every daily you solved. Game Center leaderboards and 40 achievements are there when you want a scoreboard, and out of the way when you don't.</p>`, statsWidget],
    ],
    faq: [
      ['Are the daily puzzles free?', "Yes. Today's three puzzles are part of the free game."],
      ['Can I play past days?', 'Yes. The last two weeks are in the archive. In the free game each past day opens after a short optional ad; either purchase opens them all.'],
      ['Do I need an internet connection?', 'No. Mercuro plays offline.'],
      ['What if I want more than three a day?', 'There are 330 free puzzles in chapters, and 330 more in Mercuro Pro.'],
    ],
  },
  {
    slug: 'puzzle-game-no-subscription',
    tag: 'Pricing', colour: 'var(--blue)', panel: 6,
    title: 'Logic Puzzle Game With No Subscription: Mercuro for iPhone',
    h1: 'A logic puzzle game with no subscription',
    lede: 'Play Mercuro free for as long as you like. If you buy, you buy once, and nothing ever renews.',
    description: 'Mercuro is a Thermometers logic puzzle for iPhone with no subscription: 330 puzzles free, $2.99 once to remove ads or $4.99 once for Pro.',
    sections: [
      ['Free, and properly playable', `<p>330 puzzles across eight board sizes, plus three fresh dailies every day.</p><p>${FREE_ADS}</p>`],
      ['Two purchases, both one-time', `<ul><li><strong>Remove Ads, $2.99 once.</strong> No ads at all, unlimited hints and every day in the archive open.</li><li><strong>Mercuro Pro, $4.99 once.</strong> Everything Remove Ads does, plus 330 more puzzles and all nine themes unlocked.</li></ul><p class="note">US App Store prices. Your App Store shows the price in your own currency.</p>`, () => tiersWidget('pro')],
      ['What the other Thermometers apps charge', `<p>Every other Thermometers app I checked on the US App Store sells a subscription, though two also sell one-time options. Grids of Thermometers sells $0.99 to remove ads, $0.99 level packs and $5.99 for all packs, next to a $4.49 Premium Subscription (${cite('got')}). Thermometers - Logic Puzzles sells a one-time $3.99 remove-ads pack and a $3.99 monthly or $1.99 weekly membership (${cite('fx')}). Logic Puzzles - Thermometers sells Premium at $0.49 a week, $1.39 a month or $13.90 a year (${cite('lpt')}).</p><p>All three also list far more puzzles than Mercuro, which matters if quantity is what you want.</p>`],
      ['Why once', `<p>I build Mercuro on my own, and charging once was a deliberate choice. You pay for the puzzles, and then they are yours to keep playing.</p>`],
    ],
    faq: [
      ['Does anything renew?', 'No. Both purchases are one-time.'],
      ['Do I have to buy anything to play?', 'No. The free game has 330 puzzles and the three daily puzzles.'],
      ['Where do ads appear?', `${FREE_ADS} Either purchase removes all of them.`],
    ],
  },
  {
    slug: 'games-like-sudoku-and-nonograms',
    tag: 'If you like', colour: 'var(--green)', panel: 5,
    title: 'Puzzle Games Like Sudoku and Nonograms: Try Thermometers',
    h1: 'Like Sudoku or nonograms? Try Thermometers',
    lede: 'The one-answer logic of Sudoku, the edge counts of nonograms, and a twist all its own. Mercury has to rise from the bulb.',
    description: 'If you enjoy Sudoku or nonograms, Thermometers is a logic puzzle to try next. What carries over, what is new, and where to play it free on iPhone and iPad.',
    sections: [
      ['The Sudoku part', `<p>A well-made Sudoku has a single solution (${cite('sudoku')}), and you reach it by ruling things out, never by guessing. Thermometers runs on the same promise. Every Mercuro board has exactly one answer, and every cell can be worked out from the clues.</p><p>There are no digits to place. Each cell is filled or empty, so the logic is about counting and order instead of which number goes where.</p>`],
      ['The nonogram part', `<p>Nonograms put numbers on the edges of the grid and ask you to fill cells or leave them blank (${cite('nonogram')}). So does Thermometers. The difference is what the numbers mean. A nonogram clue lists runs of filled cells; a Thermometers clue is a plain count, and the thermometer shapes do the rest.</p>`],
      ['The new part', `<p>The glass adds order. Mercury starts at the bulb and rises without gaps, so a filled cell means every cell back to the bulb is filled too, and an empty cell means everything beyond it is empty. Most of the solving is playing those two facts against the counts.</p><p>See the <a href="/app/mercuro/how-to-play-thermometers/">rules and a worked example</a>.</p>`],
      ['Start on 5x5', `<p>Mercuro has 330 free puzzles on eight board sizes, so you can start small on 5x5 and climb to 12x12 when you are ready. Three new dailies land on top every day. It is free on iPhone and iPad.</p><p class="note">This is the first 6x6 level from the app. Tap a cell to fill its thermometer up to it.</p>`, () => playCard()],
    ],
    faq: [
      ['Do I need to do any maths?', 'Only counting. No number is ever bigger than the length of a row.'],
      ['Is there a picture at the end, like a nonogram?', 'No. The reward is the solved board, not a hidden image.'],
      ['Where can I play Thermometers?', 'Mercuro, on iPhone and iPad, is free with 330 puzzles and three new ones a day.'],
    ],
  },
  {
    slug: 'grids-of-thermometers-alternative',
    tag: 'Compare', colour: 'var(--blue)', panel: 8,
    title: 'A Grids of Thermometers Alternative With No Subscription',
    h1: 'A Grids of Thermometers alternative',
    lede: 'Same puzzle, different deal. Mercuro has no level packs and no subscription, and three fresh dailies every day.',
    description: 'An alternative to Grids of Thermometers on iPhone: Mercuro has 660 curated puzzles, three daily puzzles and one-time purchases instead of packs and a subscription.',
    compare: { them: 'Grids of Thermometers', rows: [
      ['Price', MERCURO_PRICE, `Free; in-app purchases include $0.99 to remove ads, $0.99 level packs, $5.99 for all packs and a $4.49 Premium Subscription (${cite('got')})`],
      ['Puzzles', MERCURO_PUZZLES, `Thousands of levels in several grid sizes (${cite('got')})`],
      ['Daily play', 'Three new puzzles a day (Warm-Up, Daily and Challenge)', `New levels every day (${cite('got')})`],
      ['Game Center', 'Leaderboards and 40 achievements', `Leaderboards and achievements (${cite('got')})`],
      ['Runs on', 'iOS 17 or later', `iOS 12 or later (${cite('got')})`],
    ] },
    sections: [
      ['No packs to pick from', `<p>Grids of Thermometers sells extra levels in $0.99 packs, or $5.99 for all of them, alongside a $4.49 subscription (${cite('got')}). Mercuro keeps it to one set. 330 puzzles come free, and a single $4.99 Mercuro Pro purchase adds the other 330. Nothing renews.</p>`],
      ['Three dailies that grow', `<p>Both apps add puzzles every day. Mercuro's arrive as a set of three that grow in size, from a 6x6 or 7x7 Warm-Up to a Challenge between 10x10 and 12x12, and every player gets the same three on the same date.</p>`],
      ['When Grids of Thermometers is the better fit', `<p>If sheer volume is the goal, Grids of Thermometers lists thousands of levels against Mercuro's 660. It also runs on much older devices, back to iOS 12, and comes in English and 15 other languages (${cite('got')}).</p>`],
      ['Switching over', `<p>The rules are identical, so there is nothing to relearn. Every board size in Mercuro has its own chapters of ten, and solving 7 in a chapter opens the next, so an experienced player moves fast. When a board does stall you, a hint names the next forced move and tells you why.</p>`, hintsWidget],
    ],
    faq: [
      ['Can I buy Mercuro puzzles in packs?', 'No. There is one free set of 330 puzzles, and Mercuro Pro adds the other 330 for $4.99, paid once.'],
      ['Does Mercuro have new puzzles every day?', 'Yes, three: a Warm-Up, a Daily and a Challenge, each on a bigger board than the last.'],
      ['Is Mercuro on Android?', 'Not yet. Mercuro is on iPhone and iPad.'],
    ],
  },
  {
    slug: 'thermometers-logic-puzzles-alternative',
    tag: 'Compare', colour: 'var(--red)', panel: 7,
    title: 'Thermometers - Logic Puzzles Alternative, No Subscription',
    h1: 'An alternative to Thermometers - Logic Puzzles',
    lede: 'Same puzzle, smaller library. Mercuro trades 9,000 boards for 660 curated ones, three dailies a day and prices you pay once.',
    description: 'An alternative to the Thermometers - Logic Puzzles app: Mercuro has 660 curated puzzles, three daily puzzles and one-time prices with no membership.',
    compare: { them: 'Thermometers - Logic Puzzles', rows: [
      ['Price', MERCURO_PRICE, `Free; in-app purchases are a one-time $3.99 remove-ads pack, a $3.99 monthly membership and a $1.99 weekly membership (${cite('fx')})`],
      ['Puzzles', MERCURO_PUZZLES, `9,000+ from 4x4 to 17x17 (${cite('fx')})`],
      ['Difficulty', 'Sorted by board size, with chapters that open as you solve', `Five levels, Beginner to Master (${cite('fx')})`],
      ['Daily play', 'Three new puzzles a day (Warm-Up, Daily and Challenge)', `A daily challenge puzzle (${cite('fx')})`],
      ['Runs on', 'iOS 17 or later', `iOS 13 or later (${cite('fx')})`],
    ] },
    sections: [
      ['Sorted by size, not labels', `<p>Thermometers - Logic Puzzles sorts its puzzles into five difficulty levels (${cite('fx')}). Mercuro sorts by board size instead, eight of them from 5x5 to 12x12, each with chapters of ten that open as you solve.</p>`, sizesWidget],
      ['Three dailies, not one', `<p>Its daily challenge is one puzzle a day (${cite('fx')}). Mercuro sends three, a Warm-Up, a Daily and a Challenge, each on a bigger board than the last.</p>`],
      ['When Thermometers - Logic Puzzles is the better fit', `<p>It has far more puzzles, over 9,000 against Mercuro's 660, with boards up to 17x17. It also has a dark mode and a warm paper look (${cite('fx')}). If volume and huge boards are what you want, it is the better pick.</p>`],
      ['Switching over', `<p>Mercuro tops out at 12x12, so if you mostly play bigger grids it will feel small at the high end. In return you get a hint that names the next forced move and explains it, and two purchases you make once, if at all, in place of a membership.</p>`],
    ],
    faq: [
      ['Does Mercuro have a weekly or monthly plan?', 'No. Both purchases are one-time.'],
      ['Does Mercuro have a dark mode?', 'Yes. Slate, one of the two themes you start with, is dark.'],
      ['How big do Mercuro boards get?', 'Up to 12x12. The daily Challenge is between 10x10 and 12x12.'],
    ],
  },
];

const others = (slug) => PAGES.filter((p) => p.slug !== slug);
// Each guide gets a small drawn visual and a one-line teaser.
const GUIDE = {
  'how-to-play-thermometers': ['<div class="gv" data-m="still" data-p="example"></div>', 'Three rules and a 4x4 solved move by move.'],
  'daily-logic-puzzle': [`<div class="gv gv-trio"><i class="g">${DATA.daily[0].n}${X}${DATA.daily[0].n}</i><i class="b">${DATA.daily[1].n}${X}${DATA.daily[1].n}</i><i class="r">${DATA.daily[2].n}${X}${DATA.daily[2].n}</i></div>`, 'Warm-Up, Daily, Challenge, and a two-week archive.'],
  'puzzle-game-no-subscription': ['<div class="gv gv-tag"><span><b>$4.99</b><small>once</small></span></div>', '330 puzzles free. $2.99 or $4.99, paid once.'],
  'games-like-sudoku-and-nonograms': ['<div class="gv" data-m="still" data-p="5"></div>', 'What carries over, and the one rule that is new.'],
  'grids-of-thermometers-alternative': ['<div class="gv gv-vs"><span class="no">Level packs</span><span class="no">$4.49 subscription</span><span class="ok">Pay once</span></div>', 'No packs, no subscription, three dailies a day.'],
  'thermometers-logic-puzzles-alternative': [`<div class="gv gv-sizes">${[5, 7, 9, 12].map((n) => `<i style="--n:${n}">${n}${X}${n}</i>`).join('')}</div>`, '660 curated boards against a library of 9,000.'],
};
const guides = (slug) => `<ul class="guides">${others(slug).map((o) => `<li><a href="/app/mercuro/${o.slug}/">${GUIDE[o.slug][0]}<b>${nb(esc(o.h1))}</b><span>${esc(GUIDE[o.slug][1])}</span><em class="g-arrow" aria-hidden="true">${ICON.arrow}</em></a></li>`).join('')}${slug ? `<li><a href="/app/mercuro/"><div class="gv gv-icon"><img src="/app/mercuro/assets/mercuro-icon.webp" alt="" width="64" height="64" loading="lazy"></div><b>Mercuro overview</b><span>Every feature, drawn and playable.</span><em class="g-arrow" aria-hidden="true">${ICON.arrow}</em></a></li>` : ''}</ul>`;
const moreLinks = (slug) => `${guides(slug)}<p class="built"><a href="/mercuro">How Mercuro is built</a>, the solver, generator and hint engine behind these puzzles.</p>`;

function page(p) {
  const url = `${APP}${p.slug}/`;
  const ld = [
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: p.title, description: p.description, inLanguage: 'en', dateModified: UPDATED, about: { '@id': `${APP}#app` }, author: { '@id': `${BASE}/#person` }, primaryImageOfPage: OG, breadcrumb: crumbs(url, p.h1) },
    APP_LD,
    faqLd(url, p.faq),
  ];
  const compare = p.compare ? `
      <section class="group" id="compare" style="--c:${p.colour}">
        <h2><i></i>Mercuro and ${nb(esc(p.compare.them))} side by side</h2>
        <div class="cmp-wrap"><table class="cmp"><thead><tr><th scope="col"></th><th scope="col">Mercuro</th><th scope="col">${nb(esc(p.compare.them))}</th></tr></thead><tbody>
${p.compare.rows.map(([k, a, b]) => `          <tr><th scope="row">${esc(k)}</th><td data-label="Mercuro">${esc(a)}</td><td data-label="${esc(p.compare.them)}">${b}</td></tr>`).join('\n')}
        </tbody></table></div>
        <p class="note">Checked ${CHECKED} on the US App Store. Prices and features change, so see each app's own listing.</p>
      </section>` : '';
  return `${head({ title: p.title, description: p.description, url, md: `/app/mercuro/${p.slug}/index.md`, ld })}
<main id="main">
  <section class="page-hero">
    <div class="wrap">
      <div>
        <div class="tag" style="--c:${p.colour}"><i></i>${esc(p.tag)}</div>
        <h1>${nb(esc(p.h1))}<span class="dot">.</span></h1>
        <p class="lede">${esc(p.lede)}</p>
      </div>
      ${miniPanel(p.panel)}
    </div>
  </section>

  <div class="wrap prose">
${compare}
${p.sections.map(([hd, body, widget]) => `      <section class="group${widget ? ' has-widget' : ''}" style="--c:${p.colour}">
        <h2><i></i>${nb(esc(hd))}</h2>
        ${body}${widget ? `\n      <div class="widget">${widget()}</div>` : ''}
      </section>`).join('\n')}
      <section class="group" id="questions" style="--c:${p.colour}">
        <h2><i></i>Questions</h2>
        <div class="qa">
${p.faq.map(([q, a]) => `          <details open><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
        </div>
      </section>
      <section class="group" style="--c:var(--ink-soft)">
        <h2><i></i>More guides</h2>
        ${moreLinks(p.slug)}
        <div class="row"><a class="btn" href="${STORE}">Download Mercuro</a></div>
      </section>
  </div>
</main>
${FOOT}`;
}

const strip = (s) => s
  .replace(/<figure>.*?<\/figure>/gs, '').replace(/<div class="shot">.*?<\/div>/gs, '')
  .replace(/<ol>(.*?)<\/ol>/gs, (m, items) => `\n\n${items.split(/<li>/).filter((x) => x.trim()).map((x, i) => `${i + 1}. ${x.replace(/<\/li>/g, '').trim()}`).join('\n')}\n\n`)
  .replace(/<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g, (m, href, text) => `[${text}](${href.startsWith('/') ? BASE + href : href})`)
  .replace(/<ul[^>]*>/g, '\n\n').replace(/<li>/g, '\n- ').replace(/<\/li>/g, '')
  .replace(/<\/(p|ul|div)>/g, '\n\n')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

function pageMd(p) {
  const body = p.sections.map(([hd, b]) => `## ${hd}\n\n${strip(b.replace(/<p class="note">Tap a cell.*?<\/p>|<p class="note">This is the first.*?<\/p>/gs, ''))}`).join('\n\n');
  return `---\ntitle: ${p.title}\ndescription: ${p.description}\nurl: ${APP}${p.slug}/\n---\n\n# ${p.h1}\n\n${p.lede}\n\nApp Store: ${STORE}\n\n${p.compare ? `## Mercuro and ${p.compare.them}\n\n| | Mercuro | ${p.compare.them} |\n|---|---|---|\n${p.compare.rows.map(([k, a, b]) => `| ${k} | ${a} | ${strip(b)} |`).join('\n')}\n\nChecked ${CHECKED} on the US App Store.\n\n` : ''}${body}\n\n## Questions\n\n${p.faq.map(([q, a]) => `**${q}** ${a}`).join('\n\n')}\n`;
}

// ── Landing page ──

const LANDING_FAQ = [
  ['Is Mercuro free?', 'Yes. 330 puzzles and the three daily puzzles are free, supported by ads. Two optional one-time purchases remove ads ($2.99) or add 330 more puzzles with no ads ($4.99). There is no subscription.'],
  ['Where do ads appear?', `${FREE_ADS} Either purchase removes all of them.`],
  ['How do you play Thermometers?', 'Fill cells with mercury so each row and column has as many filled cells as its number. Mercury always starts at a thermometer’s bulb and rises without gaps.'],
  ['Do I ever have to guess?', 'No. Every board has exactly one solution, and you can reach it by logic alone.'],
  ['How many puzzles are there?', '660 curated puzzles: 330 free and 330 in Mercuro Pro, across eight board sizes from 5x5 to 12x12. Three new daily puzzles arrive every day on top of those.'],
  ['Does Mercuro work offline?', 'Yes. The puzzles, including the daily ones, are built into the app.'],
  ['Which devices does it run on?', 'iPhone and iPad with iOS 17 or later. The App Store also lists it for Macs with Apple silicon and for Apple Vision Pro.'],
  ['Is Mercuro on Android?', 'Not yet. Today it is on iPhone and iPad.'],
  ['Who makes Mercuro?', 'Arbaz Siddiqui, an independent developer. The project page explains how the solver, generator and hint engine are built.'],
];

// Other Thermometers apps, from their US App Store listings (see the ledger).
const MARKET = [
  ['Mercuro', '$2.99 Remove Ads, $4.99 Pro', 'None', '660 curated, 5x5 to 12x12', true],
  ['Grids of Thermometers', '$0.99 Remove Ads, $0.99 packs, $5.99 all packs', '$4.49 Premium Subscription', 'Thousands of levels', 'got'],
  ['Thermometers - Logic Puzzles', '$3.99 remove-ads pack', '$3.99 a month or $1.99 a week', '9,000+, 4x4 to 17x17', 'fx'],
  ['Logic Puzzles - Thermometers', 'None listed', '$0.49 a week, $1.39 a month or $13.90 a year', 'Thousands', 'lpt'],
];

function landing() {
  const url = APP;
  const title = 'Mercuro: Thermometers Logic Puzzle for iPhone and iPad';
  const description = 'Mercuro is a Thermometers logic puzzle for iPhone and iPad: 660 curated puzzles across 8 board sizes, three new puzzles every day, and no subscription.';
  const ld = [
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: title, description, inLanguage: 'en', dateModified: UPDATED, about: { '@id': `${APP}#app` }, author: { '@id': `${BASE}/#person` }, primaryImageOfPage: OG,
      breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: 'Projects', item: `${BASE}/projects/` },
        { '@type': 'ListItem', position: 3, name: 'Mercuro', item: url },
      ] } },
    APP_LD,
    faqLd(url, LANDING_FAQ),
  ];
  return `${head({ title, description, url, md: '/app/mercuro/index.md', ld, landing: true })}
<!--
THESIS: Mercuro opened up on the page. Every section is a working piece of the app drawn in the
browser (the level, the daily set, the size picker, the hint engine, the themes, the rank ladder),
never a picture of it. Refuses the screenshot carousel that app pages default to.
OWN-WORLD: the app's own two free themes. Glacier by day (#E9F1F6 ground, white cards, ink #1F2A33,
glacier blue, teal for a satisfied clue, mercury red #E5363A) and Slate by night. Outfit for display,
uppercase app titles with a red full stop, tracked micro-labels, ink-ruled square clue boxes, tan glass
tubes. Colour beyond that only arrives through the themes chapter, which drenches its panel.
STORY: a puzzle player plays a real level in the first viewport, watches each feature work, sees the
prices laid flat beside the alternatives, and downloads.
FIRST VIEWPORT: copy left (tagline, h1, lede, App Store badge); right, a phone running the first 6x6
level, playable by touch, demoing itself until touched.
-->
<main id="main">
  <section class="hero">
    <div class="wrap">
      <div class="hero-copy">
        <div class="app-label">Fill the heat.</div>
        <h1>A Thermometers puzzle with one true answer<span class="dot">.</span></h1>
        <p class="lede">Every row and column has a number. Every thermometer fills from the bulb. Work out where the mercury stops and the grid clicks shut. 660 curated puzzles, a fresh trio every day, no subscription.</p>
      </div>
      <div class="hero-cta">
        <div class="badge-row">${badge(true)}<small>Free on iPhone and iPad, with two optional one-time purchases</small></div>
        <p class="try"><span class="try-dot" aria-hidden="true"></span>Touch any cell to take over. This is level 1 of the 6${X}6 First Heat chapter, exactly as it ships in the app.</p>
      </div>
      ${phonePlay()}
    </div>
  </section>

  <div class="facts">
    <div class="wrap">
      <div class="fact"><strong>660 puzzles</strong><span>330 free, 330 in Pro</span></div>
      <div class="fact"><strong>8 board sizes</strong><span>5${X}5 up to 12${X}12</span></div>
      <div class="fact"><strong>3 a day</strong><span>Warm-Up, Daily, Challenge</span></div>
      <div class="fact"><strong>No subscription</strong><span>$2.99 or $4.99, once</span></div>
    </div>
  </div>

  <section class="chapter" id="how">
    <div class="wrap">
      <div class="copy">
        <div class="app-label">How to play</div>
        <h2>Three rules. No guessing.</h2>
        <p>A grid of glass thermometers, and a number beside every row and column.</p>
        <ol class="rules">
          <li><b>1</b>The number says how many cells in that row or column hold mercury.</li>
          <li><b>2</b>Mercury starts at the bulb and rises without gaps.</li>
          <li><b>3</b>A thermometer can be empty, full or filled partway.</li>
        </ol>
        <p>Play the counts against the shapes and every cell gives itself up. Mercuro’s solver checks that each board has exactly one answer, so the logic always holds.</p>
        <a class="more" href="/app/mercuro/how-to-play-thermometers/">Rules, plus a puzzle to try ${ICON.arrow}</a>
      </div>
      <div class="visual">${stepsWidget()}</div>
    </div>
  </section>

  <section class="chapter flip" id="preview">
    <div class="wrap">
      <div class="copy">
        <div class="app-label">In motion</div>
        <h2>Tap. Rise. Solved.</h2>
        <p>Mercury runs up the glass with every tap, with sound and haptics under your thumb. Clues turn teal the moment their line adds up.</p>
        <p>Close the last thermometer and the solve card drops in with your time, your chapter and the next level waiting.</p>
      </div>
      <div class="visual bare">${videoPhone()}</div>
    </div>
  </section>

  <section class="chapter wide" id="daily">
    <div class="wrap">
      <div class="copy">
        <div class="app-label">Daily</div>
        <h2>A fresh trio every day</h2>
        <p>A Warm-Up on 6${X}6 or 7${X}7. A Daily on 8${X}8 or 9${X}9. A Challenge anywhere from 10${X}10 to 12${X}12. Everyone gets the same three on the same date, so today’s Challenge is something to argue about.</p>
        <p>Missed one? The last two weeks wait in the archive. <a class="inline" href="/app/mercuro/daily-logic-puzzle/">More on the daily puzzles</a>.</p>
      </div>
      <div class="visual">${dailyWidget()}</div>
    </div>
  </section>

  <section class="chapter" id="levels">
    <div class="wrap">
      <div class="copy">
        <div class="app-label">Levels</div>
        <h2>Eight sizes. 660 puzzles. One climb.</h2>
        <p>Start on 5${X}5 and work up to 12${X}12. 330 puzzles are free, with 50 on each of the three smallest sizes, 40 on each of the middle three and 30 on 11${X}11 and 12${X}12. Mercuro Pro adds another 330.</p>
        <p>Every size runs in chapters of ten with names that heat up, First Heat, Warming Up, Simmer, Rolling Boil, Red Hot. Solve 7 and the next chapter opens.</p>
      </div>
      <div class="visual">${sizesWidget()}</div>
    </div>
  </section>

  <section class="chapter flip" id="hints">
    <div class="wrap">
      <div class="copy">
        <div class="app-label">Hints</div>
        <h2>Hints that show their working</h2>
        <p>Stuck? Mercuro finds the next move the clues force, lights up the thermometer and the line behind it, and tells you why in a sentence. <i>Row 3 needs 3. Fill this tube to 1.</i></p>
        <p>You see the deduction, make the move, and own it next time.</p>
      </div>
      <div class="visual">${hintsWidget()}</div>
    </div>
  </section>

  <section class="themes-sec" id="themes">
    <div class="wrap">
      <div class="themes-copy">
        <div class="app-label">Themes</div>
        <h2>Nine looks. Two from day one.</h2>
        <p>Riso paper with hard ink edges, cool glacier blue, deep midnight. Glacier and Slate, one light and one dark, are yours from the first launch. The other seven unlock as you solve, from Coral at 50 to Riso Paper at 330, or all at once with Pro.</p>
      </div>
      ${themesWidget()}
    </div>
  </section>

  <section class="chapter wide" id="progress">
    <div class="wrap">
      <div class="copy">
        <div class="app-label">Progress</div>
        <h2>From Novice to Virtuoso</h2>
        <p>Eight ranks, and every step past Novice hands you a new theme. Virtuoso sits at 330 solves, the whole free set, so the summit is open without paying a cent.</p>
        <p>Stats keeps your streak and your week of dailies in one glance. Game Center leaderboards rank weekly solves, all-time solves and streaks, for anyone who likes a scoreboard.</p>
      </div>
      <div class="visual two">${ranksWidget()}${statsWidget()}</div>
    </div>
  </section>

  <section class="chapter wide" id="achievements">
    <div class="wrap">
      <div class="copy">
        <div class="app-label">Achievements</div>
        <h2>40 achievements. ${DATA.achievementPoints.toLocaleString('en-US')} points.</h2>
        <p>First Heat for your first solve. Full Forecast for all three dailies in one day. Year of Heat for a 365-day streak. Tap any badge to see what it takes.</p>
      </div>
      <div class="visual">${badgesWidget()}</div>
    </div>
  </section>

  <section class="price-sec" id="pricing">
    <div class="wrap">
      <div class="price-top">
        <div>
          <div class="app-label">Pricing</div>
          <h2>Pay once. Or never.</h2>
          <p class="sub">The dailies and 330 puzzles are free. $2.99 once clears the ads, $4.99 once adds 330 puzzles and every theme. Nothing renews.</p>
        </div>
        ${tiersWidget()}
      </div>
      <h3 class="cmp-title">What the other Thermometers apps charge</h3>
      <div class="cmp-wrap"><table class="cmp market"><thead><tr><th scope="col">App</th><th scope="col">One-time purchases</th><th scope="col">Subscription</th><th scope="col">Puzzles</th></tr></thead><tbody>
${MARKET.map(([name, once, sub, n, src]) => `        <tr${src === true ? ' class="us"' : ''}><th scope="row">${esc(name)}</th><td data-label="One-time">${esc(once)}</td><td data-label="Subscription">${esc(sub)}</td><td data-label="Puzzles">${esc(n)}</td></tr>`).join('\n')}
      </tbody></table></div>
      <p class="fine">Checked ${CHECKED} on the US App Store: ${cite('got')}, ${cite('fx')}, ${cite('lpt')}. All three list far more puzzles than Mercuro, which matters if quantity is what you want. <a href="/app/mercuro/puzzle-game-no-subscription/">Why Mercuro has no subscription</a>.</p>
    </div>
  </section>

  <section class="more-sec" id="guides">
    <div class="wrap">
      <div class="app-label">Guides</div>
      <h2>Go deeper</h2>
      ${moreLinks('')}
    </div>
  </section>

  <section class="faq-sec" id="faq">
    <div class="wrap">
      <div class="faq-head"><h2>Questions</h2><p class="fine">Something else? Ask on the <a href="${SUPPORT}">support page</a>.</p></div>
      <div class="qa">
${LANDING_FAQ.map(([q, a]) => `        <details><summary>${esc(q)}</summary><p>${q === 'Who makes Mercuro?' ? `Arbaz Siddiqui, an independent developer. <a href="/mercuro">How Mercuro is built</a> explains the solver, generator and hint engine.` : esc(a)}</p></details>`).join('\n')}
      </div>
    </div>
  </section>

  <section class="closing">
    <div class="wrap">
      <div class="cta">
        <div class="cta-copy">
          <img class="icon" src="/app/mercuro/assets/mercuro-icon.webp" alt="Mercuro app icon" width="72" height="72" loading="lazy">
          <h2>Today’s trio is on the board</h2>
          <p>Warm up on the small one. Finish on the Challenge.</p>
          ${badge(false)}
        </div>
        <div class="cta-phone" aria-hidden="true">
          <div class="phone"><div class="ph-screen">${status}<div class="today-screen"><b class="app-title big">Mercuro<i>.</i></b><small class="app-sub">Fill the heat.</small><small class="sec-label">Daily</small>${todayCard()}<small class="sec-label">Continue</small><span class="browse"><span class="dots"></span><span><b>Browse all levels</b><small>660 puzzles · 8 sizes</small></span>${ICON.arrow}</span></div></div></div>
        </div>
      </div>
    </div>
  </section>
</main>
${FOOT}`;
}

function landingMd() {
  return `# Mercuro: Thermometers Logic Puzzle

> A Thermometers logic puzzle game for iPhone and iPad. Fill each thermometer from the bulb so
> every row and column matches its number. 660 curated puzzles, three new daily puzzles, and no
> subscription.

- Website: ${APP}
- App Store: ${STORE}
- Platforms: iPhone and iPad (iOS 17 or later). The App Store also lists Macs with Apple silicon and Apple Vision Pro.
- Price: free to play. Remove Ads $2.99 once. Mercuro Pro $4.99 once. No subscription.
- Made by: Arbaz Siddiqui, an independent developer (${BASE}/about)
- How it is built: ${BASE}/mercuro
- Support: ${BASE}${SUPPORT}
- Privacy policy: ${BASE}${PRIVACY}
- Last updated: ${UPDATED}

## Rules

1. The number beside each row or column says how many of its cells hold mercury.
2. Mercury starts at the bulb and rises without gaps.
3. A thermometer can be empty, full or filled partway.

Every board has exactly one solution, reachable by logic alone.

## Features

- **660 curated puzzles**: 330 free and 330 in Mercuro Pro, across 8 board sizes from 5x5 to 12x12. Free puzzles per size: 50 on 5x5, 6x6 and 7x7, 40 on 8x8 to 10x10, 30 on 11x11 and 12x12, in chapters of ten; solving 7 in a chapter opens the next.
- **Three daily puzzles**: Warm-Up, Daily and Challenge, the same for every player on the same date. The last two weeks stay in an archive.
- **Hints** that name the next forced move and explain why it follows.
- **Ads**: ${FREE_ADS} Either purchase removes all ads.
- **9 themes**: Glacier and Slate from the start; Coral, Plum, Matcha, Midnight, Porcelain, Forest and Riso Paper earned at 50 to 330 solves, or all unlocked with Pro.
- **Ranks**: eight, Novice to Virtuoso, each above Novice unlocking a theme; Virtuoso at 330 solves.
- **40 achievements** worth ${DATA.achievementPoints.toLocaleString('en-US')} Game Center points, and Game Center leaderboards for weekly solves, all-time solves and daily streak.
- **Offline play**: all puzzles are built into the app.

## Other Thermometers apps (US App Store, checked ${CHECKED})

| App | One-time purchases | Subscription | Puzzles |
|---|---|---|---|
${MARKET.map(([a, b, c, d]) => `| ${a} | ${b} | ${c} | ${d} |`).join('\n')}

## Questions

${LANDING_FAQ.map(([q, a]) => `**${q}** ${a}`).join('\n\n')}

## More about Mercuro

${PAGES.map((p) => `- [${p.h1}](${APP}${p.slug}/)`).join('\n')}
`;
}

// ── Write ──

const root = new URL('../public/app/mercuro/', import.meta.url);
mkdirSync(new URL('assets/', root), { recursive: true });
const client = readFileSync(new URL('./mercuro-app.js', import.meta.url), 'utf8');
const js = `var DATA = ${JSON.stringify(DATA)};\nvar THEMES = ${JSON.stringify(THEMES)};\n${client}`;
writeFileSync(new URL('assets/mercuro.js', root), js);
JS_V = hash(js);
CSS_V = hash(readFileSync(new URL('site.css', root)));
writeFileSync(new URL('index.html', root), landing());
writeFileSync(new URL('index.md', root), landingMd());
for (const p of PAGES) {
  const dir = new URL(`${p.slug}/`, root);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), page(p));
  writeFileSync(new URL('index.md', dir), pageMd(p));
}
writeFileSync(new URL('pages.json', root), `${JSON.stringify(PAGES.map((p) => ({ slug: p.slug, title: p.h1 })))}\n`);
console.log(`mercuro pages: index, ${PAGES.map((p) => p.slug).join(', ')}; every puzzle has one solution`);
