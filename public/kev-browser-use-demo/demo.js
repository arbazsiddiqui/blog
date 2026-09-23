// kev-0.6b-browser-use plays A Dark Room (Doublespeak Games, MPL-2.0), unmodified, in
// the browser over WebGPU. The goal the model reads is the game's latest message; the
// candidates are every button the game is showing. Nothing about the game is scripted.
import {
  OPERATIONS, ELEMENT_QUESTION, OPERATION_QUESTION, GROUP_SIZE,
  buildState, optionLabel, cut, splitGroups,
} from "./engine.js";

const OPEN_JEV = "https://cdn.jsdelivr.net/npm/open-jev@0.1.2/+esm";
// The exact module open-jev@0.1.2 imports, so env settings reach its loader.
const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm";
const FINAL_MODEL = "arbazsiddiqui/kev-0.6b-browser-use-ONNX";
const BASE_MODEL = "onnx-community/kev-0.6b-ONNX";
const LOCAL_HOST = "http://localhost:5181/";
const GAME_URL = "/games/adarkroom/index.html?ignorebrowser=true";
const GAME_WIDTH = 920;
const GAME_HEIGHT = 660;

const params = new URLSearchParams(location.search);
const MODE = ["base", "local"].includes(params.get("model")) ? params.get("model") : "final";
const MODEL_ID = MODE === "base" ? BASE_MODEL : FINAL_MODEL;
const MODEL_NAME = MODE === "base" ? "Kev-0.6B base (not fine-tuned)" : "kev-0.6b-browser-use";

// Goals are plain text. Nothing below is written per goal: the page reads what the game
// shows (places, buttons, costs, stores, villagers, what each job produces), turns it into
// questions, and the model answers every one of them.
const GOALS = ["Craft a rucksack", "Build a hut", "Buy a compass", "Craft a bone spear", "Make a waterskin", "Build a trap"];
const MAX_DEPTH = 2;

const SPEEDS = {
  watch: { gap: 1400, move: 450 },
  normal: { gap: 700, move: 260 },
};

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (p) => `${Math.round(p * 100)}%`;
const fmtMs = (ms) => (ms >= 100 ? ms.toFixed(0) : ms.toFixed(1));
const mb = (bytes) => (bytes / 1e6).toFixed(0);

