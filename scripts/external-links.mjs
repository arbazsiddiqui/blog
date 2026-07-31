// Post-build pass: every off-site link opens in a new tab.
// Runs on dist/ so it covers markdown posts and the copied static pages in
// public/ alike, neither of which goes through the .astro templates.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const OWN = 'arbazsiddiqui.me';
const ADD = ' target="_blank" rel="noopener"';

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

let files = 0;
let links = 0;

for (const file of await htmlFiles(DIST)) {
  const src = await readFile(file, 'utf8');
  let n = 0;
  const out = src.replace(/<a\s[^>]*>/g, (tag) => {
    const href = tag.match(/href="([^"]*)"/);
    if (!href) return tag;
    const url = href[1];
    if (!/^https?:\/\//i.test(url)) return tag;
    if (url.includes(OWN)) return tag;
    if (/\starget=/.test(tag)) return tag;
    n++;
    return tag.replace(/\s*>$/, ADD + '>');
  });
  if (n === 0) continue;
  // stripping exactly what was inserted must restore the input byte-for-byte
  if (out.replaceAll(ADD, '') !== src.replaceAll(ADD, '')) {
    throw new Error(`external-links: unsafe rewrite in ${file}`);
  }
  await writeFile(file, out);
  files++;
  links += n;
}

console.log(`external-links: ${links} link(s) across ${files} file(s) now open in a new tab`);
