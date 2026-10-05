// The Iris search pages: one page per thing people look for (a private tracker, PCOS and
// irregular cycles, BBT and ovulation, Apple Health) and two comparisons people search for
// (Flo and Clue alternatives). Same template and stylesheet as the support page. Claims about
// Iris come from its landing page; claims about other apps and about health cite their source.
// Writes public/app/iris/<slug>/index.html and index.md.
//
//   node scripts/iris-pages.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'https://www.arbazsiddiqui.me';
const APP = `${BASE}/app/iris/`;
const STORE = 'https://apps.apple.com/app/id6761134901';
const TODAY = new Date().toISOString().slice(0, 10);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SRC = {
  ftc: ['FTC, June 2021', 'https://www.ftc.gov/news-events/news/press-releases/2021/06/ftc-finalizes-order-flo-health-fertility-tracking-app-shared-sensitive-health-data-facebook-google'],
  clueAccount: ['Clue: why you need an account', 'https://helloclue.com/articles/how-to-use-clue/why-do-i-need-an-account-to-use-the-newest-version-of-clue'],
  cluePlus: ['Clue: premium features', 'https://support.helloclue.com/hc/en-us/articles/15007319214493-What-premium-features-are-part-of-Clue-Period-Tracking'],
  bbt: ['Cleveland Clinic: basal body temperature', 'https://my.clevelandclinic.org/health/articles/21065-basal-body-temperature'],
  nhsPcos: ['NHS: PCOS', 'https://www.nhs.uk/conditions/polycystic-ovary-syndrome-pcos/'],
};
const cite = (k) => `<a href="${SRC[k][1]}" rel="noopener" target="_blank">${esc(SRC[k][0])}</a>`;