function quantile(list, q) {
  if (!list.length) return NaN;
  const s = [...list].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

const host = document.getElementById("kbu-demo");
host.innerHTML = `
  <div class="kbu-stats" aria-live="polite">
    <div class="kbu-hero"><b data-stat="p50">–</b><span>ms per decision, p50</span></div>
    <div class="kbu-hero"><b data-stat="p95">–</b><span>ms, p95</span></div>
    <div class="kbu-hero"><b data-stat="decisions">0</b><span>decisions</span></div>
    <div class="kbu-hero"><b data-stat="played">0:00</b><span>played</span></div>
    <div class="kbu-hero"><b data-stat="goals">0</b><span>goals done</span></div>
    <dl class="kbu-facts">
      <div><dt>Model</dt><dd>${esc(MODEL_NAME)}</dd></div>
      <div><dt>Download</dt><dd data-stat="size">359 MB</dd></div>
      <div><dt>Load</dt><dd data-stat="load">not loaded</dd></div>
      <div><dt>Device</dt><dd data-stat="device">checking</dd></div>
      <div><dt>Tokens per request</dt><dd data-stat="tokens">–</dd></div>
      <div><dt>Stores</dt><dd data-stat="stores">–</dd></div>
    </dl>
  </div>

  <div class="kbu-console">
    <div class="kbu-path">
      <div class="kbu-path-head"><b>Pick a goal</b><span>Kev answers every question on the way: where to go, what to click, how to get what's missing.</span></div>
      <ol class="kbu-chips">${GOALS.map((g, i) => `<li><button type="button" class="kbu-chip" data-i="${i}"><span>${i + 1}</span><b>${esc(g)}</b><small class="kbu-chip-steps"></small></button></li>`).join("")}</ol>
    </div>
    <form class="kbu-goal-row" data-c="ask">
      <label class="kbu-goal-label" for="kbu-goal">Tell Kev</label>
      <input id="kbu-goal" class="kbu-goal" type="text" autocomplete="off" spellcheck="false" placeholder="or type your own order, like build a trap" />
      <button type="submit" class="kbu-btn kbu-primary">Do it</button>
    </form>
    <div class="kbu-controls">
      <label class="kbu-select">Start from <select data-c="start"><option value="village" selected>A small village</option><option value="new">The very beginning</option></select></label>
      <button type="button" class="kbu-btn kbu-quiet" data-c="restart">Restart</button>
      <label class="kbu-select">Pace <select data-c="speed"><option value="watch">Watch</option><option value="normal" selected>Normal</option></select></label>
      <button type="button" class="kbu-btn kbu-load-btn" data-c="load">Load model</button>
    </div>
    <div class="kbu-load">
      <div class="kbu-progress" hidden><div class="kbu-progress-bar"></div></div>
      <p class="kbu-status" role="status"></p>
    </div>
  </div>

  <div class="kbu-stage">
    <div class="kbu-frame">
      <div class="kbu-chrome">
        <span class="kbu-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="kbu-url">A Dark Room · Doublespeak Games · MPL-2.0</span>
      </div>
      <div class="kbu-viewport">
        <div class="kbu-scaler"><iframe class="kbu-game" title="A Dark Room" scrolling="no" width="${GAME_WIDTH}" height="${GAME_HEIGHT}"></iframe></div>
        <div class="kbu-overlay" aria-hidden="true">
          <div class="kbu-ring"><span class="kbu-tag"></span></div>
          <div class="kbu-cursor"><svg viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 14.8 L11.6 21.5 L14.4 20.2 L11.3 13.6 L17.5 13.6 Z" /></svg></div>
        </div>
      </div>
    </div>
    <aside class="kbu-panel" aria-label="Model decision">
      <div class="kbu-panel-head"><b>Next action</b><span class="kbu-phase">idle</span></div>
      <div class="kbu-said"><p class="kbu-sub kbu-says-label">Goal</p><p class="kbu-says">–</p></div>
      <div><p class="kbu-sub"><span class="kbu-q-kind">Button</span> <span class="kbu-cand-note"></span></p>
      <div class="kbu-cands"><p class="kbu-empty">Pick a goal to see every option it weighs.</p></div></div>
      <div><p class="kbu-sub">Operation</p>
      <div class="kbu-ops">${OPERATIONS.map((op) => `<div class="kbu-row" data-op="${op}"><span class="kbu-name">${op}</span><span class="kbu-track"><span class="kbu-fill"></span></span><span class="kbu-val">–</span></div>`).join("")}</div>
      <details class="kbu-sees"><summary>What the model sees</summary><pre class="kbu-state">Nothing sent yet.</pre></details></div>
      <p class="kbu-sub kbu-log-head">Log</p>
      <ol class="kbu-trail"></ol>
    </aside>
  </div>
`;

const ui = {
  status: $(".kbu-status", host),
  progress: $(".kbu-progress", host),
  bar: $(".kbu-progress-bar", host),
  loadBtn: $('[data-c="load"]', host),
  chips: [...host.querySelectorAll(".kbu-chip")],
  restart: $('[data-c="restart"]', host),
  start: $('[data-c="start"]', host),
  ask: $('[data-c="ask"]', host),
  goal: $("#kbu-goal", host),
  speed: $('[data-c="speed"]', host),
  viewport: $(".kbu-viewport", host),
  scaler: $(".kbu-scaler", host),
  game: $(".kbu-game", host),
  ring: $(".kbu-ring", host),
  tag: $(".kbu-tag", host),
  cursor: $(".kbu-cursor", host),
  phase: $(".kbu-phase", host),
  says: $(".kbu-says", host),
  saysLabel: $(".kbu-says-label", host),
  cands: $(".kbu-cands", host),
  candNote: $(".kbu-cand-note", host),
  qKind: $(".kbu-q-kind", host),
  state: $(".kbu-state", host),
  trail: $(".kbu-trail", host),
  stat: (k) => $(`[data-stat="${k}"]`, host),
};

// ---------- the game frame ----------
let scale = 1;
function fit() {
  scale = Math.min(1, ui.viewport.clientWidth / GAME_WIDTH);
  ui.scaler.style.transform = `scale(${scale})`;
  ui.viewport.style.height = `${GAME_HEIGHT * scale}px`;
}
new ResizeObserver(fit).observe(ui.viewport);

const gw = () => ui.game.contentWindow;
const gd = () => ui.game.contentDocument;

function gameReady() {
  const w = gw();
  return !!(w && w.Engine && w.Engine.activeModule && w.jQuery);
}

function hyperOn() {
  const w = gw();
  if (w && w.Engine && w.Engine.options && !w.Engine.options.doubleTime) w.Engine.triggerHyperMode();
}

const siteDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

ui.game.addEventListener("load", async () => {
  for (let i = 0; i < 50 && !gameReady(); i++) await sleep(100);
  if (!gameReady()) return;
  const w = gw();
  hyperOn();
  // the game's "sound available" prompt is a settings question, not play; sound stays off
  // until the reader turns it on from the game's own menu
  w.$SM.set("playStats.audioAlertShown", true);
  if (siteDark() && !w.$SM.get("config.lightsOff")) w.Engine.turnLightsOff();
});

const visible = (el) => el.getClientRects().length > 0 && gw().getComputedStyle(el).visibility !== "hidden";

// A worker arrow has no text of its own; it is named by its row, like "hunter +1".
function labelOf(el) {
  const row = el.closest(".workerRow");
  if (row && (el.classList.contains("upBtn") || el.classList.contains("dnBtn"))) {
    const name = row.querySelector(".row_key");
    return `${name ? name.textContent.trim() : "worker"} ${el.classList.contains("upBtn") ? "+1" : "-1"}`;
  }
  return buttonText(el);
}

function buttonText(el) {
  // a build button carries its cost tooltip as a child; the label is the first text node
  for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return n.textContent.trim();
  return el.textContent.trim();
}

// Every enabled button the game is showing: the current place's panel, an open event,
// and the tabs for every place found so far (clicking the current one does nothing,
// which is how the model waits).
function candidates() {
  if (!gameReady()) return [];
  const w = gw();
  const d = gd();
  const panel = w.Engine.activeModule.panel && w.Engine.activeModule.panel[0];
  const event = d.getElementById("event");
  const scope = event && visible(event) ? [event] : panel ? [panel] : [];
  const buttons = scope.flatMap((s) => [...s.querySelectorAll(".button:not(.disabled), .workerRow .upBtn:not(.disabled), .workerRow .dnBtn:not(.disabled)")]).filter(visible);
  if (!buttons.length) return [];
  const tabs = [...d.querySelectorAll(".headerButton")].filter(visible);
  return [...buttons, ...(event && visible(event) ? [] : tabs)].map((el) => ({
    el, tag: el.tagName.toLowerCase(), role: el.getAttribute("role") || "None", text: labelOf(el),
  }));
}

function latestMessage() {
  if (!gameReady()) return "";
  const n = gd().querySelector("#notifications .notification");
  return n ? n.textContent.trim() : "";
}

function eventText() {
  if (!gameReady()) return "";
  const d = gd();
  const event = d.getElementById("event");
  if (!event || !visible(event)) return "";
  const title = $(".eventTitle", event);
  const body = $("#description", event);
  return [title && title.textContent.trim(), body && body.textContent.trim()].filter(Boolean).join(": ");
}

function refreshGameStats() {
  if (!gameReady()) return;
  const d = gd();
  const rows = [...d.querySelectorAll("#stores .storeRow")].map((r) => `${$(".row_key", r)?.textContent.trim()} ${$(".row_val", r)?.textContent.trim()}`);
  setStat("stores", rows.length ? rows.slice(0, 3).join(", ") : "–");
}

// ---------- stats ----------
const stats = { latencies: [], decisions: 0, waits: 0, t0: 0, log: [] };
function setStat(k, v) { ui.stat(k).textContent = v; }
function refreshStats() {
  const l = stats.latencies;
  setStat("p50", l.length ? fmtMs(quantile(l, 0.5)) : "–");
  setStat("p95", l.length ? fmtMs(quantile(l, 0.95)) : "–");
  setStat("decisions", String(stats.decisions));
  const s = stats.t0 ? Math.floor((performance.now() - stats.t0) / 1000) : 0;
  setStat("played", `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
}

// ---------- model ----------
let jev = null;
let loading = null;
let gpuOk = false;
let choiceFn = null;

async function detectGpu() {
  if (!("gpu" in navigator)) return null;
  try { return await navigator.gpu.requestAdapter(); } catch { return null; }
}

function showNoGpu() {
  const why = "gpu" in navigator
    ? "This browser has WebGPU, but it is turned off or found no usable GPU."
    : "The 4-bit model needs WebGPU, which this browser doesn't support.";
  setStat("device", "no WebGPU");
  $(".kbu-load", host).innerHTML = `<div class="kbu-nogpu"><b>This browser can't run the model.</b>
    <p>${why} Try Chrome or Edge 113 or later on a desktop, Chrome 121 or later on Android, Safari 26 or later, or Firefox 141 or later on Windows (145 on Apple silicon Macs). The game still works: play it yourself.</p></div>`;
  for (const b of ui.chips) b.disabled = true;
  ui.loadBtn.hidden = true;
}

async function loadModel() {
  if (jev) return jev;
  if (loading) return loading;
  loading = (async () => {
    ui.loadBtn.disabled = true;
    ui.status.textContent = "Fetching the runtime…";
    const [{ OpenJev, choice }, { env }] = await Promise.all([import(OPEN_JEV), import(TRANSFORMERS)]);
    choiceFn = choice;
    env.allowLocalModels = false;
    if (MODE === "local") {
      env.remoteHost = LOCAL_HOST;
      env.remotePathTemplate = "{model}/resolve/{revision}/";
    }
    try {
      const info = await OpenJev.info({ model: MODEL_ID, device: "webgpu" });
      setStat("size", `${mb(info.downloadSize)} MB, ${info.dtype}${info.isCached ? ", cached" : ""}`);
    } catch (e) {
      throw new Error(MODE === "final"
        ? "The fine-tuned model isn't downloadable yet."
        : `Couldn't reach ${MODE === "local" ? LOCAL_HOST : "Hugging Face"} for ${MODEL_ID}: ${e.message || e}`);
    }
    ui.progress.hidden = false;
    const t0 = performance.now();
    const model = await OpenJev.load({
      model: MODEL_ID,
      device: "webgpu",
      onProgress: (p) => {
        ui.bar.style.width = `${Math.round(p.progress * 100)}%`;
        const secs = (performance.now() - t0) / 1000;
        const rate = p.loaded / Math.max(secs, 0.001) / 1e6;
        ui.status.textContent = `Downloading ${mb(p.loaded)} of ${mb(p.total)} MB · ${rate.toFixed(rate < 10 ? 1 : 0)} MB/s`;
      },
    });
    const loadMs = performance.now() - t0;
    ui.status.textContent = "Compiling GPU shaders…";
    const t1 = performance.now();
    await model.decide("Goal: warm up\nCandidate elements:\n[0] <div> role=None \"OK\"", { element: choice(ELEMENT_QUESTION, ['[0] <div> "OK"']), operation: choice(OPERATION_QUESTION, OPERATIONS) });
    const warmMs = performance.now() - t1;
    ui.progress.hidden = true;
    setStat("load", `${(loadMs / 1000).toFixed(1)} s + ${(warmMs / 1000).toFixed(1)} s warm-up`);
    ui.loadBtn.hidden = true;
    ui.status.textContent = `Ready. ${MODEL_NAME} runs on this device; nothing leaves it.`;
    jev = model;
    Object.assign(window.__kbu, { loadMs, warmMs, runtime: model.runtime });
    return model;
  })();
  try {
    return await loading;
  } catch (e) {
    loading = null;
    ui.progress.hidden = true;
    ui.loadBtn.disabled = false;
    ui.status.innerHTML = MODE === "final"
      ? `${esc(e.message)} The weights go public on release day. Until then, <a href="?model=base#demo">try the base model</a>, which has never seen a web page.`
      : `Load failed: ${esc(e.message || e)}`;
    console.error("kev-browser-use demo", e);
    throw e;
  }
}
ui.loadBtn.addEventListener("click", () => { loadModel().catch(() => {}); });

