// sqlite-sparse query path in the browser: the same file, the same algorithm, no model.
// Reads meta.vocab, qlut and the postings blobs from a sqlite-sparse/1 database opened
// with the official SQLite WASM build, tokenizes like BERT, looks up one weight per token
// and scatter-adds over the posting lists. Mirrors bindings/python/sqlite_sparse/search.py.

const MAX_WORD_CHARS = 100;
const MAX_QUERY_TOKENS = 512;

function isCjk(cp) {
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0x20000 && cp <= 0x2a6df)
    || (cp >= 0x2a700 && cp <= 0x2b73f) || (cp >= 0x2b740 && cp <= 0x2b81f) || (cp >= 0x2b820 && cp <= 0x2ceaf)
    || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0x2f800 && cp <= 0x2fa1f);
}
const RE_CONTROL = /\p{C}/u, RE_SPACE = /\p{Zs}/u, RE_MARK = /\p{Mn}/gu, RE_PUNCT = /\p{P}/u;
function isPunct(ch) {
  const cp = ch.codePointAt(0);
  if ((cp >= 33 && cp <= 47) || (cp >= 58 && cp <= 64) || (cp >= 91 && cp <= 96) || (cp >= 123 && cp <= 126)) return true;
  return RE_PUNCT.test(ch);
}

// BERT BasicTokenizer: clean, isolate CJK, split on whitespace, lowercase, strip combining marks, split punctuation.
export function basicTokenize(text) {
  let cleaned = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === 0 || cp === 0xfffd || (RE_CONTROL.test(ch) && ch !== "\t" && ch !== "\n" && ch !== "\r")) continue;
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || RE_SPACE.test(ch)) cleaned += " ";
    else if (isCjk(cp)) cleaned += ` ${ch} `;
    else cleaned += ch;
  }
  const words = [];
  for (const raw of cleaned.split(/\s+/)) {
    if (!raw) continue;
    const w = raw.toLowerCase().normalize("NFD").replace(RE_MARK, "");
    let cur = "";
    for (const c of w) {
      if (isPunct(c)) {
        if (cur) { words.push(cur); cur = ""; }
        words.push(c);
      } else cur += c;
    }
    if (cur) words.push(cur);
  }
  return words;
}

export class SparseSearch {
  constructor(sqlite3, db) {
    this.sqlite3 = sqlite3;
    this.db = db;
    const meta = new Map(db.selectArrays("SELECT k, v FROM meta"));
    if (meta.get("format") !== "sqlite-sparse/1") throw new Error("not a sqlite-sparse/1 database");
    this.modelId = meta.get("model_id");
    this.ndocs = parseInt(meta.get("ndocs") || "0", 10);
    this.scale = parseFloat(meta.get("weight_scale") || "40");
    this.u8 = (meta.get("weight_mode") || "u8") === "u8";
    this.vocab = JSON.parse(meta.get("vocab"));
    this.v2i = new Map(this.vocab.map((t, i) => [t, i]));
    this.unk = this.v2i.has("[UNK]") ? this.v2i.get("[UNK]") : -1;
    this.qlut = new Map(db.selectArrays("SELECT t, w FROM qlut"));
    this.dead = new Set(db.selectValues("SELECT id FROM docs WHERE deleted=1"));
    this.postings = db.prepare("SELECT docs, ws FROM postings WHERE t = ?");
    // When sparse0 is compiled into this SQLite build, ranking runs in the C extension and
    // the JavaScript below only reads the posting rows back to show each term's share.
    this.native = false;
    try {
      db.exec("CREATE VIRTUAL TABLE temp.s USING sparse0()");
      this.matchStmt = db.prepare("SELECT rowid, score FROM s WHERE s MATCH ? AND k = ?");
      this.tokensStmt = db.prepare("SELECT sparse_tokens(?)");
      this.native = true;
      this.extensionVersion = db.selectValue("SELECT sparse_version()");
    } catch (e) { this.native = false; }
  }

