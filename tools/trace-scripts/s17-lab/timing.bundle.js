(() => {
  // ../../src/lib/rng.js
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(...n) {
    let h = 2166136261;
    for (const v of n) {
      h ^= v | 0;
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 13;
    h = Math.imul(h, 1540483477);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  var fade = (t) => t * t * (3 - 2 * t);
  function noise1(x, seed = 0) {
    const i = Math.floor(x), f = x - i;
    const a = hash(i, seed) * 2 - 1, b = hash(i + 1, seed) * 2 - 1;
    return a + (b - a) * fade(f);
  }
  function noise2(x, y, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    const u = fade(fx), v = fade(fy);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  }
  var clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;

  // ../../src/lib/ink.js
  var INK = "#f2f0ea";
  function taper(ctx, pts, w, color = INK) {
    if (pts.length < 2) return;
    const L = [], R = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      const hw = (typeof w === "function" ? w(i / (n - 1)) : w) / 2;
      L.push([p[0] - dy * hw, p[1] + dx * hw]);
      R.push([p[0] + dy * hw, p[1] - dx * hw]);
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ../../src/lib/paths.js
  function smoothPath(ctx, pts, closed = false, tension = 0.5) {
    const n = pts.length;
    if (n < 2) return;
    const P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    ctx.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const k = tension / 3;
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
    }
    if (closed) ctx.closePath();
  }
  function sampleCurve(pts, per = 8, closed = false) {
    const n = pts.length, out2 = [];
    const P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let j = 0; j < per; j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t;
        out2.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out2.push(closed ? pts[0] : pts[n - 1]);
    return out2;
  }

  // ../../src/lib/sokoIll.js
  var PW = 2206;
  var PH = 946;
  var PI = Math.PI;
  var BLK = "#040404";
  var W1 = "rgba(236,235,230,0.95)";
  var clamp2 = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  var lerp = (a, b, t) => a + (b - a) * t;
  var sstep = (a, b, x) => {
    const t = clamp2((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  var grey = (v, a = 1) => {
    const c = Math.round(clamp2(v) * 255);
    return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`;
  };
  var P2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  var bil = (q, u, v) => P2(P2(q[0], q[1], u), P2(q[3], q[2], u), v);
  var dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  var polyPath = (g2, pts) => {
    g2.beginPath();
    g2.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g2.lineTo(pts[i][0], pts[i][1]);
    g2.closePath();
  };
  var blobPath = (g2, pts) => {
    g2.beginPath();
    smoothPath(g2, pts, true);
  };
  var TA = null;
  var TB = null;
  function scratch(c, w, h) {
    if (!c || c.width < w || c.height < h) {
      c = document.createElement("canvas");
      c.width = Math.max(w, c ? c.width : 0);
      c.height = Math.max(h, c ? c.height : 0);
    }
    return c;
  }
  function blurDraw(g2, bb, blur, draw) {
    const m = g2.getTransform(), pad = blur * 3 + 2, xs = [], ys = [];
    for (const [x, y] of [[bb[0] - pad, bb[1] - pad], [bb[2] + pad, bb[1] - pad], [bb[0] - pad, bb[3] + pad], [bb[2] + pad, bb[3] + pad]]) {
      xs.push(m.a * x + m.c * y + m.e);
      ys.push(m.b * x + m.d * y + m.f);
    }
    const dx = Math.floor(Math.min(...xs)), dy = Math.floor(Math.min(...ys)), w = Math.ceil(Math.max(...xs)) - dx, h = Math.ceil(Math.max(...ys)) - dy;
    if (w <= 0 || h <= 0) return;
    TA = scratch(TA, w, h);
    TB = scratch(TB, w, h);
    const a = TA.getContext("2d", { willReadFrequently: true }), b = TB.getContext("2d", { willReadFrequently: true });
    a.setTransform(1, 0, 0, 1, 0, 0);
    a.clearRect(0, 0, w, h);
    a.setTransform(m.a, m.b, m.c, m.d, m.e - dx, m.f - dy);
    draw(a);
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, w, h);
    b.filter = `blur(${(blur * Math.hypot(m.a, m.b)).toFixed(2)}px)`;
    b.drawImage(TA, 0, 0, w, h, 0, 0, w, h);
    b.filter = "none";
    g2.save();
    g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.drawImage(TB, 0, 0, w, h, dx, dy, w, h);
    g2.restore();
  }
  var bboxOf = (pts, pad = 0) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
  };
  var E = (x, y, rx, ry, a = 0) => Object.assign((c) => c.ellipse(x, y, rx, ry, a, 0, PI * 2), { bb: [x - Math.max(rx, ry), y - Math.max(rx, ry), x + Math.max(rx, ry), y + Math.max(rx, ry)] });
  var Rc = (x, y, w, h) => Object.assign((c) => c.rect(x, y, w, h), { bb: [x, y, x + w, y + h] });
  function fillPoly(g2, pts, color = BLK) {
    polyPath(g2, pts);
    g2.fillStyle = color;
    g2.fill();
  }
  function fillBlob(g2, pts, color = BLK) {
    blobPath(g2, pts);
    g2.fillStyle = color;
    g2.fill();
  }
  function dot(g2, x, y, r, color = W1) {
    g2.fillStyle = color;
    g2.beginPath();
    g2.arc(x, y, r, 0, PI * 2);
    g2.fill();
  }
  function ring(g2, x, y, r, w, color = W1, a0 = 0, a1 = PI * 2) {
    g2.strokeStyle = color;
    g2.lineWidth = w;
    g2.beginPath();
    g2.arc(x, y, r, a0, a1);
    g2.stroke();
  }
  function ink(g2, pts, w = 2, color = BLK, { closed = false, seed = 1, ends = 0.7, jit = 0.4 } = {}) {
    const r = rng(seed);
    const q = closed ? [...pts, pts[0]] : pts;
    const dense = [];
    for (let i = 0; i < q.length - 1; i++) {
      const [x0, y0] = q[i], [x1, y1] = q[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
      for (let k = 0; k < n; k++) dense.push([x0 + (x1 - x0) * (k / n) + (r() - 0.5) * jit, y0 + (y1 - y0) * (k / n) + (r() - 0.5) * jit]);
    }
    dense.push(q[q.length - 1]);
    taper(g2, dense, (u) => w * (ends + (1 - ends) * Math.sin(PI * u)), color);
  }
  function curve(g2, pts, w = 2, color = BLK, { closed = false, seed = 1, ends = 0.4, jit = 0.3 } = {}) {
    const r = rng(seed);
    const q = sampleCurve(pts, 8, closed).map(([x, y]) => [x + (r() - 0.5) * jit, y + (r() - 0.5) * jit]);
    taper(g2, q, (u) => w * (ends + (1 - ends) * Math.pow(Math.sin(PI * u), 0.5)), color);
  }
  function stripes(g2, q, { per = 5, cov = 0.5, lum = 0.92, seed = 1, dir = "v", jit = 0.3, brk = 0.5, wav = 0.5, lumJit = 0.22, base = true } = {}) {
    if (base) fillPoly(g2, q);
    const r = rng(seed);
    const cf = typeof cov === "number" ? () => cov : cov;
    const [A2, B2, Cc, D2] = dir === "v" ? q : [q[0], q[3], q[2], q[1]];
    const lenS = (dist(A2, B2) + dist(D2, Cc)) / 2, lenT = (dist(A2, D2) + dist(B2, Cc)) / 2;
    const n = Math.max(1, Math.round(lenS / per));
    const step = 2.5, m = Math.max(2, Math.ceil(lenT / step));
    g2.save();
    polyPath(g2, q);
    g2.clip();
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5 + (r() - 0.5) * jit) / n;
      const wMul = 0.78 + r() * 0.4, lm = lum * (1 - lumJit + lumJit * r()), ph = r() * 100, ph2 = r() * 100, ph3 = r() * 100;
      let seg = [], ws = [];
      const flush = () => {
        if (seg.length > 1) taper(g2, seg, (s) => ws[Math.min(ws.length - 1, Math.round(s * (ws.length - 1)))], grey(lm));
        seg = [];
        ws = [];
      };
      for (let k = 0; k <= m; k++) {
        const t = k / m, L = t * lenT;
        const p0 = dir === "v" ? bil(q, u, t) : bil(q, t, u);
        const c = clamp2(cf(u, t) * wMul * (1 + 0.28 * noise1(L / 34 + ph3, i + 3 * seed)));
        const b = noise1(L / (per * 5) + ph, i + seed);
        const gap = c < 0.9 && b > 1 - brk * 0.55 * (1 - c);
        const off = noise1(L / 26 + ph2, seed + 7) * wav;
        const nx = dir === "v" ? off : 0, ny = dir === "v" ? 0 : off;
        if (c < 0.04 || gap) {
          flush();
          continue;
        }
        seg.push([p0[0] + nx, p0[1] + ny]);
        ws.push(Math.min(per * 1.05, per * c));
      }
      flush();
    }
    g2.restore();
  }
  var VAL = null;
  var VALD = null;
  function valCtx() {
    if (!VAL) {
      VAL = document.createElement("canvas");
      VAL.width = PW;
      VAL.height = PH;
    }
    VALD = null;
    const v = VAL.getContext("2d", { willReadFrequently: true });
    return v;
  }
  function valPrepare(x0, y0, x1, y1) {
    x0 = Math.max(0, Math.floor(x0) - 4);
    y0 = Math.max(0, Math.floor(y0) - 4);
    x1 = Math.min(PW, Math.ceil(x1) + 4);
    y1 = Math.min(PH, Math.ceil(y1) + 4);
    VALD = { x0, y0, w: x1 - x0, h: y1 - y0, d: VAL.getContext("2d", { willReadFrequently: true }).getImageData(x0, y0, x1 - x0, y1 - y0).data };
  }
  function valAt(x, y) {
    const D2 = VALD;
    const xi = Math.max(0, Math.min(D2.w - 1, Math.round(x) - D2.x0)), yi = Math.max(0, Math.min(D2.h - 1, Math.round(y) - D2.y0));
    return D2.d[(yi * D2.w + xi) * 4] / 255;
  }
  function hatch2(g2, clipPts, { ang, per = 4, lum = 0.95, seed = 1, step = 2.2, jit = 0.35, gamma = 1, wMax = 1.08, base = true, baseV = 0, smooth = true, lumJit = 0.18, inv = false, alpha = 1, brk = 0, wn = 0 } = {}) {
    const angF = typeof ang === "number" ? () => ang : ang;
    if (base) {
      if (smooth) fillBlob(g2, clipPts, grey(baseV));
      else fillPoly(g2, clipPts, grey(baseV));
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of clipPts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, a0 = angF(cx, cy), nx = -Math.sin(a0), ny = Math.cos(a0);
    const half = Math.hypot(x1 - x0, y1 - y0) / 2 + per;
    valPrepare(x0, y0, x1, y1);
    const r = rng(seed);
    g2.save();
    g2.beginPath();
    if (smooth) smoothPath(g2, clipPts, true);
    else {
      g2.moveTo(clipPts[0][0], clipPts[0][1]);
      for (const p of clipPts.slice(1)) g2.lineTo(p[0], p[1]);
      g2.closePath();
    }
    g2.clip();
    const inBox = (x, y) => x > x0 - 4 && x < x1 + 4 && y > y0 - 4 && y < y1 + 4;
    for (let s = -half; s <= half; s += per) {
      const off = s + (r() - 0.5) * per * jit;
      const sx = cx + nx * off, sy = cy + ny * off;
      const wMul = 0.85 + r() * 0.3, lm = lum * (1 - lumJit + lumJit * r());
      const pts = [];
      for (const dir of [-1, 1]) {
        let x = sx, y = sy;
        const seg = [];
        for (let k = 0; k < 2e3 && inBox(x, y); k++) {
          const a = angF(x, y);
          x += Math.cos(a) * step * dir;
          y += Math.sin(a) * step * dir;
          seg.push([x, y]);
        }
        if (dir < 0) pts.push(...seg.reverse(), [sx, sy]);
        else pts.push(...seg);
      }
      let run = [], ws = [];
      const flush = () => {
        if (run.length > 1) taper(g2, run, (u) => ws[Math.min(ws.length - 1, Math.round(u * (ws.length - 1)))], grey(lm, alpha));
        run = [];
        ws = [];
      };
      const ph = r() * 100, li = Math.round(s / per);
      for (let k = 0; k < pts.length; k++) {
        const [x, y] = pts[k];
        const vv = inv ? 1 - valAt(x, y) : valAt(x, y);
        let w = per * Math.min(wMax, Math.pow(vv, gamma) * wMul * (1 + wn * noise1(k * step / 14 + ph, li + seed)));
        if (brk && vv < 0.92 && noise1(k * step / (per * 4) + ph * 2, li * 7 + seed) > 1 - brk * 1.3 * (1 - vv)) w = 0;
        if (w < 0.22) {
          flush();
          continue;
        }
        run.push([x, y]);
        ws.push(w);
      }
      flush();
    }
    g2.restore();
  }
  function curveField(curves, [x0, y0, x1, y1], cell = 6, fallback = PI / 2) {
    const samples = [];
    for (const c of curves) {
      const q = sampleCurve(c, 6);
      for (let i = 0; i < q.length - 1; i++) {
        const dx = q[i + 1][0] - q[i][0], dy = q[i + 1][1] - q[i][1], a = Math.atan2(dy, dx);
        samples.push([q[i][0], q[i][1], Math.cos(2 * a), Math.sin(2 * a)]);
      }
    }
    const nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1, grid = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * cell, y = y0 + j * cell;
      let sc = 0, ss = 0;
      for (const [px, py, c2, s2] of samples) {
        const w = 1 / ((px - x) ** 2 + (py - y) ** 2 + 40);
        sc += c2 * w;
        ss += s2 * w;
      }
      grid[j * nx + i] = samples.length ? Math.atan2(ss, sc) / 2 : fallback;
    }
    return (x, y) => {
      const fi = clamp2((x - x0) / cell, 0, nx - 1), fj = clamp2((y - y0) / cell, 0, ny - 1), i = Math.round(fi), j = Math.round(fj);
      return grid[j * nx + i];
    };
  }
  function vFill(v, pts, val, { blur = 0, smooth = true, alpha = 1 } = {}) {
    VALD = null;
    const draw = (c) => {
      c.beginPath();
      if (smooth) smoothPath(c, pts, true);
      else {
        c.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
        c.closePath();
      }
      c.fillStyle = typeof val === "number" ? grey(val) : val;
      c.fill();
    };
    v.save();
    v.globalAlpha = alpha;
    if (blur) blurDraw(v, bboxOf(pts), blur, draw);
    else draw(v);
    v.restore();
  }
  function vLine(v, pts, w, val, blur = 0, alpha = 1) {
    VALD = null;
    const draw = (c) => curve(c, pts, w, grey(val), { seed: 5, ends: 0.25, jit: 0 });
    v.save();
    v.globalAlpha = alpha;
    if (blur) blurDraw(v, bboxOf(pts, w), blur, draw);
    else draw(v);
    v.restore();
  }
  var vg = (a, b, e = 1) => (u, v) => lerp(a, b, Math.pow(v, e));
  var ug = (a, b, e = 1) => (u, v) => lerp(a, b, Math.pow(u, e));
  var bl = (tl, tr, br, bl_) => (u, v) => lerp(lerp(tl, tr, u), lerp(bl_, br, u), v);
  var fadeEdges = (f, top = 0.08, bot = 0.12, left = 0, right = 0) => (u, v) => f(u, v) * sstep(0, top, v) * (1 - sstep(1 - bot, 1, v)) * (left ? sstep(0, left, u) : 1) * (right ? 1 - sstep(1 - right, 1, u) : 1);
  function carton(g2, front, { cov, per = 5, lum = 0.92, seed = 1, side = null, sideCov = 0, top = null, topCov = 0.5, topLum = 0.85, rim = 0.5, dir = "v", brk = 0.5 } = {}) {
    if (top) stripes(g2, top, { per: 3.2, cov: topCov, lum: topLum, seed: seed + 3, dir: "h", brk: 0.3, jit: 0.2 });
    if (side) {
      if (sideCov) stripes(g2, side, { per, cov: sideCov, lum: lum * 0.8, seed: seed + 5, brk });
      else fillPoly(g2, side);
    }
    stripes(g2, front, { per, cov, lum, seed, dir, brk });
    if (rim > 0) ink(g2, [front[0], front[1]], 1.6, grey(0.9, rim), { seed: seed + 9 });
  }
  function leftBack(g2) {
    stripes(g2, [[12, 150], [80, 150], [80, 250], [12, 246]], { cov: fadeEdges(bl(0.28, 0.4, 0.34, 0.22), 0.02, 0.02), lum: 0.62, seed: 11 });
    stripes(g2, [[80, 150], [332, 150], [332, 318], [80, 305]], { cov: fadeEdges(bl(0.3, 0.42, 0.4, 0.3), 0.02, 0.02), lum: 0.62, seed: 12 });
    stripes(g2, [[18, 244], [84, 258], [84, 302], [16, 316]], { cov: fadeEdges(bl(0.7, 0.45, 0.3, 0.55), 0.06, 0.06), lum: 0.82, seed: 13 });
    ink(g2, [[18, 244], [84, 258]], 1.6, BLK, { seed: 131 });
    stripes(g2, [[16, 317], [219, 289], [219, 420], [14, 420]], { cov: fadeEdges(bl(0.22, 0.32, 0.26, 0.16), 0.04, 0.02), lum: 0.6, seed: 14 });
    ink(g2, [[16, 317], [219, 289]], 1.8, BLK, { seed: 141 });
    stripes(g2, [[100, 306], [136, 303], [136, 344], [100, 346]], { cov: fadeEdges(vg(0.7, 0.4), 0.05, 0.05), lum: 0.8, seed: 15 });
    ink(g2, [[100, 346], [136, 344]], 1.3, grey(0.75), { seed: 151 });
    ink(g2, [[130, 281], [181, 278], [182, 298], [131, 300]], 1.3, "rgba(215,215,205,0.6)", { closed: true, seed: 16 });
    stripes(g2, [[219, 289], [320, 319], [322, 400], [219, 400]], { cov: fadeEdges(bl(1, 0.8, 0.55, 0.85), 0.02, 0), lum: 0.96, seed: 17, per: 5.5 });
    ink(g2, [[219, 289], [320, 319]], 2, BLK, { seed: 18 });
    curve(g2, [[330, 232], [338, 280], [334, 330], [340, 380]], 3, "rgba(70,70,68,0.7)", { seed: 191 });
    g2.strokeStyle = "rgba(90,90,88,0.6)";
    g2.lineWidth = 2;
    g2.beginPath();
    g2.ellipse(352, 276, 14, 20, 0.3, 0.3, 4.6);
    g2.stroke();
    curve(g2, [[414, 180], [410, 205], [404, 232], [410, 262], [410, 272]], 1.1, "rgba(150,150,145,0.55)", { seed: 19 });
    leaf(g2, 402, 226, 1.62, 32, 0.74, 20);
    leaf(g2, 428, 236, 1.5, 26, 0.7, 21);
    leaf(g2, 412, 272, 1.55, 33, 0.78, 22);
  }
  function leaf(g2, x, y, ang, s, v = 0.72, seed = 1) {
    const pts = [];
    for (let i = 0; i < 20; i++) {
      const t = i / 20 * PI * 2;
      const lx = (1 - Math.cos(t)) * 0.5 * s;
      const k = lx / s;
      const wdt = s * 0.36 * Math.sin(t) * (k < 0.25 ? 0.7 + k * 1.2 : 1 - 0.55 * Math.pow((k - 0.25) / 0.75, 1.6));
      pts.push([x + lx * Math.cos(ang) - wdt * Math.sin(ang), y + lx * Math.sin(ang) + wdt * Math.cos(ang)]);
    }
    blobPath(g2, pts);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const gr = g2.createLinearGradient(x + nx * s * 0.35, y + ny * s * 0.35, x - nx * s * 0.35, y - ny * s * 0.35);
    gr.addColorStop(0, grey(v * 0.45));
    gr.addColorStop(0.45, grey(v));
    gr.addColorStop(0.55, grey(v * 0.9));
    gr.addColorStop(1, grey(v * 0.7));
    g2.fillStyle = gr;
    g2.fill();
    g2.strokeStyle = "rgba(8,8,8,0.9)";
    g2.lineWidth = 1.2;
    g2.stroke();
    const tip = [x + s * Math.cos(ang), y + s * Math.sin(ang)];
    curve(g2, [[x, y], P2([x, y], tip, 0.5), P2([x, y], tip, 0.9)], Math.max(0.8, s * 0.05), "rgba(15,15,15,0.85)", { seed, ends: 0.3 });
    for (let k = 1; k <= 2; k++) for (const sd of [-1, 1]) {
      const a = P2([x, y], tip, 0.22 + k * 0.22), l = s * 0.2;
      ink(g2, [a, [a[0] + Math.cos(ang + sd * 0.8) * l, a[1] + Math.sin(ang + sd * 0.8) * l]], 0.7, "rgba(20,20,20,0.55)", { seed: seed + k * 3 + sd });
    }
  }
  function guitarCase(g2) {
    const front = [[43, 400], [55, 389], [70, 384], [90, 383], [100, 390], [100, 447], [90, 547], [77, 650], [4, 652], [10, 540], [14, 503]];
    fillBlob(g2, front, "#080808");
    stripes(g2, [[40, 410], [98, 410], [80, 646], [8, 648]], { cov: fadeEdges(vg(0.22, 0.12), 0.05, 0.05, 0.15, 0.15), lum: 0.55, seed: 30, per: 6, base: false });
    curve(g2, [[14, 503], [26, 450], [43, 400], [60, 386], [90, 383], [100, 392], [100, 447], [90, 547], [77, 650]], 2.2, "rgba(225,225,220,0.85)", { seed: 31, ends: 0.6 });
    const side = [[100, 390], [120, 394], [140, 400], [143, 447], [133, 547], [127, 650], [77, 650], [90, 547], [100, 447]];
    fillPoly(g2, side, "#060606");
    curve(g2, [[103, 393], [140, 400], [143, 447], [133, 547], [127, 648]], 2, "rgba(220,220,215,0.8)", { seed: 32 });
    ink(g2, [[120, 397], [123, 450], [118, 550], [113, 650]], 2.4, "rgba(235,235,230,0.9)", { seed: 33 });
    ink(g2, [[130, 400], [132, 450], [127, 550], [122, 650]], 1.8, "rgba(210,210,205,0.75)", { seed: 34 });
    for (const [x0, y0, x1, y1] of [[120, 428, 147, 455], [105, 572, 145, 602]]) {
      fillPoly(g2, [[x0, y0], [x1, y0 + 2], [x1, y1], [x0, y1 - 1]], grey(0.78));
      ink(g2, [[x0, y0], [x1, y0 + 2], [x1, y1], [x0, y1 - 1]], 1.6, BLK, { closed: true, seed: x0 });
      fillPoly(g2, [[x0 + 6, y0 + 7], [x1 - 6, y0 + 8], [x1 - 6, y1 - 7], [x0 + 6, y1 - 7]], grey(0.3));
    }
    ink(g2, [[143, 510], [143, 527]], 2, grey(0.8), { seed: 35 });
  }
  function plantLeft(g2) {
    fillBlob(g2, [[355, 390], [390, 380], [430, 384], [432, 400], [360, 402]], grey(0.12));
    const pot = [[435, 362], [488, 360], [484, 395], [440, 398]];
    polyPath(g2, pot);
    const pg = g2.createLinearGradient(435, 0, 488, 0);
    pg.addColorStop(0, grey(0.3));
    pg.addColorStop(0.65, grey(0.78));
    pg.addColorStop(1, grey(0.45));
    g2.fillStyle = pg;
    g2.fill();
    ink(g2, pot, 1.4, BLK, { closed: true, seed: 40 });
    g2.fillStyle = grey(0.7);
    g2.beginPath();
    g2.ellipse(461, 361, 28, 4, -0.03, 0, PI * 2);
    g2.fill();
    const L = [
      [452, 345, -2.1, 26],
      [468, 342, -1.4, 26],
      [480, 345, -0.9, 24],
      [440, 350, -2.8, 26],
      [490, 350, -0.3, 24],
      [458, 352, -1.8, 22],
      [495, 336, -0.8, 25],
      [448, 328, -1.95, 22],
      [470, 330, -1.2, 22],
      [428, 342, 3, 22],
      [420, 356, 2.8, 18],
      [504, 348, 0.2, 24],
      [512, 362, 1, 22],
      [528, 360, 1.3, 22],
      [510, 400, 1.35, 24],
      [520, 422, 1.45, 24],
      [522, 446, 1.5, 21],
      [515, 466, 1.6, 18],
      [540, 392, 1.3, 26],
      [548, 428, 1.45, 24],
      [546, 452, 1.55, 20],
      [500, 322, -0.6, 22],
      [436, 318, -2.2, 22]
    ];
    L.forEach(([x, y, a, s], i) => leaf(g2, x, y, a, s, 0.56 + i % 4 * 0.06, 50 + i * 3));
    curve(g2, [[488, 362], [514, 380], [528, 404], [530, 440], [520, 470]], 1.1, "rgba(160,160,155,0.6)", { seed: 49 });
  }
  function leftMid(g2) {
    carton(g2, [[367, 350], [405, 348], [406, 392], [368, 394]], { cov: fadeEdges(vg(0.35, 0.2)), lum: 0.65, seed: 60, rim: 0.3 });
    for (const x of [373, 386]) fillPoly(g2, [[x, 352], [x + 8, 351], [x + 8, 359], [x, 360]], grey(0.85));
    const tray = [[228, 399], [360, 396], [374, 411], [248, 424]];
    stripes(g2, tray, { dir: "h", per: 3, cov: bl(0.95, 0.95, 0.85, 0.85), lum: 0.96, seed: 61, brk: 0.2 });
    ink(g2, tray, 1.8, BLK, { closed: true, seed: 62 });
    fillPoly(g2, [[248, 424], [374, 411], [375, 421], [249, 434]], grey(0.3));
    stripes(g2, [[374, 399], [500, 398], [503, 408], [375, 410]], { dir: "h", per: 3, cov: 0.8, lum: 0.92, seed: 63, brk: 0.2 });
    stripes(g2, [[375, 410], [430, 409], [431, 482], [376, 484]], { cov: fadeEdges(bl(0.7, 0.6, 0.4, 0.45), 0.02, 0.05), lum: 0.9, seed: 64 });
    stripes(g2, [[430, 409], [503, 408], [506, 480], [431, 482]], { cov: fadeEdges(bl(0.75, 0.7, 0.55, 0.6), 0.02, 0.05), lum: 0.88, seed: 641, per: 3.2, brk: 0.2 });
    fillPoly(g2, [[431, 409], [452, 409], [452, 433], [431, 434]], "#050505");
    fillPoly(g2, [[477, 410], [498, 410], [498, 432], [477, 432]], "#070707");
    ink(g2, [[431, 409], [452, 409], [452, 433], [431, 434]], 1.2, "rgba(220,220,215,0.75)", { closed: true, seed: 65 });
    ink(g2, [[452, 434], [452, 482]], 2, grey(0.95), { seed: 651 });
    stripes(g2, [[243, 423], [297, 425], [297, 560], [243, 560]], { cov: fadeEdges(bl(0.12, 0.16, 0.1, 0.08), 0.03, 0.02), lum: 0.6, seed: 66 });
    ink(g2, [[247, 432], [247, 500], [290, 500]], 1.6, grey(0.55), { seed: 661 });
    stripes(g2, [[297, 425], [387, 423], [388, 560], [297, 560]], { cov: fadeEdges(bl(0.9, 0.8, 0.6, 0.7), 0.03, 0.02), lum: 0.95, seed: 67 });
    ink(g2, [[230, 423], [387, 422]], 1.6, BLK, { seed: 671 });
  }
  function keyboardLeft(g2) {
    fillPoly(g2, [[335, 472], [380, 472], [380, 560], [335, 560]], "#080808");
    ink(g2, [[335, 472], [380, 472]], 1.4, grey(0.5), { seed: 701 });
    stripes(g2, [[380, 472], [505, 480], [508, 560], [380, 560]], { dir: "h", per: 4, cov: bl(0.7, 0.62, 0.55, 0.62), lum: 0.78, seed: 702, brk: 0.15, jit: 0.4 });
    ink(g2, [[380, 472], [505, 480], [508, 560], [380, 560]], 1.8, BLK, { closed: true, seed: 703 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
      const x = 395 + c * 16.3, y = 491.5 + r * 24.5 + c * 0.35;
      dot(g2, x, y + 1, 6.2, "#050505");
      ring(g2, x, y, 5, 1.2, "rgba(150,150,145,0.8)");
      dot(g2, x - 1.5, y - 2, 1.4, "rgba(240,240,235,0.9)");
    }
    for (const [x, dx] of [[411, 8], [445, 12], [461, 20], [477, 30]]) curve(g2, [[x, 544], [x + 2, 560], [x + dx * 0.5, 590], [x + dx, 640], [x + dx + 6, 700]], 2.6, "#030303", { seed: x, ends: 0.8 });
    fillPoly(g2, [[147, 552], [422, 552], [424, 600], [150, 610]], "#060606");
    stripes(g2, [[170, 552], [422, 552], [422, 572], [170, 572]], { dir: "h", per: 3.5, cov: 0.22, lum: 0.7, seed: 704 });
    for (let i = 0; i < 15; i++) {
      const x = 180 + i * 16.5;
      dot(g2, x, 563, 3.4, "#0a0a0a");
      dot(g2, x, 561, 2.2, "rgba(225,225,220,0.85)");
    }
    const kx0 = 172, kx1 = 422, nw = 22, kw = (kx1 - kx0) / nw;
    polyPath(g2, [[kx0, 577], [kx1, 577], [kx1, 598], [kx0, 598]]);
    const kg = g2.createLinearGradient(0, 577, 0, 598);
    kg.addColorStop(0, grey(0.97));
    kg.addColorStop(1, grey(0.78));
    g2.fillStyle = kg;
    g2.fill();
    for (let i = 0; i <= nw; i++) ink(g2, [[kx0 + i * kw, 578], [kx0 + i * kw, 598]], 1.1, "rgba(20,20,20,0.9)", { seed: 710 + i, jit: 0.1 });
    for (let i = 0; i < nw; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) {
      const x = kx0 + (i + 1) * kw - kw * 0.32;
      fillPoly(g2, [[x, 571], [x + kw * 0.64, 571], [x + kw * 0.64, 589], [x, 589]], "#070707");
      ink(g2, [[x + 1, 572], [x + kw * 0.64 - 1, 572]], 1.4, "rgba(220,220,215,0.8)", { seed: 720 + i, jit: 0.1 });
    }
    ink(g2, [[kx0, 598], [kx1, 598]], 1.6, BLK, { seed: 730 });
    fillPoly(g2, [[150, 598], [424, 598], [424, 612], [152, 614]], grey(0.12));
    fillPoly(g2, [[147, 552], [172, 552], [172, 600], [160, 612], [150, 606]], "#0b0b0b");
    ink(g2, [[160, 580], [227, 607]], 2.2, grey(0.6), { seed: 731 });
    fillPoly(g2, [[422, 585], [492, 583], [494, 624], [423, 626]], "#0c0c0c");
    ink(g2, [[422, 585], [492, 583]], 1.6, grey(0.8), { seed: 732 });
    for (let i = 0; i < 4; i++) {
      dot(g2, 437 + i * 16.5, 582, 3.2, "#0a0a0a");
      dot(g2, 437 + i * 16.5, 580.5, 2, grey(0.9));
    }
    stripes(g2, [[492, 560], [516, 560], [516, 622], [494, 622]], { cov: fadeEdges(vg(0.7, 0.5)), lum: 0.85, seed: 733 });
    stripes(g2, [[147, 624], [500, 621], [500, 641], [147, 646]], { dir: "h", per: 3.4, cov: bl(0.7, 0.95, 0.9, 0.6), lum: 0.95, seed: 740, brk: 0.25 });
    ink(g2, [[147, 646], [500, 641]], 1.6, BLK, { seed: 741 });
    fillPoly(g2, [[340, 645], [475, 642], [475, 760], [340, 760]], "#030303");
    for (const [x0, x1, y1, s] of [[323, 340, 822, 742], [475, 492, 780, 743]]) {
      stripes(g2, [[x0, 642], [x1, 642], [x1, y1], [x0, y1]], { per: 3.4, cov: fadeEdges(ug(0.95, 0.45), 0, 0.06), lum: 0.93, seed: s, brk: 0.2 });
      ink(g2, [[x1, 642], [x1, y1]], 1.4, BLK, { seed: s + 1 });
    }
    for (const [pts, bx, by] of [[[[296, 628], [352, 626], [352, 660], [330, 666], [300, 650]], 333, 641], [[[471, 623], [493, 622], [493, 660], [474, 658]], 486, 631]]) {
      fillPoly(g2, pts, grey(0.85));
      ink(g2, pts, 1.6, BLK, { closed: true, seed: bx });
      dot(g2, bx, by, 4.5, "#101010");
      dot(g2, bx - 1, by - 1, 1.6, grey(0.8));
    }
    fillPoly(g2, [[147, 626], [165, 626], [165, 646], [147, 646]], grey(0.7));
    curve(g2, [[153, 534], [172, 540], [180, 560]], 2.4, "rgba(215,215,210,0.8)", { seed: 750 });
    curve(g2, [[172, 652], [196, 660], [206, 690], [204, 722], [198, 746]], 3.4, "#040404", { seed: 751, ends: 0.9 });
    curve(g2, [[171, 651], [195, 659], [205, 690], [203, 722], [197, 746]], 1.6, "rgba(220,220,215,0.85)", { seed: 752 });
  }
  function leftLow(g2) {
    stripes(g2, [[14, 656], [72, 655], [72, 752], [14, 752]], { cov: fadeEdges(bl(0.5, 0.55, 0.45, 0.4), 0.02, 0.02), lum: 0.78, seed: 800 });
    stripes(g2, [[72, 655], [172, 655], [172, 752], [72, 752]], { cov: fadeEdges(bl(0.95, 0.75, 0.6, 0.85), 0.02, 0.02), lum: 0.95, seed: 801 });
    ink(g2, [[14, 656], [172, 655]], 1.8, grey(0.9), { seed: 802 });
    ink(g2, [[72, 656], [72, 752]], 1.6, BLK, { seed: 803 });
    fillPoly(g2, [[145, 648], [200, 650], [202, 680], [148, 678]], grey(0.2));
    ink(g2, [[145, 648], [200, 650]], 1.4, grey(0.8), { seed: 804 });
    stripes(g2, [[14, 753], [232, 752], [232, 870], [14, 870]], { cov: fadeEdges((u, v) => (u < 0.28 ? 0.55 : 0.9) * lerp(1, 0.7, v), 0.02, 0.04), lum: 0.95, seed: 805 });
    ink(g2, [[14, 753], [232, 752]], 1.8, grey(0.9), { seed: 806 });
    ink(g2, [[75, 753], [75, 870]], 1.6, BLK, { seed: 807 });
    stripes(g2, [[95, 745], [210, 744], [215, 754], [98, 755]], { dir: "h", per: 3, cov: 0.85, lum: 0.92, seed: 808 });
    fillPoly(g2, [[250, 826], [290, 824], [291, 862], [251, 863]], grey(0.55));
    ink(g2, [[250, 826], [290, 824], [291, 862], [251, 863]], 1.3, BLK, { closed: true, seed: 809 });
    dot(g2, 280, 815, 4, grey(0.75));
    stripes(g2, [[272, 812], [366, 812], [368, 830], [270, 830]], { dir: "h", per: 3, cov: 0.8, lum: 0.9, seed: 810 });
    stripes(g2, [[270, 830], [368, 830], [370, 862], [272, 862]], { dir: "h", per: 3, cov: 0.9, lum: 0.9, seed: 811 });
    ink(g2, [[270, 830], [368, 830]], 1.4, BLK, { seed: 812 });
    for (const x of [281, 305, 320, 343]) {
      fillPoly(g2, [[x - 6, 800], [x + 6, 800], [x + 6, 816], [x - 6, 816]], "#0b0b0b");
      g2.fillStyle = grey(0.85);
      g2.beginPath();
      g2.ellipse(x, 800, 6, 2.4, 0, 0, PI * 2);
      g2.fill();
    }
    for (const x of [290, 306, 348, 362]) dot(g2, x, 846, 3, "#111");
    stripes(g2, [[368, 712], [400, 710], [400, 846], [370, 846]], { cov: fadeEdges(ug(0.45, 0.7), 0.02, 0.02), lum: 0.85, seed: 820 });
    stripes(g2, [[400, 710], [432, 712], [432, 845], [400, 846]], { cov: fadeEdges(vg(0.98, 0.8), 0.01, 0.02), lum: 0.97, seed: 821, per: 4 });
    ink(g2, [[368, 712], [432, 712], [432, 845], [370, 846]], 1.6, BLK, { closed: true, seed: 822 });
    fillPoly(g2, [[440, 716], [584, 716], [584, 736], [440, 736]], "#070707");
    fillPoly(g2, [[515, 724], [556, 724], [556, 736], [515, 736]], grey(0.75));
    stripes(g2, [[432, 736], [584, 736], [584, 848], [432, 848]], { cov: fadeEdges(bl(0.97, 0.95, 0.85, 0.9), 0, 0.03), lum: 0.97, seed: 823, per: 3.4, brk: 0.15, lumJit: 0.12 });
    ink(g2, [[432, 736], [584, 736]], 1.4, BLK, { seed: 824 });
    ink(g2, [[433, 778], [584, 776]], 1.2, "rgba(40,40,40,0.7)", { seed: 825 });
    ink(g2, [[470, 766], [475, 755], [481, 766]], 1.6, "rgba(30,30,30,0.9)", { seed: 826 });
    ink(g2, [[472, 762], [479, 762]], 1.2, "rgba(30,30,30,0.9)", { seed: 827 });
    ink(g2, [[432, 736], [432, 848]], 1.6, BLK, { seed: 828 });
    curve(g2, [[372, 834], [410, 800], [456, 742], [470, 712]], 6, "#030303", { seed: 829, ends: 0.9 });
    curve(g2, [[371, 832], [409, 798], [455, 740], [469, 711]], 1.4, "rgba(210,210,205,0.7)", { seed: 830 });
    curve(g2, [[470, 850], [520, 836], [562, 822]], 5, "#030303", { seed: 831, ends: 0.9 });
  }
  function book(g2, pts, { lum = 0.95, cov = 0.85, seed = 1, spine = 0.25, k = 1 } = {}) {
    stripes(g2, pts, { dir: "h", per: 2.6, cov: (u, v) => k * cov * lerp(spine / cov, 1, sstep(0, 0.18, u)) * (1 - 0.25 * v), lum, seed, brk: 0.2, jit: 0.2, wav: 0.2 });
    ink(g2, pts, 1.3, BLK, { closed: true, seed: seed + 1 });
  }
  function speakerL(g2) {
    book(g2, [[555, 443], [650, 441], [652, 460], [556, 461]], { seed: 1001, k: 0.62 });
    book(g2, [[530, 460], [655, 458], [657, 478], [531, 479]], { seed: 1003, k: 0.62 });
    book(g2, [[535, 478], [665, 477], [666, 493], [536, 494]], { seed: 1005, k: 0.62 });
    book(g2, [[525, 493], [670, 492], [671, 506], [526, 507]], { seed: 1007, lum: 0.9, k: 0.62 });
    stripes(g2, [[522, 506], [632, 506], [632, 704], [522, 704]], { per: 4.2, cov: fadeEdges(bl(0.15, 0.2, 0.12, 0.08), 0.02, 0.02), lum: 0.6, seed: 1010 });
    stripes(g2, [[632, 506], [700, 512], [700, 612], [632, 612]], { per: 4.6, cov: fadeEdges(bl(0.9, 0.8, 0.7, 0.85), 0.02, 0), lum: 0.95, seed: 1011 });
    ink(g2, [[632, 506], [632, 612]], 1.6, BLK, { seed: 1012 });
    ink(g2, [[522, 506], [632, 506], [700, 512]], 1.8, grey(0.85), { seed: 1013 });
    driver(g2, 578, 543, 20, "tweeter");
    driver(g2, 578, 613, 46, "woofer");
    stripes(g2, [[678, 447], [710, 447], [712, 640], [680, 640]], { per: 3.4, cov: fadeEdges(ug(0.75, 0.35)), lum: 0.9, seed: 1020 });
    ink(g2, [[678, 447], [710, 447], [712, 640], [680, 640]], 1.5, BLK, { closed: true, seed: 1021 });
    for (const y of [490, 506, 560, 600]) {
      dot(g2, 692, y, 4, "#0a0a0a");
      ring(g2, 692, y, 4.2, 1.2, grey(0.85));
    }
  }
  function driver(g2, cx, cy, r, kind) {
    if (kind === "woofer") {
      dot(g2, cx, cy, r, "#070707");
      ring(g2, cx, cy, r - 1, 2, grey(0.75));
      ring(g2, cx, cy, r * 0.86, 1.2, grey(0.35));
      const gr = g2.createRadialGradient(cx - r * 0.12, cy - r * 0.15, r * 0.2, cx, cy, r * 0.78);
      gr.addColorStop(0, grey(0.98));
      gr.addColorStop(0.7, grey(0.9));
      gr.addColorStop(1, grey(0.55));
      g2.fillStyle = gr;
      g2.beginPath();
      g2.arc(cx, cy, r * 0.76, 0, PI * 2);
      g2.fill();
      for (let k = 0; k < 4; k++) ring(g2, cx, cy, r * (0.42 + k * 0.09), 0.8, "rgba(60,60,60,0.35)");
      dot(g2, cx, cy, r * 0.29, "#060606");
      dot(g2, cx - r * 0.07, cy - r * 0.09, r * 0.05, grey(0.9));
    } else {
      dot(g2, cx, cy, r, "#080808");
      ring(g2, cx, cy, r - 1, 1.6, grey(0.7));
      const gr = g2.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r * 0.8);
      gr.addColorStop(0, grey(0.45));
      gr.addColorStop(1, grey(0.08));
      g2.fillStyle = gr;
      g2.beginPath();
      g2.arc(cx, cy, r * 0.75, 0, PI * 2);
      g2.fill();
      dot(g2, cx - r * 0.1, cy - r * 0.15, r * 0.14, grey(0.95));
    }
  }
  function crateAndBooks(g2) {
    book(g2, [[635, 628], [765, 626], [766, 643], [636, 644]], { seed: 1101 });
    book(g2, [[640, 643], [770, 642], [771, 665], [641, 666]], { seed: 1103 });
    book(g2, [[640, 665], [760, 664], [761, 683], [641, 684]], { seed: 1105 });
    book(g2, [[630, 683], [765, 682], [766, 700], [631, 701]], { seed: 1107, lum: 0.9 });
    fillPoly(g2, [[675, 610], [760, 610], [761, 628], [676, 628]], grey(0.62));
    ink(g2, [[675, 610], [760, 610], [761, 628], [676, 628]], 1.3, BLK, { closed: true, seed: 1109 });
    fillPoly(g2, [[688, 615], [704, 615], [704, 623], [688, 623]], "#080808");
    for (let i = 0; i < 3; i++) dot(g2, 691 + i * 5, 619, 1.2, grey(0.9));
    fillPoly(g2, [[628, 700], [765, 700], [765, 815], [628, 815]], "#050505");
    stripes(g2, [[628, 700], [765, 700], [765, 714], [628, 714]], { dir: "h", per: 2.8, cov: 0.8, lum: 0.9, seed: 1110, brk: 0.1 });
    for (const [x0, x1] of [[636, 656], [668, 700], [710, 740], [750, 760]]) fillPoly(g2, [[x0, 702], [x1, 702], [x1, 711], [x0, 711]], "#070707");
    g2.save();
    g2.beginPath();
    g2.rect(642, 714, 108, 90);
    g2.clip();
    for (let i = -3; i < 7; i++) {
      ink(g2, [[642 + i * 30, 804], [642 + i * 30 + 90, 714]], 2.2, grey(0.7), { seed: 1120 + i, jit: 0.2 });
      ink(g2, [[642 + i * 30, 714], [642 + i * 30 + 90, 804]], 2.2, grey(0.7), { seed: 1140 + i, jit: 0.2 });
    }
    g2.restore();
    fillBlob(g2, [[676, 716], [720, 716], [724, 728], [672, 728]], "#040404");
    ink(g2, [[676, 716], [720, 716], [724, 728], [672, 728]], 1.2, grey(0.7), { closed: true, seed: 1160 });
    for (const [x0, x1] of [[628, 642], [750, 765]]) stripes(g2, [[x0, 714], [x1, 714], [x1, 815], [x0, 815]], { per: 3, cov: ug(0.85, 0.5), lum: 0.9, seed: 1161 + x0 });
    ink(g2, [[628, 815], [765, 815]], 1.4, grey(0.5), { seed: 1165 });
    g2.save();
    g2.beginPath();
    g2.rect(766, 700, 34, 110);
    g2.clip();
    for (let i = 0; i < 4; i++) ink(g2, [[766, 720 + i * 26], [800, 700 + i * 26]], 1.4, grey(0.35), { seed: 1170 + i });
    g2.restore();
  }
  function pedalboard(g2) {
    fillPoly(g2, [[572, 830], [692, 828], [694, 870], [570, 872]], "#070707");
    ink(g2, [[572, 832], [692, 830]], 2, grey(0.8), { seed: 1201 });
    ink(g2, [[692, 830], [694, 870]], 1.4, grey(0.5), { seed: 1202 });
    for (let i = 0; i < 7; i++) {
      const x = 588 + i * 15;
      g2.fillStyle = grey(0.82);
      g2.beginPath();
      g2.ellipse(x, 826, 5, 2.4, 0, 0, PI * 2);
      g2.fill();
    }
    for (const [x, y] of [[640, 853], [700, 856], [730, 850]]) {
      dot(g2, x, y, 3.5, grey(0.25));
      ring(g2, x, y, 3.8, 1, grey(0.7));
    }
    for (const [x0, y0, w, h] of [[740, 806, 40, 26], [782, 810, 22, 22]]) {
      fillPoly(g2, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], grey(0.78));
      ink(g2, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], 1.2, BLK, { closed: true, seed: x0 });
      dot(g2, x0 + 10, y0 + 8, 3, "#111");
    }
  }
  function doNotKnock(g2) {
    const sgn = [[600, 194], [817, 171], [827, 270], [611, 293]];
    fillPoly(g2, sgn, "#060606");
    ink(g2, sgn, 2.6, grey(0.8), { closed: true, seed: 1301 });
    g2.save();
    g2.translate(611, 293);
    g2.rotate(-0.106);
    for (const [x, y] of [[10, -12], [206, -12]]) ring(g2, x, y, 3.3, 1.3, grey(0.78));
    g2.font = "400 32px Geist";
    g2.fontStretch = "condensed";
    g2.fillStyle = grey(0.72);
    g2.letterSpacing = "1px";
    g2.save();
    g2.scale(0.74, 1.02);
    g2.fillText("DO NOT KNOCK.", 17, -28);
    g2.restore();
    g2.font = "500 16px Geist";
    g2.fillStyle = grey(0.5, 0.55);
    g2.fillText("MIXING.", 112, -76);
    g2.letterSpacing = "0px";
    g2.fontStretch = "normal";
    g2.restore();
  }
  function wallLight(g2) {
    g2.save();
    g2.beginPath();
    g2.ellipse(1330, 382, 42, 52, 0, 0, PI * 2);
    g2.clip();
    const r = rng(1401);
    for (let i = 0; i < 300; i++) {
      const a = r() * PI * 2, d = Math.sqrt(r()) * 52;
      const x = 1330 + Math.cos(a) * d * 0.8, y = 382 + Math.sin(a) * d;
      const fall = clamp2(1 - Math.hypot(x - 1345, y - 365) / 70);
      g2.strokeStyle = grey(0.25 + 0.45 * fall, 0.15 + 0.55 * fall);
      g2.lineWidth = 0.8 + fall * 0.5;
      g2.beginPath();
      g2.arc(x, y, 1.8 + r() * 3.2, r() * 6, r() * 6 + 3.8);
      g2.stroke();
    }
    g2.restore();
  }
  function deskUnder(g2) {
    stripes(g2, [[1030, 646], [1135, 646], [1138, 668], [1028, 668]], { per: 4, cov: 0.35, lum: 0.6, seed: 1410 });
    stripes(g2, [[823, 545], [845, 545], [838, 858], [813, 858]], { per: 3.2, cov: fadeEdges(ug(0.95, 0.4), 0, 0.03), lum: 0.93, seed: 1411, brk: 0.2 });
    ink(g2, [[845, 545], [838, 858]], 1.4, BLK, { seed: 1412 });
    stripes(g2, [[843, 574], [878, 546], [890, 548], [845, 590]], { dir: "h", per: 3, cov: 0.6, lum: 0.8, seed: 1413 });
    stripes(g2, [[891, 588], [899, 588], [898, 800], [890, 800]], { per: 3, cov: 0.3, lum: 0.6, seed: 1414 });
    stripes(g2, [[840, 800], [895, 800], [895, 812], [840, 812]], { dir: "h", per: 3, cov: 0.5, lum: 0.75, seed: 1415 });
    dot(g2, 831, 614, 5.5, "#0c0c0c");
    ring(g2, 831, 614, 5.5, 1.4, grey(0.85));
    dot(g2, 831, 614, 2, grey(0.8));
    stripes(g2, [[1298, 556], [1320, 556], [1280, 832], [1258, 830]], { dir: "v", per: 3.2, cov: fadeEdges(ug(0.9, 0.35), 0, 0.03), lum: 0.9, seed: 1420, brk: 0.2 });
    stripes(g2, [[1342, 552], [1356, 552], [1350, 700], [1338, 700]], { per: 3.2, cov: 0.35, lum: 0.7, seed: 1421 });
    stripes(g2, [[1395, 562], [1405, 556], [1436, 600], [1430, 608]], { dir: "h", per: 3, cov: 0.5, lum: 0.75, seed: 1422 });
    stripes(g2, [[1433, 548], [1457, 548], [1465, 865], [1446, 865]], { per: 3.2, cov: fadeEdges(ug(0.95, 0.5), 0, 0.03), lum: 0.93, seed: 1423, brk: 0.2 });
    ink(g2, [[1457, 548], [1465, 865]], 1.4, BLK, { seed: 1424 });
    dot(g2, 1444, 617, 5.5, "#0c0c0c");
    ring(g2, 1444, 617, 5.5, 1.4, grey(0.85));
    dot(g2, 1444, 617, 2, grey(0.8));
  }
  function soft(g2, path, fill, blur = 0, alpha = 1) {
    const draw = (c) => {
      c.beginPath();
      path(c);
      c.fillStyle = fill;
      c.fill();
    };
    g2.save();
    g2.globalAlpha = alpha;
    if (blur && path.bb) blurDraw(g2, path.bb, blur, draw);
    else {
      if (blur) g2.filter = `blur(${blur}px)`;
      draw(g2);
    }
    g2.restore();
  }
  var pth = (pts, smooth = true) => Object.assign((g2) => {
    if (smooth) smoothPath(g2, pts, true);
    else {
      g2.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) g2.lineTo(p[0], p[1]);
      g2.closePath();
    }
  }, { bb: bboxOf(pts, 4) });
  var lg = (g2, x0, y0, x1, y1, stops) => {
    const r = g2.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, v]) => r.addColorStop(o, typeof v === "number" ? grey(v) : v));
    return r;
  };
  var rg = (g2, x, y, r0, r1, stops, sy = 1) => {
    const r = g2.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([o, v]) => r.addColorStop(o, typeof v === "number" ? grey(v) : v));
    return r;
  };
  function pants(g2) {
    const v = valCtx();
    v.fillStyle = "#000";
    v.fillRect(0, 0, PW, PH);
    const L = [[929, 548], [1030, 548], [1048, 600], [1056, 640], [1060, 706], [1066, 745], [1062, 772], [1020, 778], [975, 772], [935, 772], [928, 755], [924, 700], [926, 625]];
    const R = [[1135, 548], [1250, 550], [1272, 590], [1282, 630], [1285, 687], [1270, 735], [1256, 760], [1250, 772], [1210, 777], [1170, 772], [1131, 774], [1129, 762], [1135, 706], [1141, 625]];
    const legs = [
      {
        pts: L,
        box: [920, 550, 1070, 780],
        seed: 1500,
        hi: [[[940, 567], [952, 600], [967, 631], [982, 660], [995, 690], [1013, 731]], [[958, 558], [980, 590], [999, 617], [1014, 645], [1026, 672], [1045, 713]], [[933, 610], [935, 645], [940, 676], [948, 705], [958, 731]], [[995, 700], [1020, 705], [1045, 725]], [[1005, 570], [1015, 600], [1025, 630]]],
        lo: [[[972, 595], [988, 630], [1004, 667], [1015, 695], [1026, 722]], [[945, 676], [958, 705], [972, 731]], [[990, 560], [1e3, 585]], [[1030, 640], [1040, 670], [1050, 700]]]
      },
      {
        pts: R,
        box: [1115, 555, 1290, 780],
        seed: 1520,
        hi: [[[1244, 576], [1226, 604], [1208, 631], [1195, 658], [1181, 685], [1154, 731]], [[1217, 567], [1204, 595], [1190, 622], [1176, 650], [1163, 676]], [[1276, 608], [1276, 640], [1272, 676], [1265, 705], [1254, 731]], [[1175, 700], [1160, 715], [1140, 730]]],
        lo: [[[1235, 590], [1226, 606], [1212, 631], [1199, 658], [1185, 690], [1172, 713]], [[1258, 640], [1252, 680], [1240, 715]], [[1200, 570], [1190, 590]]]
      }
    ];
    for (const leg of legs) {
      const r = rng(leg.seed);
      vFill(v, leg.pts, lg(v, 0, 556, 0, 775, [[0, 0.12], [0.25, 0.28], [0.75, 0.33], [1, 0.28]]), { smooth: false });
      v.save();
      polyPath(v, leg.pts);
      v.clip();
      for (const f2 of leg.hi) {
        vLine(v, f2, 11, 0.55, 4);
        vLine(v, f2, 4, 0.9, 1.5);
      }
      for (const f2 of leg.lo) vLine(v, f2, 8, 0.03, 2.5);
      const [bx0, , bx1] = leg.box;
      for (let i = 0; i < 4; i++) {
        const y = 740 + i * 9 + r() * 3;
        vLine(v, [[bx0, y + 3], [lerp(bx0, bx1, 0.3), y - 3], [lerp(bx0, bx1, 0.65), y + 3], [bx1, y - 2]], 4.5, i % 2 ? 0.92 : 0.06, 1.5);
      }
      v.restore();
      const fieldCurves = [...leg.hi, ...leg.lo];
      const f = curveField(fieldCurves, leg.box);
      hatch2(g2, leg.pts, { ang: (x, y) => f(x, y) + 0.1 * noise2(x / 24, y / 24, leg.seed), per: 2.6, seed: leg.seed + 1, smooth: false, baseV: 0.2, gamma: 1.15, brk: 0.15, wn: 0.5, lum: 0.88 });
      for (const [i, c] of leg.lo.entries()) curve(g2, c, 2.2, BLK, { seed: leg.seed + 10 + i, ends: 0.1 });
      curve(g2, leg.pts, 1.6, BLK, { closed: true, seed: leg.seed + 30, ends: 0.9 });
    }
    const flap = [[1249, 567], [1276, 599], [1285, 640], [1281, 667], [1262, 655], [1252, 610]];
    vFill(v, flap, lg(v, 1249, 567, 1285, 667, [[0, 0.95], [1, 0.35]]), { smooth: false });
    hatch2(g2, flap, { ang: 1.75, per: 3.2, seed: 1541, smooth: false });
    ink(g2, flap, 1.4, BLK, { closed: true, seed: 1540 });
    stripes(g2, [[1040, 649], [1145, 649], [1145, 667], [1040, 667]], { per: 4.2, cov: 0.7, lum: 0.85, seed: 1541 });
    fillPoly(g2, [[1072, 668], [1090, 668], [1088, 767], [1074, 767]], grey(0.08));
  }
  function shoe(g2, cx, m, k, seed) {
    const X = (x) => cx + (x - 982) * m * k;
    const P = (pts) => pts.map(([x, y]) => [X(x), y]);
    const v = valCtx();
    const up = P([[931, 848], [934, 812], [955, 792], [990, 785], [1025, 789], [1050, 804], [1058, 845]]);
    vFill(v, up, rg(v, X(990), 800, 5, 70, [[0, 0.24], [1, 0.08]]));
    hatch2(g2, up, { ang: m > 0 ? 1.9 : PI - 1.9, per: 2.4, seed, lum: 0.8, baseV: 0.12, wn: 0.5 });
    curve(g2, up, 1.6, BLK, { closed: true, seed: seed + 1, ends: 0.9 });
    fillBlob(g2, P([[973, 771], [1007, 771], [1008, 790], [972, 790]]), grey(0.4));
    fillBlob(g2, P([[982, 777], [1e3, 777], [1e3, 783], [982, 783]]), grey(0.9));
    const lw = grey(0.96);
    curve(g2, P([[988, 800], [970, 792], [952, 795], [962, 806], [985, 803]]), 2.4, lw, { seed: seed + 2 });
    curve(g2, P([[990, 800], [1005, 793], [1020, 800], [1012, 814], [992, 804]]), 2.4, lw, { seed: seed + 3 });
    curve(g2, P([[986, 804], [975, 815], [966, 823]]), 2.2, lw, { seed: seed + 4 });
    curve(g2, P([[990, 804], [1e3, 818], [1004, 828]]), 2.2, lw, { seed: seed + 5 });
    for (let i = 0; i < 3; i++) curve(g2, P([[944 + i * 4, 812 + i * 7], [965, 808 + i * 7], [990, 812 + i * 6]]), 2.2, lw, { seed: seed + 6 + i });
    const toe = P([[905, 853], [913, 830], [940, 820], [975, 822], [988, 842], [965, 852]]);
    vFill(v, toe, lg(v, X(905), 820, X(990), 850, [[0, 0.95], [1, 0.7]]));
    hatch2(g2, toe, { ang: m > 0 ? 0.35 : PI - 0.35, per: 2.2, seed: seed + 10, baseV: 0.3, lum: 0.9 });
    curve(g2, toe, 1.4, BLK, { closed: true, seed: seed + 11, ends: 0.9 });
    const sole = P([[900, 850], [1060, 843], [1063, 866], [1050, 874], [1e3, 876], [905, 877], [897, 864]]);
    vFill(v, sole, lg(v, 0, 845, 0, 877, [[0, 0.9], [0.6, 0.75], [1, 0.45]]), { smooth: false });
    hatch2(g2, sole, { ang: PI / 2, per: 3.4, seed: seed + 12, smooth: false });
    ink(g2, P([[901, 851], [1061, 845]]), 1.8, BLK, { seed: seed + 13 });
    for (let i = 0; i < 15; i++) {
      const x = lerp(906, 1056, i / 14);
      ink(g2, P([[x, 866], [x, 877]]), 1.8, grey(0.05, 0.85), { seed: seed + 14 + i });
    }
    ink(g2, sole, 1.4, BLK, { closed: true, seed: seed + 30 });
    const hem = P([[943, 757], [1062, 760], [1066, 800], [1040, 793], [1e3, 786], [965, 780], [945, 772]]);
    vFill(v, hem, lg(v, 0, 757, 0, 800, [[0, 0.9], [0.5, 0.55], [1, 0.8]]));
    hatch2(g2, hem, { ang: m > 0 ? 0.5 : PI - 0.5, per: 2.6, seed: seed + 31, baseV: 0.2, wn: 0.5 });
    curve(g2, hem, 1.4, BLK, { closed: true, seed: seed + 32, ends: 0.9 });
  }
  function torso(g2) {
    const T = [[921, 525], [922, 470], [926, 446], [936, 418], [950, 399], [972, 386], [1e3, 377], [1060, 373], [1127, 375], [1160, 381], [1190, 395], [1207, 414], [1216, 440], [1230, 461], [1242, 476], [1250, 492], [1250, 522]];
    fillBlob(g2, T, grey(0.25));
    g2.save();
    g2.beginPath();
    smoothPath(g2, T, true);
    g2.clip();
    soft(g2, pth(T), rg(g2, 1065, 450, 15, 215, [[0, 0.97], [0.3, 0.88], [0.6, 0.72], [1, 0.5]]));
    soft(g2, pth([[921, 430], [948, 398], [985, 390], [990, 440], [962, 520], [921, 520]]), grey(0.55), 12, 0.8);
    soft(g2, pth([[1175, 395], [1215, 420], [1252, 500], [1215, 522], [1180, 470]]), grey(0.6), 10, 0.8);
    soft(g2, pth([[1150, 445], [1185, 455], [1200, 485], [1165, 488]]), grey(0.55), 7, 0.6);
    const sf = [
      [[1004, 380], [1010, 405], [1020, 428], [1032, 440]],
      [[1130, 380], [1134, 408], [1140, 430], [1146, 446]],
      [[952, 425], [958, 460], [962, 500]],
      [[1180, 425], [1195, 455], [1206, 478]],
      [[1155, 455], [1168, 480], [1176, 505]],
      [[1212, 442], [1228, 468], [1242, 490]],
      [[938, 460], [944, 505]],
      [[1118, 470], [1142, 488], [1172, 498]],
      [[1210, 486], [1182, 494], [1152, 500]],
      [[1090, 460], [1105, 490], [1112, 515]]
    ];
    for (const f of sf) blurDraw(g2, bboxOf(f, 6), 2.2, (c) => curve(c, f, 4.5, grey(0.4, 0.75), { seed: 7, ends: 0.2, jit: 0 }));
    soft(g2, pth([[1036, 392], [1104, 392], [1100, 452], [1040, 452]]), grey(1), 6, 0.7);
    g2.restore();
    curve(g2, [[1036, 380], [1044, 405], [1054, 430]], 1.6, grey(0.25, 0.8), { seed: 1620 });
    curve(g2, [[1102, 378], [1098, 402], [1090, 428]], 1.6, grey(0.25, 0.8), { seed: 1621 });
    const inkF = [
      [[1104, 378], [1112, 400], [1122, 425], [1130, 445]],
      [[1138, 420], [1148, 440], [1152, 452]],
      [[1e3, 380], [1006, 402]],
      [[1180, 430], [1196, 460], [1206, 480]],
      [[1215, 445], [1232, 470], [1244, 490]],
      [[1150, 470], [1172, 482], [1192, 488]]
    ];
    for (const [i, f] of inkF.entries()) curve(g2, f, 1.3, grey(0.25, 0.75), { seed: 1610 + i, ends: 0.15 });
    const arm = [[1112, 506], [1150, 494], [1195, 486], [1236, 480], [1250, 494], [1246, 522], [1112, 522]];
    soft(g2, pth(arm, false), lg(g2, 0, 482, 0, 522, [[0, 0.95], [1, 0.74]]));
    curve(g2, [[1115, 506], [1150, 495], [1195, 487], [1236, 480]], 1.4, grey(0.25, 0.8), { seed: 1609 });
    curve(g2, T.slice(0, -1), 2, grey(0.1), { seed: 1611, ends: 0.8 });
    fillPoly(g2, [[908, 520], [915, 494], [926, 487], [931, 520]], grey(0.86));
    g2.save();
    g2.globalCompositeOperation = "lighter";
    g2.translate(1075, 440);
    g2.scale(1, 110 / 190);
    const hr = g2.createRadialGradient(0, 0, 0, 0, 0, 230);
    hr.addColorStop(0, grey(0.06));
    hr.addColorStop(0.6, grey(0.035));
    hr.addColorStop(1, grey(0));
    g2.fillStyle = hr;
    g2.beginPath();
    g2.arc(0, 0, 230, 0, PI * 2);
    g2.fill();
    g2.restore();
  }
  function head(g2, gaze) {
    const down = gaze !== "owl";
    soft(g2, pth([[1048, 364], [1096, 364], [1099, 404], [1072, 414], [1045, 404]]), lg(g2, 0, 364, 0, 412, [[0, 0.2], [0.45, 0.42], [1, 0.8]]));
    curve(g2, [[1050, 372], [1048, 392], [1046, 404]], 1.2, grey(0.2, 0.7), { seed: 1699 });
    curve(g2, [[1094, 372], [1096, 392], [1098, 404]], 1.2, grey(0.2, 0.7), { seed: 1698 });
    curve(g2, [[1006, 386], [1030, 366], [1070, 360], [1110, 366], [1134, 386]], 4, grey(0.06), { seed: 1700 });
    for (const [cx, cy, a, sd] of [[1021, 404, 0.12, -1], [1115, 398, -0.12, 1]]) {
      g2.save();
      g2.translate(cx, cy);
      g2.rotate(a);
      soft(g2, E(0, 0, 16, 31, 0), grey(0.05));
      for (let k = 0; k < 6; k++) {
        g2.strokeStyle = grey(k % 2 ? 0.2 : 0.8, 0.9);
        g2.lineWidth = 1.5;
        g2.beginPath();
        g2.ellipse(sd * k * 0.8, 0, 14 - k * 2, 29 - k * 4, 0, 0, PI * 2);
        g2.stroke();
      }
      g2.strokeStyle = grey(0.95);
      g2.lineWidth = 2.2;
      g2.beginPath();
      g2.ellipse(0, 0, 16, 31, 0, sd < 0 ? -2.4 : -0.7, sd < 0 ? 0.7 : 2.4);
      g2.stroke();
      g2.restore();
    }
    const hairBack = [[996, 262], [992, 296], [995, 330], [1003, 352], [1014, 362], [1026, 350], [1040, 320], [1070, 300], [1100, 320], [1114, 352], [1128, 364], [1140, 352], [1148, 326], [1150, 296], [1148, 264], [1070, 245]];
    fillBlob(g2, hairBack, grey(0.02));
    const F2 = [[1016, 272], [1014, 300], [1017, 324], [1023, 343], [1034, 358], [1050, 369], [1066, 375], [1078, 376], [1092, 371], [1106, 360], [1117, 344], [1124, 324], [1127, 300], [1126, 272], [1070, 258]];
    fillBlob(g2, F2, grey(0.5));
    g2.save();
    g2.beginPath();
    smoothPath(g2, F2, true);
    g2.clip();
    soft(g2, pth(F2), rg(g2, 1066, 332, 6, 68, [[0, 0.98], [0.5, 0.94], [0.8, 0.84], [1, 0.66]]));
    soft(g2, Rc(1e3, 252, 150, 20), grey(0.45), 5, 0.85);
    soft(g2, pth([[1104, 290], [1127, 286], [1128, 330], [1112, 352], [1104, 330]]), grey(0.5), 6, 0.8);
    soft(g2, pth([[1014, 296], [1026, 296], [1030, 340], [1020, 334]]), grey(0.62), 5, 0.7);
    soft(g2, pth([[1096, 318], [1112, 312], [1110, 346], [1098, 340]]), grey(0.68), 5, 0.6);
    for (const x of [1037, 1101]) {
      soft(g2, E(x, 283, 23, 10, 0), grey(0.56), 3.5, 0.75);
      soft(g2, E(x, 296.5, 17, 4.6, 0), grey(0.28), 2.6, 0.8);
    }
    soft(g2, pth([[1052, 298], [1059, 298], [1060, 322], [1053, 320]]), grey(0.7), 2.2, 0.6);
    soft(g2, pth([[1080, 300], [1087, 304], [1088, 326], [1080, 324]]), grey(0.6), 2.4, 0.75);
    soft(g2, E(1072, 334, 14, 3.4, 0), grey(0.5), 2, 0.85);
    soft(g2, E(1073, 356, 16, 4, 0), grey(0.6), 2.2, 0.8);
    soft(g2, E(1072, 377, 38, 8, 0), grey(0.42), 5, 0.85);
    const v = valCtx();
    v.fillStyle = "#fff";
    v.fillRect(1e3, 250, 140, 130);
    vFill(v, [[1104, 290], [1127, 286], [1128, 330], [1112, 352], [1104, 330]], 0.5, { blur: 5 });
    vFill(v, [[1014, 296], [1026, 296], [1030, 340], [1020, 334]], 0.6, { blur: 5 });
    vFill(v, [[1e3, 250], [1140, 250], [1140, 272], [1e3, 272]], 0.5, { blur: 5, smooth: false });
    vFill(v, [[1030, 360], [1112, 358], [1112, 380], [1030, 380]], 0.55, { blur: 4, smooth: false });
    hatch2(g2, F2, { ang: 2.05, per: 2.2, seed: 1706, base: false, inv: true, lum: 0.2, alpha: 0.3, gamma: 1.5 });
    g2.restore();
    curve(g2, [[1015, 296], [1017, 324], [1023, 343], [1034, 358], [1050, 369], [1066, 375], [1078, 376], [1092, 371], [1106, 360], [1117, 344], [1124, 324], [1127, 300]], 1.2, grey(0.1), { seed: 1710, ends: 0.3 });
    const eyes = [[1021, 1054, 1037, down ? 1038.5 : 1030.5, 1720, -1], [1085, 1119, 1101, down ? 1102 : 1094, 1730, 1]];
    for (const [x0, x1, cx, ix, seed, side] of eyes) {
      const lid = down ? 1.6 : 0;
      const eye = [[x0, 286], [cx - 9, 281 + lid], [cx + 7, 280.5 + lid], [x1, 285], [cx + 7, 290.5], [cx - 7, 291]];
      fillBlob(g2, eye, grey(0.72));
      g2.save();
      g2.beginPath();
      smoothPath(g2, eye, true);
      g2.clip();
      soft(g2, E(cx + 6, 287, 9, 3, 0), grey(0.8), 2, 0.7);
      const iy = 285 + (down ? 1.6 : 0);
      dot(g2, ix, iy, 6.6, grey(0.2));
      dot(g2, ix, iy, 4.6, grey(0.08));
      dot(g2, ix, iy, 2.4, grey(0));
      dot(g2, ix - 1.8, iy - 2, 1.1, grey(0.9));
      soft(g2, Rc(x0, 276, x1 - x0, 6.5 + lid), grey(0.1), 1.4, 0.9);
      g2.restore();
      curve(g2, [[x0 - 3, 288], [cx - 10, 280.5 + lid], [cx + 6, 279.5 + lid], [x1 + 2.5, 285.5]], 3.4, grey(0.02), { seed, ends: 0.2 });
      const ox = side < 0 ? x0 : x1;
      for (let k = 0; k < 3; k++) ink(g2, [[ox - side * k * 2.5 - side * 1, 286.5 - k * 1.8], [ox - side * k * 2.5 + side * 3.5, 283 - k * 2.2]], 0.9, grey(0.05, 0.85), { seed: seed + 10 + k });
      curve(g2, [[x0 + 1, 276.5], [cx, 273.5], [x1 - 1, 277]], 1.1, grey(0.25, 0.8), { seed: seed + 1, ends: 0.3 });
      curve(g2, [[x0 + 2.5, 290], [cx, 292], [x1 - 3, 289.5]], 1.1, grey(0.2, 0.85), { seed: seed + 2 });
      curve(g2, [[x0 + 2, 295], [cx, 300], [x1 - 3, 295]], 1.2, grey(0.18, 0.7), { seed: seed + 3 });
    }
    curve(g2, [[1020, 270], [1036, 266], [1054, 267.5]], 3.2, grey(0.03), { seed: 1740, ends: 0.3 });
    curve(g2, [[1083, 267], [1101, 265.5], [1119, 269.5]], 3.2, grey(0.03), { seed: 1741, ends: 0.3 });
    curve(g2, [[1057, 298], [1057, 310], [1058, 320]], 1, grey(0.3, 0.6), { seed: 1742 });
    curve(g2, [[1059, 322], [1061, 328], [1066, 331], [1073, 331.5], [1079, 331], [1084, 328], [1086, 322]], 1.3, grey(0.22, 0.8), { seed: 1743 });
    soft(g2, E(1065.5, 329, 2.4, 1.4, 0.2), grey(0.12), 0.6, 0.9);
    soft(g2, E(1079.5, 329, 2.4, 1.4, -0.2), grey(0.12), 0.6, 0.9);
    curve(g2, [[1083, 310], [1086, 322]], 1, grey(0.3, 0.7), { seed: 1744 });
    curve(g2, [[1051, 348.5], [1061, 346.8], [1072, 347.6], [1083, 346.8], [1095, 349.5]], 2, grey(0.08), { seed: 1745, ends: 0.25 });
    curve(g2, [[1061, 343.3], [1072, 342.6], [1085, 343.3]], 0.9, grey(0.45, 0.5), { seed: 1746 });
    curve(g2, [[1060, 356], [1073, 357.5], [1087, 356]], 1.1, grey(0.35, 0.7), { seed: 1747 });
    for (const [x, y, l] of [[1032, 314, 6], [1104, 332, 5], [1106, 321, 4], [1046, 261, 3], [1094, 258, 3]]) {
      ink(g2, [[x, y], [x + 0.4, y + l]], 1.6, grey(0.25, 0.8), { seed: x });
      dot(g2, x + 0.4, y + l, 1.2, grey(0.95, 0.85));
    }
    const B2 = [[999, 272], [996, 244], [999, 212], [1009, 187], [1027, 170], [1052, 161], [1074, 159], [1096, 164], [1118, 178], [1134, 197], [1145, 222], [1149, 250], [1149, 275], [1146, 287], [1137, 275], [1124, 262], [1106, 253], [1081, 250], [1056, 252], [1031, 256], [1012, 262]];
    fillBlob(g2, B2, grey(0.2));
    g2.save();
    g2.beginPath();
    smoothPath(g2, B2, true);
    g2.clip();
    soft(g2, pth(B2), rg(g2, 1055, 175, 8, 125, [[0, 0.32], [0.5, 0.23], [1, 0.1]]));
    soft(g2, pth([[1110, 170], [1150, 200], [1150, 290], [1120, 262], [1110, 220]]), grey(0.1), 12, 0.6);
    soft(g2, pth([[994, 222], [1070, 214], [1150, 222], [1150, 240], [1070, 232], [994, 240]]), grey(0.33), 5, 0.6);
    const rb = rng(1750);
    for (let i = 0; i < 75; i++) {
      const x = 991 + i * 2.15 + rb() * 0.6, d = (x - 1070) / 80;
      const lite = rb() < 0.5;
      curve(g2, [[1070 + (x - 1070) * 0.45, 158 + d * d * 26], [x, 207]], 0.8, grey(lite ? 0.5 : 0.08, 0.18), { seed: 1751 + i, ends: 0.4 });
      ink(g2, [[x, 214], [x + d * 2, 292]], 0.85, grey(lite ? 0.48 : 0.08, 0.22), { seed: 1830 + i });
    }
    soft(g2, pth([[990, 205], [1070, 199], [1152, 207], [1152, 215], [1070, 209], [990, 216]]), grey(0.04), 1.5, 0.9);
    soft(g2, pth([[990, 250], [1070, 240], [1152, 250], [1152, 295], [990, 295]]), grey(0.1), 8, 0.6);
    g2.restore();
    curve(g2, [[996, 213], [1030, 207], [1068, 204.5], [1106, 206], [1146, 214]], 1.1, grey(0.45, 0.45), { seed: 1900 });
    curve(g2, B2, 1.2, grey(0.25, 0.8), { closed: true, seed: 1901, ends: 0.9 });
    const strand = (pts, w, col) => {
      const q = sampleCurve(pts, 8);
      taper(g2, q, (u) => w * Math.pow(1 - u, 0.85) + 0.3, col);
    };
    const rh = rng(1905);
    const fringe = [
      [1e3, 256],
      [1030, 252],
      [1070, 249],
      [1110, 252],
      [1140, 260],
      [1142, 272],
      [1128, 276],
      [1120, 270],
      [1108, 278],
      [1098, 268],
      [1086, 274],
      [1076, 266],
      [1066, 276],
      [1058, 266],
      [1048, 274],
      [1040, 266],
      [1030, 276],
      [1020, 268],
      [1008, 280],
      [1e3, 276]
    ];
    fillBlob(g2, fringe, grey(0.02));
    const locks = [
      [[1004, 262], [1008, 288], [1013, 312], [1012, 336], 10],
      [[1016, 262], [1022, 282], [1025, 300], 8],
      [[1027, 262], [1034, 276], [1038, 289], 7],
      [[1040, 260], [1047, 272], [1051, 284], 6],
      [[1050, 258], [1057, 276], [1056, 296], [1052, 308], 9],
      [[1062, 258], [1066, 274], [1064, 290], 6],
      [[1074, 258], [1082, 270], [1088, 280], 6],
      [[1088, 259], [1098, 270], [1104, 282], 6],
      [[1100, 262], [1111, 276], [1117, 292], 7],
      [[1113, 264], [1123, 283], [1127, 306], 9],
      [[1044, 260], [1040, 274], [1034, 283], 5],
      [[1068, 260], [1072, 280], [1070, 294], 4]
    ];
    for (const l of locks) {
      const w = l.pop();
      strand(l, w, grey(0.02));
      strand(l.map(([x, y], i) => [x + (rh() - 0.5) * 5 * i, y + (rh() - 0.3) * 3 * i]), w * 0.5, grey(0.02));
    }
    for (const side of [-1, 1]) for (let i = 0; i < 14; i++) {
      const x = side < 0 ? 1008 - rh() * 10 : 1128 + rh() * 10, y = 262 + rh() * 40, len = 26 + rh() * 40, out2 = (rh() - 0.1) * 18;
      strand([[x, y], [x + side * out2 * 0.3, y + len * 0.5], [x + side * out2, y + len]], 4 + rh() * 4, grey(0.02));
    }
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? 1 : -1, x = side < 0 ? 994 + rh() * 20 : 1128 + rh() * 20, y = 266 + rh() * 30;
      strand([[x, y], [x + side * 3, y + 20 + rh() * 12], [x + side * (6 + rh() * 10), y + 36 + rh() * 22]], 1 + rh() * 1.1, grey(0.3 + rh() * 0.25, 0.7));
    }
    for (let i = 0; i < 10; i++) {
      const x = 1012 + rh() * 115;
      strand([[x, 256], [x + (rh() - 0.5) * 8, 266 + rh() * 8]], 0.9, grey(0.35, 0.6));
    }
  }
  function laptop(g2) {
    const lid = [[914, 449], [1083, 449], [1112, 521], [898, 521]];
    fillPoly(g2, lid, "#050505");
    ink(g2, [[914, 449], [1083, 449]], 3.2, grey(0.95), { seed: 2001 });
    ink(g2, [[1083, 449], [1112, 521]], 2.4, grey(0.92), { seed: 2002 });
    ink(g2, [[914, 449], [898, 521]], 1.2, grey(0.5), { seed: 2003 });
    dot(g2, 1010, 491, 9.5, grey(0.97));
  }
  function deskTop(g2) {
    stripes(g2, [[770, 523], [1512, 522], [1512, 542], [770, 543]], { dir: "h", per: 3.2, cov: (u, v) => lerp(0.45, 0.8, Math.sin(PI * clamp2(u * 1.1 - 0.05))) * (1 - 0.3 * v), lum: 0.9, seed: 2010, brk: 0.3, wav: 0.4 });
    ink(g2, [[770, 523], [1512, 522]], 1.6, grey(0.97), { seed: 2011 });
    ink(g2, [[770, 543], [1512, 542]], 1.6, BLK, { seed: 2012 });
    fillPoly(g2, [[772, 544], [1510, 543], [1508, 556], [774, 557]], "#040404");
  }
  function mug(g2) {
    const body = [[818, 472], [870, 472], [866, 521], [822, 521]];
    soft(g2, pth(body, false), lg(g2, 818, 0, 870, 0, [[0, 0.6], [0.35, 0.97], [0.7, 0.93], [1, 0.7]]));
    for (let i = 0; i < 5; i++) ink(g2, [[826 + i * 9, 478], [827 + i * 9, 516]], 1, grey(0.5, 0.35), { seed: 2020 + i });
    ink(g2, [[818, 472], [822, 521], [866, 521], [870, 472]], 1.5, BLK, { seed: 2025 });
    g2.fillStyle = grey(0.85);
    g2.beginPath();
    g2.ellipse(844, 472, 26, 4.5, 0, 0, PI * 2);
    g2.fill();
    g2.fillStyle = grey(0.12);
    g2.beginPath();
    g2.ellipse(844, 473, 22, 3, 0, 0, PI * 2);
    g2.fill();
    g2.lineCap = "round";
    for (const [x, s] of [[818, -1], [870, 1]]) {
      g2.strokeStyle = grey(0.1);
      g2.lineWidth = 6;
      g2.beginPath();
      g2.ellipse(x, 500, 13, 14, 0, s < 0 ? PI * 0.5 : -PI * 0.5, s < 0 ? PI * 1.5 : PI * 0.5);
      g2.stroke();
      g2.strokeStyle = grey(0.9);
      g2.lineWidth = 3.4;
      g2.beginPath();
      g2.ellipse(x, 500, 13, 14, 0, s < 0 ? PI * 0.5 : -PI * 0.5, s < 0 ? PI * 1.5 : PI * 0.5);
      g2.stroke();
    }
    for (const [pts, seed] of [[[[841, 469], [830, 451], [837, 434], [829, 417], [821, 400], [830, 383]], 2030], [[[844, 466], [839, 446], [846, 426], [836, 411], [837, 391], [850, 371]], 2031]]) {
      blurDraw(g2, bboxOf(pts, 3), 0.7, (c) => curve(c, pts, 2.6, grey(0.8, 0.8), { seed, ends: 0.1 }));
    }
  }
  function lampAndGear(g2) {
    ink(g2, [[1426, 330], [1424, 424]], 2.2, grey(0.6), { seed: 2040 });
    ink(g2, [[1433, 318], [1497, 388]], 2.6, grey(0.72), { seed: 2041 });
    ink(g2, [[1440, 314], [1503, 382]], 1.6, grey(0.6), { seed: 2042 });
    ink(g2, [[1495, 394], [1472, 440]], 2.4, grey(0.62), { seed: 2043 });
    dot(g2, 1496, 392, 7, "#0b0b0b");
    ring(g2, 1496, 392, 6.5, 1.6, grey(0.85));
    dot(g2, 1496, 392, 2, grey(0.8));
    dot(g2, 1434, 318, 4.5, grey(0.7));
    const shade = [[1326, 329], [1358, 312], [1394, 293], [1419, 309], [1408, 339], [1397, 379]];
    soft(g2, pth(shade, false), lg(g2, 1330, 300, 1410, 370, [[0, 0.4], [0.45, 0.2], [1, 0.07]]));
    curve(g2, [[1340, 322], [1372, 305], [1400, 296]], 2.2, grey(0.8, 0.7), { seed: 2044 });
    ink(g2, shade, 1.4, BLK, { closed: true, seed: 2045 });
    fillPoly(g2, [[1394, 282], [1422, 294], [1419, 310], [1392, 298]], grey(0.55));
    ink(g2, [[1394, 282], [1422, 294], [1419, 310], [1392, 298]], 1.2, BLK, { closed: true, seed: 2046 });
    g2.save();
    g2.translate(1361, 354);
    g2.rotate(0.6);
    g2.fillStyle = grey(0.98);
    g2.beginPath();
    g2.ellipse(0, 0, 44, 15, 0, 0, PI * 2);
    g2.fill();
    g2.strokeStyle = grey(0.3);
    g2.lineWidth = 1.4;
    g2.beginPath();
    g2.ellipse(0, 0, 44, 15, 0, 0, PI * 2);
    g2.stroke();
    g2.fillStyle = grey(1);
    g2.beginPath();
    g2.ellipse(6, 1, 22, 8, 0, 0, PI * 2);
    g2.fill();
    g2.restore();
    for (const [x0, y0, x1, y1] of [[1300, 455, 1293, 418], [1307, 455, 1306, 420], [1314, 455, 1318, 416], [1320, 455, 1330, 424], [1326, 455, 1338, 432], [1303, 455, 1290, 430]]) ink(g2, [[x0, y0], [x1, y1]], 2.4, grey(0.85), { seed: x1 * 7 });
    const cup = [[1296, 453], [1331, 453], [1330, 500], [1297, 500]];
    stripes(g2, cup, { dir: "h", per: 3, cov: (u, v) => lerp(0.5, 0.95, Math.sin(PI * clamp2(u * 0.9 + 0.2))), lum: 0.9, seed: 2050, brk: 0.1 });
    ink(g2, cup, 1.3, BLK, { closed: true, seed: 2051 });
    book(g2, [[1236, 490], [1296, 488], [1297, 505], [1237, 506]], { seed: 2060 });
    book(g2, [[1232, 505], [1300, 504], [1301, 521], [1233, 522]], { seed: 2062 });
    book(g2, [[1360, 424], [1430, 422], [1432, 440], [1361, 441]], { seed: 2070 });
    stripes(g2, [[1348, 440], [1478, 438], [1480, 458], [1349, 459]], { dir: "h", per: 3, cov: 0.8, lum: 0.9, seed: 2072, brk: 0.2 });
    ink(g2, [[1348, 440], [1478, 438], [1480, 458], [1349, 459]], 1.3, BLK, { closed: true, seed: 2073 });
    const rx = [[1353, 459], [1486, 457], [1488, 522], [1353, 523]];
    stripes(g2, rx, { dir: "h", per: 3.4, cov: (u, v) => lerp(0.2, 0.1, u), lum: 0.55, seed: 2074, brk: 0.2 });
    ink(g2, rx, 1.4, grey(0.85), { closed: true, seed: 2075 });
    ink(g2, [[1353, 490], [1486, 489]], 1, grey(0.3), { seed: 2076 });
    for (const [x, r] of [[1365, 7], [1412, 8], [1435, 7]]) {
      dot(g2, x, 473, r, grey(0.1));
      ring(g2, x, 473, r, 1.6, grey(0.9));
      dot(g2, x - 1.5, 471, 1.6, grey(0.9));
    }
    fillPoly(g2, [[1380, 468], [1396, 468], [1396, 478], [1380, 478]], grey(0.6));
    fillPoly(g2, [[1455, 467], [1476, 467], [1476, 480], [1455, 480]], grey(0.85));
    ink(g2, [[1455, 467], [1476, 467], [1476, 480], [1455, 480]], 1.2, BLK, { closed: true, seed: 2077 });
    for (const x of [1367, 1388, 1414, 1435, 1466]) {
      dot(g2, x, 503, 6, grey(0.06));
      ring(g2, x, 503, 6.5, 1.5, grey(0.85));
    }
  }
  function cable(g2, pts, w = 5, seed = 1, lit = 0.75) {
    w *= 1.45;
    curve(g2, pts, w, "#030303", { seed, ends: 0.85 });
    curve(g2, pts.map(([x, y]) => [x - w * 0.2, y - w * 0.1]), Math.max(1.2, w * 0.26), grey(0.88, lit), { seed: seed + 1, ends: 0.4 });
  }
  function cables(g2) {
    cable(g2, [[922, 520], [912, 545], [904, 562], [900, 620], [897, 687], [879, 781], [854, 850], [826, 874], [790, 880]], 5.5, 2100);
    cable(g2, [[944, 520], [936, 548], [928, 600], [920, 660], [912, 720], [900, 770], [884, 812], [860, 846]], 5, 2102);
    cable(g2, [[926, 522], [934, 548], [952, 562]], 4, 2104);
    cable(g2, [[841, 794], [822, 850], [785, 875], [740, 884]], 4, 2106, 0.6);
    for (const [pts, w, sd] of [
      [[[1325, 520], [1318, 580], [1305, 670], [1300, 760], [1310, 850], [1330, 880]], 4.6, 2110],
      [[[1367, 509], [1372, 560], [1380, 600], [1390, 700], [1410, 800], [1440, 870]], 4.6, 2112],
      [[[1388, 509], [1395, 560], [1418, 620], [1440, 690], [1462, 760], [1476, 850]], 4.4, 2114],
      [[[1414, 509], [1420, 560], [1430, 620], [1438, 700], [1446, 790], [1452, 860]], 4.2, 2116],
      [[[1435, 509], [1446, 560], [1470, 620], [1480, 700], [1490, 830], [1500, 870]], 4.4, 2118],
      [[[1466, 509], [1476, 560], [1486, 620], [1496, 700]], 4.2, 2120],
      [[[1300, 525], [1290, 600], [1270, 690], [1262, 760]], 4, 2122],
      [[[1250, 525], [1258, 580], [1262, 640]], 3.6, 2124]
    ]) cable(g2, pts, w, sd);
    cable(g2, [[1500, 782], [1560, 752], [1620, 748], [1700, 758], [1760, 786], [1800, 800]], 4, 2130, 0.6);
    cable(g2, [[1280, 872], [1360, 884], [1440, 876], [1520, 888], [1600, 880], [1680, 890], [1760, 884]], 4.2, 2132, 0.5);
    cable(g2, [[1300, 860], [1380, 868], [1460, 860], [1540, 872]], 3.6, 2134, 0.45);
    cable(g2, [[520, 870], [600, 884], [680, 876], [760, 890], [840, 884], [900, 892]], 4.2, 2136, 0.5);
    cable(g2, [[600, 690], [612, 740], [604, 790], [590, 830]], 9, 2138, 0.8);
    cable(g2, [[420, 600], [440, 660], [470, 720], [500, 760], [530, 800], [560, 830]], 4, 2140);
    cable(g2, [[445, 600], [480, 650], [520, 690], [556, 720], [590, 760]], 3.8, 2142);
    cable(g2, [[477, 600], [500, 640], [530, 670], [560, 690]], 3.6, 2144);
    cable(g2, [[1650, 740], [1700, 780], [1750, 800], [1800, 830]], 3.6, 2146, 0.5);
  }
  function rightCentre(g2) {
    stripes(g2, [[1340, 703], [1520, 702], [1520, 712], [1340, 713]], { dir: "h", per: 2.8, cov: 0.9, lum: 0.9, seed: 2200 });
    stripes(g2, [[1340, 713], [1520, 712], [1520, 728], [1340, 729]], { dir: "h", per: 3, cov: 0.55, lum: 0.75, seed: 2201 });
    stripes(g2, [[1320, 742], [1525, 741], [1525, 768], [1320, 769]], { dir: "h", per: 3, cov: bl(0.8, 0.9, 0.6, 0.5), lum: 0.88, seed: 2202 });
    for (const x of [1360, 1510]) {
      stripes(g2, [[x, 769], [x + 15, 769], [x + 15, 852], [x, 852]], { per: 3, cov: ug(0.9, 0.4), lum: 0.9, seed: 2203 + x });
      for (const y of [780, 840]) ink(g2, [[x - 2, y], [x + 17, y]], 2, grey(0.85), { seed: y + x });
    }
    stripes(g2, [[1494, 550], [1612, 550], [1612, 565], [1494, 565]], { dir: "h", per: 2.8, cov: 0.85, lum: 0.92, seed: 2210 });
    stripes(g2, [[1494, 565], [1612, 565], [1612, 790], [1494, 790]], { per: 4.2, cov: fadeEdges(bl(0.6, 0.35, 0.25, 0.45), 0.01, 0.03), lum: 0.8, seed: 2211 });
    ink(g2, [[1494, 550], [1612, 550], [1612, 790], [1494, 790]], 1.6, BLK, { closed: true, seed: 2212 });
    driver(g2, 1553, 613, 15, "tweeter");
    driver(g2, 1550, 688, 47, "woofer");
    dot(g2, 1553, 770, 22, "#070707");
    ring(g2, 1553, 770, 22, 1.4, grey(0.5));
  }
  function darkBox(g2, pts, edge = 0.35, seed = 1) {
    stripes(g2, pts, { per: 5, cov: fadeEdges(bl(0.12, 0.08, 0.05, 0.08), 0.05, 0.05), lum: 0.5, seed });
    ink(g2, [pts[0], pts[1]], 1.3, grey(0.6, edge), { seed: seed + 1 });
  }
  function rightBack(g2) {
    stripes(g2, [[1822, 128], [1905, 118], [1905, 242], [1822, 246]], { per: 5, cov: fadeEdges(bl(0.35, 0.3, 0.3, 0.3), 0.02, 0.02), lum: 0.6, seed: 2300 });
    ink(g2, [[2090, 95], [2165, 95], [2165, 215]], 1.2, grey(0.3), { seed: 2301 });
    darkBox(g2, [[1722, 246], [1796, 250], [1798, 332], [1722, 332]], 0.4, 2302);
    darkBox(g2, [[1688, 330], [1800, 334], [1802, 420], [1688, 420]], 0.3, 2303);
    darkBox(g2, [[1726, 405], [1812, 413], [1812, 470], [1726, 470]], 0.7, 2304);
    stripes(g2, [[1800, 415], [1845, 418], [1845, 450], [1800, 450]], { per: 4, cov: 0.55, lum: 0.8, seed: 2305 });
    const S = [
      [[[1586, 287], [1720, 250], [1721, 330], [1587, 358]], 0.95, 2310],
      [[[1619, 354], [1687, 331], [1687, 418], [1620, 428]], 0.92, 2311],
      [[[1588, 437], [1725, 406], [1726, 552], [1588, 560]], 0.9, 2312]
    ];
    for (const [q, v, seed] of S) {
      stripes(g2, q, { per: 5, cov: fadeEdges(bl(v * 0.8, v * 0.68, v * 0.46, v * 0.56), 0.03, 0.03), lum: 0.92, seed });
      ink(g2, [q[0], q[1]], 1.8, grey(0.92), { seed: seed + 1 });
    }
    fillPoly(g2, [[1570, 360], [1604, 356], [1606, 450], [1572, 452]], grey(0.26));
    ink(g2, [[1570, 360], [1604, 356], [1606, 450], [1572, 452]], 1.4, grey(0.8), { closed: true, seed: 2314 });
    dot(g2, 1588, 408, 11, grey(0.12));
    ring(g2, 1588, 408, 11, 2, grey(0.85));
    ring(g2, 1588, 408, 6, 1.2, grey(0.6));
    for (const [cx, cy, rx, ry, a] of [[1650, 232, 20, 24, -0.2], [1695, 226, 17, 22, 0.25]]) {
      g2.save();
      g2.translate(cx, cy);
      g2.rotate(a);
      dot(g2, 0, 0, rx, "#070707");
      for (let k = 0; k < 4; k++) {
        g2.strokeStyle = grey(k % 2 ? 0.15 : 0.55);
        g2.lineWidth = 1.6;
        g2.beginPath();
        g2.ellipse(0, 0, rx - k * 3, ry - k * 3.5, 0, 0, PI * 2);
        g2.stroke();
      }
      g2.restore();
    }
    curve(g2, [[1628, 236], [1640, 212], [1672, 205], [1712, 210], [1735, 228]], 4, grey(0.35), { seed: 2316 });
    const r = rng(2320);
    for (let i = 0; i < 12; i++) {
      const x0 = 1745 + r() * 100, y0 = 245 + r() * 20, dx = (r() - 0.3) * 60;
      cable(g2, [[x0, y0], [x0 + dx * 0.3 + 10, y0 + 60 + r() * 20], [x0 + dx * 0.7, y0 + 120 + r() * 40], [x0 + dx, y0 + 170 + r() * 60]], 2.4 + r() * 1.6, 2321 + i, 0.55);
    }
    for (let i = 0; i < 3; i++) {
      g2.strokeStyle = grey(0.45, 0.7);
      g2.lineWidth = 2;
      g2.beginPath();
      g2.ellipse(1800 + i * 10, 330, 34 - i * 6, 56 - i * 8, 0.2, 0.2, 5.8);
      g2.stroke();
    }
    ink(g2, [[1780, 413], [1893, 413]], 1.4, grey(0.5), { seed: 2325 });
    stripes(g2, [[1880, 245], [1937, 225], [1938, 405], [1881, 408]], { per: 5, cov: fadeEdges(bl(0.85, 0.75, 0.55, 0.6), 0.03, 0.02), lum: 0.93, seed: 2330 });
    ink(g2, [[1880, 245], [1937, 225]], 1.6, grey(0.9), { seed: 2331 });
    stripes(g2, [[1932, 378], [2085, 330], [2086, 455], [1932, 487]], { per: 5, cov: fadeEdges(bl(0.95, 0.85, 0.72, 0.8), 0.02, 0), lum: 0.95, seed: 2332 });
    ink(g2, [[1932, 378], [2085, 330]], 1.8, grey(0.92), { seed: 2333 });
    stripes(g2, [[1932, 487], [2086, 455], [2087, 552], [1932, 556]], { per: 5, cov: fadeEdges(bl(0.85, 0.8, 0.6, 0.65), 0.02, 0), lum: 0.92, seed: 2334 });
    ink(g2, [[1932, 487], [2086, 455]], 1.6, BLK, { seed: 2335 });
    fillPoly(g2, [[1968, 356], [2010, 344], [2012, 356], [1970, 368]], grey(0.8));
    stripes(g2, [[2105, 335], [2155, 335], [2155, 356], [2105, 356]], { per: 4, cov: 0.4, lum: 0.7, seed: 2336 });
    stripes(g2, [[2130, 460], [2165, 460], [2165, 492], [2130, 492]], { per: 4, cov: 0.4, lum: 0.7, seed: 2337 });
    ink(g2, [[2060, 336], [2176, 334]], 2.4, grey(0.7), { seed: 2340 });
    const pot = [[2084, 288], [2150, 286], [2145, 332], [2090, 334]];
    stripes(g2, pot, { dir: "h", per: 3.4, cov: (u, v) => lerp(0.4, 0.95, Math.sin(PI * clamp2(u))), lum: 0.9, seed: 2341, brk: 0.2 });
    ink(g2, pot, 1.4, BLK, { closed: true, seed: 2342 });
    const RL = [
      [2095, 280, -1.75, 30],
      [2118, 276, -1.3, 30],
      [2140, 280, -0.8, 30],
      [2078, 282, -2.2, 28],
      [2160, 288, -0.3, 26],
      [2066, 272, -2.7, 28],
      [2102, 262, -1.6, 28],
      [2130, 258, -1.1, 26],
      [2150, 250, -0.7, 26],
      [2080, 256, -2.1, 28],
      [2050, 262, -2.6, 26],
      [2168, 270, 0.1, 22],
      [2030, 285, 2.9, 26],
      [2010, 300, 2.6, 24],
      [2040, 300, 1.9, 24],
      [2112, 240, -1.5, 22],
      [2155, 305, 0.6, 24]
    ];
    RL.forEach(([x, y, a, s], i) => leaf(g2, x, y, a, s, 0.66 + i % 3 * 0.08, 2350 + i * 3));
    curve(g2, [[2046, 300], [2040, 340], [2046, 380], [2040, 420], [2046, 450]], 1.1, grey(0.5, 0.6), { seed: 2349 });
    [[2040, 318, 2.6, 22], [2046, 340, 1, 22], [2040, 362, 2.2, 22], [2046, 385, 1.2, 22], [2040, 408, 2, 20], [2046, 430, 1.4, 20]].forEach(([x, y, a, s], i) => leaf(g2, x, y, a, s, 0.72, 2400 + i * 3));
  }
  function uprightSynth(g2) {
    fillPoly(g2, [[1560, 440], [1590, 440], [1590, 550], [1560, 550]], grey(0.12));
    for (let i = 0; i < 4; i++) {
      dot(g2, 1575, 455 + i * 24, 4, grey(0.08));
      ring(g2, 1575, 455 + i * 24, 4, 1.2, grey(0.7));
    }
    const TL = [1650, 488], TR = [1766, 445], BR = [1752, 760], BLc = [1632, 746];
    const Q = [TL, TR, BR, BLc], at = (u, v) => bil(Q, u, v);
    const quad = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
    fillPoly(g2, Q, "#060606");
    for (let i = 0; i < 12; i++) {
      const [x, y] = at(0.1, 0.06 + i * 0.078);
      g2.fillStyle = grey(0.88);
      g2.beginPath();
      g2.ellipse(x, y, 4.5, 2.6, 0, 0, PI * 2);
      g2.fill();
      dot(g2, x, y + 0.6, 1.4, grey(0.05));
    }
    stripes(g2, quad(0.2, 0.08, 0.42, 1), { per: 3.2, cov: 0.35, lum: 0.72, seed: 2502, brk: 0.2 });
    for (let i = 0; i < 16; i++) for (const uu of [0.26, 0.36]) {
      const [x, y] = at(uu, 0.1 + i * 0.056);
      dot(g2, x, y, 2.8, grey(0.05));
      ring(g2, x, y, 3, 0.9, grey(0.7));
    }
    stripes(g2, quad(0.35, 0, 0.98, 0.2), { dir: "h", per: 3, cov: 0.4, lum: 0.75, seed: 2503, brk: 0.2 });
    for (const [uu, vv] of [[0.48, 0.07], [0.72, 0.05], [0.52, 0.15], [0.78, 0.13]]) {
      const [x, y] = at(uu, vv);
      dot(g2, x, y, 7, grey(0.07));
      ring(g2, x, y, 7, 1.6, grey(0.85));
      dot(g2, x - 2, y - 2, 1.6, grey(0.9));
    }
    const k0 = 0.2, k1 = 0.99, nk = 20;
    fillPoly(g2, quad(0.46, k0, 0.9, k1), grey(0.95));
    for (let i = 0; i <= nk; i++) {
      const v = k0 + (k1 - k0) * (i / nk);
      ink(g2, [at(0.46, v), at(0.9, v)], 1.1, grey(0.12), { seed: 2510 + i, jit: 0.1 });
    }
    for (let i = 0; i < nk; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) {
      const v = k0 + (k1 - k0) * ((i + 0.7) / nk), h = (k1 - k0) * 0.6 / nk;
      fillPoly(g2, quad(0.46, v, 0.68, v + h), "#060606");
    }
    ink(g2, [at(0.9, 0.2), at(0.9, 1)], 2.4, grey(0.55), { seed: 2540 });
    ink(g2, [TR, BR], 2, grey(0.75), { seed: 2541 });
    ink(g2, [TL, TR], 2, grey(0.8), { seed: 2542 });
    fillPoly(g2, [[1592, 762], [1662, 760], [1664, 800], [1594, 802]], grey(0.22));
    ink(g2, [[1592, 762], [1662, 760], [1664, 800], [1594, 802]], 1.2, grey(0.7), { closed: true, seed: 2543 });
    dot(g2, 1620, 776, 8, grey(0.1));
    ring(g2, 1620, 776, 8, 1.4, grey(0.8));
    fillPoly(g2, [[1618, 800], [1682, 798], [1684, 842], [1620, 844]], grey(0.8));
    ink(g2, [[1618, 800], [1682, 798], [1684, 842], [1620, 844]], 1.3, BLK, { closed: true, seed: 2544 });
    fillPoly(g2, [[1632, 810], [1664, 809], [1664, 826], [1632, 827]], grey(0.2));
    stripes(g2, [[1682, 792], [1722, 792], [1722, 842], [1682, 842]], { per: 4.5, cov: 0.8, lum: 0.9, seed: 2545 });
    stripes(g2, [[1752, 830], [1778, 829], [1779, 860], [1753, 861]], { dir: "h", per: 3, cov: 0.9, lum: 0.95, seed: 2546 });
    dot(g2, 1761, 846, 2.6, grey(0.05));
    stripes(g2, [[1530, 862], [1600, 860], [1602, 878], [1532, 880]], { dir: "h", per: 3, cov: 0.9, lum: 0.9, seed: 2547 });
  }
  function metalBar(g2, a, b, w, seed) {
    ink(g2, [a, b], w, grey(0.9), { seed, jit: 0.2, ends: 0.95 });
    const n = [-(b[1] - a[1]), b[0] - a[0]], l = Math.hypot(n[0], n[1]);
    const off = (k) => [[a[0] + n[0] / l * k, a[1] + n[1] / l * k], [b[0] + n[0] / l * k, b[1] + n[1] / l * k]];
    ink(g2, off(-w * 0.28), w * 0.22, grey(1), { seed: seed + 1, jit: 0.2, ends: 0.95 });
    ink(g2, off(w * 0.12), w * 0.12, grey(0.3), { seed: seed + 2, jit: 0.2, ends: 0.95 });
    ink(g2, off(w * 0.42), w * 0.1, grey(0.2), { seed: seed + 3, jit: 0.2, ends: 0.95 });
  }
  function rightLow(g2) {
    const body = [[1797, 510], [1968, 516], [1992, 540], [1998, 600], [1990, 650], [1797, 654]];
    fillBlob(g2, body, "#050505");
    curve(g2, [[1968, 516], [1990, 536], [1998, 600], [1990, 650]], 2, grey(0.55), { seed: 2600 });
    metalBar(g2, [1800, 528], [1962, 535], 9, 2601);
    metalBar(g2, [1800, 587], [1962, 590], 12, 2602);
    metalBar(g2, [1807, 528], [1807, 652], 12, 2603);
    metalBar(g2, [1958, 535], [1958, 648], 9, 2604);
    fillPoly(g2, [[1850, 512], [1918, 513], [1918, 522], [1850, 521]], grey(0.7));
    ink(g2, [[1850, 512], [1918, 513]], 1.2, grey(0.95), { seed: 2605 });
    for (const [x, y] of [[1806, 530], [1960, 536]]) {
      fillPoly(g2, [[x - 11, y - 10], [x + 11, y - 10], [x + 11, y + 12], [x - 11, y + 12]], grey(0.78));
      ink(g2, [[x - 11, y - 10], [x + 11, y - 10], [x + 11, y + 12], [x - 11, y + 12]], 1.2, BLK, { closed: true, seed: x });
      dot(g2, x, y + 1, 2.8, "#111");
    }
    fillPoly(g2, [[1900, 570], [1933, 570], [1933, 612], [1900, 612]], grey(0.82));
    ink(g2, [[1900, 570], [1933, 570], [1933, 612], [1900, 612]], 1.6, BLK, { closed: true, seed: 2610 });
    fillPoly(g2, [[1907, 579], [1926, 579], [1926, 603], [1907, 603]], grey(0.3));
    const lid = [[1990, 550], [2082, 545], [2078, 650], [1996, 652]];
    stripes(g2, lid, { dir: "v", per: 3.5, cov: (u, v) => lerp(0.95, 0.72, v), lum: 0.97, seed: 2620, brk: 0.4 });
    ink(g2, lid, 1.4, BLK, { closed: true, seed: 2621 });
    stripes(g2, [[1776, 652], [1858, 650], [1860, 830], [1778, 832]], { per: 5, cov: fadeEdges(bl(0.8, 0.62, 0.42, 0.58), 0.01, 0.02), lum: 0.92, seed: 2630 });
    ink(g2, [[1776, 652], [1858, 650]], 1.6, grey(0.9), { seed: 2631 });
    for (let i = 0; i < 8; i++) {
      const y = 758 + i * 11.5, x0 = 1900 + i % 3 * 5, x1 = 2090 - i * 7 % 4 * 4;
      book(g2, [[x0, y], [x1, y - 1], [x1 + 2, y + 10], [x0 + 1, y + 11]], { seed: 2640 + i * 2, lum: 0.9 - i * 0.02 });
    }
    const bp = [[2022, 690], [2030, 650], [2052, 622], [2095, 610], [2135, 618], [2162, 648], [2176, 700], [2180, 770], [2172, 840], [2140, 862], [2062, 862], [2034, 836], [2024, 770]];
    fillBlob(g2, bp, grey(0.06));
    g2.save();
    g2.beginPath();
    smoothPath(g2, bp, true);
    g2.clip();
    const rb = rng(2650);
    for (let i = 0; i < 140; i++) {
      const x = 2022 + rb() * 158, y = 612 + rb() * 250, len = 10 + rb() * 20, a = -0.15 + rb() * 0.3;
      const lit = clamp2(1 - Math.abs(x - 2105) / 85) * 0.55 + 0.15;
      ink(g2, [[x, y], [x + Math.cos(a) * len, y + Math.sin(a) * len]], 1.2 + rb() * 1.4, grey(0.12 + lit * 0.45, 0.6), { seed: 2651 + i, ends: 0.3 });
    }
    g2.restore();
    const strap = (pts, w, seed) => {
      curve(g2, pts, w, grey(0.1), { seed, ends: 0.9 });
      curve(g2, pts.map(([x, y]) => [x - w * 0.18, y]), w * 0.5, grey(0.36), { seed: seed + 1, ends: 0.8 });
      curve(g2, pts.map(([x, y]) => [x - w * 0.28, y]), w * 0.14, grey(0.8, 0.85), { seed: seed + 2, ends: 0.6 });
      const q = sampleCurve(pts, 8);
      for (let i = 4; i < q.length - 2; i += 6) {
        const [x, y] = q[i];
        ink(g2, [[x - w * 0.45, y], [x + w * 0.45, y + 2]], 1.2, grey(0.05, 0.9), { seed: seed + i });
      }
    };
    strap([[2036, 700], [2040, 652], [2062, 630], [2090, 640], [2100, 700], [2104, 780], [2102, 850]], 22, 2660);
    strap([[2106, 640], [2120, 620], [2146, 628], [2160, 680], [2166, 760], [2160, 845]], 22, 2670);
    curve(g2, bp, 1.8, grey(0.55), { closed: true, seed: 2680, ends: 0.8 });
    fillPoly(g2, [[2130, 455], [2175, 455], [2175, 490], [2130, 490]], grey(0.3));
  }
  function floor(g2) {
    const r = rng(2700);
    g2.save();
    g2.beginPath();
    g2.rect(0, 856, PW, PH - 856);
    g2.clip();
    for (let i = -40; i <= 40; i++) {
      const xt = 1080 + i * 24, xb = 1080 + i * 80;
      const a = clamp2(0.42 - Math.abs(i) * 9e-3) * (0.5 + r() * 0.7);
      ink(g2, [[xt, 856], [xb, 946]], 1 + r() * 1.8, grey(0.6, a), { seed: 2701 + i, jit: 1 });
    }
    g2.restore();
  }
  function roomLight(g2) {
    const c = document.createElement("canvas");
    c.width = Math.round(PW / 4);
    c.height = Math.round(PH / 4);
    const t = c.getContext("2d", { willReadFrequently: true });
    t.scale(0.25, 0.25);
    t.fillStyle = "#fff";
    t.fillRect(0, 0, PW, PH);
    t.save();
    t.translate(1e3, 470);
    t.scale(1, 0.55);
    const r = t.createRadialGradient(0, 0, 0, 0, 0, 1150);
    r.addColorStop(0, grey(1));
    r.addColorStop(0.36, grey(1));
    r.addColorStop(0.66, grey(0.82));
    r.addColorStop(0.88, grey(0.72));
    r.addColorStop(1, grey(0.7));
    t.fillStyle = r;
    t.fillRect(-1300, -1800, 2600, 3600);
    t.restore();
    const b = t.createLinearGradient(0, 780, 0, 946);
    b.addColorStop(0, "rgba(0,0,0,0)");
    b.addColorStop(1, "rgba(0,0,0,0.3)");
    t.fillStyle = b;
    t.fillRect(0, 780, PW, 166);
    g2.save();
    g2.globalCompositeOperation = "multiply";
    g2.imageSmoothingQuality = "low";
    g2.drawImage(c, 0, 0, PW, PH);
    g2.restore();
  }
  function paintSokoIll(g2, { gaze = "owl" } = {}) {
    const steps = [
      () => wallLight(g2),
      () => floor(g2),
      () => rightBack(g2),
      () => leftBack(g2),
      () => leftMid(g2),
      () => keyboardLeft(g2),
      () => guitarCase(g2),
      () => leftLow(g2),
      () => plantLeft(g2),
      () => speakerL(g2),
      () => crateAndBooks(g2),
      () => pedalboard(g2),
      () => doNotKnock(g2),
      () => uprightSynth(g2),
      () => rightLow(g2),
      () => rightCentre(g2),
      () => deskUnder(g2),
      () => roomLight(g2),
      () => pants(g2),
      () => shoe(g2, 982, 1, 1, 1560),
      () => shoe(g2, 1186, -1, 0.8, 1580),
      () => torso(g2),
      () => head(g2, gaze),
      () => laptop(g2),
      () => deskTop(g2),
      () => mug(g2),
      () => lampAndGear(g2),
      () => cables(g2)
    ];
    g2.fillStyle = "#000";
    g2.fillRect(0, 0, PW, PH);
    for (const f of steps) f();
  }
  var illCache = /* @__PURE__ */ new Map();
  function sokoIllCanvas({ gaze = "owl", scale = 1 } = {}) {
    const key = `${gaze}:${scale}`;
    if (illCache.has(key)) return illCache.get(key);
    const c = document.createElement("canvas");
    c.width = Math.round(PW * scale);
    c.height = Math.round(PH * scale);
    const g2 = c.getContext("2d", { willReadFrequently: true });
    g2.scale(scale, scale);
    paintSokoIll(g2, { gaze });
    const out2 = document.createElement("canvas");
    out2.width = c.width;
    out2.height = c.height;
    const og = out2.getContext("2d", { willReadFrequently: true });
    og.filter = `blur(${(0.55 * scale).toFixed(2)}px)`;
    og.drawImage(c, 0, 0);
    og.filter = "none";
    out2.__scale = scale;
    illCache.set(key, out2);
    return out2;
  }
  function releaseSokoIll() {
    illCache.clear();
  }

  // ../../src/lib/sites.js
  var font = (ctx, spec, stretch = "normal") => {
    ctx.font = spec;
    ctx.fontStretch = stretch;
  };
  var PAGE_W = 2206;
  var PAGE_H = 946;
  var SOKO_BG = "#030303";
  var HEADER = { x: 38, y: 62, w: 2110, h: 208 };
  var FRAMED = {
    x: 161.16,
    y: 132.76,
    sx: 0.8444,
    sy: 0.8462,
    w: PAGE_W * 0.8444,
    h: PAGE_H * 0.8462,
    screen: { x0: 144, y0: 128.5, x1: 2023, y1: 946 },
    glowRect: { x0: 137, y0: 121.5, x1: 2030, y1: 946 }
  };
  var toFramed = (px, py) => [FRAMED.x + FRAMED.sx * px, FRAMED.y + FRAMED.sy * py];
  var HEADER_FRAMED = (() => {
    const [x0, y0] = toFramed(HEADER.x, HEADER.y), [x1, y1] = toFramed(HEADER.x + HEADER.w, HEADER.y + HEADER.h);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  })();
  function headerTornPoints({ seed = 7, amp = 3.5, inset = 0 } = {}) {
    const r = rng(seed), pts = [];
    const x0 = HEADER.x - inset, y0 = HEADER.y - inset, x1 = HEADER.x + HEADER.w + inset, y1 = HEADER.y + HEADER.h + inset;
    const edge = (ax, ay, bx, by) => {
      const L = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(L / 24)), nx = -(by - ay) / L, ny = (bx - ax) / L;
      for (let i = 0; i < n; i++) {
        const t = (i + (i ? (r() - 0.5) * 0.5 : 0)) / n, j = i ? (r() - 0.5) * 2 * amp : 0;
        pts.push([ax + (bx - ax) * t + nx * j, ay + (by - ay) * t + ny * j]);
      }
    };
    edge(x0, y0, x1, y0);
    edge(x1, y0, x1, y1);
    edge(x1, y1, x0, y1);
    edge(x0, y1, x0, y0);
    return pts;
  }
  function headerTornPath(ctx, opts) {
    const p = headerTornPoints(opts);
    ctx.moveTo(p[0][0], p[0][1]);
    for (const q of p.slice(1)) ctx.lineTo(q[0], q[1]);
    ctx.closePath();
  }
  function drawHeaderHole(ctx, { seed = 7, rim = true, fill = "#070807" } = {}) {
    ctx.save();
    ctx.beginPath();
    headerTornPath(ctx, { seed });
    ctx.fillStyle = fill;
    ctx.fill();
    if (rim) {
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(236,236,230,0.93)";
      ctx.lineWidth = 4.5;
      ctx.stroke();
    }
    ctx.restore();
  }
  var NAV = [
    // icon x, label x, label, sub-label
    [1275, 1302, "objects", "IN 1 \xB7 instruments / tools / spares"],
    [1550, 1577, "radio", "IN 2 \xB7 live / archive / zine"],
    [1785, 1812, "store", "IN 3 \xB7 cart / offers / gift"],
    [2013, 2041, "index", "IN 4 \xB7 manuals / support"]
  ];
  function drawSokoRail(ctx) {
    ctx.save();
    ctx.fillStyle = "#e4e4e1";
    ctx.beginPath();
    ctx.arc(31, 26, 17, 0, Math.PI * 2);
    ctx.fill();
    roundRect(ctx, 46, 7.5, 18.5, 37.5, 2.2);
    ctx.fill();
    ctx.fillStyle = "#d8cf2a";
    ctx.fillRect(30.6, 13.5, 2.4, 8.5);
    font(ctx, "300 17.75px Geist");
    ctx.letterSpacing = "0.5px";
    ctx.fillStyle = "rgba(226,226,223,0.86)";
    ctx.fillText("s\u014Dko", 77, 23);
    ctx.fillText("objects", 77, 41.5);
    for (const [ix, lx, label, sub3] of NAV) {
      const g2 = ctx.createRadialGradient(ix, 25.5, 4, ix, 25.5, 16);
      g2.addColorStop(0, "rgba(90,92,92,0.9)");
      g2.addColorStop(0.55, "rgba(34,36,36,0.95)");
      g2.addColorStop(1, "rgba(10,10,10,0)");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(ix, 25.5, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120,122,122,0.55)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ix, 26, 12.5, 0.35, Math.PI - 0.35);
      ctx.stroke();
      ctx.fillStyle = "rgba(225,228,228,0.35)";
      ctx.beginPath();
      ctx.arc(ix, 25.5, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e2e5e6";
      ctx.beginPath();
      ctx.arc(ix, 25.5, 6.4, 0, Math.PI * 2);
      ctx.fill();
      font(ctx, "400 16.5px Geist");
      ctx.letterSpacing = "0.5px";
      ctx.fillStyle = "rgba(228,228,225,0.82)";
      ctx.fillText(label, lx, 24.5);
      font(ctx, "400 9.3px 'Geist Mono'");
      ctx.letterSpacing = "0px";
      ctx.fillStyle = "rgba(160,162,160,0.62)";
      ctx.fillText(sub3, lx + 1, 39.5);
    }
    ctx.fillStyle = "rgba(200,202,200,0.8)";
    ctx.beginPath();
    ctx.arc(2203, 26, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.letterSpacing = "0px";
    ctx.restore();
  }
  function drawSokoHeadline(ctx, { color = "#f1f0ec" } = {}) {
    ctx.save();
    font(ctx, "900 79px Archivo", "expanded");
    ctx.letterSpacing = "-1.75px";
    ctx.fillStyle = color;
    ctx.fillText("MIXING DOWN,", 64, 148);
    ctx.fillText("LATE AT NIGHT.", 64, 222);
    ctx.letterSpacing = "0px";
    ctx.restore();
  }
  function drawSokoCounter(ctx, { counter = "000.0" } = {}) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(1900, 158, 190, 8);
    ctx.fillStyle = "#1b1c14";
    ctx.fillRect(1900, 90, 190, 72);
    ctx.strokeStyle = "rgba(60,62,50,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(1900.5, 90.5, 189, 71);
    font(ctx, "400 49.25px 'Geist Mono'");
    ctx.letterSpacing = "1.75px";
    ctx.fillStyle = "#efebd6";
    ctx.shadowColor = "rgba(240,236,214,0.35)";
    ctx.shadowBlur = 6;
    ctx.fillText(counter, 1919, 147);
    ctx.shadowBlur = 0;
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#f5da0c";
    roundRect(ctx, 1904, 174.5, 47, 45, 5.5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, 1906, 176, 43, 8, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,252,230,0.85)";
    ctx.beginPath();
    ctx.moveTo(1921.5, 191);
    ctx.lineTo(1930, 196.5);
    ctx.lineTo(1921.5, 202);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function drawSokoPage(ctx, { header = true, hole = "torn", rail = true, ui = true, ill = true, gaze = "owl", counter = "000.0", scale = 1 } = {}) {
    ctx.save();
    ctx.fillStyle = SOKO_BG;
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    if (ill) ctx.drawImage(sokoIllCanvas({ gaze, scale }), 0, 0, PAGE_W, PAGE_H);
    if (ui) {
      drawSokoHeadline(ctx);
      drawSokoCounter(ctx, { counter });
    }
    if (rail) drawSokoRail(ctx);
    if (!header) drawHeaderHole(ctx, { rim: hole === "torn" });
    ctx.restore();
  }
  var SOKO_CACHE = /* @__PURE__ */ new Map();
  function sokoCached(key, w, h, scale, draw) {
    let c = SOKO_CACHE.get(key);
    if (!c) {
      c = document.createElement("canvas");
      c.width = Math.round(w * scale);
      c.height = Math.round(h * scale);
      const g2 = c.getContext("2d");
      g2.scale(scale, scale);
      draw(g2);
      c.__scale = scale;
      SOKO_CACHE.set(key, c);
    }
    return c;
  }
  function releaseSoko() {
    SOKO_CACHE.clear();
    releaseSokoIll();
  }
  function sokoPageCanvas(opts = {}) {
    const { header = true, hole = "torn", rail = true, ui = true, ill = true, gaze = "owl", counter = "000.0", scale = 1 } = opts;
    const key = `page:${header}:${hole}:${rail}:${ui}:${ill}:${gaze}:${counter}:${scale}`;
    return sokoCached(key, PAGE_W, PAGE_H, scale, (g2) => drawSokoPage(g2, { header, hole, rail, ui, ill, gaze, counter, scale }));
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ../../src/lib/owlInk.js
  var LINE = "#0f0e0d";
  var gv = (v, a = 1) => {
    const c = Math.round(clamp(v) * 255);
    return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`;
  };
  var V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
    mul: (a, k) => [a[0] * k, a[1] * k],
    len: (a) => Math.hypot(a[0], a[1]),
    nrm: (a) => {
      const l = Math.hypot(a[0], a[1]) || 1;
      return [a[0] / l, a[1] / l];
    },
    perp: (a) => [-a[1], a[0]],
    rot: (a, t) => {
      const c = Math.cos(t), s = Math.sin(t);
      return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
    },
    mix: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  };
  var { add, sub, mul, nrm, perp } = V;
  var TAU = Math.PI * 2;
  var blobPath2 = (pts) => (c) => smoothPath(c, pts, true);
  var PPU = 1;
  function setPPU(v) {
    PPU = v;
  }
  var MINW = 0.7;
  var wmin = (w) => Math.max(w, MINW / PPU);
  function ink2(g2, pts, w, color = LINE, { per = 6, end = 0.2, bias = 0.5, pow = 0.55 } = {}) {
    if (pts.length < 2) return;
    const q = sampleCurve(pts.length > 2 ? pts : [pts[0], pts[1]], pts.length > 2 ? per : 4);
    const W2 = wmin(w);
    taper(g2, q, (u) => {
      const k = Math.pow(Math.sin(Math.PI * clamp(u < bias ? u / bias * 0.5 : 0.5 + (u - bias) / (1 - bias) * 0.5)), pow);
      return W2 * (end + (1 - end) * k);
    }, color);
  }
  function flick(g2, p, dir, L, w, color, curve2 = 0.12) {
    const n = perp(dir);
    const q = [p, add(add(p, mul(dir, L * 0.5)), mul(n, L * curve2)), add(p, mul(dir, L))];
    const W2 = wmin(w);
    taper(g2, sampleCurve(q, 4), (u) => W2 * Math.pow(1 - u, 0.7) * Math.min(1, 0.35 + u * 5), color);
  }
  function walk(poly, step, seed, fn, { from = 0, to = 1, jitter = 0.6 } = {}) {
    const L = [0];
    for (let i2 = 1; i2 < poly.length; i2++) L.push(L[i2 - 1] + Math.hypot(poly[i2][0] - poly[i2 - 1][0], poly[i2][1] - poly[i2 - 1][1]));
    const total = L[L.length - 1];
    if (total <= 0) return;
    const r = rng(seed);
    let d = from * total + step * r(), i = 1;
    while (d < to * total) {
      while (i < L.length - 1 && L[i] < d) i++;
      const a = poly[i - 1], b = poly[i], f = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
      fn([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], nrm(sub(b, a)), d / total, r);
      d += step * (1 - jitter / 2 + jitter * r());
    }
  }
  function area(pts) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  }
  var inward = (t, cw) => cw ? [-t[1], t[0]] : [t[1], -t[0]];
  function rimHatch(g2, outline, o = {}) {
    const { light = [-0.55, -0.83], thr = 0.05, step = 4, len = 20, w = 1, color = gv(0.33, 0.55), flow = [0, 1], bend = 0.35, seed = 9, closed = true, from = 0, to = 1, density = 1 } = o;
    const poly = sampleCurve(outline, 6, closed);
    const cw = area(poly) > 0;
    const fl = nrm(flow);
    walk(poly, step, seed, (p, t, u, r) => {
      const n = inward(t, cw);
      const facing = n[0] * light[0] + n[1] * light[1];
      const k = (facing - thr) / (1 - thr);
      if (k <= 0 || r() > density * (0.25 + 0.75 * k)) return;
      const d = nrm(add(mul(n, 1 - bend), mul(fl, bend)));
      flick(g2, add(p, mul(n, 0.5 + r() * 2)), V.rot(d, (r() - 0.5) * 0.35), len * (0.35 + 0.9 * k) * (0.6 + 0.7 * r()), w * (0.7 + 0.6 * r()), color, (r() - 0.5) * 0.25);
    }, { from, to });
  }
  function plumage(g2, path, o = {}) {
    const { base = 0.97, shade = 0.8, light = [-0.55, -0.83], depth = 30, blur = 12, keep = null } = o;
    g2.save();
    g2.beginPath();
    path(g2);
    g2.clip();
    g2.fillStyle = gv(shade);
    g2.fill();
    g2.filter = `blur(${Math.max(0.4, blur * PPU).toFixed(2)}px)`;
    g2.fillStyle = gv(base);
    for (const off of keep ? [[light[0] * depth, light[1] * depth], [light[0] * depth * 0.4 + keep[0], light[1] * depth * 0.4 + keep[1]]] : [[light[0] * depth, light[1] * depth]]) {
      g2.save();
      g2.translate(off[0], off[1]);
      g2.beginPath();
      path(g2);
      g2.fill();
      g2.restore();
    }
    g2.filter = "none";
    g2.restore();
  }
  function softShade(g2, clipPath, shape, value, alpha, blur) {
    g2.save();
    g2.beginPath();
    clipPath(g2);
    g2.clip();
    g2.filter = `blur(${Math.max(0.4, blur * PPU).toFixed(2)}px)`;
    g2.fillStyle = gv(value, alpha);
    g2.beginPath();
    shape(g2);
    g2.fill();
    g2.filter = "none";
    g2.restore();
  }
  function screentone(canvas, { pitch = 4.2, amp = 0.2, white = 0.93, range = 0.3, x = 0, y = 0, w = canvas.width, h = canvas.height } = {}) {
    const g2 = canvas.getContext("2d");
    w = Math.min(w, canvas.width - x);
    h = Math.min(h, canvas.height - y);
    if (w <= 0 || h <= 0) return;
    const img = g2.getImageData(x, y, w, h), d = img.data;
    const k = 1 / (pitch * Math.SQRT2);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const o = (j * w + i) * 4;
        if (d[o + 3] < 8) continue;
        const L = d[o] / 255;
        if (L > white || L < 0.22) continue;
        const t = Math.min(1, (white - L) / range) * Math.min(1, (L - 0.22) / 0.2);
        const X = i + x, Y = j + y;
        const fa = Math.abs((X + Y) * k % 1 - 0.5) * 2, fb = Math.abs((X - Y + 8192) * k % 1 - 0.5) * 2;
        const m = Math.max(1 - Math.min(1, fa * 2.6), 1 - Math.min(1, fb * 2.6));
        const v = Math.max(0, Math.min(255, (L - amp * t * (m - 0.3)) * 255));
        d[o] = d[o + 1] = d[o + 2] = v;
      }
    }
    g2.putImageData(img, x, y);
  }
  function headGeom(h) {
    const { x = 0, y = 0, rx = 109, ry = 100, yaw = 0, pitch = 0, roll = 0, square = 2.6, jowl = 0.05 } = h;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const toFrame = (px, py) => [x + px * cr - py * sr, y + px * sr + py * cr];
    const P = (az, el, lift = 1) => {
      const nx = Math.sin(az) * Math.cos(el), ny = -Math.sin(el), nz = Math.cos(az) * Math.cos(el);
      const x1 = nx * Math.cos(yaw) + nz * Math.sin(yaw), z1 = -nx * Math.sin(yaw) + nz * Math.cos(yaw);
      const y2 = ny * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = ny * Math.sin(pitch) + z1 * Math.cos(pitch);
      const p = toFrame(x1 * rx * lift, y2 * ry * lift);
      return { x: p[0], y: p[1], nx: x1, ny: y2, nz: z2 };
    };
    const shape = (t) => {
      const c = Math.cos(t), s = Math.sin(t), n = s < 0 ? square : 2.15;
      let px = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx;
      const py = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry;
      if (s > 0) px *= 1 + jowl * Math.sin(Math.PI * s);
      return [px, py];
    };
    const out2 = [];
    const N = 56;
    for (let i = 0; i < N; i++) {
      const q = shape(i / N * TAU - Math.PI / 2);
      out2.push(toFrame(q[0], q[1]));
    }
    const at = (phi) => {
      const t = phi - Math.PI / 2, a = shape(t), b = shape(t + 0.01);
      const tan = V.rot(nrm(sub(b, a)), roll);
      return { p: toFrame(a[0], a[1]), n: [tan[1], -tan[0]] };
    };
    return { x, y, rx, ry, yaw, pitch, roll, P, out: out2, at, toFrame };
  }
  function bodyOutline(b) {
    const { x = 0, y = 0, a = 150, b: hb = 100, rot = 0, egg = 0, sag = 0 } = b;
    const pts = [];
    const N = 44;
    for (let i = 0; i < N; i++) {
      const t = i / N * TAU;
      let v = Math.sin(t) * hb * (1 - egg * Math.cos(t));
      if (v > 0) v *= 1 + sag * Math.sin(Math.PI * (0.5 + 0.5 * Math.cos(t)));
      pts.push(add([x, y], V.rot([Math.cos(t) * a, v], rot)));
    }
    return pts;
  }
  var EYE_STATES = {
    stare: { pupil: 0.8, lid: 0.2, curve: 0.35, slant: 0.35, lidW: 0.2, low: 0, ext: 0.22 },
    glare: { pupil: 0.82, lid: 0.34, curve: 0.2, slant: 0.34, lidW: 0.17, low: 0, ext: 0.1 },
    half: { pupil: 0.76, lid: 0.46, curve: 0.06, slant: 0, lidW: 0.15, low: 0, ext: 0 },
    angry: { pupil: 0.62, lid: 0.42, curve: 0, slant: 0.5, lidW: 0.18, low: 0.06, brow: 1, ext: 0 },
    smug: { pupil: 0.58, lid: 0.52, curve: -0.04, slant: 0.1, lidW: 0.16, low: 0.2, brow: 0.6, ext: 0 },
    sleepy: { pupil: 0.66, lid: 0.56, curve: 0.12, slant: -0.1, lidW: 0.13, low: 0.04, ext: 0 },
    wide: { pupil: 0.62, lid: 0, curve: 0.2, slant: 0.1, lidW: 0.1, low: 0, ext: 0 },
    startled: { pupil: 0.12, lid: 0, curve: 0.2, slant: 0, lidW: 0.07, low: 0, scale: 1.12, ext: 0 },
    closed: { closed: true }
  };
  function drawEye(g2, e) {
    const st = { ...EYE_STATES[e.state || "stare"] };
    for (const k of ["lid", "pupil", "slant", "curve", "brow", "low", "lidW", "ext", "peak"]) if (e[k] !== void 0) st[k] = e[k];
    const r = e.r * (st.scale || 1), side = e.side || 1, sx = e.sx ?? 1, outer = side > 0 ? 1 : -1;
    const PPU0 = PPU;
    PPU = PPU0 * r;
    const u = (w) => wmin(w / r);
    g2.save();
    g2.translate(e.x, e.y);
    g2.rotate(e.rot || 0);
    g2.scale(sx * r, r);
    g2.lineCap = "round";
    g2.lineJoin = "round";
    if (st.closed) {
      ink2(g2, [[-1.05, 0.02], [-0.45, 0.26], [0.15, 0.3], [0.65, 0.16], [1.05, -0.08]].map(([a, b]) => [a * outer, b]), u(4.4), LINE, { end: 0.1, bias: 0.45 });
      ink2(g2, [[1, -0.04], [1.18, -0.2]].map(([a, b]) => [a * outer, b]), u(1.6), LINE, { end: 0.1 });
      g2.globalAlpha = 0.3;
      ink2(g2, [[-0.95, -0.25], [-0.5, -0.75], [0.2, -0.9], [0.85, -0.55]], u(1.4), gv(0.35));
      g2.globalAlpha = 1;
      g2.restore();
      PPU = PPU0;
      return;
    }
    const ey = (x) => -1 + 2 * st.lid - st.curve * (1 - x * x) + st.slant * x * -side;
    const ext = st.ext ?? 0.22;
    const ringTop = (xx) => -Math.sqrt(Math.max(0, 1 - xx * xx));
    const topY = (xx) => Math.min(Math.sqrt(Math.max(0, 1 - xx * xx)), Math.max(ey(xx), ringTop(xx) - ext * (1 - xx * xx)));
    const xOut = outer * (st.outX ?? 0.94), xIn = -outer * 0.99;
    const N = 28;
    const lidPts = [];
    for (let i = 0; i <= N; i++) {
      const xx = xIn + (xOut - xIn) * i / N;
      lidPts.push([xx, topY(xx)]);
    }
    const opening = (c) => {
      c.moveTo(lidPts[0][0], lidPts[0][1]);
      for (const p of lidPts) c.lineTo(p[0], p[1]);
      const aO = Math.atan2(Math.max(lidPts[N][1], -0.99), lidPts[N][0]), aI = Math.atan2(Math.max(0, lidPts[0][1]), lidPts[0][0]);
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        let a;
        if (outer > 0) {
          const A0 = aO, A1 = aI + (aI < A0 ? TAU : 0);
          a = A0 + (A1 - A0) * i / steps;
        } else {
          const A0 = aO, A1 = aI - (aI > A0 ? TAU : 0);
          a = A0 + (A1 - A0) * i / steps;
        }
        c.lineTo(Math.cos(a), Math.sin(a));
      }
      c.closePath();
    };
    g2.fillStyle = gv(0.97);
    g2.beginPath();
    opening(g2);
    g2.fill();
    const pr = st.pupil, look = e.look || [0, 0];
    const px = look[0] * (1 - pr) * 0.95, py = look[1] * (1 - pr) * 0.95;
    g2.save();
    g2.beginPath();
    opening(g2);
    g2.clip();
    g2.fillStyle = "#060606";
    g2.beginPath();
    g2.arc(px, py, pr, 0, TAU);
    g2.fill();
    if (st.scale) {
      g2.strokeStyle = LINE;
      g2.lineWidth = u(1.1);
      g2.beginPath();
      g2.arc(px, py, pr * 1.9, 0, TAU);
      g2.stroke();
      g2.fillStyle = gv(0.97);
      g2.beginPath();
      g2.arc(px - pr * 0.3, py - pr * 0.3, pr * 0.3, 0, TAU);
      g2.fill();
    }
    if (st.low > 0) {
      g2.fillStyle = gv(e.plumage ?? 0.95);
      g2.fillRect(-1.3, 1 - 2 * st.low, 2.6, 2 * st.low + 0.4);
    }
    g2.restore();
    const arcPts = (a0, a1, rr, n = 20) => {
      const q = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * i / n;
        q.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      return q;
    };
    const rw = u(e.ringW ?? 2.3);
    const aOut = Math.atan2(lidPts[N][1], lidPts[N][0]);
    const rimPts = outer > 0 ? arcPts(aOut, Math.PI + 0.05, 1, 34) : arcPts(aOut < 0 ? aOut + TAU : aOut, -0.05, 1, 34);
    taper(g2, rimPts, (t) => rw * (0.45 + 0.95 * Math.pow(Math.sin(Math.PI * t), 1.3)), LINE);
    if (!st.scale) taper(g2, arcPts(0.55, 1.65, 0.9, 14).map(([a, b]) => [-a * outer, b]), (t) => rw * 0.45 * Math.sin(Math.PI * t), LINE);
    const p0 = lidPts[0], p1 = lidPts[N], q1 = lidPts[N - 3];
    const td = nrm(sub(p1, q1));
    const seq = [[p0[0] - outer * 0.17, p0[1] + 0.1], ...lidPts, add(p1, add(mul(td, 0.1), [0, -0.06])), add(p1, add(mul(td, 0.2), [outer * 0.06, -0.2]))];
    const pk = st.peak ?? 0.45;
    taper(g2, seq, (t) => {
      const k = t < pk ? Math.pow(t / pk, 0.8) : t > 0.86 ? Math.pow(Math.max(0, (1 - t) / 0.14), 0.8) : 1 - 0.3 * (t - pk) / (0.86 - pk);
      return st.lidW * (0.05 + 0.95 * k) + u(0.35);
    }, "#070707");
    if (st.low > 0) ink2(g2, [[-0.9, 1 - 2 * st.low + 0.12], [0, 1 - 2 * st.low - 0.02], [0.9, 1 - 2 * st.low + 0.12]], u(1.8), LINE, { end: 0.1 });
    g2.restore();
    PPU = PPU0;
    if (st.brow) {
      g2.save();
      g2.translate(e.x, e.y);
      g2.rotate(e.rot || 0);
      const b = st.brow, inner = -side;
      const y0 = -r * (1.25 - 0.2 * b), yIn = y0 + r * 0.5 * b * (st.slant > 0.2 ? 1 : 0.3);
      ink2(g2, [[-inner * r * 1.05 * sx, y0 - r * 0.08], [0, y0 + (yIn - y0) * 0.4], [inner * r * 0.95 * sx, yIn]], r * 0.14 * b + 1.2, LINE, { end: 0.25, bias: 0.6 });
      g2.restore();
    }
  }
  function drawBeak(g2, b) {
    const { x, y, w = 30, l = 40, rot = 0, turn = 0, open = 0, smirk = 0 } = b;
    g2.save();
    g2.translate(x, y);
    g2.rotate(rot);
    const k = clamp(turn, -1, 1);
    const tip = [w * 0.05 + k * w * 0.05, l];
    const Lft = [[-w * 0.48, l * 0.02], [-w * 0.53, l * 0.3], [-w * 0.38, l * 0.68], tip];
    const Rt = [tip, [w * 0.22, l * 0.76], [w * 0.46, l * 0.44], [w * 0.5, l * 0.12], [w * 0.3, -l * 0.04], [-w * 0.05, -l * 0.06]];
    const path = blobPath2([...Lft, ...Rt.slice(1)]);
    g2.save();
    g2.beginPath();
    path(g2);
    g2.clip();
    g2.fillStyle = gv(0.86);
    g2.fill();
    g2.filter = `blur(${Math.max(0.4, w * 0.1 * PPU).toFixed(2)}px)`;
    g2.fillStyle = gv(0.58, 0.85);
    g2.beginPath();
    g2.ellipse(w * 0.42, l * 0.6, w * 0.3, l * 0.32, -0.5, 0, TAU);
    g2.fill();
    g2.fillStyle = gv(0.98, 0.9);
    g2.beginPath();
    g2.ellipse(-w * 0.15, l * 0.22, w * 0.2, l * 0.22, 0.2, 0, TAU);
    g2.fill();
    g2.filter = "none";
    g2.restore();
    if (open > 0.02) {
      const o = open;
      g2.fillStyle = "#151515";
      g2.beginPath();
      smoothPath(g2, [[w * 0.5, l * 0.4], [w * 0.3, l * 0.72], tip, [w * 0.05, l * (0.95 + 0.45 * o)], [w * 0.44, l * (0.7 + 0.25 * o)]], true);
      g2.fill();
      g2.fillStyle = gv(0.82);
      g2.beginPath();
      smoothPath(g2, [[w * 0.12, l * (0.9 + 0.3 * o)], [w * 0.4, l * (0.72 + 0.25 * o)], [w * 0.48, l * (0.82 + 0.3 * o)], [w * 0.1, l * (1.08 + 0.42 * o)]], true);
      g2.fill();
      ink2(g2, [[w * 0.48, l * (0.72 + 0.25 * o)], [w * 0.3, l * (0.95 + 0.35 * o)], [w * 0.06, l * (1.08 + 0.42 * o)]], w * 0.07, LINE);
    } else {
      g2.fillStyle = gv(0.3, 0.92);
      g2.beginPath();
      smoothPath(g2, [[w * 0.5, l * 0.38], [w * 0.36, l * 0.56], [w * 0.16, l * 0.8], [w * 0.28, l * 0.58]], true);
      g2.fill();
      g2.fillStyle = gv(0.7, 0.9);
      g2.beginPath();
      smoothPath(g2, [[w * 0.42, l * 0.5], [w * 0.3, l * 0.6], [w * 0.2, l * 0.72], [w * 0.3, l * 0.56]], true);
      g2.fill();
      ink2(g2, [[w * 0.56 + smirk * w * 0.1, l * 0.36 - smirk * l * 0.14], [w * 0.36, l * 0.58], [w * 0.14, l * 0.84], tip], w * 0.07, LINE, { end: 0.15 });
    }
    ink2(g2, [[-w * 0.44, l * 0], ...Lft.slice(1)], w * 0.085, LINE, { end: 0.35, bias: 0.55 });
    ink2(g2, Rt.slice(0, 4), w * 0.05, LINE, { end: 0.2 });
    ink2(g2, [[-w * 0.44, 0], [-w * 0.1, -l * 0.07], [w * 0.3, -l * 0.04]], w * 0.03, gv(0.3, 0.5), { end: 0.2 });
    g2.fillStyle = LINE;
    g2.beginPath();
    g2.ellipse(-w * 0.04 - k * w * 0.1, l * 0.28, w * 0.065, w * 0.05, 0, 0, TAU);
    g2.fill();
    g2.restore();
  }
  function headphoneGeom(H2, HP) {
    const yaw = HP.yaw ?? H2.yaw, dx = HP.dx ?? 0, dy = HP.dy ?? 0, tilt = HP.tilt ?? 0.15;
    const lift = HP.lift ?? 1.3, bR = HP.bandR ?? 1.3, bH = HP.bandH ?? 1.6, pw = HP.bandPow ?? 0.6;
    const proj = (X, Y, Z2) => {
      const x1 = X * Math.cos(yaw) + Z2 * Math.sin(yaw), z1 = -X * Math.sin(yaw) + Z2 * Math.cos(yaw);
      const y2 = Y * Math.cos(H2.pitch) - z1 * Math.sin(H2.pitch), z2 = Y * Math.sin(H2.pitch) + z1 * Math.cos(H2.pitch);
      return { p: H2.toFrame((x1 + dx) * H2.rx, (y2 + dy) * H2.ry), z: z2 };
    };
    const band = [];
    const N = 40, cupTop = (HP.r ?? 50) / H2.ry * 0.85;
    for (let i = 0; i <= N; i++) {
      const ph = -Math.PI / 2 + i / N * Math.PI;
      const X = Math.sin(ph) * bR, Yv = -(cupTop + Math.pow(Math.cos(ph), pw) * (bH - cupTop));
      band.push(proj(X, Yv * Math.cos(tilt), Yv * Math.sin(tilt)));
    }
    const segs = [];
    let cur = null;
    for (let i = 0; i <= N; i++) {
      const front = band[i].z >= 0;
      if (!cur || cur.front !== front) {
        if (cur) cur.pts.push(band[i].p);
        cur = { front, pts: i > 0 ? [band[i - 1].p] : [] };
        segs.push(cur);
      }
      cur.pts.push(band[i].p);
    }
    segs.forEach((sg, k) => {
      sg.ends = [k === 0, k === segs.length - 1];
      if (sg.pts.length < 2) sg.pts.push(sg.pts[0]);
    });
    const cups = [-1, 1].map((sd) => {
      const c = proj(sd * lift, -Math.sin(HP.cupEl ?? 0), 0), o = proj(0, -Math.sin(HP.cupEl ?? 0), 0);
      return { sd, x: c.p[0], y: c.p[1], z: c.z, side: c.p[0] >= o.p[0] ? 1 : -1, open: HP.open ?? clamp(0.5 + 0.8 * Math.abs(Math.sin(yaw)), 0.4, 0.85) };
    });
    return { band, segs, cups };
  }
  var SIT3Q = {
    light: [-0.85, -0.5],
    head: { x: -126, y: -122, rx: 109, ry: 100, yaw: -0.25, pitch: 0, roll: -0.136, square: 2.6, jowl: 0.05 },
    tufts: [{ at: -0.44, size: 30, width: 0.26, lean: 0.35, second: 0.45, curl: 0.12 }, { at: 0.98, size: 52, width: 0.34, lean: -0.42, second: 0.5, curl: 0.3 }],
    body: { x: -6, y: -8, a: 170, b: 99, rot: 0.384, egg: 0, sag: 0 },
    tail: { base: [134, 40], tip: [247, 76], w: 26, n: 2, spread: 0 },
    wings: [{ type: "folded", layer: "front", S: [-31, -75], T: [171, 52], width: 58, back: 55, dir: 1 }],
    feet: [{ x: -60, y: 86, rot: 0.65, size: 26, mode: "perch", toes: 4, spread: 0.35, seed: 4 }, { x: 30, y: 98, rot: 0.4, size: 28, mode: "perch", toes: 4, spread: 0.35, seed: 9 }],
    eyes: { state: "stare", r: 27.3, spread: 0.4365, el: -0.19, look: [-0.55, -0.6], left: { slant: 0.2, pupil: 0.84, look: [0.45, -0.5] } },
    beak: { el: -0.41, lift: 1.32, w: 32, l: 40 },
    bandage: { az: -0.55, el: 0.82, size: 80, rot: -0.5 },
    headphones: { on: true, yaw: -0.8, dx: 0.38, dy: 0.02, lift: 1.3, r: 50, bandR: 1.3, bandH: 2, tilt: 0.15, open: 0.72, cupEl: -0.02, w: 19 },
    flow: [-0.35, 1],
    disc: 1
  };
  function mergePose(a, b) {
    if (!b) return a;
    const out2 = Array.isArray(a) ? [...a] : { ...a };
    for (const k of Object.keys(b)) {
      const v = b[k];
      out2[k] = v && typeof v === "object" && !Array.isArray(v) && a && typeof a[k] === "object" && a[k] && !Array.isArray(a[k]) ? mergePose(a[k], v) : v;
    }
    return out2;
  }
  var POSES = {
    sit3q: SIT3Q,
    // sitting, facing us (on his shoulder, 20–29 s)
    front: {
      light: [-0.5, -0.86],
      head: { x: 0, y: -118, rx: 108, ry: 96, yaw: 0, pitch: 0, roll: 0, square: 2.6, jowl: 0.05 },
      tufts: [{ at: -0.8, size: 28, width: 0.3, lean: -0.1, second: 0.5, curl: 0.12 }, { at: 0.8, size: 28, width: 0.3, lean: 0.1, second: 0.5, curl: 0.12 }],
      body: { x: 0, y: 10, a: 118, b: 104, rot: Math.PI / 2, egg: -0.1, sag: 0 },
      tail: null,
      wings: [
        { type: "folded", layer: "front", S: [-86, -34], T: [-70, 110], width: 30, back: 14, dir: -1 },
        { type: "folded", layer: "front", S: [86, -34], T: [70, 110], width: 30, back: 14, dir: 1 }
      ],
      feet: [{ x: -34, y: 116, rot: 0, size: 16, mode: "perch", seed: 2 }, { x: 34, y: 116, rot: 0, size: 16, mode: "perch", seed: 5 }],
      eyes: { state: "stare", r: 25, spread: 0.42, el: -0.12, look: [0, -0.3] },
      beak: { el: -0.5, lift: 1.25, w: 26, l: 34 },
      bandage: { az: -0.5, el: 0.78, size: 64, rot: -0.55 },
      headphones: { on: true, lift: 1.12, r: 46, tilt: 0.25, bandR: 1.12, bandH: 1.3, cupEl: 0.1, w: 15, open: 0.5 },
      flow: [0, 1],
      disc: 1
    }
  };
  POSES.frontStand = mergePose(POSES.front, { feet: [{ x: -38, y: 108, rot: 0.15, size: 15, mode: "stand", leg: 24, seed: 2 }, { x: 38, y: 108, rot: -0.15, size: 15, mode: "stand", leg: 24, seed: 5 }], body: { a: 110 } });
  POSES.hips = mergePose(POSES.frontStand, {
    eyes: { state: "angry", look: [0.2, 0.15] },
    wings: [
      { type: "arm", layer: "front", S: [-84, -40], Wr: [-132, 26], T: [-80, 62], len: 30 },
      { type: "arm", layer: "front", S: [84, -40], Wr: [132, 26], T: [80, 62], len: 30 }
    ],
    beak: { smirk: 1 }
  });
  POSES.smirk = mergePose(POSES.frontStand, { eyes: { state: "smug", look: [0.6, 0.1] }, head: { roll: 0.08, yaw: 0.12 }, beak: { smirk: 1 } });
  POSES.startled = mergePose(POSES.front, {
    eyes: { state: "startled", look: [0, 0] },
    beak: { open: 0.8 },
    wings: [
      { type: "spread", layer: "back", S: [-80, -40], Wr: [-160, -110], T: [-230, -160], trail: [0.3, 1], len: 60, spread: 0.7 },
      { type: "spread", layer: "back", S: [80, -40], Wr: [160, -110], T: [230, -160], trail: [-0.3, 1], len: 60, spread: 0.7 }
    ]
  });
  POSES.fly = mergePose(POSES.front, {
    eyes: { state: "stare", look: [0, 0.1] },
    body: { a: 104, b: 94, y: 0 },
    feet: [{ x: -26, y: 104, rot: 0.1, size: 13, mode: "dangle", seed: 2 }, { x: 26, y: 104, rot: -0.1, size: 13, mode: "dangle", seed: 5 }],
    wings: [
      { type: "spread", layer: "back", S: [-78, -46], Wr: [-190, -120], T: [-330, -110], trail: [0.2, 1], len: 78, spread: 1 },
      { type: "spread", layer: "back", S: [78, -46], Wr: [190, -120], T: [330, -110], trail: [-0.2, 1], len: 78, spread: 1 }
    ]
  });
  POSES.flyDown = mergePose(POSES.fly, {
    wings: [
      { type: "spread", layer: "back", S: [-78, -40], Wr: [-190, 10], T: [-300, 120], trail: [0.5, 0.8], len: 70, spread: 0.8 },
      { type: "spread", layer: "back", S: [78, -40], Wr: [190, 10], T: [300, 120], trail: [-0.5, 0.8], len: 70, spread: 0.8 }
    ]
  });
  POSES.angry = mergePose(POSES.fly, { eyes: { state: "angry", look: [-0.2, 0.2] }, head: { yaw: -0.2, roll: -0.12 }, beak: { open: 0.35 } });
  POSES.walk = mergePose(SIT3Q, {
    light: [-0.6, -0.8],
    head: { x: 18, y: -128, rx: 100, ry: 92, yaw: 0.55, roll: 0.04 },
    tufts: [{ at: -0.62, size: 24, width: 0.28, lean: -0.1, second: 0.45, curl: 0.1 }, { at: 0.72, size: 26, width: 0.3, lean: 0.1, second: 0.45, curl: 0.12 }],
    body: { x: 0, y: 6, a: 112, b: 96, rot: 2.1, egg: 0.08, sag: 0 },
    tail: { base: [-58, 70], tip: [-150, 150], w: 22, n: 2 },
    wings: [{ type: "folded", layer: "front", S: [18, -62], T: [-96, 118], width: 34, back: 26, dir: -1 }],
    feet: [{ x: -14, y: 100, rot: -0.35, size: 14, mode: "stand", leg: 22, seed: 2 }, { x: 38, y: 94, rot: -0.1, size: 14, mode: "stand", leg: 16, seed: 5 }],
    eyes: { state: "stare", r: 24, spread: 0.42, el: -0.12, look: [0.7, 0], left: null },
    beak: { el: -0.45, lift: 1.28, w: 26, l: 34 },
    bandage: { az: -0.5, el: 0.78, size: 60, rot: -0.55 },
    headphones: { on: true, yaw: 0.55, dx: 0, dy: 0, lift: 1.12, r: 44, bandR: 1.12, bandH: 1.35, tilt: 0.2, open: null, cupEl: 0.1, w: 15 },
    flow: [0.3, 1]
  });
  POSES.carry = mergePose(POSES.frontStand, {
    wings: [
      { type: "spread", layer: "back", S: [-80, -40], Wr: [-150, -150], T: [-120, -250], trail: [-0.9, 0.3], len: 56, spread: 0.6 },
      { type: "spread", layer: "back", S: [80, -40], Wr: [150, -150], T: [120, -250], trail: [0.9, 0.3], len: 56, spread: 0.6 }
    ],
    eyes: { state: "stare", look: [0, -0.8] },
    head: { pitch: 0.12 }
  });
  POSES.sleep = mergePose(SIT3Q, { eyes: { state: "closed" }, head: { y: -100, x: -131, roll: -0.23 } });
  POSES.glare = mergePose(SIT3Q, { eyes: { state: "glare" }, head: { x: -130, y: -110, roll: -0.215 } });

  // ../../src/shots/s17/owl.js
  function mixPose(a, b, u) {
    if (typeof a === "number" && typeof b === "number") return a + (b - a) * u;
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => mixPose(v, b[i], u));
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      const o = {};
      for (const k of /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (!(k in a)) o[k] = b[k];
        else if (!(k in b)) o[k] = a[k];
        else o[k] = mixPose(a[k], b[k], u);
      }
      return o;
    }
    return u < 0.5 ? a : b;
  }
  var ROUND = { pupil: 0.26, lid: 0, curve: 0, slant: 0, lidW: 0.05, low: 0, ext: 0, ringW: 1.6 };
  var A = {
    root: [735, 505],
    s: 0.4,
    head: { x: 706.6, y: 458.9, r: 40.3, yaw: 0.866, pitch: 0, roll: -0.366, square: 2.1 },
    body: { x: 735, y: 500, a: 56, b: 44, rot: 0.15 },
    tail: { base: [737, 530], dir: [0.1, 1], len: 2, n: 5, spread: 0.8, w: 7 },
    wings: [
      { lead: [[745, 452], [753, 436], [775, 434], [796, 460]], tips: [[800, 484], [792, 484], [783, 479], [773, 473], [763, 467], [754, 461], [748, 456]] },
      { lead: [[695, 487], [670, 503], [648, 525], [630, 543]], tips: [[625, 548], [640, 547], [658, 545], [675, 540], [690, 535], [703, 530], [712, 525]] }
    ],
    feet: [
      { x: 768, y: 523, rot: 0.1, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] },
      { x: 786, y: 523, rot: -1.97, size: 18, fat: 0.22, toes: 3, spread: 0.65, curl: 0.5, seed: 5, leg: [-12, -3] }
    ],
    order: ["farHP", "wing:0", "tail", "body", "wing:1", "head", "nearHP", "foot:0", "foot:1"],
    eyes: { r: 10.9, spread: 0.4, el: -0.18, look: [0.6, -0.6] },
    beak: { az: 0, el: -0.43, lift: 1.05, w: 9.6, l: 11.2, open: 0 },
    plaster: { az: 0.25, el: 0.93, w: 14.4, h: 4.4 },
    headphones: { yaw: 0.866, dx: 0, dy: 0.05, lift: 1, r: 17, bandR: 0.96, bandH: 1.24, tilt: 0.1, open: 0.9, cupEl: 0, w: 5.6 },
    tuft: { dx: -36, dy: -8, ang: 3.55, len: 13, n: 3, spread: 0.7 }
  };
  var B = mergePose(A, {
    head: { x: 706.6, y: 457.4, r: 39.7, yaw: 0.873, roll: -0.388 },
    headphones: { yaw: 0.873 },
    wings: [
      { lead: [[753, 445], [765, 424], [790, 422], [815, 428]], tips: [[822, 432], [818, 442], [811, 451], [802, 459], [792, 466], [782, 471], [772, 474]] },
      { lead: [[693, 487], [670, 495], [640, 507], [605, 523]], tips: [[597, 527], [605, 534], [620, 537], [637, 538], [660, 537], [685, 532], [700, 527]] }
    ],
    feet: [{ x: 765, y: 525, rot: 0.1, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 793, y: 520, rot: -1.97, size: 18, fat: 0.22, toes: 3, spread: 0.65, curl: 0.5, seed: 5, leg: [-12, -3] }],
    eyes: { el: -0.17 },
    beak: { el: -0.5 }
  });
  var C = mergePose(B, {
    head: { x: 706.9, y: 454.2, r: 40.7, yaw: 0.816, roll: -0.437 },
    headphones: { yaw: 0.816 },
    body: { x: 740, y: 503, a: 56, b: 46, rot: 0.3 },
    tail: { base: [738, 533], dir: [0.1, 1], len: 22, n: 5, spread: 0.8, w: 8 },
    wings: [
      { lead: [[748, 460], [755, 425], [775, 402], [805, 384]], tips: [[809, 381], [815, 395], [810, 410], [808, 425], [803, 440], [795, 452], [785, 462]] },
      { lead: [[700, 485], [670, 482], [630, 485], [590, 492]], tips: [[575, 495], [583, 510], [600, 520], [620, 528], [640, 533], [662, 535], [685, 532]] }
    ],
    feet: [{ x: 762, y: 527, rot: 0.1, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 793, y: 518, rot: -1.8, size: 18, fat: 0.22, toes: 3, spread: 0.7, curl: 0.45, seed: 5, leg: [-12, -3] }],
    eyes: { el: -0.15, look: [0.6, -0.5] },
    beak: { el: -0.57 }
  });
  var D = mergePose(C, {
    head: { x: 705.6, y: 451.2, r: 42.1, yaw: 0.793, roll: -0.387 },
    headphones: { yaw: 0.793 },
    body: { x: 740, y: 500, a: 52, b: 48, rot: 0.8 },
    tail: { base: [733, 532], dir: [0, 1], len: 36, n: 5, spread: 1.3, w: 8 },
    wings: [
      { lead: [[748, 465], [750, 430], [758, 398], [774, 358]], tips: [[779, 356], [795, 368], [802, 388], [802, 410], [800, 428], [793, 445], [783, 462]] },
      { lead: [[690, 480], [655, 468], [620, 458], [578, 446]], tips: [[572, 445], [572, 470], [588, 494], [606, 510], [632, 522], [660, 527], [690, 527]] }
    ],
    feet: [{ x: 762, y: 527, rot: 0.05, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 793, y: 520, rot: -1.6, size: 18, fat: 0.22, toes: 3, spread: 0.75, curl: 0.4, seed: 5, leg: [-12, -3] }],
    eyes: { r: 11, el: -0.09, look: [0.4, -0.2] },
    beak: { el: -0.44 }
  });
  var E2 = mergePose(D, {
    head: { x: 704.6, y: 441, r: 43.7, yaw: 0.62, roll: -0.395 },
    headphones: { yaw: 0.62 },
    body: { x: 742, y: 503, a: 50, b: 48, rot: 1.4 },
    tail: { base: [728, 530], dir: [0, 1], len: 40, n: 5, spread: 1.4, w: 9 },
    wings: [
      { lead: [[750, 470], [748, 430], [752, 390], [760, 346]], tips: [[763, 342], [780, 350], [795, 375], [801, 398], [801, 420], [795, 440], [785, 460]] },
      { lead: [[690, 476], [660, 460], [620, 442], [585, 420]], tips: [[580, 417], [574, 450], [582, 470], [600, 484], [620, 504], [645, 514], [675, 520]] }
    ],
    feet: [{ x: 755, y: 520, rot: 0, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 790, y: 510, rot: -1.3, size: 18, fat: 0.22, toes: 3, spread: 0.8, curl: 0.3, seed: 5, leg: [-12, -3] }],
    eyes: { r: 12, el: -0.09, look: [0.2, 0] },
    beak: { el: -0.52, open: 0.5 }
  });
  var F = mergePose(E2, {
    head: { x: 707.2, y: 430.1, r: 43.3, yaw: 0.462, roll: -0.375 },
    headphones: { yaw: 0.462 },
    body: { x: 739, y: 498, a: 46, b: 47, rot: 1.5 },
    tail: { base: [722, 530], dir: [-0.1, 1], len: 40, n: 5, spread: 1.6, w: 9 },
    wings: [
      { lead: [[762, 468], [758, 420], [757, 385], [758, 338]], tips: [[758, 332], [777, 340], [792, 362], [802, 388], [803, 415], [795, 440], [785, 460]] },
      { lead: [[690, 470], [655, 450], [620, 428], [590, 405]], tips: [[583, 398], [573, 428], [582, 455], [600, 482], [622, 500], [650, 510], [682, 514]] }
    ],
    feet: [{ x: 752, y: 517, rot: 0, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 790, y: 507, rot: -1.25, size: 18, fat: 0.22, toes: 3, spread: 0.8, curl: 0.3, seed: 5, leg: [-12, -3] }],
    eyes: { r: 13.5, el: -0.09, look: [-0.15, 0] },
    beak: { el: -0.53, open: 0.6 }
  });
  var G = mergePose(F, {
    head: { x: 706.8, y: 415, r: 46, yaw: 0.446, roll: -0.257, pitch: 0.12 },
    headphones: { yaw: 0.446 },
    body: { x: 735, y: 485, a: 48, b: 46, rot: 1.5 },
    tail: { base: [718, 520], dir: [-0.1, 1], len: 40, n: 5, spread: 1.6, w: 10 },
    wings: [
      { lead: [[767, 455], [759, 420], [759, 370], [760, 327]], tips: [[760, 322], [777, 325], [793, 348], [803, 377], [805, 405], [800, 428], [790, 445]] },
      { lead: [[690, 460], [655, 440], [620, 415], [590, 380]], tips: [[585, 373], [575, 402], [580, 432], [596, 466], [618, 490], [648, 500], [680, 505]] }
    ],
    feet: [{ x: 740, y: 510, rot: 0, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 785, y: 495, rot: -1.3, size: 18, fat: 0.22, toes: 3, spread: 0.8, curl: 0.3, seed: 5, leg: [-12, -3] }],
    eyes: { r: 15.5, el: -0.075, look: [0, 0.1] },
    beak: { el: -0.52, open: 0.6 }
  });
  var feetU = (d, g2) => [
    { x: d[0], y: d[1], rot: d[2], size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] },
    { x: g2[0], y: g2[1], rot: g2[2], size: 18, fat: 0.22, toes: 3, spread: 0.8, curl: 0.3, seed: 5, leg: [-12, -3] }
  ];
  var L1 = mergePose(G, {
    head: { x: 713, y: 413, r: 47, yaw: 0.35, roll: -0.2, pitch: 0.05 },
    headphones: { yaw: 0.35 },
    body: { x: 742, y: 478, a: 48, b: 45, rot: 1.5 },
    tail: { base: [725, 512], dir: [-0.3, 1], len: 34, n: 5, spread: 1.4, w: 10 },
    wings: [
      { lead: [[765, 452], [757, 420], [755, 370], [756, 320]], tips: [[756, 315], [778, 321], [796, 344], [807, 373], [805, 405], [798, 430], [787, 452]] },
      { lead: [[690, 455], [655, 440], [620, 410], [595, 378]], tips: [[591, 385], [578, 410], [582, 435], [596, 460], [621, 472], [650, 490], [679, 498]] }
    ],
    feet: feetU([740, 512, 0], [785, 495, -1.3]),
    eyes: { r: 15, look: [-0.6, -0.6] }
  });
  var L2 = mergePose(L1, {
    head: { x: 727, y: 419, r: 48, yaw: 0.35, roll: 0.05, pitch: 0 },
    headphones: { yaw: 0.35 },
    body: { x: 752, y: 482, a: 48, b: 44, rot: 1.6 },
    tail: { base: [735, 512], dir: [-0.2, 1], len: 28, n: 5, spread: 1.3, w: 10 },
    wings: [
      { lead: [[776, 452], [768, 420], [765, 370], [764, 318]], tips: [[763, 313], [783, 322], [805, 355], [817, 391], [812, 420], [800, 440], [790, 455]] },
      { lead: [[700, 460], [665, 440], [630, 410], [612, 375]], tips: [[609, 383], [592, 410], [600, 439], [621, 464], [654, 483], [685, 501], [704, 512]] }
    ],
    feet: feetU([754, 518, 0.1], [800, 500, -1.2]),
    eyes: { r: 14, look: [-0.5, 0.45], over: { lid: 0.3, lidW: 0.12 } }
  });
  var L3 = mergePose(L2, {
    head: { x: 742, y: 440, r: 47, yaw: 0.3, roll: 0.1, pitch: 0 },
    headphones: { yaw: 0.3 },
    body: { x: 750, y: 490, a: 44, b: 46, rot: 1.7 },
    tail: { base: [735, 522], dir: [-0.4, 1], len: 22, n: 5, spread: 1.3, w: 10 },
    wings: [
      { lead: [[778, 465], [774, 420], [772, 370], [772, 325]], tips: [[772, 321], [788, 333], [804, 366], [816, 405], [812, 434], [802, 450], [788, 462]] },
      { lead: [[715, 470], [680, 440], [650, 400], [622, 372]], tips: [[618, 383], [623, 414], [632, 453], [654, 482], [679, 498], [700, 511], [715, 518]] }
    ],
    feet: feetU([745, 522, 0.2], [790, 512, -1.3]),
    eyes: { r: 13, look: [-0.8, 0.2], over: { lid: 0.1 } }
  });
  var L4 = mergePose(L3, {
    head: { x: 760, y: 440, r: 47, yaw: 0.05, roll: 0.05 },
    headphones: { yaw: 0.05 },
    body: { x: 772, y: 492, a: 62, b: 36, rot: 0.05 },
    tail: { base: [835, 505], dir: [1, 0.3], len: 14, n: 4, spread: 0.8, w: 10 },
    wings: [
      { lead: [[808, 452], [835, 432], [865, 415], [895, 405]], tips: [[898, 405], [890, 420], [880, 431], [868, 440], [855, 447], [840, 452], [825, 455]] },
      { lead: [[752, 462], [722, 452], [690, 445], [658, 440]], tips: [[655, 441], [662, 453], [672, 463], [684, 471], [698, 477], [712, 480], [726, 480]] }
    ],
    feet: feetU([792, 530, 0.1], [818, 526, -0.3]),
    eyes: { look: [0, 0.6], over: { lid: 0.62, lidW: 0.15 } },
    blur: [10, 2]
  });
  var NEAR = {
    BMID: { lead: [[45, 8], [85, -2], [120, -12], [150, -20]], tips: [[153, -20], [150, -8], [142, 2], [132, 10], [118, 16], [100, 20], [82, 22]] },
    FWD: { lead: [[4, 28], [-28, 34], [-60, 40], [-92, 46]], tips: [[-98, 52], [-88, 60], [-74, 64], [-58, 66], [-42, 64], [-26, 60], [-10, 54]] },
    UP: { lead: [[56, 9], [62, -30], [72, -70], [82, -103]], tips: [[83, -107], [105, -90], [117, -67], [125, -40], [132, -15], [128, 2], [115, 10]] },
    BUP: { lead: [[45, 5], [75, -10], [105, -25], [132, -36]], tips: [[135, -37], [142, -24], [145, -10], [143, 5], [135, 15], [120, 20], [100, 22]] },
    BACK: { lead: [[45, 10], [90, 5], [130, 5], [165, 9]], tips: [[167, 11], [160, 18], [150, 22], [138, 25], [122, 27], [104, 27], [85, 26]] },
    DOWN: { lead: [[12, 30], [-12, 44], [-38, 56], [-60, 64]], tips: [[-64, 68], [-54, 76], [-42, 80], [-30, 80], [-18, 78], [-6, 72], [5, 64]] }
  };
  var FAR = {
    BACKF: { lead: [[45, 4], [90, -2], [130, -4], [165, -2]], tips: [[167, 0], [160, 8], [150, 13], [138, 16], [122, 18], [104, 18], [85, 17]] },
    UP: { lead: [[5, -30], [-8, -46], [-24, -64], [-38, -76]], tips: [[-42, -78], [-32, -72], [-22, -64], [-13, -55], [-5, -47], [2, -40], [8, -34]] },
    SPK: { lead: [[40, -22], [50, -36], [62, -46], [75, -50]], tips: [[78, -50], [72, -54], [64, -52], [57, -47], [51, -41], [45, -35], [40, -29]] },
    BK: { lead: [[40, 0], [62, 4], [86, 8], [112, 10]], tips: [[116, 10], [110, 15], [103, 17], [96, 18], [89, 18], [82, 17], [75, 16]] }
  };
  function flyKey(hx, hy, near, far, o = {}, ns = 0) {
    if (near === "DOWN") o = mergePose({
      body: { x: hx + 62, y: hy + 42, a: 60, b: 44, rot: 0.3 },
      feet: [
        { x: hx + 100, y: hy + 80, rot: -0.7, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 2, leg: [-6, -8] },
        { x: hx + 112, y: hy + 74, rot: -0.9, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 5, leg: [-6, -8] }
      ]
    }, o);
    const rel = (p) => [hx + p[0], hy + p[1]];
    const W2 = (w, sh = 0) => ({ lead: w.lead.map((p, i) => rel([p[0] + sh * (0.6 + 0.4 * i / (w.lead.length - 1)), p[1]])), tips: w.tips.map((p) => rel([p[0] + sh, p[1]])) });
    return mergePose({
      root: [hx + 62, hy + 30],
      s: 0.45,
      head: { x: hx, y: hy + 2, r: 40, sx: 1.08, yaw: -0.35, pitch: 0, roll: -0.29, square: 2.1 },
      body: { x: hx + 60, y: hy + 38, a: 58, b: 42, rot: 0.3 },
      tail: { base: rel([106, 56]), dir: [1, 0.55], len: 15, n: 4, spread: 0.7, w: 9 },
      wings: [W2(FAR[far]), W2(NEAR[near], ns)],
      feet: [
        { x: hx + 98, y: hy + 66, rot: -0.7, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 2, leg: [-6, -8] },
        { x: hx + 110, y: hy + 60, rot: -0.9, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 5, leg: [-6, -8] }
      ],
      order: ["farHP", "wing:0", "tail", "body", "foot:0", "foot:1", "head", "nearHP", "wing:1"],
      eyes: { r: 11, spread: 0.4, el: -0.15, look: [-0.8, 0.05] },
      beak: { az: 0, el: -0.45, lift: 1.05, w: 10, l: 11.5, open: 0.35 },
      plaster: { az: 0.1, el: 1, w: 15, h: 4.6 },
      headphones: { yaw: -0.35, dx: 0, dy: 0, lift: 1, r: 15, bandR: 1, bandH: 1.02, tilt: 0.1, open: 0.8, cupEl: 0, w: 5.5 },
      tuft: { dx: 44, dy: -22, ang: -0.45, len: 20, n: 5, spread: 1.5, w: 0.3 },
      blur: [4, 0]
    }, o);
  }
  var FLY = [
    [52.68, 740, 443, "FWD", "BACKF", 0, 0, { head: { r: 46 }, body: { x: 800, y: 482, a: 80, b: 42, rot: 0.06 }, tail: { base: [868, 494], dir: [1, 0.2], len: 20 } }],
    [52.72, 705, 453, "DOWN", "BK"],
    [52.76, 677, 453, "BUP", "SPK"],
    [52.8, 647, 450, "UP", "UP"],
    [52.84, 612, 445, "BUP", "SPK"],
    [52.88, 590, 445, "DOWN", "BK", 0, 7],
    [52.92, 570, 447, "BUP", "SPK"],
    [52.96, 537, 449, "UP", "UP"],
    [53, 512, 448, "BUP", "SPK"],
    [53.04, 512, 448, "BUP", "SPK"],
    [53.08, 480, 447, "DOWN", "BK", 0, 7],
    [53.12, 452, 452, "BACK", "SPK", 0, 7],
    [53.16, 428, 450, "UP", "UP"],
    [53.2, 400, 452, "BMID", "SPK"]
  ];
  var KEYS = [
    { t: 48.72, p: A },
    { t: 49.08, p: A },
    { t: 49.88, p: B, ease: (u) => u * u },
    { t: 50.4, p: C },
    { t: 50.88, p: D },
    { t: 51.36, p: E2 },
    { t: 51.8, p: F },
    { t: 52.44, p: G }
  ];
  var ONES = [[52.52, L1], [52.56, L2], [52.6, L3], [52.64, L4], ...FLY.map(([t, x, y, n, f, ns, bl2, o]) => [t, flyKey(x, y, n, f, { ...o || {}, ...bl2 ? { blur: [bl2, 0] } : {} }, ns || 0)])];
  var DRAW = [];
  for (let k = 0; ; k++) {
    const t = +(47.84 + 0.08 * k).toFixed(2);
    if (t > 49.53) break;
    DRAW.push(t);
  }
  for (const [a, b] of [[49.64, 50.53], [50.64, 51.53], [51.64, 52.45]]) for (let t = a; t < b; t += 0.08) DRAW.push(+t.toFixed(2));
  function drawTick(t) {
    if (t >= 52.52 - 1e-6) return Math.abs(t - 53.04) < 0.01 ? 53 : t;
    let d = DRAW[0];
    for (const x of DRAW) if (x <= t + 1e-6) d = x;
    return d;
  }
  function drawingTime(t) {
    const d = drawTick(t);
    return d < 49.12 - 1e-6 ? 48.72 : d;
  }
  function owlFrame(t) {
    if (t >= 52.52 - 1e-6) {
      let k = ONES[0][1];
      for (const [tt, p] of ONES) if (tt <= t + 1e-6) k = p;
      return toUnits(k);
    }
    return owlAt(drawingTime(t));
  }
  function toUnits(K) {
    const s = K.s, R = K.root, u = (p) => [(p[0] - R[0]) / s, (p[1] - R[1]) / s], d = (v) => v / s;
    const h = K.head, hr = d(h.r);
    const hc = u([h.x, h.y]);
    return {
      x: R[0],
      y: R[1],
      s,
      rot: K.rot || 0,
      light: [-0.55, -0.83],
      head: { x: hc[0], y: hc[1], rx: hr * (h.sx ?? 1), ry: hr, yaw: h.yaw, pitch: h.pitch || 0, roll: h.roll || 0, square: h.square ?? 2.1, jowl: 0.04 },
      body: K.body ? { x: u([K.body.x, K.body.y])[0], y: u([K.body.x, K.body.y])[1], a: d(K.body.a), b: d(K.body.b), rot: K.body.rot || 0, egg: K.body.egg || 0, sag: 0 } : null,
      tail: K.tail && K.tail.len > 3 ? { base: u(K.tail.base), dir: K.tail.dir, len: d(K.tail.len), n: K.tail.n, spread: K.tail.spread, w: d(K.tail.w) } : null,
      wings: K.wings.map((w) => ({ ...w, lead: w.lead.map(u), tips: w.tips.map(u) })),
      feet: K.feet.map((f) => ({ ...f, x: u([f.x, f.y])[0], y: u([f.x, f.y])[1], size: d(f.size), leg: f.leg ? [d(f.leg[0]), d(f.leg[1])] : null })),
      order: K.order,
      eyes: { state: "wide", r: d(K.eyes.r), spread: K.eyes.spread, el: K.eyes.el, look: K.eyes.look, over: ROUND, left: K.eyes.left, right: K.eyes.right },
      beak: { ...K.beak, w: d(K.beak.w), l: d(K.beak.l) },
      plaster: { ...K.plaster, w: d(K.plaster.w), h: d(K.plaster.h) },
      headphones: { on: true, ...K.headphones, r: d(K.headphones.r), w: d(K.headphones.w) },
      tuft: K.tuft ? { ...K.tuft, dx: d(K.tuft.dx), dy: d(K.tuft.dy), len: d(K.tuft.len) } : null,
      disc: 1,
      blur: K.blur,
      flip: K.flip
    };
  }
  function owlAt(t) {
    const K = KEYS;
    let k;
    if (t <= K[0].t) k = K[0].p;
    else if (t >= K[K.length - 1].t) k = K[K.length - 1].p;
    else {
      for (let i = 1; i < K.length; i++) {
        if (t <= K[i].t) {
          const a = K[i - 1], b = K[i], u = (t - a.t) / (b.t - a.t);
          k = mixPose(a.p, b.p, b.ease ? b.ease(u) : u);
          break;
        }
      }
    }
    return toUnits(k);
  }

  // ../../src/shots/s17/owlDraw.js
  var { add: add2, sub: sub2, mul: mul2, nrm: nrm2, perp: perp2 } = V;
  var TAU2 = Math.PI * 2;
  var blobPath3 = (pts) => (c) => smoothPath(c, pts, true);
  var PPU2 = 1;
  var wmin2 = (w) => Math.max(w, 0.7 / PPU2);
  function wingGeom(w) {
    const { lead: L0, tips: T0, cw = 0.36, fw = 1, rmax = 0.62, sub: subd = 1 } = w;
    let tips = T0;
    if (subd) {
      tips = [];
      for (let i = 0; i < T0.length; i++) {
        tips.push(T0[i]);
        if (i < T0.length - 1) {
          const m = V.mix(T0[i], T0[i + 1], 0.5), c = V.mix(L0[0], L0[L0.length - 1], 0.5 + 0.5 * (1 - i / (T0.length - 1)) - 0.25);
          tips.push(V.mix(m, c, 0.1));
        }
      }
    }
    const lead = sampleCurve(L0, 8);
    const acc = [0];
    for (let i = 1; i < lead.length; i++) acc.push(acc[i - 1] + V.len(sub2(lead[i], lead[i - 1])));
    const total = acc[acc.length - 1] || 1;
    const at = (f) => {
      const d = clamp(f) * total;
      let i = 1;
      while (i < acc.length - 1 && acc[i] < d) i++;
      const u = (d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
      return V.mix(lead[i - 1], lead[i], clamp(u));
    };
    const n = tips.length;
    const feathers = tips.map((tip, i) => {
      const f = n === 1 ? 1 : 1 - i / (n - 1);
      return { root: at(0.04 + rmax * f), tip, point: 0.75 + 0.25 * f, kind: f > 0.45 ? 1 : 0 };
    });
    let trs = [0, 0], Ls = 0;
    for (let i = 0; i < n; i++) {
      const f = feathers[i], L = V.len(sub2(f.tip, f.root));
      const a = feathers[Math.max(0, i - 1)].tip, b = feathers[Math.min(n - 1, i + 1)].tip;
      const sp = V.len(sub2(b, a)) / (i > 0 && i < n - 1 ? 2 : 1);
      f.w = clamp(sp * 2.2, L * 0.2, L * 0.38) * fw;
      trs = add2(trs, nrm2(sub2(f.tip, f.root)));
      Ls += L;
    }
    for (let i = 0; i < n; i++) {
      const f = feathers[i], u = nrm2(sub2(f.tip, f.root));
      let nn = perp2(u);
      const ref = i < n - 1 ? feathers[i + 1].tip : V.mix(f.root, f.tip, 0.5);
      const side = i < n - 1 ? sub2(ref, f.tip) : sub2(feathers[Math.max(0, i - 1)].tip, f.tip);
      if ((nn[0] * side[0] + nn[1] * side[1]) * (i < n - 1 ? 1 : -1) < 0) nn = mul2(nn, -1);
      f.off = mul2(nn, f.w * (i === 0 ? 0.42 : 0.22));
    }
    const cov = feathers.map((f) => V.mix(f.root, f.tip, cw));
    return { lead, cov, feathers, tr: nrm2(trs), len: Ls / Math.max(1, n) };
  }
  function leaf2(f) {
    const d = sub2(f.tip, f.root), L = V.len(d) || 1, u = mul2(d, 1 / L), n = perp2(u), w = f.w, p = f.point;
    const o = f.off || [0, 0];
    const sh = (q, k) => add2(q, mul2(o, k));
    return [
      sh(add2(f.root, mul2(n, -w * 0.3)), 1),
      sh(add2(add2(f.root, mul2(u, L * 0.4)), mul2(n, -w * 0.5)), 0.85),
      sh(add2(add2(f.root, mul2(u, L * (0.78 + 0.08 * p))), mul2(n, -w * (0.36 - 0.12 * p))), 0.45),
      f.tip,
      sh(add2(add2(f.root, mul2(u, L * (0.78 + 0.08 * p))), mul2(n, w * (0.36 - 0.12 * p))), 0.45),
      sh(add2(add2(f.root, mul2(u, L * 0.4)), mul2(n, w * 0.5)), 0.85),
      sh(add2(f.root, mul2(n, w * 0.3)), 1)
    ];
  }
  function paintWing(g2, G2, plu, dl) {
    for (let i = 0; i < G2.feathers.length; i++) {
      const f = G2.feathers[i], sh = leaf2(f), path = blobPath3(sh);
      plumage(g2, path, { base: 0.96, shade: f.kind ? 0.8 : 0.78, depth: f.w * 0.3, blur: f.w * 0.18, ...plu });
      ink2(g2, sh.slice(1, 6), 1.1, gv(0.25, 0.85), { end: 0.15, bias: 0.6 });
      if (dl > 0.4) {
        const d = nrm2(sub2(f.tip, f.root)), L = V.len(sub2(f.tip, f.root)), nn = perp2(d);
        ink2(g2, [add2(f.root, mul2(d, L * 0.3)), add2(f.root, mul2(d, L * 0.8))], 0.7, gv(0.55, 0.35), { end: 0.1 });
        const r = rng(900 + i * 7);
        for (let k = 0; k < 4; k++) {
          const u = 0.3 + 0.5 * r(), p0 = add2(add2(f.root, mul2(d, L * u)), mul2(nn, f.w * (0.05 + 0.15 * r())));
          flick(g2, p0, nrm2(add2(d, mul2(nn, 0.5))), f.w * 0.35, 0.8, gv(0.5, 0.3), 0.1);
        }
      }
    }
    const band = [...G2.lead, ...G2.cov];
    const bp = blobPath3(band);
    plumage(g2, bp, { base: 0.97, shade: 0.86, depth: G2.len * 0.15, blur: G2.len * 0.08, ...plu });
    const covIn = [...G2.cov].reverse();
    scallops(g2, covIn, G2.tr, G2.len * 0.12, 0.9, gv(0.45, 0.55));
    ink2(g2, G2.lead, 1.4, gv(0.22, 0.9), { end: 0.25, bias: 0.4 });
  }
  function scallops(g2, pts, dir, r, w, color) {
    const q = sampleCurve(pts, 4);
    let acc = 0, last = q[0];
    const marks = [q[0]];
    for (let i = 1; i < q.length; i++) {
      acc += V.len(sub2(q[i], q[i - 1]));
      if (acc >= r * 1.7) {
        marks.push(q[i]);
        acc = 0;
      }
      last = q[i];
    }
    if (V.len(sub2(marks[marks.length - 1], last)) > r * 0.8) marks.push(last);
    for (let i = 1; i < marks.length; i++) {
      const a = marks[i - 1], b = marks[i], m = add2(V.mix(a, b, 0.5), mul2(dir, r * 0.9));
      ink2(g2, [a, m, b], w, color, { end: 0.25 });
    }
  }
  function tailGeom(t) {
    const { base, dir, len = 60, n = 5, spread = 0.9, w = 26, seed = 7 } = t;
    const d0 = nrm2(dir), r = rng(seed), out2 = [];
    const nb = perp2(d0);
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0 : i / (n - 1) - 0.5;
      const d = V.rot(d0, f * spread);
      const root = add2(base, mul2(nb, f * w * 0.8));
      out2.push({ root, tip: add2(root, mul2(d, len * (1 - 0.18 * Math.abs(f) * 2) * (0.95 + 0.1 * r()))), w, point: 0.35, kind: 1 });
    }
    out2.sort((a, b) => Math.abs(V.len(sub2(b.root, base))) - Math.abs(V.len(sub2(a.root, base))));
    return out2;
  }
  function drawCupS(g2, c) {
    const { x, y, r = 45, rot = 0, open = 0.85, side = 1 } = c;
    g2.save();
    g2.translate(x, y);
    g2.rotate(rot);
    const s = side, rx = r * open, ry = r;
    const rimX = -s * r * 0.1, RX = rx * 0.98 + r * 0.08, RY = ry;
    g2.fillStyle = gv(0.62);
    g2.beginPath();
    g2.ellipse(rimX, 0, RX, RY, 0, 0, TAU2);
    g2.fill();
    g2.save();
    g2.beginPath();
    g2.ellipse(rimX, 0, RX, RY, 0, 0, TAU2);
    g2.clip();
    g2.lineCap = "butt";
    for (let i = 0; i < 44; i++) {
      const a = i / 44 * TAU2;
      g2.strokeStyle = i % 2 ? gv(0.85, 0.9) : gv(0.35, 0.85);
      g2.lineWidth = wmin2(r * 0.05);
      g2.beginPath();
      g2.moveTo(rimX + Math.cos(a) * RX * 0.72, Math.sin(a) * RY * 0.72);
      g2.lineTo(rimX + Math.cos(a) * RX * 1.02, Math.sin(a) * RY * 1.03);
      g2.stroke();
    }
    g2.restore();
    g2.strokeStyle = gv(0.12);
    g2.lineWidth = wmin2(r * 0.07);
    g2.beginPath();
    g2.ellipse(rimX, 0, RX, RY, 0, 0, TAU2);
    g2.stroke();
    const fx = s * r * 0.14, PX = rx * 0.8, PY = ry * 0.86;
    g2.fillStyle = gv(0.9);
    g2.beginPath();
    g2.ellipse(fx, 0, PX, PY, 0, 0, TAU2);
    g2.fill();
    g2.save();
    g2.beginPath();
    g2.ellipse(fx, 0, PX, PY, 0, 0, TAU2);
    g2.clip();
    g2.filter = `blur(${Math.max(0.4, r * 0.12 * PPU2).toFixed(2)}px)`;
    g2.fillStyle = gv(0.98, 0.9);
    g2.beginPath();
    g2.ellipse(fx - s * PX * 0.25, -PY * 0.3, PX * 0.4, PY * 0.4, 0, 0, TAU2);
    g2.fill();
    g2.fillStyle = gv(0.62, 0.55);
    g2.beginPath();
    g2.ellipse(fx + s * PX * 0.5, PY * 0.45, PX * 0.45, PY * 0.5, 0, 0, TAU2);
    g2.fill();
    g2.filter = "none";
    g2.restore();
    g2.strokeStyle = gv(0.2, 0.9);
    g2.lineWidth = wmin2(r * 0.06);
    g2.beginPath();
    g2.ellipse(fx, 0, PX, PY, 0, 0, TAU2);
    g2.stroke();
    for (const k of [0.62, 0.38]) {
      g2.strokeStyle = gv(0.45, 0.6);
      g2.lineWidth = wmin2(r * 0.035);
      g2.beginPath();
      g2.ellipse(fx + s * PX * (1 - k) * 0.2, PY * (1 - k) * 0.08, PX * k, PY * k, 0, 0, TAU2);
      g2.stroke();
    }
    g2.restore();
  }
  function drawFootS(g2, f) {
    const { x, y, rot = 0, size = 40, toes = 3, spread = 0.8, curl = 0.4, claw = 0.3, fat = 0.22, seed = 3, palm = 0.2 } = f;
    const r = rng(seed);
    g2.save();
    g2.translate(x, y);
    g2.rotate(rot);
    g2.lineCap = "round";
    g2.lineJoin = "round";
    const tw = size * fat, ol = wmin2(size * 0.045);
    const stroke = (q, w, c) => {
      g2.strokeStyle = c;
      g2.lineWidth = w;
      g2.beginPath();
      g2.moveTo(q[0][0], q[0][1]);
      for (const p of q) g2.lineTo(p[0], p[1]);
      g2.stroke();
    };
    if (f.leg) {
      const L = V.rot(f.leg, -rot), q = [L, V.mix(L, [0, 0], 0.5), [0, 0]];
      stroke(q, tw * 1.25 + ol * 2, gv(0.18));
      stroke(q, tw * 1.25, gv(0.92));
    }
    const toeP = [];
    for (let i = 0; i < toes; i++) {
      const f0 = toes === 1 ? 0 : i / (toes - 1) - 0.5;
      let d = V.rot([0, 1], f0 * spread * 2);
      const L = size * (1 - Math.abs(f0) * 0.25) * (0.92 + 0.16 * r());
      const pts = [mul2(perp2(d), -f0 * tw * 0.8)];
      for (let k = 0; k < 3; k++) {
        pts.push(add2(pts[pts.length - 1], mul2(d, L / 3)));
        d = V.rot(d, curl * (0.35 + 0.25 * k));
      }
      toeP.push({ q: sampleCurve(pts, 4), f0, d });
    }
    const order = toeP.map((t, i) => i).sort((a, b) => Math.abs(toeP[b].f0) - Math.abs(toeP[a].f0));
    for (const i of order) {
      const { q, d } = toeP[i];
      const e = q[q.length - 1], tip = add2(e, mul2(d, size * claw));
      stroke([e, tip], tw * 0.7 + ol * 2, gv(0.12));
      stroke([e, V.mix(e, tip, 0.6)], tw * 0.6, gv(0.55));
      stroke(q, tw + ol * 2, gv(0.15));
      stroke(q, tw, gv(0.92 - 0.04 * r()));
      for (const k of [0.36, 0.68]) {
        const j = Math.floor((q.length - 1) * k), p = q[j], tt = nrm2(sub2(q[Math.min(q.length - 1, j + 1)], q[Math.max(0, j - 1)])), n = perp2(tt);
        ink2(g2, [add2(p, mul2(n, -tw * 0.45)), add2(p, mul2(tt, tw * 0.15)), add2(p, mul2(n, tw * 0.45))], size * 0.02, gv(0.35, 0.7), { end: 0.3 });
      }
    }
    const pr = size * palm;
    g2.fillStyle = gv(0.92);
    g2.beginPath();
    g2.ellipse(0, pr * 0.2, pr * 0.9, pr * 0.75, 0, 0, TAU2);
    g2.fill();
    g2.restore();
  }
  function drawBandS(g2, pts, w) {
    if (pts.length < 2) return;
    const q = sampleCurve(pts, 6);
    const nrmAt = (i) => {
      const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)];
      return perp2(nrm2(sub2(b, a)));
    };
    const line = (off, lw, c) => {
      const p = q.map((pp, i) => add2(pp, mul2(nrmAt(i), off)));
      g2.strokeStyle = c;
      g2.lineWidth = lw;
      g2.lineCap = "round";
      g2.lineJoin = "round";
      g2.beginPath();
      g2.moveTo(p[0][0], p[0][1]);
      for (const pp of p) g2.lineTo(pp[0], pp[1]);
      g2.stroke();
    };
    line(0, w + wmin2(w * 0.35), gv(0.12));
    line(0, w, gv(0.78));
    line(w * 0.22, w * 0.3, gv(0.35, 0.8));
    line(-w * 0.2, w * 0.25, gv(0.96, 0.85));
  }
  function drawPlaster(g2, { x, y, w = 36, h = 11, rot = 0, sx = 1 }) {
    g2.save();
    g2.translate(x, y);
    g2.rotate(rot);
    g2.scale(sx, 1);
    g2.fillStyle = gv(0.78);
    g2.beginPath();
    g2.roundRect(-w / 2, -h / 2, w, h, h * 0.45);
    g2.fill();
    g2.strokeStyle = gv(0.25, 0.9);
    g2.lineWidth = wmin2(1.3);
    g2.stroke();
    g2.fillStyle = gv(0.62);
    g2.beginPath();
    g2.roundRect(-w * 0.18, -h * 0.34, w * 0.36, h * 0.68, h * 0.2);
    g2.fill();
    g2.restore();
  }
  var ORDER = ["farHP", "wing:0", "tail", "body", "foot:0", "wing:1", "head", "nearHP", "foot:1"];
  function owlS17Layer(P, canvas) {
    const s = P.s ?? 1, res = P.res ?? 1, rot = P.rot ?? 0, fl = P.flip ? -1 : 1;
    const ca = Math.cos(rot), sa = Math.sin(rot);
    const toF = ([ux, uy]) => [P.x + s * (ca * fl * ux - sa * uy), P.y + s * (sa * fl * ux + ca * uy)];
    const Lf = P.light || [-0.55, -0.83];
    const Lu = nrm2([fl * (ca * Lf[0] + sa * Lf[1]), -sa * Lf[0] + ca * Lf[1]]);
    const dl = P.detail ?? clamp(s * res / 1, 0.2, 1);
    const H2 = headGeom(P.head);
    const body = P.body ? bodyOutline(P.body) : null;
    const wings = (P.wings || []).map((w) => wingGeom(w));
    const tail = P.tail ? tailGeom(P.tail) : [];
    const E3 = P.eyes || {};
    const eyes = [-1, 1].map((sd) => {
      const q = H2.P(sd * (E3.spread ?? 0.4) + (E3.az ?? 0), E3.el ?? -0.1);
      const nz = Math.max(0.05, q.nz);
      return { x: q.x, y: q.y, nz, side: sd, r: (E3.r ?? 27) * (1 - 0.55 * (1 - nz)), sx: 0.2 + 0.8 * nz };
    });
    const B2 = P.beak || {};
    const bq = H2.P(B2.az ?? 0, B2.el ?? -0.45, B2.lift ?? 1.05);
    const HP = P.headphones || {};
    const hp = HP.on ? headphoneGeom(H2, HP) : null;
    const all = [...H2.out];
    if (body) all.push(...body);
    wings.forEach((G2) => {
      all.push(...G2.lead);
      G2.feathers.forEach((f) => all.push(f.tip));
    });
    tail.forEach((f) => all.push(f.tip, f.root));
    (P.feet || []).forEach((f) => {
      const z = (f.size || 15) * 2.4;
      all.push([f.x - z, f.y - z], [f.x + z, f.y + z]);
    });
    if (hp) {
      hp.band.forEach((b) => all.push(b.p));
      hp.cups.forEach((c) => {
        const r = (HP.r ?? 45) * 1.2;
        all.push([c.x - r, c.y - r], [c.x + r, c.y + r]);
      });
    }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of all) {
      const f = toF(p);
      x0 = Math.min(x0, f[0]);
      y0 = Math.min(y0, f[1]);
      x1 = Math.max(x1, f[0]);
      y1 = Math.max(y1, f[1]);
    }
    const bl2 = P.blur ? Math.hypot(P.blur[0], P.blur[1]) : 0;
    const m = 12 * s + 6 + bl2;
    x0 = Math.floor(x0 - m);
    y0 = Math.floor(y0 - m);
    x1 = Math.ceil(x1 + m);
    y1 = Math.ceil(y1 + m);
    const cw = Math.max(1, Math.round((x1 - x0) * res)), ch = Math.max(1, Math.round((y1 - y0) * res));
    const cv = canvas || document.createElement("canvas");
    if (cv.width !== cw || cv.height !== ch) {
      cv.width = cw;
      cv.height = ch;
    }
    const g2 = cv.getContext("2d", { willReadFrequently: true });
    g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.clearRect(0, 0, cw, ch);
    g2.setTransform(res * s * fl * ca, res * s * fl * sa, -res * s * sa, res * s * ca, res * (P.x - x0), res * (P.y - y0));
    PPU2 = s * res;
    setPPU(PPU2);
    const plu = { light: Lu };
    const hatchCol = gv(0.3, 0.45);
    const layers = {
      farHP() {
        if (!hp) return;
        for (const sg of hp.segs) if (!sg.front) drawBandS(g2, sg.pts, HP.w ?? 13);
        for (const c of hp.cups) if (c.z < -0.02) drawCupS(g2, { x: c.x, y: c.y, r: (HP.r ?? 45) * (HP.farR ?? 0.92), rot: H2.roll, open: c.open, side: c.side });
      },
      tail() {
        tail.slice().reverse().forEach((f) => {
          const sh = leaf2(f);
          plumage(g2, blobPath3(sh), { base: 0.95, shade: 0.76, depth: f.w * 0.3, blur: f.w * 0.2, ...plu });
          ink2(g2, sh.slice(1, 6), 1.2, gv(0.12, 0.95), { end: 0.2 });
        });
      },
      body() {
        if (!body) return;
        const bp = blobPath3(body), b = P.body;
        plumage(g2, bp, { base: 0.97, shade: 0.8, depth: b.a * 0.3, blur: b.a * 0.1, ...plu });
        softShade(g2, bp, (c) => {
          const q = add2([b.x || 0, b.y || 0], V.rot([b.a * 0.1, b.b * 0.95], b.rot));
          c.ellipse(q[0], q[1], b.a * 0.9, b.b * 0.35, b.rot, 0, TAU2);
        }, 0.66, 0.35, b.b * 0.2);
        if (dl > 0.25) {
          rimHatch(g2, body, { light: Lu, flow: [0, 1], len: b.a * 0.08, step: 3.6, w: 0.9, color: hatchCol, seed: 12, density: 0.8, bend: 0.6 });
          const r = rng(19);
          g2.save();
          g2.beginPath();
          bp(g2);
          g2.clip();
          for (let i = 0; i < 90; i++) {
            const a = r() * TAU2, d = Math.sqrt(r());
            const q = add2([b.x || 0, b.y || 0], V.rot([Math.cos(a) * b.a * d, Math.sin(a) * b.b * d], b.rot));
            const lower = (q[1] - (b.y || 0)) / b.b;
            if (lower < -0.2 && r() < 0.7) continue;
            flick(g2, q, nrm2([0.25 * (r() - 0.5), 1]), b.a * 0.1 * (0.6 + 0.8 * r()), 0.8, gv(0.5, 0.22 + 0.15 * Math.max(0, lower)), 0.15);
          }
          g2.restore();
          for (let i = 0; i < 26; i++) {
            const a = r() * TAU2, d = Math.sqrt(r()) * 0.75;
            const c = add2([b.x || 0, b.y || 0], V.rot([Math.cos(a) * b.a * d, Math.sin(a) * b.b * d], b.rot));
            const L = b.a * 0.05 * (0.7 + 0.6 * r());
            ink2(g2, [add2(c, [-L, -L * 0.5]), c, add2(c, [L, -L * 0.5])], 0.8, gv(0.5, 0.35), { end: 0.2 });
          }
        }
        ink2(g2, [...body, body[0]], 1.2, gv(0.3, 0.55), { end: 0.6, per: 3 });
      },
      head() {
        const hpth = blobPath3(H2.out);
        if (P.tuft) {
          const tf = P.tuft, r = rng(tf.seed ?? 44), root = [H2.x + tf.dx, H2.y + tf.dy];
          for (let k = 0; k < (tf.n ?? 3); k++) {
            const f = (tf.n ?? 3) === 1 ? 0 : k / ((tf.n ?? 3) - 1) - 0.5;
            const d = [Math.cos(tf.ang + f * (tf.spread ?? 0.6)), Math.sin(tf.ang + f * (tf.spread ?? 0.6))];
            const L = tf.len * (1 - 0.35 * Math.abs(f)) * (0.9 + 0.2 * r()), w = tf.len * (tf.w ?? 0.34);
            const b0 = add2(root, mul2(perp2(d), -w / 2)), b1 = add2(root, mul2(perp2(d), w / 2)), tip = add2(root, mul2(d, L));
            const sh = [b0, add2(V.mix(b0, tip, 0.55), mul2(perp2(d), -w * 0.12)), tip, add2(V.mix(b1, tip, 0.55), mul2(perp2(d), w * 0.1)), b1];
            plumage(g2, blobPath3(sh), { base: 0.97, shade: 0.88, depth: 3, blur: 2, ...plu });
            ink2(g2, sh.slice(0, 4), 1, gv(0.3, 0.8), { end: 0.2 });
          }
        }
        plumage(g2, hpth, { base: 0.97, shade: 0.82, depth: H2.ry * 0.36, blur: H2.ry * 0.1, keep: [0, H2.ry * 0.5], ...plu });
        if (hp) {
          const nc = hp.cups.find((c) => c.z >= 0);
          if (nc) softShade(g2, hpth, (c) => c.ellipse(nc.x - nc.side * (HP.r ?? 45) * 0.7, nc.y + 4, (HP.r ?? 45) * 0.5, (HP.r ?? 45) * 1.2, H2.roll, 0, TAU2), 0.66, 0.45, 12);
        }
        if (dl > 0.25) rimHatch(g2, H2.out, { light: Lu, flow: [0, 1], len: H2.ry * 0.14, step: 3, w: 0.9, color: hatchCol, seed: 22, density: 0.7, thr: 0.15 });
        ink2(g2, [...H2.out, H2.out[0]], 1.2, gv(0.3, 0.5), { end: 0.6, per: 3 });
        if (P.disc ?? 1) {
          const top = H2.P(E3.az ?? 0, (E3.el ?? -0.1) + 0.5, 1);
          for (const e of eyes) {
            if (e.nz < 0.25) continue;
            const sd = e.side, R = e.r;
            const q = [
              [top.x, top.y],
              add2([e.x, e.y], V.rot([sd * R * 0.35 * e.sx, -R * 1.75], H2.roll)),
              add2([e.x, e.y], V.rot([sd * R * 1.65 * e.sx, -R * 0.95], H2.roll)),
              add2([e.x, e.y], V.rot([sd * R * 1.95 * e.sx, R * 0.55], H2.roll)),
              add2([e.x, e.y], V.rot([sd * R * 1.2 * e.sx, R * 1.85], H2.roll))
            ];
            ink2(g2, q, 1.1, gv(0.42, 0.7), { end: 0.15, bias: 0.4 });
          }
        }
        for (const e of eyes) {
          if (e.nz < 0.12) continue;
          drawEye(g2, { x: e.x, y: e.y, r: e.r, sx: e.sx, rot: H2.roll, side: e.side, state: E3.state || "wide", look: E3.look, ...E3.over || {}, ...e.side < 0 ? E3.left : E3.right });
          if (!(E3.state === "closed")) {
            const lk = (e.side < 0 ? E3.left?.look : E3.right?.look) || E3.look || [0, 0], pr = E3.over?.pupil ?? 0.26;
            const px = e.x + lk[0] * (1 - pr) * 0.95 * e.r * e.sx, py = e.y + lk[1] * (1 - pr) * 0.95 * e.r;
            g2.fillStyle = gv(0.97, 0.95);
            g2.beginPath();
            g2.arc(px - e.r * pr * 0.3, py - e.r * pr * 0.35, Math.max(e.r * pr * 0.28, 0.5 / PPU2), 0, TAU2);
            g2.fill();
          }
        }
        drawBeak(g2, { x: bq.x, y: bq.y, w: B2.w ?? 26, l: B2.l ?? 30, rot: H2.roll + (B2.rot ?? 0), turn: B2.turn ?? H2.yaw * 1.5, open: B2.open ?? 0, smirk: 0 });
        if (P.plaster) {
          const pl = P.plaster, q = H2.P(pl.az ?? 0, pl.el ?? 0.9, 1);
          if (q.nz > 0) drawPlaster(g2, { x: q.x, y: q.y, w: pl.w ?? 36, h: pl.h ?? 11, rot: H2.roll + (pl.rot ?? 0), sx: 0.4 + 0.6 * Math.max(0, Math.cos(H2.yaw - (pl.az ?? 0))) });
        }
        if (P.freckles !== false) {
          for (const e of eyes) {
            if (e.nz < 0.5) continue;
            const c = add2([e.x, e.y], V.rot([-e.side * e.r * 0.9 * e.sx, e.r * 1.35], H2.roll));
            g2.fillStyle = gv(0.4, 0.6);
            for (const [dx, dy] of [[0, 0], [-3.5, 2.5]]) {
              g2.beginPath();
              g2.arc(c[0] + dx * e.side, c[1] + dy, Math.max(1.1, 0.6 / PPU2), 0, TAU2);
              g2.fill();
            }
          }
        }
      },
      nearHP() {
        if (!hp) return;
        for (const sg of hp.segs) if (sg.front) drawBandS(g2, sg.pts, HP.w ?? 13);
        for (const c of hp.cups) if (c.z >= -0.02) drawCupS(g2, { x: c.x, y: c.y, r: HP.r ?? 45, rot: H2.roll + (HP.cupRot ?? 0), open: HP.open ?? c.open, side: c.side });
      }
    };
    wings.forEach((G2, i) => {
      layers["wing:" + i] = () => paintWing(g2, G2, plu, dl);
    });
    (P.feet || []).forEach((f, i) => {
      layers["foot:" + i] = () => drawFootS(g2, f);
    });
    const order = P.order || ORDER;
    for (const name of order) if (layers[name]) layers[name]();
    PPU2 = 1;
    setPPU(1);
    if (P.tone === true && dl > 0.3) {
      g2.setTransform(1, 0, 0, 1, 0, 0);
      screentone(cv, { pitch: 4.2 * res });
    }
    g2.setTransform(1, 0, 0, 1, 0, 0);
    return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0, toF, H: H2, eyes, bq, cups: hp ? hp.cups : [] };
  }
  var SCR = null;
  var SCR2 = null;
  function drawOwlS17(ctx, P) {
    if (!SCR) SCR = document.createElement("canvas");
    const L = owlS17Layer(P, SCR);
    const bl2 = P.blur ? Math.hypot(P.blur[0], P.blur[1]) : 0;
    if (bl2 > 1) {
      if (!SCR2) SCR2 = document.createElement("canvas");
      const pad = Math.ceil(bl2 / 2) + 2, w = L.canvas.width + 2 * pad, h = L.canvas.height + 2 * pad;
      if (SCR2.width !== w || SCR2.height !== h) {
        SCR2.width = w;
        SCR2.height = h;
      }
      const g2 = SCR2.getContext("2d");
      g2.setTransform(1, 0, 0, 1, 0, 0);
      g2.globalCompositeOperation = "source-over";
      g2.globalAlpha = 1;
      g2.clearRect(0, 0, w, h);
      g2.globalCompositeOperation = "lighter";
      const n = 7, wts = [];
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1) - 0.5;
        wts.push(Math.exp(-f * f * 6));
      }
      const ws = wts.reduce((a, b) => a + b, 0);
      const sx = L.canvas.width / L.w;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1) - 0.5;
        g2.globalAlpha = wts[i] / ws;
        g2.drawImage(L.canvas, pad + P.blur[0] * f * sx, pad + P.blur[1] * f * sx);
      }
      g2.globalCompositeOperation = "source-over";
      g2.globalAlpha = 1;
      ctx.drawImage(SCR2, L.x - pad / sx, L.y - pad / sx, w / sx, h / sx);
    } else {
      ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
    }
    return L;
  }

  // ../../src/shots/s17/steam.js
  var STEAM_BOX = [812, 356, 868, 467];
  var MUG_TOP = 466;
  function drawSteam(ctx, t, bg = "#030303") {
    const [x0, y0, x1, y1] = STEAM_BOX;
    ctx.save();
    ctx.fillStyle = bg;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    const td = t;
    for (let i = 0; i < 2; i++) {
      const top = 100 - 10 * i, lam = 50 + 4 * i, ph = i * 1.7 + 0.4;
      const pts = [];
      for (let h = 4; h <= top; h += 2) {
        const f = Math.min(1, h / top);
        const A2 = 3 + 8 * Math.pow(f, 0.8);
        const x = 838 + 8 * i + A2 * Math.sin(2 * Math.PI * h / lam - 3.4 * td + ph) + 3 * Math.sin(0.7 * td + 1.3 * i) * f;
        pts.push([x, MUG_TOP - h]);
      }
      const q = sampleCurve(pts, 2);
      const g0 = ((0.35 * td + 0.5 * i) % 1 + 1) % 1;
      let seg = [];
      const flush = () => {
        if (seg.length > 3) taper(ctx, seg, (u) => 1.9 * Math.pow(Math.sin(Math.PI * Math.min(1, u)), 0.4), "rgba(228,228,228,0.85)");
        seg = [];
      };
      for (let k = 0; k < q.length; k++) {
        const u = k / (q.length - 1);
        const d = Math.abs(u - (0.3 + 0.6 * g0));
        if (d < 0.035) flush();
        else seg.push(q[k]);
      }
      flush();
    }
    ctx.restore();
  }

  // ../../src/shots/s17.js
  var Z = [
    [-0.04, 2.1718],
    [0, 1.9529],
    [0.04, 1.7763],
    [0.08, 1.6346],
    [0.12, 1.5126],
    [0.16, 1.4111],
    [0.2, 1.3299],
    [0.24, 1.2619],
    [0.28, 1.207],
    [0.32, 1.1592],
    [0.36, 1.122],
    [0.4, 1.0911],
    [0.44, 1.0673],
    [0.48, 1.0471],
    [0.52, 1.0319],
    [0.56, 1.0204],
    [0.6, 1.0124],
    [0.64, 1.0066],
    [0.68, 1.0029],
    [0.72, 1]
  ];
  var FX = 865;
  var FY = 341;
  function zoomAt(t) {
    if (t <= Z[0][0]) return Z[0][1];
    for (let i = 1; i < Z.length; i++) if (t <= Z[i][0]) {
      const [a, va] = Z[i - 1], [b, vb] = Z[i];
      return va + (vb - va) * ((t - a) / (b - a));
    }
    return 1;
  }
  function mugPath(c) {
    c.moveTo(816, 466);
    c.lineTo(872, 466);
    c.lineTo(868, 523);
    c.lineTo(820, 523);
    c.closePath();
    for (const x of [818, 870]) {
      c.moveTo(x + 16.5, 500);
      c.ellipse(x, 500, 16.5, 17.5, 0, 0, Math.PI * 2);
      c.moveTo(x + 9.5, 500);
      c.ellipse(x, 500, 9.5, 10.5, 0, Math.PI * 2, 0, true);
    }
  }
  var EYES = [[1021, 1054, 1037], [1085, 1119, 1101]];
  function eyeShift(t) {
    return t < 52.86 ? 0 : t < 52.9 ? -2.5 : t < 52.94 ? -3.5 : -4.5;
  }
  function eyePath(c, [x0, x1, cx]) {
    const e = [[x0, 286], [cx - 9, 281], [cx + 7, 280.5], [x1, 285], [cx + 7, 290.5], [cx - 7, 291]];
    smoothPath(c, e, true);
  }
  function drawEyes(ctx, page, dx) {
    for (const E3 of EYES) {
      ctx.save();
      ctx.beginPath();
      eyePath(ctx, E3);
      ctx.clip();
      ctx.beginPath();
      ctx.rect(E3[0] - 4, 270, E3[1] - 8 - (E3[0] - 4), 30);
      ctx.clip();
      ctx.drawImage(page, dx, 0, PAGE_W, PAGE_H);
      ctx.restore();
    }
  }
  var SHUTTER = 5e-3;
  var NBLUR = 3;
  var CS = 2;
  var COMP = null;
  function composite(t, page2) {
    if (!COMP) {
      COMP = document.createElement("canvas");
      COMP.width = PAGE_W * CS;
      COMP.height = PAGE_H * CS;
    }
    const g2 = COMP.getContext("2d");
    g2.setTransform(CS, 0, 0, CS, 0, 0);
    g2.globalAlpha = 1;
    g2.globalCompositeOperation = "source-over";
    g2.imageSmoothingQuality = "high";
    g2.drawImage(page2, 0, 0, PAGE_W, PAGE_H);
    drawSteam(g2, drawTick(t));
    const p = owlFrame(t);
    if (p) drawOwlS17(g2, { ...p, res: CS });
    g2.setTransform(1, 0, 0, 1, 0, 0);
    return COMP;
  }
  var shot = {
    draw(ctx, local, t0) {
      const t = Math.round(t0 * 25) / 25;
      local = t - 47.84;
      const z = zoomAt(local);
      if (local < 0.7) {
        const comp = composite(t, sokoPageCanvas({ gaze: "owl", scale: CS }));
        ctx.save();
        ctx.imageSmoothingQuality = "high";
        for (let i = 0; i < NBLUR; i++) {
          const zi = zoomAt(local + (i / (NBLUR - 1) - 0.5) * SHUTTER);
          ctx.setTransform(zi, 0, 0, zi, FX - zi * FX, FY - zi * FY);
          ctx.globalAlpha = 1 / (i + 1);
          ctx.drawImage(comp, 0, 0, PAGE_W, PAGE_H);
        }
        ctx.restore();
        return;
      }
      if (COMP) {
        COMP.width = COMP.height = 0;
        COMP = null;
      }
      const page = sokoPageCanvas({ gaze: "owl", scale: 1 });
      ctx.save();
      ctx.translate(FX, FY);
      ctx.scale(z, z);
      ctx.translate(-FX, -FY);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(page, 0, 0, PAGE_W, PAGE_H);
      drawSteam(ctx, drawTick(t));
      const ex = eyeShift(t);
      if (ex) drawEyes(ctx, page, ex);
      ctx.restore();
      const p = owlFrame(t);
      if (p) {
        const q = { ...p, x: FX + z * (p.x - FX), y: FY + z * (p.y - FY), s: p.s * z };
        if (p.blur) q.blur = [p.blur[0] * z, p.blur[1] * z];
        drawOwlS17(ctx, q);
        if (t >= 52.56 - 1e-6 && t < 52.78) {
          ctx.save();
          ctx.translate(FX, FY);
          ctx.scale(z, z);
          ctx.translate(-FX, -FY);
          ctx.beginPath();
          mugPath(ctx);
          ctx.clip();
          ctx.drawImage(page, 0, 0, PAGE_W, PAGE_H);
          ctx.restore();
        }
      }
    },
    release() {
      releaseSoko();
      if (COMP) {
        COMP.width = COMP.height = 0;
        COMP = null;
      }
    }
  };

  // timing.js
  var W = 2206;
  var H = 946;
  var paint = document.createElement("canvas");
  paint.width = W;
  paint.height = H;
  var g = paint.getContext("2d");
  var out = [];
  for (const t of window.LAB.times) {
    const a = performance.now();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    g.save();
    shot.draw(g, t - 47.84, t);
    g.restore();
    g.getImageData(0, 0, 1, 1);
    out.push(Math.round(performance.now() - a));
  }
  var pre = document.createElement("pre");
  pre.id = "o";
  pre.textContent = JSON.stringify(out);
  document.documentElement.appendChild(pre);
})();