function tokenCount(state, labels) {
  let n = jev.countTokens(state) + jev.countTokens(ELEMENT_QUESTION) + jev.countTokens(OPERATION_QUESTION);
  for (const l of labels) n += jev.countTokens(l);
  for (const op of OPERATIONS) n += jev.countTokens(op);
  return n;
}

async function ask(goal, history, cands) {
  const state = buildState(goal, history, cands);
  const labels = cands.map(optionLabel);
  const t0 = performance.now();
  const a = await jev.decide(state, {
    element: choiceFn(ELEMENT_QUESTION, labels),
    operation: choiceFn(OPERATION_QUESTION, OPERATIONS),
  });
  const ms = performance.now() - t0;
  stats.latencies.push(ms);
  const tokens = tokenCount(state, labels);
  setStat("tokens", String(tokens));
  return { idx: labels.indexOf(a.element.choice), a, ms, state, labels, tokens, cands };
}

// More than 10 buttons: the model picks one per group of at most 10 in page order,
// then picks among the group winners.
async function decide(goal, history, all) {
  const calls = [];
  let pool = all;
  while (pool.length > GROUP_SIZE) {
    const winners = [];
    for (const g of splitGroups(pool)) {
      const r = await ask(goal, history, g);
      calls.push(r);
      winners.push(g[r.idx]);
    }
    pool = winners;
  }
  const final = await ask(goal, history, pool);
  calls.push(final);
  return { all, final, calls, stepMs: calls.reduce((t, c) => t + c.ms, 0) };
}

