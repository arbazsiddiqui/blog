// Post-build pass: every h2/h3 that carries an id gets a link to itself, so a
// section can be shared by URL. Runs on dist/ like external-links.mjs.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const anchor = (id) => `<a class="anchor" href="#${id}" aria-label="Link to this section">#</a>`;

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    // the Slop Corner games are self-contained apps with their own design; leave them alone
    if (entry.isDirectory() && path === join(DIST, 'slop-corner')) continue;
    if (entry.isDirectory()) out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

let files = 0;
let headings = 0;

for (const file of await htmlFiles(DIST)) {
  const src = await readFile(file, 'utf8');
  let n = 0;
  // <h2 id="slug">text</h2>, no nested heading tags inside, no anchor yet
  const out = src.replace(/<(h[23])\s+id="([^"]+)"([^>]*)>((?:(?!<\/\1>).)*?)<\/\1>/gs, (whole, tag, id, attrs, inner) => {
    if (inner.includes('class="anchor"')) return whole;
    n++;
    return `<${tag} id="${id}"${attrs}>${inner}${anchor(id)}</${tag}>`;
  });
  if (n === 0) continue;
  // stripping exactly what was inserted must restore the input byte-for-byte
  if (out.replace(/<a class="anchor" href="#[^"]+" aria-label="Link to this section">#<\/a>/g, '') !== src) {
    throw new Error(`heading-anchors: unsafe rewrite in ${file}`);
  }
  await writeFile(file, out);
  files++;
  headings += n;
}

console.log(`heading-anchors: ${headings} heading(s) across ${files} file(s) got a link`);
