---
date: 2026-09-07
title: 'sqlite-sparse: semantic search inside a SQLite file, no model at query time'
template: post
thumbnail: '/thumbnails/website.png'
slug: sqlite-sparse
categories:
  - Search
tags:
  - SQLite
  - Retrieval
  - sqlite-sparse
---

[sqlite-sparse](https://github.com/arbazsiddiqui/sqlite-sparse) is a SQLite extension for semantic search. You insert text, it stores an index inside the database file, and searching that file needs no model, no server and no vector database.

## How it works

Most semantic search today is dense retrieval: an embedding model turns each document into a vector of a few hundred numbers, and at query time the same model turns the query into a vector so the two can be compared. Every search needs the model, so every place that searches needs the model too.

A learned sparse encoder, given a document, outputs a list of words from its vocabulary with a weight on each, about 150 to 300 words per paragraph. The words come from a transformer, so a sentence about aspirin and heart attacks gets a weight on `cardiac` even though the sentence never says it. The output can be stored the way search engines have stored text for decades: one posting list per word, listing the documents that carry it and their weights.

OpenSearch publishes a family of these encoders that are inference-free on the query side. The model runs only on documents. A query is split into tokens, each token gets a fixed weight from a table the model ships with, and the score of a document is the sum over matching tokens of query weight times stored weight, so a search is tokenizing, table lookups and additions.

sqlite-sparse puts that in a virtual table. INSERT runs the encoder, through an embedded copy of llama.cpp, and appends the weighted words to posting lists that are rows in the file. MATCH tokenizes the query, reads the query weights from the file and adds up the postings. The result is exact; there is no approximate index and no candidate stage.

```sql
.load ./sparse0
SELECT sparse_register('mini', 'mini_q8.gguf', 'mini.sprs');
CREATE VIRTUAL TABLE notes USING sparse0(model='mini');
INSERT INTO notes(rowid, text) VALUES (1, 'Aspirin lowers the risk of heart attack and stroke.');
```

```sql
SELECT rowid, score FROM notes WHERE notes MATCH 'what prevents cardiac arrest' LIMIT 10;
```

The second statement does not open the model files. Copy the `.db` to another machine, load the extension there, and the same query runs. Three OpenSearch models are available as aliases (`mini` at 23M parameters, `base` at 67M, `multilingual` at 168M) and download on first use. Since 1.1.0 the table also accepts `{"token": weight}` vectors directly, for sparse models you run yourself.

These encoders are BERT models with the masked-language-model head still attached, the layer that scores every vocabulary word as a candidate for a blank. That head is what turns token vectors into weighted words. llama.cpp drops it when converting BERT models, because it only uses them for embeddings. sqlite-sparse copies the head into a small sidecar file at conversion time and applies it itself, in C on ggml, after llama.cpp has produced the token vectors.

## Demo

The database below holds the 4,799 movie overviews from the [TMDB 5000 Movie Dataset](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata), indexed on a laptop with the `mini` model in 160 seconds. The page downloads that SQLite file (10 MB, 4.8 MB compressed) and SQLite compiled to WebAssembly with `sparse0` compiled in (2.4 MB, 0.9 MB compressed), and searches locally. Nothing is sent anywhere. No model is downloaded, because the query path does not need one.

The extension in that WebAssembly build is the same C code as the native one, built with llama.cpp left out, so it can search and write indexes but not encode text. The build recipe is in the repository's `wasm/` directory. Every query on this page is a `MATCH` against the virtual table. The JavaScript around it draws the results and, for each hit, reads the posting rows back to show which terms made the score.

<div id="ss-demo" class="ss-demo">
  <div class="ss-load">
    <button id="ss-load-btn" type="button">Load the demo (4.8 MB)</button>
    <span id="ss-status" class="ss-status"></span>
  </div>
  <div id="ss-ui" hidden>
    <form id="ss-form" class="ss-form" autocomplete="off">
      <input id="ss-q" type="search" placeholder="describe a movie you half remember" aria-label="Search query" />
      <button type="submit">Search</button>
    </form>
    <div class="ss-chips" id="ss-examples"></div>
    <p class="ss-explain" id="ss-explain"></p>
    <ol class="ss-results" id="ss-results"></ol>
    <p class="ss-foot" id="ss-foot"></p>
    <details class="ss-sql"><summary>What actually ran</summary>
<pre><code>-- once, when the file loaded
CREATE VIRTUAL TABLE temp.s USING sparse0();          -- attaches to the index in the file

-- per query, all inside the extension
SELECT rowid, score FROM s WHERE s MATCH ? AND k = 5;

-- for the display only
SELECT sparse_tokens(?);                              -- the tokens the query became
SELECT docs, ws FROM postings WHERE t = ?;            -- each hit's share per term
SELECT title, release_date, genres, overview FROM movies WHERE id = ?;</code></pre>
    </details>
  </div>
</div>

The overviews are one paragraph each and the model is small, so concrete descriptions work better than vague ones. Under each result are the words the model assigned to that overview, with the weight your query gave them; the score is the sum of those products. A word missing from the model's vocabulary is split into word pieces, shown with a `##` prefix.

## It runs everywhere

The extension is one C file plus llama.cpp, built with CMake. Prebuilt binaries exist for Linux x86-64 and macOS arm64, `pip install sqlite-sparse` installs one of them together with a Python reference implementation, and the sqlite3 shell loads the same file:

```
$ sqlite3 notes.db
sqlite> .load ./sparse0
sqlite> SELECT rowid, score FROM notes WHERE notes MATCH 'heart medication' LIMIT 5;
```

Any program that embeds SQLite loads it the same way, through `sqlite3_load_extension` or the shell's `.load`, so a Go, Rust, Node or Swift process can read an index a Python job built, with no bridge in between. Windows has not been built or tested.

SQLite's WebAssembly build has a hook for compiling extensions in, and the repository's `wasm/` directory uses it to produce a `sqlite3.wasm` with `sparse0` inside, minus llama.cpp. The demo above is that bundle. It ran unchanged in Chromium, Firefox and WebKit, and its rankings on the movies file, checked against the native binary, matched exactly.

The index itself is four ordinary tables: vocabulary and settings in `meta`, query weights in `qlut`, one row per word in `postings` holding a little-endian int32 array of document ids and one byte per weight, and a `docs` table. Any language reads that with its SQLite driver and a typed-array view. The Python package's reference implementation does exactly that with numpy and no extension, and the C code is tested against it.

## Exact search, no index to tune

There is no approximate nearest neighbour structure here and none is planned. A dense vector index needs one because comparing a query against a million vectors means a million dot products. A sparse query touches only the posting lists of its own tokens, four to ten lists for a typical question, and a posting list is already the index. Scoring every document that shares a token with the query is exact and, at a million documents, takes single-digit milliseconds. Tokens the model gives a zero query weight, which covers most stop words, are skipped before any list is read.

## Benchmarks

The numbers below compare three ways to search inside one SQLite file, each in the form you would install: FTS5, SQLite's built-in full-text search ranked by BM25; brute-force dense search with [sqlite-vec](https://github.com/asg017/sqlite-vec) int8 and the 23M [mdbr-leaf-ir](https://huggingface.co/MongoDB/mdbr-leaf-ir) model encoding queries on torch with 8 CPU threads; and `sparse0` with `mini` (23M parameters, Q8_0 encoder, one-byte weights). Nothing runs on a server or a GPU, no approximate index is involved, and queries run one at a time. Latency is end to end, so the dense number includes encoding the query, because a dense query cannot happen without it. FTS5 gets the OR of the query tokens ranked by `bm25()`; an AND would be faster and would miss documents that match only some terms. The corpus is the first 1M passages of MS MARCO with its dev queries. The machine is a GCE `c3-standard-8` (8 vCPU, 4 physical cores) on Debian 12, each engine in a fresh process, 4,000 sampled queries times five repetitions per lane, except at 1M where dense ran 900 by 3 and FTS5 1,000 by 3, reported as the median of repetition medians. Cold start is the second of three fresh-process runs. RAM is peak RSS after 50 warm queries. Scripts and raw results are attached to the GitHub release.

| msmarco, 1M documents | FTS5 BM25 | dense brute-force (sqlite-vec + 23M encoder) | sqlite-sparse (mini) |
|---|---|---|---|
| query p50, warm | 582 ms | 735 ms | **3.1 ms** |
| query p99, warm | 1,305 ms | 739 ms | **7.2 ms** |
| cold process to first result | 88 ms | 6,989 ms | **62 ms** |
| peak RAM on the query path | 37 MB | 527 MB | **28 MB** |
| index size, bytes per document | **540** | 807 | 1,092 |
| indexing, documents per second (CPU) | **~43,000** | 167 | 20.5 |

Bold is the best value in each row. At 100K documents the p50s are 54 ms, 82 ms and 0.26 ms in the same order.

sqlite-sparse loses two rows. The index is twice the size of FTS5's, because the model writes 150 to 300 weighted terms per passage where FTS5 stores the words that are there. Indexing is slow: the transformer runs once per document, 20 documents a second on this CPU, so a million-document index is a half-day job. The Python package has a bulk builder that runs the same models through torch on a GPU; I have not benchmarked that path here. Build the index where the hardware is and ship the file.

The extension keeps the model's quality.

| nDCG@10 | OpenSearch doc-v2-mini, 23M (card) | same model through sqlite-sparse | FTS5 BM25, same corpora |
|---|---|---|---|
| SciFact | 0.699 | 0.6985 | 0.668 |
| NFCorpus | 0.336 | 0.3371 | 0.308 |
| SCIDOCS | 0.164 | 0.1633 | 0.151 |
| FiQA | 0.338 | 0.3387 | 0.234 |

The reference is the model card's own nDCG@10 on these BEIR datasets. The compiled extension, with the Q8_0 encoder, one-byte weights and 512-token truncation, lands within about 0.001 of it on every set. The last column is what the semantic index buys over keyword search on the same documents and queries, small on SciFact, large on FiQA. The same model run in torch at fp32 agrees with the extension on 96 to 98 percent of top-10 results, and storing weights as one byte instead of four moved nDCG@10 by less than 0.001. For scale against dense models of the same size, mdbr-leaf-ir reports 0.5355 BEIR average to `mini`'s 0.497; the two do very different amounts of work at query time, so read that as context.

A 3 ms query in 28 MB of memory with no model loaded fits a laptop, a phone or a serverless function. It does not fit a corpus that changes faster than a CPU can encode 20 documents a second.

<style>
.ss-demo { border: 1px solid var(--line); border-radius: 12px; padding: 1rem 1.1rem; margin: 1.6rem 0; background: var(--bg-soft, transparent); }
.ss-load { display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap; }
.ss-demo button { font: inherit; padding: 0.5rem 0.9rem; border-radius: 8px; border: 1px solid var(--line); background: var(--fg); color: var(--bg, #fff); cursor: pointer; }
.ss-demo button:disabled { opacity: 0.6; cursor: default; }
.ss-status { color: var(--soft); font-size: 0.95rem; }
.ss-form { display: flex; gap: 0.6rem; margin-top: 0.4rem; }
.ss-form input { flex: 1; font: inherit; padding: 0.55rem 0.8rem; border-radius: 8px; border: 1px solid var(--line); background: transparent; color: var(--fg); min-width: 0; }
.ss-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.55rem 0 0.2rem; }
.ss-chips button { background: transparent; color: var(--fg); padding: 0.25rem 0.6rem; font-size: 0.9rem; }
.ss-explain { color: var(--soft); font-size: 0.92rem; margin: 0.5rem 0 0; }
.ss-explain code, .ss-terms code { font-size: 0.85em; }
.ss-results { list-style: none; padding: 0; margin: 0.4rem 0 0; }
.ss-results li { padding: 0.45rem 0; border-top: 1px solid var(--line); }
.ss-title { font-weight: 600; }
.ss-meta { color: var(--soft); font-size: 0.9rem; margin-left: 0.4rem; }
.ss-score { float: right; color: var(--soft); font-variant-numeric: tabular-nums; }
.ss-overview { margin: 0.15rem 0 0.25rem; color: var(--fg); font-size: 0.92rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ss-terms { color: var(--soft); font-size: 0.84rem; }
.ss-foot { color: var(--soft); font-size: 0.9rem; margin-top: 0.6rem; }
.ss-sql summary { cursor: pointer; color: var(--soft); font-size: 0.92rem; margin-top: 0.4rem; }
.ss-sql pre { font-size: 0.82rem; }
</style>

<script type="module">
import sqlite3InitModule from "/sqlite-sparse-demo/sqlite3.mjs";
import { SparseSearch } from "/sqlite-sparse-demo/search.js";

const $ = (id) => document.getElementById(id);
const EXAMPLES = ["astronauts stranded in space", "a robot learns to feel emotions", "time travel to change the past",
  "a chef opens a restaurant in paris", "detective hunts a serial killer in a rainy city", "a spy with amnesia",
  "dinosaurs escape on an island", "world war two submarine crew"];
let engine = null, movies = null;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (x, d = 2) => Number(x).toFixed(d);

async function load() {
  const btn = $("ss-load-btn"); btn.disabled = true;
  const status = $("ss-status");
  try {
    status.textContent = "starting SQLite WebAssembly…";
    const sqlite3 = await sqlite3InitModule({ print: () => {}, printErr: () => {} });
    const t0 = performance.now();
    engine = await SparseSearch.open(sqlite3, "/sqlite-sparse-demo/movies.db.gz", (got, total) => {
      status.textContent = `downloading and inflating the database… ${(got / 1048576).toFixed(1)} MB`;
    });
    movies = engine.db.prepare("SELECT title, release_date, genres, overview FROM movies WHERE id = ?");
    const ms = Math.round(performance.now() - t0);
    status.textContent = `${engine.ndocs.toLocaleString()} movies, ${(engine.bytes / 1048576).toFixed(1)} MB, loaded in ${ms} ms. `
      + (engine.native ? `Ranking by ${engine.extensionVersion} compiled to WebAssembly.` : "Ranking by the JavaScript port of the query path.")
      + " Nothing left this page.";
    btn.hidden = true;
    $("ss-ui").hidden = false;
    for (const ex of EXAMPLES) {
      const b = document.createElement("button"); b.type = "button"; b.textContent = ex;
      b.addEventListener("click", () => { $("ss-q").value = ex; run(); });
      $("ss-examples").appendChild(b);
    }
    $("ss-q").focus();
  } catch (e) {
    console.error("sqlite-sparse demo", e);
    status.textContent = "the demo could not load in this browser: " + (e && e.message ? e.message : e);
    btn.disabled = false;
  }
}

function run() {
  const q = $("ss-q").value.trim();
  if (!engine || !q) return;
  const { results, ms, termsScanned, postingsScanned, totalHits } = engine.search(q, 5);
  const qterms = engine.native ? [...engine.encodeQueryNative(q)].map(([t, w]) => ({ token: engine.vocab[t], weight: w })) : engine.explainQuery(q);
  $("ss-explain").innerHTML = qterms.length
    ? "your query became " + qterms.map((t) => `<code>${esc(t.token)}</code> ${fmt(t.weight)}`).join(", ")
    : "none of those tokens has a query weight in this model (stop words score zero)";
  const list = $("ss-results"); list.innerHTML = "";
  for (const r of results) {
    movies.bind([r.id]); movies.step();
    const [title, date, genres, overview] = [movies.get(0), movies.get(1), movies.get(2), movies.get(3)];
    movies.reset();
    const li = document.createElement("li");
    li.innerHTML = `<span class="ss-score">${fmt(r.score)}</span><span class="ss-title">${esc(title)}</span>`
      + `<span class="ss-meta">${esc((date || "").slice(0, 4))}${genres ? " · " + esc(genres) : ""}</span>`
      + `<p class="ss-overview">${esc(overview)}</p>`
      + `<div class="ss-terms">${r.terms.slice(0, 4).map((t) => `<code>${esc(t.token)}</code> ${fmt(t.q)} × ${fmt(t.w)}`).join(" &nbsp; ")}</div>`;
    list.appendChild(li);
  }
  $("ss-foot").textContent = results.length
    ? `${fmt(ms, 1)} ms for the MATCH in your browser: ${termsScanned} posting lists, ${postingsScanned.toLocaleString()} postings, ${totalHits.toLocaleString()} movies touched, top ${results.length}.`
    : `no movie scored above zero for that query (${fmt(ms, 1)} ms).`;
}

$("ss-load-btn").addEventListener("click", load);
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); load(); }
  }, { rootMargin: "400px" });
  io.observe($("ss-demo"));
} else {
  load();
}
$("ss-form").addEventListener("submit", (e) => { e.preventDefault(); run(); });
</script>