// ---------- panel ----------
function renderPanel(d, kind = "Button") {
  const { final } = d;
  const probs = final.a.element.probabilities;
  const ops = final.a.operation ? final.a.operation.probabilities : {};
  ui.qKind.textContent = kind;
  for (const op of OPERATIONS) {
    const row = $(`[data-op="${op}"]`, host);
    const p = ops[op] ?? 0;
    row.classList.toggle("on", !!final.a.operation && op === final.a.operation.choice);
    $(".kbu-fill", row).style.width = pct(p);
    $(".kbu-val", row).textContent = final.a.operation ? p.toFixed(2) : "–";
  }
  const order = final.labels.map((l, i) => ({ l, i, p: probs[l] ?? 0 }));
  ui.cands.innerHTML = order.map(({ l, i, p }) => `<div class="kbu-row kbu-cand ${i === final.idx ? "on" : ""}" title="${esc(l)}"><span class="kbu-name">${esc(cut(final.cands[i].text))}</span><span class="kbu-track"><span class="kbu-fill" style="width:0"></span></span><span class="kbu-val">${p.toFixed(2)}</span></div>`).join("");
  requestAnimationFrame(() => {
    ui.cands.querySelectorAll(".kbu-fill").forEach((f, k) => { f.style.width = pct(order[k].p); });
  });
  ui.candNote.textContent = kind !== "Button" ? `${d.all.length} options`
    : d.calls.length > 1 ? `final round, ${d.all.length} buttons over ${d.calls.length} calls`
    : `${d.all.length} buttons`;
  ui.state.textContent = `${final.state}\n\nQuestion: ${final.question || ELEMENT_QUESTION}\n${final.labels.map((l) => `  ${l}`).join("\n")}` +
    (final.a.operation ? `\n\nQuestion: ${OPERATION_QUESTION}\n${OPERATIONS.map((o) => `  ${o}`).join("\n")}` : "");
}