  // Fetches the database file and opens it read-only in memory.
  static async open(sqlite3, dbUrl, onProgress) {
    const res = await fetch(dbUrl);
    if (!res.ok) throw new Error(`fetch ${dbUrl}: ${res.status}`);
    const total = parseInt(res.headers.get("content-length") || "0", 10);
    const chunks = []; let got = 0;
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.byteLength;
      if (onProgress) onProgress(got, total);
    }
    let bytes = new Uint8Array(got); let off = 0;
    for (const c of chunks) { bytes.set(c, off); off += c.byteLength; }
    // A .gz file arrives either still compressed (magic 1f 8b) or already inflated by a
    // server that sets Content-Encoding; only the former needs inflating here.
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      if (typeof DecompressionStream !== "function") throw new Error("this browser cannot inflate gzip");
      const inflated = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
      bytes = new Uint8Array(inflated);
    }
    if (String.fromCharCode(...bytes.subarray(0, 15)) !== "SQLite format 3") throw new Error("not a SQLite file");
    const db = new sqlite3.oo1.DB();
    const p = sqlite3.wasm.allocFromTypedArray(bytes);
    const rc = sqlite3.capi.sqlite3_deserialize(db.pointer, "main", p, bytes.byteLength, bytes.byteLength,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_READONLY);
    db.checkRc(rc);
    const s = new SparseSearch(sqlite3, db);
    s.bytes = got;
    return s;
  }

  // Opens a database from bytes already in memory (tests, or a cached copy).
  static fromBytes(sqlite3, bytes) {
    const db = new sqlite3.oo1.DB();
    const p = sqlite3.wasm.allocFromTypedArray(bytes);
    const rc = sqlite3.capi.sqlite3_deserialize(db.pointer, "main", p, bytes.byteLength, bytes.byteLength,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_READONLY);
    db.checkRc(rc);
    const s = new SparseSearch(sqlite3, db);
    s.bytes = bytes.byteLength;
    return s;
  }

  wordpieceWord(w) {
    if ([...w].length > MAX_WORD_CHARS) return [this.unk];
    const ids = []; let s = 0;
    while (s < w.length) {
      let e = w.length, found = false;
      while (e > s) {
        const piece = s === 0 ? w.slice(s, e) : "##" + w.slice(s, e);
        if (this.v2i.has(piece)) { ids.push(this.v2i.get(piece)); found = true; break; }
        e -= 1;
      }
      if (!found) return [this.unk];
      s = e;
    }
    return ids;
  }

  tokenize(text) {
    const out = [];
    for (const w of basicTokenize(text)) {
      for (const t of this.wordpieceWord(w)) if (t >= 0) out.push(t);
      if (out.length >= MAX_QUERY_TOKENS) return out.slice(0, MAX_QUERY_TOKENS);
    }
    return out;
  }

  // {term id: summed query weight}, zero-weight tokens dropped, as the extension does.
  encodeQuery(text) {
    const qw = new Map();
    for (const t of this.tokenize(text)) {
      const w = this.qlut.get(t);
      if (w) qw.set(t, (qw.get(t) || 0) + w);
    }
    return qw;
  }

  // The tokens a query becomes and their weights, for display. With the extension present
  // the tokens come from its own tokenizer (sparse_tokens); otherwise from the JS port.
  explainQuery(text) {
    return [...this.encodeQuery(text)].map(([t, w]) => ({ token: this.vocab[t], weight: w }));
  }

  encodeQueryNative(text) {
    this.tokensStmt.bind([text]);
    let toks = [];
    if (this.tokensStmt.step()) toks = JSON.parse(this.tokensStmt.get(0));
    this.tokensStmt.reset();
    const qw = new Map();
    for (const tok of toks) {
      const t = this.v2i.get(tok);
      const w = t === undefined ? undefined : this.qlut.get(t);
      if (w) qw.set(t, (qw.get(t) || 0) + w);
    }
    return qw;
  }

  // Ranking by the sparse0 extension itself (MATCH), then the per-term shares of each hit
  // read from the same posting rows the extension summed.
  searchNative(text, k) {
    const t0 = performance.now();
    this.matchStmt.bind([text, k]);
    const results = [];
    while (this.matchStmt.step()) results.push({ id: this.matchStmt.get(0), score: this.matchStmt.get(1), terms: [] });
    this.matchStmt.reset();
    const ms = performance.now() - t0;
    const qw = this.encodeQueryNative(text);
    const byId = new Map(results.map((r) => [r.id, r]));
    let termsScanned = 0, postingsScanned = 0;
    const touched = new Set();
    for (const [t, w] of qw) {
      this.postings.bind([t]);
      if (this.postings.step()) {
        const docs = new Int32Array(this.postings.get(0).slice().buffer);
        const wsRaw = this.postings.get(1).slice().buffer;
        const weights = this.u8 ? new Uint8Array(wsRaw) : new Float32Array(wsRaw);
        termsScanned++; postingsScanned += docs.length;
        for (let i = 0; i < docs.length; i++) {
          touched.add(docs[i]);
          const r = byId.get(docs[i]);
          if (!r) continue;
          const sw = this.u8 ? weights[i] / this.scale : weights[i];
          r.terms.push({ token: this.vocab[t], q: w, w: sw, contrib: w * sw });
        }
      }
      this.postings.reset();
    }
    for (const r of results) r.terms.sort((a, b) => b.contrib - a.contrib);
    return { results, ms, termsScanned, postingsScanned, totalHits: touched.size, native: true };
  }

  search(text, k = 10) {
    if (this.native) return this.searchNative(text, k);
    const t0 = performance.now();
    const qw = this.encodeQuery(text);
    const score = new Float64Array(this.ndocs + 1);
    const rows = [];
    for (const [t, w] of qw) {
      this.postings.bind([t]);
      if (this.postings.step()) {
        const d = this.postings.get(0), ws = this.postings.get(1);
        const docs = new Int32Array(d.slice().buffer);
        const weights = this.u8 ? new Uint8Array(ws.slice().buffer) : new Float32Array(ws.slice().buffer);
        rows.push({ t, w, docs, weights });
        for (let i = 0; i < docs.length; i++) {
          const sw = this.u8 ? weights[i] / this.scale : weights[i];
          score[docs[i]] += w * sw;
        }
      }
      this.postings.reset();
    }
    const hits = [];
    for (let d = 1; d < score.length; d++) if (score[d] > 0 && !this.dead.has(d)) hits.push([d, score[d]]);
    hits.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const top = hits.slice(0, k);
    // which query terms scored each hit, for the explanation column
    const results = top.map(([id, s]) => ({ id, score: s, terms: [] }));
    const byId = new Map(results.map((r) => [r.id, r]));
    for (const row of rows) {
      for (let i = 0; i < row.docs.length; i++) {
        const r = byId.get(row.docs[i]);
        if (!r) continue;
        const sw = this.u8 ? row.weights[i] / this.scale : row.weights[i];
        r.terms.push({ token: this.vocab[row.t], q: row.w, w: sw, contrib: row.w * sw });
      }
    }
    for (const r of results) r.terms.sort((a, b) => b.contrib - a.contrib);
    return { results, ms: performance.now() - t0, termsScanned: rows.length,
             postingsScanned: rows.reduce((n, r) => n + r.docs.length, 0), totalHits: hits.length };
  }
}
