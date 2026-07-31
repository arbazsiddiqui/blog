// Tell IndexNow-participating crawlers what changed, after a deploy.
// Reaches Bing, Yandex, Seznam, Naver, Yep, the Internet Archive and Amazonbot.
// Google does not participate in IndexNow; it only recrawls via Search Console.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const HOST = 'www.arbazsiddiqui.me';
const DIST = 'dist';

// The key is the public/<key>.txt file whose contents equal its own name.
async function findKey() {
  for (const name of await readdir(DIST)) {
    if (!name.endsWith('.txt')) continue;
    const stem = name.slice(0, -4);
    if (!/^[A-Za-z0-9-]{8,128}$/.test(stem)) continue;
    const body = (await readFile(join(DIST, name), 'utf8')).trim();
    if (body === stem) return stem;
  }
  return null;
}

const key = await findKey();
if (!key) {
  console.log('indexnow: no key file in dist, skipping');
  process.exit(0);
}

const xml = await readFile(join(DIST, 'sitemap-0.xml'), 'utf8');
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urlList.length === 0) {
  console.log('indexnow: sitemap had no URLs, skipping');
  process.exit(0);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${key}.txt`,
    urlList,
  }),
});

// A failed ping must never fail the deploy; the site is already live by now.
console.log(`indexnow: submitted ${urlList.length} URLs -> HTTP ${res.status}`);