const MAX_TRAIL = 30;
function trailRow(html, cls = "") {
  const li = document.createElement("li");
  li.className = cls;
  li.innerHTML = html;
  ui.trail.prepend(li);
  while (ui.trail.children.length > MAX_TRAIL) ui.trail.lastChild.remove();
  return li;
}

// ---------- overlay: cursor and ring over the game frame ----------
let tracked = null;
function rel(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left * scale, y: r.top * scale, w: r.width * scale, h: r.height * scale };
}
function follow() {
  if (tracked && tracked.isConnected && visible(tracked)) {
    const r = rel(tracked);
    Object.assign(ui.ring.style, { transform: `translate(${r.x - 4}px, ${r.y - 4}px)`, width: `${r.w + 8}px`, height: `${r.h + 8}px` });
  } else if (tracked) {
    ui.ring.classList.remove("show");
  }
  requestAnimationFrame(follow);
}
async function pointAt(el, p) {
  const r = rel(el);
  const sp = SPEEDS[ui.speed.value];
  ui.cursor.style.transitionDuration = `${sp.move}ms`;
  ui.cursor.classList.add("show");
  ui.cursor.style.transform = `translate(${r.x + Math.min(r.w * 0.6, r.w - 6)}px, ${r.y + r.h * 0.55}px)`;
  tracked = el;
  ui.tag.textContent = p.toFixed(2);
  ui.ring.classList.remove("show");
  await sleep(sp.move);
  ui.ring.classList.add("show");
  ui.cursor.classList.add("press");
  await sleep(90);
  ui.cursor.classList.remove("press");
}

// ---------- the planner ----------
let busy = false;
let goalsDone = 0;
const history = [];