const PAGES = [
  {
    slug: 'private-period-tracker',
    tag: 'Privacy', colour: 'var(--rose)',
    title: 'Private period tracker for iPhone: no account, data on your phone',
    h1: 'A private period tracker',
    lede: 'Iris keeps your cycle on your iPhone. There is no account, no email and no Iris server, so there is nowhere else for your data to go.',
    description: 'A private period tracker for iPhone: no account or email, data stored on your phone, optional sync only to your own iCloud, and no Iris servers. Free.',
    sections: [
      ['Where your data goes', `<p>Everything you log stays on your iPhone. Turn on sync and a copy goes to your own private iCloud, so you can move to a new phone or use your iPad. Iris has no servers of its own, so there is no Iris copy of your data to leak, sell or hand over.</p>`],
      ['No account at all', `<p>There is no sign-up, email or login. You enter the date of your last period and start. Nothing ties what you log to your name.</p>`],
      ['Sharing only when you choose', `<p>Partner sharing works with a code you send. Your partner sees your phase, cycle day and predictions, view only and end-to-end encrypted. Mood and symptoms stay private unless you choose to share them, and you can stop at any time.</p>`],
      ['Why it matters', `<p>Period trackers hold some of the most sensitive data on a phone. In 2021 the US Federal Trade Commission finalised an order against one of the biggest, Flo, for sharing users' health data with Facebook, Google and other companies despite promising to keep it private (${cite('ftc')}). Keeping the data on the phone removes that risk instead of asking you to trust a policy.</p>`],
      ['Every feature is free', `<p>Iris shows a few ads to pay for itself, and a single one-time purchase removes them. There is no subscription and nothing is locked.</p>`],
    ],
    faq: [
      ['Does Iris sell or share my data?', 'No. Your data stays on your iPhone and, if you turn on sync, your own iCloud. Iris has no servers to send it to.'],
      ['Can I use Iris without an account?', 'Yes. There is no account, email or login.'],
      ['What happens if I lose my phone?', 'If sync is on, your history comes back from your own iCloud when you sign in to the new phone with your Apple ID.'],
    ],
  },
  {
    slug: 'pcos-period-tracker',
    tag: 'Irregular cycles', colour: 'var(--ovulation)',
    title: 'Period tracker for PCOS and irregular cycles',
    h1: 'A period tracker for PCOS and irregular cycles',
    lede: 'When your cycles swing by a week or more, one predicted date is just a guess. Iris gives you the window your period is likely to fall in, from your own history.',
    description: 'A free iPhone period tracker for irregular cycles and PCOS (PMOS): predictions as a likely window from your own cycles, honest when a period runs late, no account.',
    sections: [
      ['A window, not a single date', `<p>Iris looks at your past cycles and shows the range your next period is likely to land in, such as day 33 to 43. If your period runs past that window, Iris says so plainly and waits for you to log, instead of pretending it knows.</p>`],
      ['Built from your own cycles', `<p>Predictions start with the dates you give it and sharpen each time you log a period. Long cycles, short cycles and the odd outlier all count, so the window reflects how your body actually behaves rather than a textbook 28 days.</p>`],
      ['Track what matters to you', `<p>Log flow, symptoms, mood, discharge, sleep, weight and notes, and hide what you don't track. LH tests and basal temperature help show whether and when you ovulated in a long cycle.</p>`],
      ['A report for your doctor', `<p>Irregular periods or long gaps between them are one of the main symptoms of PCOS, the condition the NHS now calls PMOS (${cite('nhsPcos')}). Iris exports a PDF of your cycles and symptoms to take to an appointment, so the conversation starts from real dates.</p>`],
    ],
    faq: [
      ['Does Iris work with PCOS?', 'Yes. Set your cycle type to irregular and Iris shows a likely window based on your history instead of a single date.'],
      ['Can Iris diagnose PCOS?', 'No. Iris tracks and estimates; only a doctor can diagnose PCOS. The doctor report helps you bring your history to that appointment.'],
      ['Is it free?', 'Yes. Every feature is free; a one-time purchase removes ads.'],
    ],
  },
  {
    slug: 'bbt-ovulation-tracker',
    tag: 'Ovulation', colour: 'var(--fertile)',
    title: 'BBT and ovulation tracker for iPhone: basal temperature and LH tests',
    h1: 'A BBT and ovulation tracker',
    lede: 'Log your morning temperature and LH test strips. Iris charts temperatures against a coverline and uses a positive LH test to mark ovulation and reset the countdown to your next period.',
    description: 'Track basal body temperature and LH ovulation tests on iPhone: a BBT chart with a coverline, positive LH tests that move the period forecast, and two-way Apple Health sync. Free.',
    sections: [
      ['Basal body temperature', `<p>After ovulation, progesterone raises your resting temperature a little: Cleveland Clinic gives the rise as anywhere from 0.4 °F (0.22 °C) to 1 °F (0.56 °C) (${cite('bbt')}). It is small, so take it as soon as you wake, at about the same time each morning. Iris charts each reading against a coverline so the rise after ovulation is easy to see.</p>`],
      ['LH tests', `<p>LH tests pick up the hormone surge that comes before ovulation. Log a positive test and Iris marks ovulation on the calendar and moves your period prediction to match, so a late ovulation shifts the forecast instead of making the period look late.</p>`],
      ['Works with Apple Health', `<p>Basal temperature and ovulation tests sync both ways with Apple Health, so readings from a connected thermometer or another app land in Iris without typing them twice.</p>`],
      ['Trying to conceive, or not', `<p>Pick a goal mode: trying to conceive, avoiding pregnancy, or just tracking. Colours and wording change to fit. Temperature alone is not reliable birth control (${cite('bbt')}), and Iris never marks a day as safe.</p>`],
    ],
    faq: [
      ['Does Iris draw a coverline?', 'Yes. Temperatures are charted against a coverline so the post-ovulation rise stands out.'],
      ['Can I log LH test strips?', 'Yes. A positive LH test marks ovulation on your calendar and resets the countdown to your next period.'],
      ['Can I use temperature tracking as birth control?', 'No. Iris is not a contraceptive and its predictions are estimates.'],
    ],
  },
  {
    slug: 'period-tracker-apple-health',
    tag: 'Apple Health', colour: '#E0607E',
    title: 'Period tracker that syncs with Apple Health',
    h1: 'A period tracker that works with Apple Health',
    lede: 'Iris syncs with Apple Health in both directions, so your history isn’t locked inside one app and nothing has to be entered twice.',
    description: 'A free iPhone period tracker with two-way Apple Health sync: period flow, basal body temperature, ovulation tests, cervical mucus, weight and sleep. No account needed.',
    sections: [
      ['What syncs', `<ul><li>Period flow</li><li>Basal body temperature</li><li>Ovulation tests</li><li>Cervical mucus</li><li>Weight</li><li>Sleep</li></ul><p>Data you log in Iris goes to Apple Health, and data other apps and devices write to Apple Health comes into Iris.</p>`],
      ['Your data stays yours', `<p>Apple Health and Iris both keep the data on your iPhone. Iris has no account and no servers, so syncing with Health never sends your cycle anywhere else.</p>`],
      ['On your Home Screen too', `<p>Home Screen and Lock Screen widgets show your cycle day, phase and days until your next period, and move to the next day at midnight on their own.</p>`],
    ],
    faq: [
      ['Is the sync two-way?', 'Yes. Iris reads from and writes to Apple Health.'],
      ['Do I need an account to sync?', 'No. Apple Health sync works on the phone itself, with no Iris account.'],
    ],
  },
  {
    slug: 'flo-alternative',
    tag: 'Compare', colour: 'var(--luteal)',
    title: 'A free, private Flo alternative for iPhone',
    h1: 'A private Flo alternative',
    lede: 'Looking for a period tracker like Flo, without a subscription or your data leaving your phone? Iris does the core of what Flo does, keeps everything on your iPhone and has no account.',
    description: 'A free, private alternative to Flo for iPhone: period and ovulation predictions, PCOS mode, BBT and LH tracking, partner sharing and Apple Health sync, with no account, no subscription and data on your phone.',
    compare: { them: 'Flo', rows: [
      ['Price', 'Every feature free; a one-time purchase removes ads', 'Free version, plus Flo Premium, a subscription'],
      ['Privacy record', 'No Iris servers to share data from', `FTC order in 2021 over sharing health data with Facebook and Google (${cite('ftc')})`],
    ] },
    sections: [
      ['What Iris covers', `<ul><li>Period predictions from your own cycles, with the next period counted forward from ovulation</li><li>A likely window for irregular cycles and PCOS</li><li>BBT chart with a coverline, and LH test logging</li><li>Partner sharing, view only and end-to-end encrypted</li><li>Two-way Apple Health sync, widgets and cycle-aware reminders</li><li>Pregnancy, postpartum and hormonal contraception modes, and a PDF report for your doctor</li></ul>`],
      ['What Flo has that Iris doesn’t', `<p>Flo is a much bigger product, with a large library of expert articles and videos and an AI health assistant. If those are what you want, Flo is the better fit. Iris is for people who want a tracker that is complete, free and keeps their data to themselves.</p>`],
      ['Moving over', `<p>If you have kept your periods in Apple Health, Iris reads them in. Otherwise enter your last few period dates on the calendar and predictions start from there.</p>`],
    ],
    faq: [
      ['Is Iris really free?', 'Yes. Every feature is free. A few ads pay for the app, and a one-time purchase removes them. There is no subscription.'],
      ['Is Iris on Android?', 'No. Iris is for iPhone and iPad.'],
    ],
  },
  {
    slug: 'clue-alternative',
    tag: 'Compare', colour: 'var(--fertile)',
    title: 'A Clue alternative with no account: Iris for iPhone',
    h1: 'A Clue alternative with no account',
    lede: 'Clue needs an account and keeps your data on its servers. Iris needs no account and keeps your cycle on your iPhone, with every feature free.',
    description: 'An alternative to Clue for iPhone that needs no account: data stays on your phone, every feature is free, and it handles irregular cycles, BBT, LH tests, partner sharing and Apple Health.',
    compare: { them: 'Clue', rows: [
      ['Account', 'Not needed', `Required to use the app (${cite('clueAccount')})`],
      ['Where your data lives', 'Your iPhone, and optionally your own iCloud', `Clue’s servers in the EU (${cite('clueAccount')})`],
      ['Price', 'Every feature free; a one-time purchase removes ads', `Free version, plus Clue Plus, a subscription (${cite('cluePlus')})`],
    ] },
    sections: [
      ['What Iris covers', `<ul><li>Period predictions from your own cycles</li><li>A likely window for irregular cycles and PCOS</li><li>BBT chart with a coverline, and LH test logging</li><li>Partner sharing with a private code, end-to-end encrypted</li><li>Two-way Apple Health sync, widgets and reminders</li><li>A PDF report for your doctor</li></ul>`],
      ['When Clue is the better fit', `<p>Clue runs on Android as well as iPhone, and an account means your data follows you to any device. Iris is iPhone and iPad only, and moves between your own devices through your iCloud instead.</p>`],
    ],
    faq: [
      ['Why does no account matter?', 'Without an account, nothing links what you log to your name or email, and there is no copy of your cycle on a company server.'],
      ['Can I bring my history?', 'If your periods are in Apple Health, Iris reads them in. Otherwise add your last few period dates on the calendar.'],
    ],
  },
];

