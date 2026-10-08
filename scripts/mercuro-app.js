// Live pieces of the Mercuro app, drawn in the browser for /app/mercuro/ and its search pages.
// scripts/mercuro-pages.mjs prepends `var DATA = {...}` (real puzzles from the app bundle) and
// `var THEMES = [...]` (palettes from Mercuro/DesignSystem/Theme) and writes the result to
// public/app/mercuro/assets/mercuro.js. Each widget starts from a data-m attribute in the page.
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var C = 100;
  var CHAPTERS = ['FIRST HEAT', 'WARMING UP', 'SIMMER', 'ROLLING BOIL', 'RED HOT'];

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function h(tag, cls, parent, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ── Solver: the same row and column propagation as MercuroCore ThermometerSolver ──

  function applyLine(p, lo, hi, clue, axis, idx) {
    var minT = 0, maxT = 0, t, k, cells;
    for (t = 0; t < p.t.length; t++) {
      cells = p.t[t];
      if (lo[t] > hi[t]) return false;
      for (k = 0; k < lo[t]; k++) if (cells[k][axis] === idx) minT++;
      for (k = 0; k < Math.min(hi[t], cells.length); k++) if (cells[k][axis] === idx) maxT++;
    }
    if (minT > clue || maxT < clue) return false;
    if (maxT === clue) {
      for (t = 0; t < p.t.length; t++) {
        var maxK = -1; cells = p.t[t];
        for (k = lo[t]; k < Math.min(hi[t], cells.length); k++) if (cells[k][axis] === idx) maxK = k;
        if (maxK >= 0) lo[t] = Math.max(lo[t], maxK + 1);
      }
    }
    if (minT === clue) {
      for (t = 0; t < p.t.length; t++) {
        cells = p.t[t];
        for (k = lo[t]; k < Math.min(hi[t], cells.length); k++) if (cells[k][axis] === idx) { hi[t] = Math.min(hi[t], k); break; }
      }
    }
    for (t = 0; t < p.t.length; t++) if (lo[t] > hi[t]) return false;
    return true;
  }
  // Returns the propagated range plus the order in which thermometers became certain.
  function propagate(p) {
    var lo = p.t.map(function () { return 0; }), hi = p.t.map(function (c) { return c.length; });
    var order = [], known = p.t.map(function () { return false; }), changed = true;
    function note() { for (var t = 0; t < lo.length; t++) if (!known[t] && lo[t] === hi[t]) { known[t] = true; order.push(t); } }
    while (changed) {
      changed = false;
      for (var line = 0; line < 2 * p.n; line++) {
        var axis = line < p.n ? 0 : 1, idx = line % p.n, before = lo.join() + hi.join();
        if (!applyLine(p, lo, hi, axis ? p.c[idx] : p.r[idx], axis, idx)) return null;
        if (lo.join() + hi.join() !== before) { changed = true; note(); }
      }
    }
    for (var t = 0; t < lo.length; t++) if (!known[t]) order.push(t);
    return { lo: lo, hi: hi, order: order };
  }
  var propCache = new WeakMap();
  function prop(p) { if (!propCache.has(p)) propCache.set(p, propagate(p)); return propCache.get(p); }

  // ── Hints: a port of MercuroCore HintEngine.nextHint and its explanation text ──

  function bindingLine(p, st, ti, cellIdx, kind) {
    var therm = p.t[ti], cell = therm[cellIdx], best = null, bestT = -Infinity;
    [[0, cell[0], p.r[cell[0]]], [1, cell[1], p.c[cell[1]]]].forEach(function (cand) {
      var axis = cand[0], li = cand[1], clue = cand[2], t, k, maxO = 0, minO = 0;
      function contrib(tt, upto) { var n = 0; for (k = 0; k < upto; k++) if (p.t[tt][k][axis] === li) n++; return n; }
      for (t = 0; t < p.t.length; t++) if (t !== ti) maxO += contrib(t, Math.min(st.hi[t], p.t[t].length));
      if (kind === 'fill') {
        var must = clue - maxO;
        if (must <= 0) return;
        if (contrib(ti, cellIdx + 1) >= must && must > bestT) { bestT = must; best = [axis, li, clue]; }
      } else {
        for (t = 0; t < p.t.length; t++) if (t !== ti) minO += contrib(t, st.lo[t]);
        var thisMin = contrib(ti, st.lo[ti]), thisMax = contrib(ti, Math.min(st.hi[ti], therm.length));
        if (minO + thisMin >= clue && thisMax > thisMin) {
          var tight = -(minO + thisMin - clue);
          if (tight > bestT) { bestT = tight; best = [axis, li, clue]; }
        }
      }
    });
    return best;
  }
  function lineName(b) { return (b[0] ? 'Column ' : 'Row ') + (b[1] + 1); }
  function nextHint(p, levels) {
    var st = prop(p), ti, b;
    for (ti = 0; ti < p.t.length; ti++) {
      var fill = levels[ti], lo = st.lo[ti], hi = st.hi[ti];
      if (lo > fill) {
        b = bindingLine(p, st, ti, lo - 1, 'fill');
        return { t: ti, level: lo, line: b, title: 'TUBE ' + (ti + 1) + ' · FILLED TO ' + lo,
          text: b ? lineName(b) + ' needs ' + b[2] + '. Fill this tube to ' + lo + '.' : 'The clues force this tube to ' + lo + '.' };
      }
      if (hi < p.t[ti].length && fill > hi) {
        b = bindingLine(p, st, ti, hi, 'cap');
        return { t: ti, level: hi, line: b, title: 'TUBE ' + (ti + 1) + ' · CAPPED AT ' + hi,
          text: b ? lineName(b) + ' is full. Stop this tube at ' + hi + '.' : 'The clues stop this tube at ' + hi + '.' };
      }
    }
    for (ti = 0; ti < p.t.length; ti++) {
      var s = p.s[ti];
      if (levels[ti] > s) return { t: ti, level: s, line: null, title: 'TUBE ' + (ti + 1) + ' · REDUCE TO ' + s, text: 'Too full. Pull this tube back to ' + s + '.' };
      if (levels[ti] < s) return { t: ti, level: s, line: null, title: 'TUBE ' + (ti + 1) + ' · FILL TO ' + s, text: 'The clues force this tube to ' + s + '.' };
    }
    return null;
  }

  // ── Board: grid, clue boxes, glass tubes and mercury that rises from the bulb ──


  // ── Thermometer: the app's v6 tube. A glass shell with a 2pt wall, a capsule stem 24% of a cell
  // wide, a bulb 56% of a cell, tonal fill per cell (blank, mercury, marked empty), white graduation
  // marks on the light side, a straight glass shine, and a glint and meniscus in the bulb. A cell
  // that changes state flips about the tube's axis in 200ms, like ThermometerView's FlipFace. ──

  var SH = 12, BR = 28, WALL = 4.5, TIP = 15, uid = 0;
  function capsule(parent, a, b, half, ext, round) {
    var vert = Math.abs(a[0] - b[0]) < 0.5, x0, y0, x1, y1;
    if (vert) { x0 = a[0] - half; x1 = a[0] + half; y0 = Math.min(a[1], b[1]) - half; y1 = Math.max(a[1], b[1]) + half; if (b[1] > a[1]) y1 += ext; else y0 -= ext; }
    else { y0 = a[1] - half; y1 = a[1] + half; x0 = Math.min(a[0], b[0]) - half; x1 = Math.max(a[0], b[0]) + half; if (b[0] > a[0]) x1 += ext; else x0 -= ext; }
    el('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: round }, parent);
  }
  function Therm(parent, defs, pts, opts) {
    opts = opts || {};
    var id = 'm' + (++uid), b = pts[0], t = pts[pts.length - 1], n = pts.length, cs = opts.cell || C;
    var vert = n < 2 || Math.abs(pts[1][0] - b[0]) < 0.5;
    this.vert = vert; this.len = n; this.state = []; this.cells = []; this.busy = [];
    var co = el('clipPath', { id: id + 'o' }, defs), ci = el('clipPath', { id: id + 'i' }, defs);
    el('circle', { cx: b[0], cy: b[1], r: BR }, co); el('circle', { cx: b[0], cy: b[1], r: BR - WALL }, ci);
    if (n > 1) { capsule(co, b, t, SH, TIP, SH); capsule(ci, b, t, SH - WALL, TIP, SH - WALL); }
    var gr = el('linearGradient', vert ? { id: id + 'g', gradientUnits: 'userSpaceOnUse', x1: b[0] - SH, x2: b[0] + SH, y1: 0, y2: 0 } : { id: id + 'g', gradientUnits: 'userSpaceOnUse', y1: b[1] - SH, y2: b[1] + SH, x1: 0, x2: 0 }, defs);
    [[0, '#fff', .34], [.42, '#fff', 0], [.62, '#000', 0], [1, '#000', .22]].forEach(function (s) { el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] }, gr); });
    var g = this.g = el('g', { 'class': 'b-tube' }, parent);
    el('path', { 'class': 'b-hl', d: 'M' + pts.map(function (q) { return q.join(' '); }).join('L') }, g);
    var inner = SH - WALL, breadth = inner * 2;
    for (var k = 0; k < n; k++) {
      var q = pts[k], cg = el('g', { 'class': 'cf', 'data-s': 0 }, g);
      cg.style.transformOrigin = q[0] + 'px ' + q[1] + 'px';
      var sq = { x: q[0] - cs / 2, y: q[1] - cs / 2, width: cs, height: cs };
      el('rect', Object.assign({ 'class': 'c-edge', 'clip-path': 'url(#' + id + 'o)' }, sq), cg);
      el('rect', Object.assign({ 'class': 'c-fill', 'clip-path': 'url(#' + id + 'i)' }, sq), cg);
      el('rect', Object.assign({ fill: 'url(#' + id + 'g)', 'clip-path': 'url(#' + id + 'i)' }, sq), cg);
      if (k > 0) {
        var prev = pts[k - 1];
        if (vert) {
          var by = (q[1] + prev[1]) / 2, sx = q[0] - inner;
          el('path', { 'class': 'c-shine', 'clip-path': 'url(#' + id + 'i)', d: 'M' + (sx + 2.4) + ' ' + (q[1] - cs / 2) + 'V' + (q[1] + cs / 2) }, cg);
          el('rect', { 'class': 'c-tick', x: sx, y: by - 2, width: breadth * .6, height: 4 }, cg);
          el('rect', { 'class': 'c-tick', x: sx, y: q[1] - 2, width: breadth * .35, height: 4 }, cg);
        } else {
          var bx = (q[0] + prev[0]) / 2, sy = q[1] - inner;
          el('path', { 'class': 'c-shine', 'clip-path': 'url(#' + id + 'i)', d: 'M' + (q[0] - cs / 2) + ' ' + (sy + 2.4) + 'H' + (q[0] + cs / 2) }, cg);
          el('rect', { 'class': 'c-tick', x: bx - 2, y: sy, width: 4, height: breadth * .6 }, cg);
          el('rect', { 'class': 'c-tick', x: q[0] - 2, y: sy, width: 4, height: breadth * .35 }, cg);
        }
      } else {
        var bi = BR - WALL, sp = bi * .5, dp = bi * .38;
        el('path', { 'class': 'c-men', d: vert
          ? 'M' + (q[0] + bi * .3) + ' ' + (q[1] - sp) + 'Q' + (q[0] + bi * .3 + dp) + ' ' + q[1] + ' ' + (q[0] + bi * .3) + ' ' + (q[1] + sp)
          : 'M' + (q[0] - sp) + ' ' + (q[1] + bi * .3) + 'Q' + q[0] + ' ' + (q[1] + bi * .3 + dp) + ' ' + (q[0] + sp) + ' ' + (q[1] + bi * .3) }, cg);
        el('ellipse', { 'class': 'c-glint', cx: q[0] - bi * .35, cy: q[1] - bi * .35, rx: bi * .175, ry: bi * .275 }, cg);
      }
      this.cells.push(cg); this.state.push(0); this.busy.push(null);
    }
  }
  // Set one cell's state. The face turns edge-on, swaps colour at 90 degrees, and turns back.
  Therm.prototype.setCell = function (k, s, delay, ms) {
    var cg = this.cells[k], self = this;
    this.state[k] = s;
    if (reduce || ms === 0 || !cg.animate) { cg.setAttribute('data-s', s); return; }
    if (this.busy[k]) return;
    var axis = this.vert ? 'rotateY' : 'rotateX';
    this.busy[k] = true;
    var a = cg.animate([{ transform: axis + '(0deg)' }, { transform: axis + '(90deg)' }], { duration: 100, delay: delay || 0, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = function () {
      cg.setAttribute('data-s', self.state[k]);
      var b2 = cg.animate([{ transform: axis + '(-90deg)' }, { transform: axis + '(0deg)' }], { duration: 100, easing: 'ease-out' });
      a.cancel();
      b2.onfinish = function () { self.busy[k] = null; if (cg.getAttribute('data-s') !== String(self.state[k])) self.setCell(k, self.state[k], 0); };
    };
  };
  // Fill from the bulb to a level. Changed cells flip in a wave, upward when filling, downward when draining.
  Therm.prototype.setLevel = function (level, ms) {
    var changed = [], k;
    for (k = 0; k < this.len; k++) {
      var want = k < level ? 1 : (this.state[k] === 1 ? 0 : this.state[k]);
      if (want !== this.state[k]) changed.push([k, want]);
    }
    var up = changed.length && changed[0][1] === 1;
    if (!up) changed.reverse();
    for (var i = 0; i < changed.length; i++) this.setCell(changed[i][0], changed[i][1], i * 55, ms);
  };

  function Board(host, puzzle, opts) {
    opts = opts || {};
    this.host = host;
    this.opts = opts;
    this.svg = el('svg', { 'class': 'mboard', role: opts.interactive ? 'grid' : 'img' }, host);
    if (opts.label) this.svg.setAttribute('aria-label', opts.label);
    this.load(puzzle);
  }
  Board.prototype.load = function (p) {
    var svg = this.svg, self = this;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    this.p = p;
    var n = p.n, K = 86, G = 12, S = 72, ox = K + G, oy = K + G, W = ox + n * C + 3;
    this.ox = ox; this.oy = oy;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + W);
    this.levels = p.t.map(function () { return 0; });
    this.marks = {};
    var g = el('g', {}, svg);
    el('rect', { 'class': 'b-cell', x: ox, y: oy, width: n * C, height: n * C }, g);
    var grid = '';
    for (var i = 1; i < n; i++) grid += 'M' + (ox + i * C) + ' ' + oy + 'v' + n * C + 'M' + ox + ' ' + (oy + i * C) + 'h' + n * C;
    el('path', { 'class': 'b-grid', d: grid }, g);
    this.lineHl = el('rect', { 'class': 'b-linehl', x: ox, y: oy, width: 0, height: 0, rx: 6 }, g);
    el('rect', { 'class': 'b-frame', x: ox, y: oy, width: n * C, height: n * C }, g);
    this.clues = { r: [], c: [] };
    for (var k = 0; k < n; k++) {
      this.clues.c.push(this._clue(ox + k * C + (C - S) / 2, oy - G - S, S, p.c[k]));
      this.clues.r.push(this._clue(ox - G - S, oy + k * C + (C - S) / 2, S, p.r[k]));
    }
    var defs = el('defs', {}, svg);
    this.tubes = p.t.map(function (cells) { return new Therm(svg, defs, cells.map(function (c) { return self.center(c); })); });
    this.pendG = el('g', {}, svg);
    if (this.opts.interactive) this._hits();
    this.finger = el('circle', { 'class': 'b-finger', r: 26, cx: 0, cy: 0 }, svg);
    this._status();
  };
  Board.prototype._clue = function (x, y, s, v) {
    var g = el('g', { 'class': 'b-clue' }, this.svg);
    el('rect', { x: x, y: y, width: s, height: s, rx: 7 }, g);
    var t = el('text', { x: x + s / 2, y: y + s / 2 + 14, 'text-anchor': 'middle' }, g);
    t.textContent = v;
    return g;
  };
  Board.prototype.center = function (rc) { return [this.ox + rc[1] * C + C / 2, this.oy + rc[0] * C + C / 2]; };
  Board.prototype._hits = function () {
    var self = this, p = this.p, map = {};
    p.t.forEach(function (cells, ti) { cells.forEach(function (c, k) { map[c[0] + ',' + c[1]] = [ti, k]; }); });
    var hg = el('g', { 'class': 'b-hits' }, this.svg);
    this.hitList = [];
    for (var r = 0; r < p.n; r++) for (var c = 0; c < p.n; c++) {
      var at = map[r + ',' + c];
      var rect = el('rect', { x: this.ox + c * C, y: this.oy + r * C, width: C, height: C, role: 'gridcell', tabindex: r + c === 0 ? 0 : -1,
        'aria-label': 'Row ' + (r + 1) + ', column ' + (c + 1) }, hg);
      rect.dataset.r = r; rect.dataset.c = c;
      this.hitList.push(rect);
      (function (rect, at) {
        rect.addEventListener('click', function () { if (at && self.onTap) self.onTap(at[0], at[1]); });
        rect.addEventListener('keydown', function (e) {
          var R = +rect.dataset.r, Cc = +rect.dataset.c, nr = R, nc = Cc;
          if (e.key === 'ArrowUp') nr--; else if (e.key === 'ArrowDown') nr++;
          else if (e.key === 'ArrowLeft') nc--; else if (e.key === 'ArrowRight') nc++;
          else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (at && self.onTap) self.onTap(at[0], at[1]); return; }
          else return;
          e.preventDefault();
          if (nr < 0 || nc < 0 || nr >= p.n || nc >= p.n) return;
          var nx = self.hitList[nr * p.n + nc];
          rect.setAttribute('tabindex', -1); nx.setAttribute('tabindex', 0); nx.focus();
        });
      })(rect, at);
    }
  };
  Board.prototype.set = function (ti, level, ms) {
    var tb = this.tubes[ti];
    level = Math.max(0, Math.min(tb.len, level));
    this.levels[ti] = level;
    tb.setLevel(level, ms);
    tb.g.classList.toggle('on', level > 0);
    this._status();
  };
  Board.prototype.setAll = function (levels, ms) { for (var i = 0; i < levels.length; i++) this.set(i, levels[i], ms); };
  Board.prototype.count = function (axis, idx) {
    var n = 0, self = this;
    this.p.t.forEach(function (cells, ti) { for (var k = 0; k < self.levels[ti]; k++) if (cells[k][axis] === idx) n++; });
    return n;
  };
  Board.prototype._status = function () {
    var p = this.p, all = true;
    for (var i = 0; i < p.n; i++) {
      var cr = this.count(0, i), cc = this.count(1, i);
      this.clues.r[i].setAttribute('class', 'b-clue' + (cr === p.r[i] ? ' ok' : cr > p.r[i] ? ' over' : ''));
      this.clues.c[i].setAttribute('class', 'b-clue' + (cc === p.c[i] ? ' ok' : cc > p.c[i] ? ' over' : ''));
    }
    for (i = 0; i < p.t.length; i++) if (this.levels[i] !== p.s[i]) all = false;
    this.solved = all;
    this.svg.classList.toggle('solved', all);
  };
  // Marked-empty cells take the app's marked colour on the tube, cell by cell.
  Board.prototype.mark = function (cells, ms) {
    var want = {};
    (cells || []).forEach(function (rc) { want[rc[0] + ',' + rc[1]] = 1; });
    this.p.t.forEach(function (tcells, ti) {
      var tb = this.tubes[ti];
      tcells.forEach(function (rc, k) {
        var s = tb.state[k];
        if (want[rc[0] + ',' + rc[1]] && s !== 1) tb.setCell(k, 2, 0, ms);
        else if (!want[rc[0] + ',' + rc[1]] && s === 2) tb.setCell(k, 0, 0, ms);
      });
    }, this);
  };
  Board.prototype.pending = function (cells) {
    var g = this.pendG, self = this;
    while (g.firstChild) g.removeChild(g.firstChild);
    (cells || []).forEach(function (rc) { var q = self.center(rc); el('circle', { 'class': 'b-pend', cx: q[0], cy: q[1], r: 36 }, g); });
  };
  Board.prototype.highlight = function (tubes, line) {
    this.tubes.forEach(function (tb, i) { tb.g.classList.toggle('hl', tubes.indexOf(i) >= 0); });
    var r = this.lineHl, n = this.p.n;
    if (!line) { r.setAttribute('width', 0); r.setAttribute('height', 0); return; }
    if (line[0] === 0) { r.setAttribute('x', this.ox); r.setAttribute('y', this.oy + line[1] * C); r.setAttribute('width', n * C); r.setAttribute('height', C); }
    else { r.setAttribute('x', this.ox + line[1] * C); r.setAttribute('y', this.oy); r.setAttribute('width', C); r.setAttribute('height', n * C); }
  };
  Board.prototype.point = function (rc) {
    var f = this.finger;
    if (!rc) { f.classList.remove('show'); return; }
    var q = this.center(rc);
    f.style.transform = 'translate(' + q[0] + 'px,' + q[1] + 'px)';
    f.classList.add('show');
    f.classList.remove('tap'); void f.getBBox(); f.classList.add('tap');
  };
  Board.prototype.clear = function (ms) { this.setAll(this.p.t.map(function () { return 0; }), ms); this.mark([]); this.pending([]); this.highlight([]); };

  // Plays a solve in the order the clues settle it.
  function solveSteps(p) {
    return prop(p).order.filter(function (t) { return p.s[t] > 0; });
  }

  // ── Visibility: start loops when a widget scrolls in, pause them when it leaves ──
  var watchers = [];
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var w = watchers.filter(function (x) { return x.node === e.target; })[0];
      if (!w) return;
      w.visible = e.isIntersecting;
      if (e.isIntersecting && !w.seen) { w.seen = true; e.target.classList.add('in'); }
      w.fn(e.isIntersecting);
    });
  }, { threshold: 0.25 }) : null;
  function watch(node, fn) {
    var w = { node: node, fn: fn, visible: !io };
    watchers.push(w);
    if (io) io.observe(node); else { node.classList.add('in'); fn(true); }
    return w;
  }
  // A cancellable loop that only runs while its node is visible.
  function loop(node, body) {
    var token = 0, running = false, w;
    function start() {
      if (running) return;
      running = true;
      var my = ++token;
      (async function () {
        while (running && my === token) {
          await body(function () { return !running || my !== token; });
        }
      })();
    }
    w = watch(node, function (v) { if (v) start(); else { running = false; token++; } });
    return { stop: function () { running = false; token++; }, start: start, w: w };
  }

  // ── Hero: a real Mercuro level, playable, with hints, undo and an idle demo ──

  function initPlay(root) {
    var list = root.dataset.set === 'how' ? [DATA.example] : DATA.hero;
    var idx = 0, p = list[0];
    var host = root.querySelector('.play-board');
    var board = new Board(host, p, { interactive: true, label: 'Thermometers puzzle. Tap a cell to fill its thermometer from the bulb up to that cell.' });
    var timeEl = root.querySelector('[data-time]'), sizeEl = root.querySelector('[data-size]');
    var levelEl = root.querySelector('[data-level]'), chEl = root.querySelector('[data-chap]');
    var track = root.querySelector('[data-track]');
    var banner = root.querySelector('.hint-banner'), bTitle = banner && banner.querySelector('b'), bText = banner && banner.querySelector('span');
    var done = root.querySelector('.solved-card'), live = root.querySelector('[data-live]');
    var undo = [], redo = [], t0 = 0, elapsed = 0, tick = null, playing = false, demo = null, scTherm = null;
    var scSvg = root.querySelector('.sc-svg');
    if (scSvg) scTherm = new Therm(scSvg, el('defs', {}, scSvg), [[50, 350], [50, 250], [50, 150], [50, 50]]);

    function fmt(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    function startClock() {
      if (tick) return;
      t0 = Date.now() - elapsed * 1000;
      tick = setInterval(function () { elapsed = Math.floor((Date.now() - t0) / 1000); if (timeEl) timeEl.textContent = fmt(elapsed); }, 500);
    }
    function stopClock() { clearInterval(tick); tick = null; }
    function header() {
      if (sizeEl) sizeEl.textContent = p.n + '×' + p.n;
      if (levelEl) levelEl.textContent = idx + 1;
      if (track) [].forEach.call(track.children, function (s, i) { s.classList.toggle('on', i < idx + 1); });
      if (timeEl) timeEl.textContent = '0:00';
    }
    function hideHint() { if (banner) banner.classList.remove('show'); board.highlight([]); }
    function apply(ti, level, record) {
      if (record !== false) { undo.push([ti, board.levels[ti]]); redo = []; }
      board.set(ti, level);
      hideHint();
      if (board.solved) win();
    }
    function win() {
      stopClock();
      if (live) live.textContent = 'Solved in ' + fmt(elapsed) + '.';
      if (!done) return;
      done.querySelector('[data-final]').textContent = fmt(elapsed);
      setTimeout(function () { done.classList.add('show'); confetti(done); if (scTherm) setTimeout(function () { scTherm.setLevel(4); }, reduce ? 0 : 350); }, reduce ? 0 : 650);
    }
    function takeOver() {
      if (playing) return;
      playing = true;
      if (demo) demo.stop();
      board.point(null);
      board.clear(0);
      root.classList.add('playing');
      elapsed = 0; header();
    }
    board.onTap = function (ti, k) {
      if (board.solved) return;
      takeOver();
      startClock();
      var cur = board.levels[ti];
      apply(ti, cur === k + 1 ? k : k + 1);
    };
    host.addEventListener('pointerdown', takeOver, { passive: true });
    function btn(name, fn) { var b = root.querySelector('[data-act="' + name + '"]'); if (b) b.addEventListener('click', function () { takeOver(); fn(); }); }
    btn('undo', function () { var u = undo.pop(); if (!u) return; redo.push([u[0], board.levels[u[0]]]); board.set(u[0], u[1]); hideHint(); });
    btn('redo', function () { var u = redo.pop(); if (!u) return; undo.push([u[0], board.levels[u[0]]]); board.set(u[0], u[1]); if (board.solved) win(); });
    btn('restart', function () { undo = []; redo = []; board.clear(); hideHint(); });
    btn('hint', function () {
      if (board.solved) return;
      var hnt = nextHint(p, board.levels);
      if (!hnt || !banner) return;
      bTitle.textContent = hnt.title; bText.textContent = hnt.text;
      banner.classList.add('show');
      board.highlight([hnt.t], hnt.line);
      startClock();
    });
    btn('check', function () {
      var wrong = p.t.map(function (c, i) { return i; }).filter(function (i) { return board.levels[i] > p.s[i]; });
      board.highlight(wrong);
      if (live) live.textContent = wrong.length ? wrong.length + ' thermometer' + (wrong.length > 1 ? 's are' : ' is') + ' too full.' : 'Nothing wrong so far.';
      root.classList.toggle('checked-ok', !wrong.length);
      setTimeout(function () { board.highlight([]); root.classList.remove('checked-ok'); }, 1400);
    });
    var next = root.querySelector('[data-act="next"]');
    if (next) next.addEventListener('click', function () {
      done.classList.remove('show');
      if (scTherm) scTherm.setLevel(0, 0);
      idx = (idx + 1) % list.length; p = list[idx];
      board.load(p); undo = []; redo = []; elapsed = 0; stopClock(); header();
      var first = board.hitList && board.hitList[0]; if (first) first.focus();
    });
    header();

    // Idle demo: until the visitor touches the board, a finger plays the opening moves.
    if (reduce) { root.classList.add('playing'); playing = true; return; }
    demo = loop(root, async function (cancelled) {
      board.clear(0);
      await wait(1100);
      var steps = solveSteps(p).slice(0, 5);
      for (var i = 0; i < steps.length; i++) {
        if (cancelled()) return;
        var ti = steps[i], target = p.t[ti][p.s[ti] - 1];
        board.point(target);
        await wait(420);
        if (cancelled()) return;
        board.set(ti, p.s[ti]);
        await wait(900);
      }
      board.point(null);
      if (cancelled()) return;
      if (banner) {
        var hnt = nextHint(p, board.levels);
        bTitle.textContent = hnt.title; bText.textContent = hnt.text;
        banner.classList.add('show'); board.highlight([hnt.t], hnt.line);
        await wait(2600);
        hideHint();
      }
      await wait(900);
    });
  }

  function confetti(host) {
    if (reduce) return;
    var box = h('div', 'confetti', host), cols = ['var(--red)', 'var(--blue)', 'var(--green)', 'var(--ink)'];
    for (var i = 0; i < 26; i++) {
      var c = h('i', '', box);
      c.style.left = (8 + Math.random() * 84) + '%';
      c.style.background = cols[i % 4];
      c.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
      c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      c.style.animationDelay = (Math.random() * 0.25) + 's';
    }
    setTimeout(function () { box.remove(); }, 2200);
  }

  // ── A board that solves itself whenever it is on screen ──

  function autoSolve(host, p, opts) {
    opts = opts || {};
    var board = new Board(host, p, { label: opts.label });
    if (reduce) { board.setAll(p.s, 0); return board; }
    loop(opts.watch || host, async function (cancelled) {
      board.clear(0);
      await wait(opts.delay || 500);
      var steps = solveSteps(p);
      for (var i = 0; i < steps.length; i++) {
        if (cancelled()) return;
        board.set(steps[i], p.s[steps[i]]);
        await wait(opts.pace || 260);
      }
      if (opts.onSolved) opts.onSolved();
      await wait(opts.hold || 3200);
      if (opts.onReset) opts.onReset();
    });
    return board;
  }
  function initMini(root) {
    var p = DATA.sizes[+(root.dataset.size || 5) - 5];
    autoSolve(root.querySelector('.mini-board'), p, { label: 'A ' + p.n + ' by ' + p.n + ' Mercuro board solving itself', pace: 300,
      onSolved: function () { root.classList.add('done'); }, onReset: function () { root.classList.remove('done'); } });
  }

  // ── Worked example: step through the 4x4 rules puzzle ──

  function initSteps(root) {
    var p = DATA.example, S = DATA.exampleSteps;
    var board = new Board(root.querySelector('.steps-board'), p, { label: 'The 4 by 4 example puzzle, shown after each solving step' });
    var text = root.querySelector('[data-step-text]'), count = root.querySelector('[data-step-n]');
    var prev = root.querySelector('[data-act="prev"]'), next = root.querySelector('[data-act="next"]'), play = root.querySelector('[data-act="play"]');
    var i = 0, auto = !reduce, timer = null;
    function show(k) {
      i = k;
      var s = S[k];
      board.setAll(s.levels);
      board.mark(s.marks);
      board.pending(s.pending);
      board.highlight(s.tubes || [], s.line);
      text.textContent = s.text;
      count.textContent = k === 0 ? 'Start' : 'Step ' + k + ' of ' + (S.length - 1);
      prev.disabled = k === 0;
      next.disabled = k === S.length - 1;
    }
    function stopAuto() { auto = false; clearTimeout(timer); play.setAttribute('aria-pressed', 'false'); play.textContent = 'Play'; }
    function run() {
      clearTimeout(timer);
      if (!auto) return;
      timer = setTimeout(function () { show(i === S.length - 1 ? 0 : i + 1); run(); }, i === S.length - 1 ? 3600 : 2600);
    }
    prev.addEventListener('click', function () { stopAuto(); if (i > 0) show(i - 1); });
    next.addEventListener('click', function () { stopAuto(); if (i < S.length - 1) show(i + 1); });
    play.addEventListener('click', function () {
      if (auto) return stopAuto();
      auto = true; play.setAttribute('aria-pressed', 'true'); play.textContent = 'Pause';
      if (i === S.length - 1) show(0);
      run();
    });
    show(0);
    if (!reduce) { play.setAttribute('aria-pressed', 'true'); play.textContent = 'Pause'; }
    watch(root, function (v) { if (v && auto) run(); else clearTimeout(timer); });
  }

  // ── Daily three: the Today card and three real daily boards ──

  function initDaily(root) {
    var cards = root.querySelectorAll('.day-board');
    var tiles = root.querySelectorAll('.tile');
    var boards = [];
    [].forEach.call(cards, function (card, i) {
      var p = DATA.daily[i];
      var host = card.querySelector('.mini-board');
      var b = new Board(host, p, { label: ['Warm-Up', 'Daily', 'Challenge'][i] + ' puzzle, ' + p.n + ' by ' + p.n });
      boards.push(b);
      if (reduce) { b.setAll(p.s, 0); card.classList.add('done'); }
    });
    if (reduce) { [].forEach.call(tiles, function (t) { t.classList.add('done'); }); return; }
    function playOne(i, cancelled) {
      var p = DATA.daily[i], b = boards[i], steps = solveSteps(p), pace = [210, 150, 95][i];
      return (async function () {
        for (var k = 0; k < steps.length; k++) {
          if (cancelled()) return;
          b.set(steps[k], p.s[steps[k]]);
          await wait(pace);
        }
        cards[i].classList.add('done'); tiles[i] && tiles[i].classList.add('done');
      })();
    }
    loop(root, async function (cancelled) {
      boards.forEach(function (b, i) { b.clear(0); cards[i].classList.remove('done'); tiles[i] && tiles[i].classList.remove('done'); });
      await wait(600);
      await Promise.all([0, 1, 2].map(function (i) { return wait(i * 500).then(function () { return playOne(i, cancelled); }); }));
      await wait(4200);
    });
  }

  // ── Board sizes: one control morphs the board through the 8 real sizes ──

  function initSizes(root) {
    var host = root.querySelector('.size-board'), chips = root.querySelectorAll('[data-n]');
    var range = root.querySelector('input[type=range]'), out = root.querySelector('[data-size-out]');
    var chList = root.querySelector('.chapters'), free = { 5: 50, 6: 50, 7: 50, 8: 40, 9: 40, 10: 40, 11: 30, 12: 30 };
    var board = null, user = false, n = 5, token = 0;
    function chapters(n) {
      chList.textContent = '';
      var count = free[n] / 10;
      for (var i = 0; i < count; i++) {
        var li = h('li', i === 0 ? 'open' : '', chList);
        h('b', '', li, String(i + 1).padStart(2, '0'));
        var s = h('span', '', li); h('strong', '', s, CHAPTERS[i]);
        h('small', '', s, i === 0 ? 'Levels 1-10' : 'Opens after 7 in chapter ' + i);
        li.style.setProperty('--i', i);
      }
    }
    function show(k) {
      n = k;
      var my = ++token;
      [].forEach.call(chips, function (c) { c.setAttribute('aria-pressed', String(+c.dataset.n === k)); });
      if (range) range.value = k;
      if (out) out.textContent = k + '×' + k + ' · ' + free[k] + ' free puzzles';
      chapters(k);
      var p = DATA.sizes[k - 5];
      host.classList.remove('grow');
      if (!board) board = new Board(host, p, { label: 'A ' + k + ' by ' + k + ' Mercuro board' });
      else board.load(p);
      void host.offsetWidth;
      host.classList.add('grow');
      if (reduce) { board.setAll(p.s, 0); return; }
      var steps = solveSteps(p), pace = Math.max(60, 2400 / steps.length);
      (async function () {
        await wait(500);
        for (var i = 0; i < steps.length; i++) { if (my !== token) return; board.set(steps[i], p.s[steps[i]]); await wait(pace); }
      })();
    }
    [].forEach.call(chips, function (c) { c.addEventListener('click', function () { user = true; show(+c.dataset.n); }); });
    if (range) range.addEventListener('input', function () { user = true; show(+range.value); });
    show(5);
    if (reduce) return;
    var cyc = null;
    watch(root, function (v) {
      clearInterval(cyc);
      if (v && !user) cyc = setInterval(function () { if (user) return clearInterval(cyc); show(n === 12 ? 5 : n + 1); }, 5200);
    });
  }

  // ── Hints: step the real hint engine through a 5x5 level ──

  function initHints(root) {
    var p = DATA.hint, board = new Board(root.querySelector('.hint-board'), p, { label: 'A 5 by 5 level with the next forced move highlighted' });
    var title = root.querySelector('.hint-banner b'), text = root.querySelector('.hint-banner span'), bn = root.querySelector('.hint-banner');
    var btn = root.querySelector('[data-act="hint"]'), log = root.querySelector('.hint-log'), user = false, cur = null, n = 0;
    function reset() { board.clear(0); n = 0; log.textContent = ''; bn.classList.remove('show'); cur = null; }
    function show() {
      cur = nextHint(p, board.levels);
      if (!cur) { title.textContent = 'SOLVED'; text.textContent = 'Every tube is where the clues put it.'; bn.classList.add('show'); board.highlight([]); return false; }
      title.textContent = cur.title; text.textContent = cur.text;
      bn.classList.remove('show'); void bn.offsetWidth; bn.classList.add('show');
      board.highlight([cur.t], cur.line);
      return true;
    }
    function applyCur() {
      if (!cur) return;
      board.set(cur.t, cur.level);
      n++;
      var li = h('li', '', log); h('b', '', li, String(n)); h('span', '', li, cur.text);
      if (log.children.length > 4) log.removeChild(log.firstChild);
      cur = null;
    }
    btn.addEventListener('click', function () {
      user = true;
      if (board.solved) { reset(); show(); return; }
      if (cur) applyCur();
      if (!show()) btn.textContent = 'Start over'; else btn.textContent = 'Use hint';
    });
    reset();
    if (reduce) { show(); return; }
    loop(root, async function (cancelled) {
      if (user) return wait(1000);
      reset();
      await wait(700);
      while (!cancelled() && !user) {
        if (!show()) break;
        await wait(2300);
        if (cancelled() || user) return;
        applyCur();
        board.highlight([]);
        await wait(500);
      }
      await wait(2600);
    });
  }

  // ── Themes: recolour a live board through the nine real palettes ──

  function themeVars(t) {
    var P = t.p, dark = t.dark;
    return {
      '--t-bg': P.bg, '--t-surface': P.surface, '--t-alt': P.surfaceAlt, '--t-ink': P.ink, '--t-muted': P.inkMuted,
      '--t-red': P.red, '--t-green': P.green, '--t-blue': P.blue, '--t-accent': P.primaryAccent, '--t-line': P.hairline,
      '--b-cell': dark ? '#2A2E35' : P.bg, '--b-grid': dark ? '#3E4450' : 'rgba(169,155,124,.62)', '--b-frame': dark ? '#6B7480' : P.ink,
      '--tube': dark ? '#363B42' : '#B9A986', '--tube-edge': dark ? '#7E8794' : '#6E5C39', '--mk': dark ? '#5686B4' : '#5E82A8', '--mk-edge': dark ? '#93B6D8' : '#33506F', '--shine': dark ? '#FFFFFF' : '#F3E9D6',
      '--clue-bg': dark ? '#2A2E35' : P.surface, '--clue-ink': P.ink, '--clue-edge': dark ? '#6B7480' : P.ink, '--clue-ok': P.green,
      '--clue-ok-ink': dark ? '#15171B' : '#FFFFFF',
      '--t-radius': t.radius + 'px', '--t-border': t.border + 'px', '--t-font': t.font
    };
  }
  function initThemes(root) {
    var scope = root.closest('.themes-sec') || root;
    var stage = root.querySelector('.theme-stage'), grid = root.querySelector('.theme-grid');
    var name = root.querySelector('[data-theme-name]'), note = root.querySelector('[data-theme-note]');
    var p = DATA.sizes[1], board = new Board(stage.querySelector('.theme-board'), p, { label: 'A Mercuro board in the selected theme' });
    board.setAll(p.s.map(function (s, i) { return i % 3 === 2 ? 0 : s; }), 0);
    var user = false, cur = 1, buttons = [];
    THEMES.forEach(function (t, i) {
      var b = h('button', 'tcard' + (t.dark ? ' dark' : ''), grid);
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      var v = themeVars(t); for (var k in v) b.style.setProperty(k, v[k]);
      var w = h('span', 'tc-word', b, 'MERCURO'); w.style.fontFamily = t.font;
      h('span', 'tc-name', b, t.name);
      var dots = h('span', 'tc-dots', b); ['red', 'green', 'blue'].forEach(function (c) { h('i', '', dots).style.background = t.p[c]; });
      h('span', 'tc-lock', b, t.unlock ? t.unlock + ' solves' : 'Free');
      b.addEventListener('click', function () { user = true; pick(i); });
      buttons.push(b);
    });
    function pick(i) {
      cur = i;
      var t = THEMES[i], v = themeVars(t);
      for (var k in v) scope.style.setProperty(k, v[k]);
      scope.classList.toggle('t-dark', t.dark);
      buttons.forEach(function (b, j) { b.setAttribute('aria-pressed', String(j === i)); });
      name.textContent = t.name;
      name.style.fontFamily = t.font;
      note.textContent = t.unlock ? 'Earned at ' + t.unlock + ' puzzles solved, or with Pro' : 'Yours from the start';
    }
    pick(1);
    if (reduce) return;
    var cyc = null;
    watch(root, function (vis) {
      clearInterval(cyc);
      if (vis && !user) cyc = setInterval(function () { if (user) return clearInterval(cyc); pick((cur + 1) % THEMES.length); }, 2400);
    });
  }

  // ── Rank ladder: mercury climbs 0 to 330 solves and each rank lights in turn ──

  function initRanks(root) {
    var svg = root.querySelector('.rk-svg'), rows = root.querySelectorAll('.rk-row'), count = root.querySelector('[data-solved]');
    var you = root.querySelector('[data-you]');
    var steps = [].map.call(rows, function (r) { return +r.dataset.at; });
    var asc = steps.slice().sort(function (a, b) { return a - b; });
    var pts = asc.map(function (x, k) { return [50, 800 - 50 - k * 100]; });
    var therm = new Therm(svg, el('defs', {}, svg), pts);
    var reached = -1;
    function setTo(v, ms) {
      var r = asc.filter(function (a) { return v >= a; }).length;
      if (r !== reached) { reached = r; therm.setLevel(r, ms); }
      var top = -1, topAt = -1;
      [].forEach.call(rows, function (row, i) { var on = v >= steps[i]; row.classList.toggle('on', on); if (on && steps[i] > topAt) { topAt = steps[i]; top = i; } });
      [].forEach.call(rows, function (row, i) { row.classList.toggle('you', i === top); });
      if (you && top >= 0) you.textContent = rows[top].dataset.name;
      if (count) count.textContent = Math.round(v);
    }
    if (reduce) { setTo(122, 0); return; }
    setTo(0, 0);
    loop(root, async function (cancelled) {
      var start = performance.now(), D = 6000;
      await new Promise(function (res) {
        (function f(t) {
          if (cancelled()) return res();
          var k = Math.min(1, (t - start) / D), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          setTo(e * 330);
          if (k < 1) requestAnimationFrame(f); else res();
        })(start);
      });
      await wait(2800);
      if (cancelled()) return;
      setTo(0);
      await wait(1400);
    });
  }

  // ── Achievements: the forty real badges from the app, with names and points from Game Center ──

  function initBadges(root) {
    var grid = root.querySelector('.badges'), info = root.querySelector('.badge-info');
    var nameEl = info.querySelector('b'), descEl = info.querySelector('span'), ptsEl = info.querySelector('i');
    var buttons = [];
    DATA.achievements.forEach(function (a, i) {
      var b = h('button', 'badge-b', grid); b.type = 'button';
      b.style.setProperty('--i', i);
      b.setAttribute('aria-label', a[0] + ', ' + a[1] + ' points: ' + a[2]);
      var img = h('img', '', b); img.src = '/app/mercuro/assets/achievements/' + a[3] + '.webp'; img.alt = ''; img.width = 88; img.height = 88; img.loading = 'lazy'; img.decoding = 'async';
      h('span', 'badge-name', b, a[0]);
      b.addEventListener('click', function () { pick(i); });
      b.addEventListener('mouseenter', function () { pick(i); });
      b.addEventListener('focus', function () { pick(i); });
      buttons.push(b);
    });
    function pick(i) {
      var a = DATA.achievements[i];
      buttons.forEach(function (b, j) { b.setAttribute('aria-pressed', String(i === j)); });
      nameEl.textContent = a[0]; descEl.textContent = a[2]; ptsEl.textContent = a[1] + ' points';
    }
    pick(0);
    watch(root, function () {});
  }

  // ── Stats: a sample week of dailies ticking in, as on the Stats tab ──

  function initStats(root) {
    var cells = root.querySelectorAll('.wk i'), solved = root.querySelector('[data-wk-solved]'), streak = root.querySelector('[data-wk-streak]');
    var pattern = root.dataset.pattern.split('').map(Number);
    function render(k) {
      var s = 0;
      [].forEach.call(cells, function (c, i) { var on = i < k && pattern[i]; c.classList.toggle('on', !!on); if (on) s++; });
      solved.textContent = s;
      streak.textContent = k >= 21 ? 7 : 0;
    }
    if (reduce) { render(21); return; }
    loop(root, async function (cancelled) {
      render(0);
      await wait(500);
      for (var d = 0; d < 7; d++) {
        for (var r = 0; r < 3; r++) {
          if (cancelled()) return;
          var idx = r * 7 + d;
          if (pattern[idx]) cells[idx].classList.add('on');
        }
        var shown = 0; [].forEach.call(cells, function (c) { if (c.classList.contains('on')) shown++; });
        solved.textContent = shown; streak.textContent = d + 1;
        await wait(420);
      }
      await wait(3600);
    });
  }

  // ── Pricing: what each tier changes ──

  function initTiers(root) {
    var tabs = root.querySelectorAll('[role=tab]'), rows = root.querySelectorAll('[data-tiers]');
    var price = root.querySelector('[data-tier-price]'), note = root.querySelector('[data-tier-note]');
    var info = { free: ['$0', 'Supported by ads'], ads: ['$2.99', 'Paid once'], pro: ['$4.99', 'Paid once'] };
    function pick(k) {
      [].forEach.call(tabs, function (t) { var on = t.dataset.tier === k; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      var ti = ['free', 'ads', 'pro'].indexOf(k);
      [].forEach.call(rows, function (r) { r.querySelector('em').textContent = r.dataset.tiers.split('|')[ti]; r.classList.toggle('yes', r.dataset.good.split('')[ti] === '1'); });
      price.textContent = info[k][0]; note.textContent = info[k][1];
    }
    [].forEach.call(tabs, function (t, i) {
      t.addEventListener('click', function () { pick(t.dataset.tier); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
        var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); pick(n.dataset.tier);
      });
    });
    pick(root.dataset.start || 'free');
  }

  // ── Preview video: load only near the viewport, pause off screen ──

  function initVideo(v) {
    var loaded = false;
    if (reduce) { v.removeAttribute('autoplay'); v.controls = true; }
    watch(v, function (vis) {
      if (vis && !loaded) {
        loaded = true;
        [].forEach.call(v.querySelectorAll('source'), function (s) { s.src = s.dataset.src; });
        v.load();
      }
      if (reduce) return;
      if (vis) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
    });
  }

  // ── Nav gauge: a small thermometer that fills as you scroll ──

  function initGauge(g) {
    var svg = g.querySelector('svg'), pts = [];
    for (var k = 0; k < 5; k++) pts.push([50 + k * 100, 50]);
    var therm = new Therm(svg, el('defs', {}, svg), pts), last = -1;
    function on() {
      var max = document.documentElement.scrollHeight - innerHeight;
      var lv = 1 + Math.round((max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0) * 4);
      if (lv !== last) { therm.setLevel(lv, last < 0 ? 0 : undefined); last = lv; }
    }
    addEventListener('scroll', function () { requestAnimationFrame(on); }, { passive: true });
    on();
  }

  function initStill(node) {
    var p = node.dataset.p === 'example' ? DATA.example : DATA.sizes[+node.dataset.p - 5];
    var b = new Board(node, p, {});
    b.setAll(p.s, 0);
  }

  var init = { still: initStill, play: initPlay, mini: initMini, steps: initSteps, daily: initDaily, sizes: initSizes, hints: initHints,
    themes: initThemes, ranks: initRanks, badges: initBadges, stats: initStats, tiers: initTiers, video: initVideo, gauge: initGauge };
  [].forEach.call(document.querySelectorAll('[data-m]'), function (node) {
    try { init[node.dataset.m](node); } catch (e) { if (window.console) console.error(e); }
  });
  [].forEach.call(document.querySelectorAll('.reveal'), function (n) { watch(n, function () {}); });
})();