// What the game knows, read straight from it.
const stores = () => gw().$SM.get("stores") || {};
const workers = () => gw().$SM.get("game.workers") || {};
const population = () => gw().$SM.get("game.population") || 0;
const freeVillagers = () => Math.max(0, population() - Object.values(workers()).reduce((a, b) => a + b, 0));
const secondsPerTick = () => (gw().Engine.options.doubleTime ? 0.5 : 1);
function costOf(el) {
  const thing = el && el.getAttribute && el.getAttribute("buildThing");
  const R = gw().Room;
  const item = thing && (R.Craftables[thing] || R.TradeGoods[thing]);
  return item ? { thing, cost: item.cost() } : null;
}
// How many of a thing the village has: buildings for buildings, stores for everything else.
function countOf(thing) {
  const w = gw();
  const item = w.Room.Craftables[thing];
  return (item && item.type === "building" ? w.$SM.get(`game.buildings["${thing}"]`, true) : w.$SM.get(`stores["${thing}"]`, true)) || 0;
}
const fmt = (o) => Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${k} ${Math.floor(v)}`).join(", ");
const inventory = () => `Stores: ${fmt(stores())}\nVillagers: ${population()}, ${freeVillagers()} free; ${fmt(workers())}`;

// Every place the game has unlocked, with the buttons in it.
function places() {
  const w = gw();
  const mods = [w.Room, w.Outside, w.Path, w.Ship, w.Fabricator].filter((m) => m && m.tab && m.panel);
  return mods.filter((m) => visible(m.tab[0])).map((m) => {
    const els = [...m.panel[0].querySelectorAll(".button, .workerRow .upBtn")];
    const names = [...new Set(els.map(labelOf).filter(Boolean))];
    // group by the game's own section headings ("build:", "craft:", "buy:"); workers by row
    const groups = new Map();
    for (const el of els) {
      const row = el.closest(".workerRow");
      const legend = row ? "workers" : ((el.closest("[data-legend]") || {}).dataset || {}).legend;
      const key = (legend || "").replace(/:$/, "");
      const name = row ? row.getAttribute("key") : labelOf(el);
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key).add(name);
    }
    const label = [...groups].map(([k, v]) => (k ? `${k}: ` : "") + [...v].join(", ")).join("; ");
    return { mod: m, tab: m.tab[0], name: m.tab[0].textContent.trim(), names, label: `${m.tab[0].textContent.trim()}: ${label}` };
  });
}

// Every enabled button in every place the game has unlocked. The model picks from all of
// them; if its pick is in another place, the page walks there first, the way an agent
// scrolls to an element that is off screen.
function everyButton() {
  if (!gameReady()) return [];
  const d = gd();
  const event = d.getElementById("event");
  if (event && visible(event)) return candidates();
  const out = [];
  for (const p of places()) {
    for (const el of p.mod.panel[0].querySelectorAll(".button:not(.disabled), .workerRow .upBtn:not(.disabled), .workerRow .dnBtn:not(.disabled)")) {
      if (el.id === "lightButton" && getComputedStyle(el).display === "none") continue;
      out.push({ el, place: p, tag: el.tagName.toLowerCase(), role: el.getAttribute("role") || "None", text: labelOf(el) });
    }
  }
  return out;
}

// Where more of something can come from, and the button that starts it.
function sources() {
  const w = gw();
  const out = [];
  const cart = w.$SM.get('game.buildings["cart"]', true) > 0;
  out.push({ kind: "gather", button: "gather wood", label: `gather wood: makes wood, ${cart ? 50 : 10} each time`, gives: { wood: cart ? 50 : 10 } });
  if (w.$SM.get('game.buildings["trap"]', true) > 0) {
    out.push({ kind: "traps", button: "check traps", label: `check traps: finds ${w.Outside.TrapDrops.map((t) => t.name).join(", ")}`, gives: {} });
  }
  const jobs = workers();
  for (const [key, inc] of Object.entries(w.Outside._INCOME)) {
    if (!(key in jobs)) continue;
    const makes = Object.entries(inc.stores).filter(([, v]) => v > 0).map(([k]) => k);
    const uses = Object.entries(inc.stores).filter(([, v]) => v < 0).map(([k]) => k);
    out.push({ kind: "worker", key, button: `${key} +1`, label: `${key}: makes ${makes.join(", ")}${uses.length ? `, uses ${uses.join(", ")}` : ""}`, income: inc });
  }
  for (const [key, good] of Object.entries(w.Room.TradeGoods)) {
    if (!places().some((p) => p.names.includes(key))) continue;
    out.push({ kind: "buy", key, button: key, label: `buy ${key}: gives ${key}, costs ${fmt(good.cost())}` });
  }
  return out;
}

// One question to the model: pick one of these options.
async function askChoice(state, question, labels, kind) {
  const t0 = performance.now();
  const a = await jev.decide(state, { element: choiceFn(question, labels) });
  const ms = performance.now() - t0;
  stats.latencies.push(ms);
  const idx = labels.indexOf(a.element.choice);
  const final = { idx, a, ms, state, labels, question, cands: labels.map((text) => ({ tag: "", text })) };
  stats.decisions++;
  if (!stats.t0) stats.t0 = performance.now() - ms;
  renderPanel({ final, calls: [final], all: labels }, kind);
  refreshStats();
  return { idx, p: a.element.confidence, ms };
}

function logLine(kind, asked, answer, p, ms, note = "") {
  stats.log.push({ kind, order: asked, pick: answer, p, stepMs: ms, said: note });
  trailRow(`<span class="kbu-t-n">${stats.decisions}</span><span class="kbu-t-kind">${esc(kind)}</span><span class="kbu-t-said">${esc(cut(asked, 70))}</span> <b>${esc(answer)}</b> <span class="kbu-t-p">${p.toFixed(2)} · ${fmtMs(ms)} ms</span>${note ? `<span class="kbu-t-note">${esc(note)}</span>` : ""}`);
}

async function waitFor(label, test, seconds) {
  const t0 = performance.now();
  while ((performance.now() - t0) / 1000 < seconds) {
    if (test()) return true;
    const left = Math.max(0, Math.ceil(seconds - (performance.now() - t0) / 1000));
    ui.phase.textContent = `${label} · ${left} s`;
    await sleep(500);
  }
  return test();
}

// One click: the model picks the button for the order. Returns the element it clicked.
async function walkTo(place, p) {
  if (!place || place.mod === gw().Engine.activeModule) return;
  await pointAt(place.tab, p);
  gw().jQuery(place.tab).click();
  await sleep(800);
}

async function click(order, target) {
  refreshGameStats();
  if (target && !(await waitFor(`waiting for ${target}`, () => everyButton().some((c) => c.text === target), 90))) return null;
  for (let t = 0; t < 60 && !everyButton().length; t++) await sleep(1000);
  const all = everyButton();
  if (!all.length) return null;
  ui.phase.textContent = "thinking";
  // each order is a one-step task, so no previous actions carry over from other orders
  const d = await decide(order, [], all);
  const { final } = d;
  const chosen = final.cands[final.idx];
  stats.decisions++;
  if (!stats.t0) stats.t0 = performance.now() - d.stepMs;
  renderPanel(d, "Button");
  refreshStats();
  await walkTo(chosen.place, final.a.element.confidence);
  await pointAt(chosen.el, final.a.element.confidence);
  const bought = costOf(chosen.el);
  const countBefore = bought ? countOf(bought.thing) : 0;
  if (chosen.el.isConnected) gw().jQuery(chosen.el).click();
  history.push({ role: chosen.role === "None" ? chosen.tag : chosen.role, text: chosen.text, op: final.a.operation.choice });
  await sleep(chosen.el.classList.contains("headerButton") ? 800 : 150);
  const said = latestMessage();
  logLine("click", order, chosen.text, final.a.element.confidence, d.stepMs, said ? `the game says: ${said}` : "");
  return { el: chosen.el, text: chosen.text, item: bought, said, made: bought ? countOf(bought.thing) > countBefore : null };
}

// Get `need` more of `what`: the model picks the source, and how many workers if it's a job.
async function fetchMore(what, need, forGoal, depth) {
  const src = sources();
  const state = `Goal: get ${Math.ceil(need)} more ${what} to ${forGoal.toLowerCase()}\n${inventory()}`;
  const r = await askChoice(state, `How do we get more ${what}?`, src.map((s) => s.label), "Plan");
  const s = src[r.idx];
  logLine("plan", `get ${Math.ceil(need)} more ${what}`, s.label.split(":")[0], r.p, r.ms);
  const target = () => (gw().$SM.get(`stores["${what}"]`, true) || 0);
  const goal = target() + need;

  if (s.kind === "gather" || s.kind === "traps") {
    for (let round = 0; round < 4 && target() < goal; round++) {
      const done = await click(s.kind === "gather" ? "Gather some wood" : "Check the traps", s.button);
      if (!done) return false;
    }
    return target() >= goal;
  }
  if (s.kind === "buy") {
    return !!(await achieve(`Buy ${s.key}`, depth + 1));
  }
  // a job: how many to put on it, with the wait each choice means
  const perTick = s.income.stores[what] || 0;
  const free = freeVillagers();
  if (perTick <= 0 || free < 1) { logLine("plan", `get more ${what}`, "can't", 0, 0, free < 1 ? "no free villagers" : `${s.key} doesn't make ${what}`); return false; }
  // net change per second across every job (tanners use fur while hunters make it)
  const w = gw();
  const jobs = { ...workers(), gatherer: freeVillagers() };
  const netPerSecond = (extra) => Object.entries(w.Outside._INCOME).reduce((sum, [key, inc]) => {
    const n = (jobs[key] || 0) + (key === s.key ? extra : 0) - (key === "gatherer" ? extra : 0);
    return sum + n * (inc.stores[what] || 0) / (inc.delay * secondsPerTick());
  }, 0);
  const eta = (k) => (netPerSecond(k) > 0 ? Math.ceil(need / netPerSecond(k)) : Infinity);
  const counts = [...Array(Math.min(free, 5)).keys()].map((i) => i + 1);
  const MAX_WAIT = 180;
  const best = eta(counts[counts.length - 1]);
  if (best > MAX_WAIT) {
    const why = best === Infinity ? `other jobs use ${what} faster than ${counts[counts.length - 1]} more ${s.key}s would make it` : `even ${counts[counts.length - 1]} more ${s.key}s would take about ${Math.round(best / 60)} min`;
    logLine("plan", `get ${Math.ceil(need)} more ${what}`, "too slow", 0, 0, why);
    return false;
  }
  const usable = counts.filter((k) => eta(k) <= MAX_WAIT);
  const rc = await askChoice(state, `How many more ${s.key}s?`, usable.map((k) => `${k} more ${s.key}${k > 1 ? "s" : ""}, about ${eta(k)} s`), "How many");
  const k = usable[rc.idx];
  logLine("how many", `more ${s.key}s`, String(k), rc.p, rc.ms, `about ${eta(k)} s`);
  for (let i = 0; i < k; i++) if (!(await click(`Add a ${s.key}`, `${s.key} +1`))) return false;
  return waitFor(`waiting for ${what}`, () => target() >= goal, eta(k) * 2 + 20);
}