const others = (slug) => PAGES.filter((p) => p.slug !== slug);

function html(p) {
  const url = `${APP}${p.slug}/`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${url}#page`, url, name: p.title, description: p.description, inLanguage: 'en', dateModified: TODAY, about: { '@id': `${APP}#app` }, author: { '@id': `${BASE}/#person` },
        breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
          { '@type': 'ListItem', position: 2, name: 'Iris', item: APP },
          { '@type': 'ListItem', position: 3, name: p.h1, item: url },
        ] } },
      { '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: p.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  const compare = p.compare ? `
      <section class="group" id="compare" style="--c:${p.colour}">
        <h2><i></i>Iris and ${esc(p.compare.them)} side by side</h2>
        <div class="cmp-wrap"><table class="cmp"><thead><tr><th scope="col"></th><th scope="col">Iris</th><th scope="col">${esc(p.compare.them)}</th></tr></thead><tbody>
${p.compare.rows.map(([k, a, b]) => `          <tr><th scope="row">${esc(k)}</th><td>${esc(a)}</td><td>${b}</td></tr>`).join('\n')}
        </tbody></table></div>
        <p class="note">Checked ${TODAY}. Plans and policies change; see each company's own pages.</p>
      </section>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="Arbaz Siddiqui">
<link rel="canonical" href="${url}">
<link rel="author" href="/about">
<link rel="alternate" type="text/markdown" href="/app/iris/${p.slug}/index.md" title="This page as Markdown">
<meta name="apple-itunes-app" content="app-id=6761134901">
<link rel="icon" href="/app/iris/assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/app/iris/assets/apple-touch-icon.png">
<meta name="theme-color" content="#FAF6F7">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/og/iris.jpg">
<meta property="og:image:alt" content="Iris period tracker app icon and cycle screens">
<meta property="og:site_name" content="Arbaz Siddiqui">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${BASE}/og/iris.jpg">
<link rel="stylesheet" href="/app/iris/site.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>

<header class="nav">
  <div class="wrap">
    <a class="brand" href="/app/iris/"><img src="/app/iris/assets/iris-icon.webp" alt="" width="32" height="32">Iris</a>
    <ul>
      <li><a href="/app/iris/">Overview</a></li>
      <li><a href="/app/iris/support">Support</a></li>
      <li><a href="/app/iris/privacy">Privacy</a></li>
    </ul>
    <a class="get" href="${STORE}">Download</a>
  </div>
</header>

<main>
  <section class="page-hero">
    <div class="wrap">
      <div>
        <div class="tag" style="--c:${p.colour}"><i></i>${esc(p.tag)}</div>
        <h1>${esc(p.h1)}</h1>
        <p class="lede">${esc(p.lede)}</p>
      </div>
      <div class="panel contact">
        <p>Free on iPhone and iPad</p>
        <div class="row"><a class="btn" href="${STORE}">Get Iris on the App Store</a></div>
        <p>No account. No subscription. Every feature free.</p>
      </div>
    </div>
  </section>

  <div class="wrap prose">
${compare}
${p.sections.map(([h, body]) => `      <section class="group" style="--c:${p.colour}">
        <h2><i></i>${esc(h)}</h2>
        ${body}
      </section>`).join('\n')}
      <section class="group" id="questions" style="--c:${p.colour}">
        <h2><i></i>Questions</h2>
        <div class="qa">
${p.faq.map(([q, a]) => `          <details open><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
        </div>
        <p class="note">Iris is not a contraceptive. Its predictions are estimates, and it never marks a day as safe.</p>
      </section>
      <section class="group" style="--c:var(--ink-faint)">
        <h2><i></i>More about Iris</h2>
        <ul>${others(p.slug).map((o) => `<li><a href="/app/iris/${o.slug}/">${esc(o.h1)}</a></li>`).join('')}<li><a href="/app/iris/">The full overview</a></li></ul>
        <div class="row"><a class="btn" href="${STORE}">Download Iris</a></div>
      </section>
  </div>
</main>

<footer>
  <div class="wrap">
    <span>Made by <a href="/about">Arbaz Siddiqui</a>.</span>
    <nav>
      <a href="/app/iris/">Iris</a>
      <a href="/app/iris/support">Support</a>
      <a href="/app/iris/privacy">Privacy policy</a>
      <a href="/iris">How Iris is built</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

const strip = (s) => s.replace(/<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g, '[$2]($1)').replace(/<li>/g, '\n- ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
function markdown(p) {
  return `---\ntitle: ${p.title}\ndescription: ${p.description}\nurl: ${APP}${p.slug}/\n---\n\n# ${p.h1}\n\n${p.lede}\n\nApp Store: ${STORE}\n\n${p.compare ? `## Iris and ${p.compare.them}\n\n${p.compare.rows.map(([k, a, b]) => `- ${k}: Iris: ${a}. ${p.compare.them}: ${strip(b)}.`).join('\n')}\n\n` : ''}${p.sections.map(([h, b]) => `## ${h}\n\n${strip(b)}`).join('\n\n')}\n\n## Questions\n\n${p.faq.map(([q, a]) => `**${q}** ${a}`).join('\n\n')}\n\nIris is not a contraceptive. Its predictions are estimates.\n`;
}

for (const p of PAGES) {
  const dir = new URL(`../public/app/iris/${p.slug}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), html(p));
  writeFileSync(new URL('index.md', dir), markdown(p));
}
writeFileSync(new URL('../public/app/iris/pages.json', import.meta.url), `${JSON.stringify(PAGES.map((p) => ({ slug: p.slug, title: p.h1 })))}\n`);
console.log(`iris pages: ${PAGES.map((p) => p.slug).join(', ')}`);