// The goal loop: try, and if the game says something is missing, get it and try again.
async function achieve(goal, depth = 0) {
  let item = null;
  let startCount = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const done = await click(goal);
    if (!done) return false;
    // the first thing the goal tried to make is what "done" means for it
    if (!item && done.item) { item = done.item.thing; startCount = countOf(item) - (done.made ? 1 : 0); }
    const m = /^not enough (.+?)\.?$/.exec(done.said || "");
    if (!m) return item ? countOf(item) > startCount : true;
    if (depth >= MAX_DEPTH || !done.item) return false;
    const what = m[1];
    const need = (done.item.cost[what] || 0) - (gw().$SM.get(`stores["${what}"]`, true) || 0);
    if (need <= 0) continue;
    if (!(await fetchMore(what, need, goal, depth))) return false;
  }
  return false;
}

async function ensureReady() {
  if (!gpuOk) return false;
  try { await loadModel(); return true; } catch { return false; }
}

async function runGoal(goal, chip) {
  if (busy) return false;
  busy = true;
  ui.chips.forEach((c) => { c.disabled = true; });
  const first = stats.log.length;
  const note = (t) => { if (chip) $(".kbu-chip-steps", chip).textContent = t; };
  try {
    if (!(await ensureReady())) return false;
    ui.says.textContent = goal;
    note("working…");
    const ok = await achieve(goal);
    const n = stats.log.length - first;
    note(ok ? `done, ${n} decisions` : `didn't finish, ${n} decisions`);
    if (chip) chip.classList.toggle("done", ok);
    if (ok) setStat("goals", String(++goalsDone));
    ui.phase.textContent = ok ? "done" : "stopped";
    return ok;
  } catch (e) {
    console.error("kev-browser-use demo", e);
    ui.status.textContent = `Error: ${e.message || e}`;
    return false;
  } finally {
    busy = false;
    ui.chips.forEach((c) => { c.disabled = false; });
  }
}

// The village is a save in the game's own format: a few buildings and stores, so many
// buttons are on screen from the first decision.
let villageSave = null;
async function newGame(from = ui.start.value) {
  try {
    if (from === "village") {
      villageSave = villageSave || await (await fetch(new URL("./village-save.json", import.meta.url))).text();
      localStorage.setItem("gameState", villageSave);
    } else {
      localStorage.removeItem("gameState");
    }
  } catch { /* storage blocked: the game starts from the beginning */ }
  history.length = 0;
  ui.chips.forEach((c) => { c.classList.remove("done"); $(".kbu-chip-steps", c).textContent = ""; });
  Object.assign(stats, { latencies: [], decisions: 0, waits: 0, t0: 0, log: [] });
  ui.trail.innerHTML = "";
  tracked = null;
  ui.ring.classList.remove("show");
  ui.cursor.classList.remove("show");
  refreshStats();
  ui.game.src = GAME_URL;
}

ui.chips.forEach((c, i) => c.addEventListener("click", () => runGoal(GOALS[i], c)));
ui.ask.addEventListener("submit", (e) => {
  e.preventDefault();
  const order = ui.goal.value.trim();
  if (!order) { ui.goal.focus(); return; }
  runGoal(order);
});
ui.restart.addEventListener("click", () => newGame());
ui.start.addEventListener("change", () => newGame());

// ---------- start ----------
window.__kbu = {
  stats,
  load: () => loadModel(),
  tell: (goal) => runGoal(goal),
  ask: async (state, question, labels) => { const r = await jev.decide(state, { element: choiceFn(question, labels) }); return r.element; },
  places: () => places().map((p) => ({ name: p.name, names: p.names, label: p.label })),
  pick: async (order) => { const all = everyButton(); const d = await decide(order, [], all); return { text: d.final.cands[d.final.idx].text, p: d.final.a.element.confidence, n: all.length, calls: d.calls.length }; },
  goals: GOALS,
  newGame,
  game: () => gw(),
  mode: MODE,
  modelId: MODEL_ID,
};

requestAnimationFrame(follow);
fit();
newGame();
detectGpu().then((adapter) => {
  if (!adapter) { showNoGpu(); return; }
  gpuOk = true;
  const i = adapter.info || {};
  const f16 = adapter.features && adapter.features.has("shader-f16");
  setStat("device", `WebGPU${i.vendor ? `, ${i.vendor}` : ""}${i.architecture ? ` ${i.architecture}` : ""}${f16 ? "" : ", no fp16"}`);
  window.__kbu.adapter = { vendor: i.vendor, architecture: i.architecture, f16 };
  ui.status.textContent = `Nothing downloads until you press Load or pick a goal. The game is yours to play too.`;
  ui.loadBtn.textContent = "Load model (359 MB)";
});
