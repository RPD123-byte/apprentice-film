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
  var clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;

  // ../../src/lib/ink.js
  var INK = "#f2f0ea";
  function taper(ctx2, pts, w, color = INK) {
    if (pts.length < 2) return;
    const L5 = [], R = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      const hw = (typeof w === "function" ? w(i / (n - 1)) : w) / 2;
      L5.push([p[0] - dy * hw, p[1] + dx * hw]);
      R.push([p[0] + dy * hw, p[1] - dx * hw]);
    }
    ctx2.beginPath();
    ctx2.moveTo(L5[0][0], L5[0][1]);
    for (let i = 1; i < n; i++) ctx2.lineTo(L5[i][0], L5[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx2.lineTo(R[i][0], R[i][1]);
    ctx2.closePath();
    ctx2.fillStyle = color;
    ctx2.fill();
  }

  // ../../src/lib/paths.js
  function smoothPath(ctx2, pts, closed = false, tension = 0.5) {
    const n = pts.length;
    if (n < 2) return;
    const P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    ctx2.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const k = tension / 3;
      ctx2.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
    }
    if (closed) ctx2.closePath();
  }
  function sampleCurve(pts, per = 8, closed = false) {
    const n = pts.length, out = [];
    const P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let j = 0; j < per; j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(closed ? pts[0] : pts[n - 1]);
    return out;
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
  var blobPath = (pts) => (c) => smoothPath(c, pts, true);
  var PPU = 1;
  function setPPU(v) {
    PPU = v;
  }
  var MINW = 0.7;
  var wmin = (w) => Math.max(w, MINW / PPU);
  function ink(g, pts, w, color = LINE, { per = 6, end = 0.2, bias = 0.5, pow = 0.55 } = {}) {
    if (pts.length < 2) return;
    const q = sampleCurve(pts.length > 2 ? pts : [pts[0], pts[1]], pts.length > 2 ? per : 4);
    const W = wmin(w);
    taper(g, q, (u) => {
      const k = Math.pow(Math.sin(Math.PI * clamp(u < bias ? u / bias * 0.5 : 0.5 + (u - bias) / (1 - bias) * 0.5)), pow);
      return W * (end + (1 - end) * k);
    }, color);
  }
  function flick(g, p, dir, L5, w, color, curve = 0.12) {
    const n = perp(dir);
    const q = [p, add(add(p, mul(dir, L5 * 0.5)), mul(n, L5 * curve)), add(p, mul(dir, L5))];
    const W = wmin(w);
    taper(g, sampleCurve(q, 4), (u) => W * Math.pow(1 - u, 0.7) * Math.min(1, 0.35 + u * 5), color);
  }
  function walk(poly, step, seed, fn, { from = 0, to = 1, jitter = 0.6 } = {}) {
    const L5 = [0];
    for (let i2 = 1; i2 < poly.length; i2++) L5.push(L5[i2 - 1] + Math.hypot(poly[i2][0] - poly[i2 - 1][0], poly[i2][1] - poly[i2 - 1][1]));
    const total = L5[L5.length - 1];
    if (total <= 0) return;
    const r = rng(seed);
    let d = from * total + step * r(), i = 1;
    while (d < to * total) {
      while (i < L5.length - 1 && L5[i] < d) i++;
      const a = poly[i - 1], b = poly[i], f = (d - L5[i - 1]) / Math.max(1e-6, L5[i] - L5[i - 1]);
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
  var inward = (t, cw2) => cw2 ? [-t[1], t[0]] : [t[1], -t[0]];
  function rimHatch(g, outline, o = {}) {
    const { light = [-0.55, -0.83], thr = 0.05, step = 4, len = 20, w = 1, color = gv(0.33, 0.55), flow = [0, 1], bend = 0.35, seed = 9, closed = true, from = 0, to = 1, density = 1 } = o;
    const poly = sampleCurve(outline, 6, closed);
    const cw2 = area(poly) > 0;
    const fl = nrm(flow);
    walk(poly, step, seed, (p, t, u, r) => {
      const n = inward(t, cw2);
      const facing = n[0] * light[0] + n[1] * light[1];
      const k = (facing - thr) / (1 - thr);
      if (k <= 0 || r() > density * (0.25 + 0.75 * k)) return;
      const d = nrm(add(mul(n, 1 - bend), mul(fl, bend)));
      flick(g, add(p, mul(n, 0.5 + r() * 2)), V.rot(d, (r() - 0.5) * 0.35), len * (0.35 + 0.9 * k) * (0.6 + 0.7 * r()), w * (0.7 + 0.6 * r()), color, (r() - 0.5) * 0.25);
    }, { from, to });
  }
  function plumage(g, path, o = {}) {
    const { base = 0.97, shade = 0.8, light = [-0.55, -0.83], depth = 30, blur = 12, keep = null } = o;
    g.save();
    g.beginPath();
    path(g);
    g.clip();
    g.fillStyle = gv(shade);
    g.fill();
    g.filter = `blur(${Math.max(0.4, blur * PPU).toFixed(2)}px)`;
    g.fillStyle = gv(base);
    for (const off of keep ? [[light[0] * depth, light[1] * depth], [light[0] * depth * 0.4 + keep[0], light[1] * depth * 0.4 + keep[1]]] : [[light[0] * depth, light[1] * depth]]) {
      g.save();
      g.translate(off[0], off[1]);
      g.beginPath();
      path(g);
      g.fill();
      g.restore();
    }
    g.filter = "none";
    g.restore();
  }
  function softShade(g, clipPath, shape, value, alpha, blur) {
    g.save();
    g.beginPath();
    clipPath(g);
    g.clip();
    g.filter = `blur(${Math.max(0.4, blur * PPU).toFixed(2)}px)`;
    g.fillStyle = gv(value, alpha);
    g.beginPath();
    shape(g);
    g.fill();
    g.filter = "none";
    g.restore();
  }
  function screentone(canvas, { pitch = 4.2, amp = 0.2, white = 0.93, range = 0.3, x = 0, y = 0, w = canvas.width, h = canvas.height } = {}) {
    const g = canvas.getContext("2d");
    w = Math.min(w, canvas.width - x);
    h = Math.min(h, canvas.height - y);
    if (w <= 0 || h <= 0) return;
    const img = g.getImageData(x, y, w, h), d = img.data;
    const k = 1 / (pitch * Math.SQRT2);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const o = (j * w + i) * 4;
        if (d[o + 3] < 8) continue;
        const L5 = d[o] / 255;
        if (L5 > white || L5 < 0.22) continue;
        const t = Math.min(1, (white - L5) / range) * Math.min(1, (L5 - 0.22) / 0.2);
        const X = i + x, Y = j + y;
        const fa = Math.abs((X + Y) * k % 1 - 0.5) * 2, fb = Math.abs((X - Y + 8192) * k % 1 - 0.5) * 2;
        const m = Math.max(1 - Math.min(1, fa * 2.6), 1 - Math.min(1, fb * 2.6));
        const v = Math.max(0, Math.min(255, (L5 - amp * t * (m - 0.3)) * 255));
        d[o] = d[o + 1] = d[o + 2] = v;
      }
    }
    g.putImageData(img, x, y);
  }
  function headGeom(h) {
    const { x = 0, y = 0, rx = 109, ry = 100, yaw = 0, pitch = 0, roll = 0, square = 2.6, jowl = 0.05 } = h;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const toFrame = (px, py) => [x + px * cr - py * sr, y + px * sr + py * cr];
    const P = (az, el, lift = 1) => {
      const nx = Math.sin(az) * Math.cos(el), ny = -Math.sin(el), nz = Math.cos(az) * Math.cos(el);
      const x12 = nx * Math.cos(yaw) + nz * Math.sin(yaw), z1 = -nx * Math.sin(yaw) + nz * Math.cos(yaw);
      const y2 = ny * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = ny * Math.sin(pitch) + z1 * Math.cos(pitch);
      const p = toFrame(x12 * rx * lift, y2 * ry * lift);
      return { x: p[0], y: p[1], nx: x12, ny: y2, nz: z2 };
    };
    const shape = (t) => {
      const c = Math.cos(t), s = Math.sin(t), n = s < 0 ? square : 2.15;
      let px = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx;
      const py = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry;
      if (s > 0) px *= 1 + jowl * Math.sin(Math.PI * s);
      return [px, py];
    };
    const out = [];
    const N = 56;
    for (let i = 0; i < N; i++) {
      const q = shape(i / N * TAU - Math.PI / 2);
      out.push(toFrame(q[0], q[1]));
    }
    const at = (phi) => {
      const t = phi - Math.PI / 2, a = shape(t), b = shape(t + 0.01);
      const tan = V.rot(nrm(sub(b, a)), roll);
      return { p: toFrame(a[0], a[1]), n: [tan[1], -tan[0]] };
    };
    return { x, y, rx, ry, yaw, pitch, roll, P, out, at, toFrame };
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
  function drawEye(g, e) {
    const st = { ...EYE_STATES[e.state || "stare"] };
    for (const k of ["lid", "pupil", "slant", "curve", "brow", "low", "lidW", "ext", "peak"]) if (e[k] !== void 0) st[k] = e[k];
    const r = e.r * (st.scale || 1), side = e.side || 1, sx = e.sx ?? 1, outer = side > 0 ? 1 : -1;
    const PPU0 = PPU;
    PPU = PPU0 * r;
    const u = (w) => wmin(w / r);
    g.save();
    g.translate(e.x, e.y);
    g.rotate(e.rot || 0);
    g.scale(sx * r, r);
    g.lineCap = "round";
    g.lineJoin = "round";
    if (st.closed) {
      ink(g, [[-1.05, 0.02], [-0.45, 0.26], [0.15, 0.3], [0.65, 0.16], [1.05, -0.08]].map(([a, b]) => [a * outer, b]), u(4.4), LINE, { end: 0.1, bias: 0.45 });
      ink(g, [[1, -0.04], [1.18, -0.2]].map(([a, b]) => [a * outer, b]), u(1.6), LINE, { end: 0.1 });
      g.globalAlpha = 0.3;
      ink(g, [[-0.95, -0.25], [-0.5, -0.75], [0.2, -0.9], [0.85, -0.55]], u(1.4), gv(0.35));
      g.globalAlpha = 1;
      g.restore();
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
    g.fillStyle = gv(0.97);
    g.beginPath();
    opening(g);
    g.fill();
    const pr = st.pupil, look = e.look || [0, 0];
    const px = look[0] * (1 - pr) * 0.95, py = look[1] * (1 - pr) * 0.95;
    g.save();
    g.beginPath();
    opening(g);
    g.clip();
    g.fillStyle = "#060606";
    g.beginPath();
    g.arc(px, py, pr, 0, TAU);
    g.fill();
    if (st.scale) {
      g.strokeStyle = LINE;
      g.lineWidth = u(1.1);
      g.beginPath();
      g.arc(px, py, pr * 1.9, 0, TAU);
      g.stroke();
      g.fillStyle = gv(0.97);
      g.beginPath();
      g.arc(px - pr * 0.3, py - pr * 0.3, pr * 0.3, 0, TAU);
      g.fill();
    }
    if (st.low > 0) {
      g.fillStyle = gv(e.plumage ?? 0.95);
      g.fillRect(-1.3, 1 - 2 * st.low, 2.6, 2 * st.low + 0.4);
    }
    g.restore();
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
    taper(g, rimPts, (t) => rw * (0.45 + 0.95 * Math.pow(Math.sin(Math.PI * t), 1.3)), LINE);
    if (!st.scale) taper(g, arcPts(0.55, 1.65, 0.9, 14).map(([a, b]) => [-a * outer, b]), (t) => rw * 0.45 * Math.sin(Math.PI * t), LINE);
    const p0 = lidPts[0], p1 = lidPts[N], q1 = lidPts[N - 3];
    const td = nrm(sub(p1, q1));
    const seq = [[p0[0] - outer * 0.17, p0[1] + 0.1], ...lidPts, add(p1, add(mul(td, 0.1), [0, -0.06])), add(p1, add(mul(td, 0.2), [outer * 0.06, -0.2]))];
    const pk = st.peak ?? 0.45;
    taper(g, seq, (t) => {
      const k = t < pk ? Math.pow(t / pk, 0.8) : t > 0.86 ? Math.pow(Math.max(0, (1 - t) / 0.14), 0.8) : 1 - 0.3 * (t - pk) / (0.86 - pk);
      return st.lidW * (0.05 + 0.95 * k) + u(0.35);
    }, "#070707");
    if (st.low > 0) ink(g, [[-0.9, 1 - 2 * st.low + 0.12], [0, 1 - 2 * st.low - 0.02], [0.9, 1 - 2 * st.low + 0.12]], u(1.8), LINE, { end: 0.1 });
    g.restore();
    PPU = PPU0;
    if (st.brow) {
      g.save();
      g.translate(e.x, e.y);
      g.rotate(e.rot || 0);
      const b = st.brow, inner = -side;
      const y02 = -r * (1.25 - 0.2 * b), yIn = y02 + r * 0.5 * b * (st.slant > 0.2 ? 1 : 0.3);
      ink(g, [[-inner * r * 1.05 * sx, y02 - r * 0.08], [0, y02 + (yIn - y02) * 0.4], [inner * r * 0.95 * sx, yIn]], r * 0.14 * b + 1.2, LINE, { end: 0.25, bias: 0.6 });
      g.restore();
    }
  }
  function drawBeak(g, b) {
    const { x, y, w = 30, l = 40, rot = 0, turn = 0, open = 0, smirk = 0 } = b;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    const k = clamp(turn, -1, 1);
    const tip = [w * 0.05 + k * w * 0.05, l];
    const Lft = [[-w * 0.48, l * 0.02], [-w * 0.53, l * 0.3], [-w * 0.38, l * 0.68], tip];
    const Rt = [tip, [w * 0.22, l * 0.76], [w * 0.46, l * 0.44], [w * 0.5, l * 0.12], [w * 0.3, -l * 0.04], [-w * 0.05, -l * 0.06]];
    const path = blobPath([...Lft, ...Rt.slice(1)]);
    g.save();
    g.beginPath();
    path(g);
    g.clip();
    g.fillStyle = gv(0.86);
    g.fill();
    g.filter = `blur(${Math.max(0.4, w * 0.1 * PPU).toFixed(2)}px)`;
    g.fillStyle = gv(0.58, 0.85);
    g.beginPath();
    g.ellipse(w * 0.42, l * 0.6, w * 0.3, l * 0.32, -0.5, 0, TAU);
    g.fill();
    g.fillStyle = gv(0.98, 0.9);
    g.beginPath();
    g.ellipse(-w * 0.15, l * 0.22, w * 0.2, l * 0.22, 0.2, 0, TAU);
    g.fill();
    g.filter = "none";
    g.restore();
    if (open > 0.02) {
      const o = open;
      g.fillStyle = "#151515";
      g.beginPath();
      smoothPath(g, [[w * 0.5, l * 0.4], [w * 0.3, l * 0.72], tip, [w * 0.05, l * (0.95 + 0.45 * o)], [w * 0.44, l * (0.7 + 0.25 * o)]], true);
      g.fill();
      g.fillStyle = gv(0.82);
      g.beginPath();
      smoothPath(g, [[w * 0.12, l * (0.9 + 0.3 * o)], [w * 0.4, l * (0.72 + 0.25 * o)], [w * 0.48, l * (0.82 + 0.3 * o)], [w * 0.1, l * (1.08 + 0.42 * o)]], true);
      g.fill();
      ink(g, [[w * 0.48, l * (0.72 + 0.25 * o)], [w * 0.3, l * (0.95 + 0.35 * o)], [w * 0.06, l * (1.08 + 0.42 * o)]], w * 0.07, LINE);
    } else {
      g.fillStyle = gv(0.3, 0.92);
      g.beginPath();
      smoothPath(g, [[w * 0.5, l * 0.38], [w * 0.36, l * 0.56], [w * 0.16, l * 0.8], [w * 0.28, l * 0.58]], true);
      g.fill();
      g.fillStyle = gv(0.7, 0.9);
      g.beginPath();
      smoothPath(g, [[w * 0.42, l * 0.5], [w * 0.3, l * 0.6], [w * 0.2, l * 0.72], [w * 0.3, l * 0.56]], true);
      g.fill();
      ink(g, [[w * 0.56 + smirk * w * 0.1, l * 0.36 - smirk * l * 0.14], [w * 0.36, l * 0.58], [w * 0.14, l * 0.84], tip], w * 0.07, LINE, { end: 0.15 });
    }
    ink(g, [[-w * 0.44, l * 0], ...Lft.slice(1)], w * 0.085, LINE, { end: 0.35, bias: 0.55 });
    ink(g, Rt.slice(0, 4), w * 0.05, LINE, { end: 0.2 });
    ink(g, [[-w * 0.44, 0], [-w * 0.1, -l * 0.07], [w * 0.3, -l * 0.04]], w * 0.03, gv(0.3, 0.5), { end: 0.2 });
    g.fillStyle = LINE;
    g.beginPath();
    g.ellipse(-w * 0.04 - k * w * 0.1, l * 0.28, w * 0.065, w * 0.05, 0, 0, TAU);
    g.fill();
    g.restore();
  }
  function headphoneGeom(H, HP) {
    const yaw = HP.yaw ?? H.yaw, dx = HP.dx ?? 0, dy = HP.dy ?? 0, tilt = HP.tilt ?? 0.15;
    const lift = HP.lift ?? 1.3, bR = HP.bandR ?? 1.3, bH = HP.bandH ?? 1.6, pw = HP.bandPow ?? 0.6;
    const proj = (X, Y, Z) => {
      const x12 = X * Math.cos(yaw) + Z * Math.sin(yaw), z1 = -X * Math.sin(yaw) + Z * Math.cos(yaw);
      const y2 = Y * Math.cos(H.pitch) - z1 * Math.sin(H.pitch), z2 = Y * Math.sin(H.pitch) + z1 * Math.cos(H.pitch);
      return { p: H.toFrame((x12 + dx) * H.rx, (y2 + dy) * H.ry), z: z2 };
    };
    const band = [];
    const N = 40, cupTop = (HP.r ?? 50) / H.ry * 0.85;
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
    const out = Array.isArray(a) ? [...a] : { ...a };
    for (const k of Object.keys(b)) {
      const v = b[k];
      out[k] = v && typeof v === "object" && !Array.isArray(v) && a && typeof a[k] === "object" && a[k] && !Array.isArray(a[k]) ? mergePose(a[k], v) : v;
    }
    return out;
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

  // ../../src/shots/s17/owlDraw.js
  var { add: add2, sub: sub2, mul: mul2, nrm: nrm2, perp: perp2 } = V;
  var TAU2 = Math.PI * 2;
  var blobPath2 = (pts) => (c) => smoothPath(c, pts, true);
  var PPU2 = 1;
  var wmin2 = (w) => Math.max(w, 0.7 / PPU2);
  function wingGeom(w) {
    const { lead: L0, tips: T0, cw: cw2 = 0.36, fw = 1, rmax = 0.62, sub: subd = 1 } = w;
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
      const f = feathers[i], L5 = V.len(sub2(f.tip, f.root));
      const a = feathers[Math.max(0, i - 1)].tip, b = feathers[Math.min(n - 1, i + 1)].tip;
      const sp = V.len(sub2(b, a)) / (i > 0 && i < n - 1 ? 2 : 1);
      f.w = clamp(sp * 2.2, L5 * 0.2, L5 * 0.38) * fw;
      trs = add2(trs, nrm2(sub2(f.tip, f.root)));
      Ls += L5;
    }
    for (let i = 0; i < n; i++) {
      const f = feathers[i], u = nrm2(sub2(f.tip, f.root));
      let nn = perp2(u);
      const ref = i < n - 1 ? feathers[i + 1].tip : V.mix(f.root, f.tip, 0.5);
      const side = i < n - 1 ? sub2(ref, f.tip) : sub2(feathers[Math.max(0, i - 1)].tip, f.tip);
      if ((nn[0] * side[0] + nn[1] * side[1]) * (i < n - 1 ? 1 : -1) < 0) nn = mul2(nn, -1);
      f.off = mul2(nn, f.w * (i === 0 ? 0.42 : 0.22));
    }
    const cov = feathers.map((f) => V.mix(f.root, f.tip, cw2));
    return { lead, cov, feathers, tr: nrm2(trs), len: Ls / Math.max(1, n) };
  }
  function leaf(f) {
    const d = sub2(f.tip, f.root), L5 = V.len(d) || 1, u = mul2(d, 1 / L5), n = perp2(u), w = f.w, p = f.point;
    const o = f.off || [0, 0];
    const sh = (q, k) => add2(q, mul2(o, k));
    return [
      sh(add2(f.root, mul2(n, -w * 0.3)), 1),
      sh(add2(add2(f.root, mul2(u, L5 * 0.4)), mul2(n, -w * 0.5)), 0.85),
      sh(add2(add2(f.root, mul2(u, L5 * (0.78 + 0.08 * p))), mul2(n, -w * (0.36 - 0.12 * p))), 0.45),
      f.tip,
      sh(add2(add2(f.root, mul2(u, L5 * (0.78 + 0.08 * p))), mul2(n, w * (0.36 - 0.12 * p))), 0.45),
      sh(add2(add2(f.root, mul2(u, L5 * 0.4)), mul2(n, w * 0.5)), 0.85),
      sh(add2(f.root, mul2(n, w * 0.3)), 1)
    ];
  }
  function paintWing(g, G2, plu, dl) {
    for (let i = 0; i < G2.feathers.length; i++) {
      const f = G2.feathers[i], sh = leaf(f), path = blobPath2(sh);
      plumage(g, path, { base: 0.96, shade: f.kind ? 0.8 : 0.78, depth: f.w * 0.3, blur: f.w * 0.18, ...plu });
      ink(g, sh.slice(1, 6), 1.1, gv(0.25, 0.85), { end: 0.15, bias: 0.6 });
      if (dl > 0.4) {
        const d = nrm2(sub2(f.tip, f.root)), L5 = V.len(sub2(f.tip, f.root)), nn = perp2(d);
        ink(g, [add2(f.root, mul2(d, L5 * 0.3)), add2(f.root, mul2(d, L5 * 0.8))], 0.7, gv(0.55, 0.35), { end: 0.1 });
        const r = rng(900 + i * 7);
        for (let k = 0; k < 4; k++) {
          const u = 0.3 + 0.5 * r(), p0 = add2(add2(f.root, mul2(d, L5 * u)), mul2(nn, f.w * (0.05 + 0.15 * r())));
          flick(g, p0, nrm2(add2(d, mul2(nn, 0.5))), f.w * 0.35, 0.8, gv(0.5, 0.3), 0.1);
        }
      }
    }
    const band = [...G2.lead, ...G2.cov];
    const bp = blobPath2(band);
    plumage(g, bp, { base: 0.97, shade: 0.86, depth: G2.len * 0.15, blur: G2.len * 0.08, ...plu });
    const covIn = [...G2.cov].reverse();
    scallops(g, covIn, G2.tr, G2.len * 0.12, 0.9, gv(0.45, 0.55));
    ink(g, G2.lead, 1.4, gv(0.22, 0.9), { end: 0.25, bias: 0.4 });
  }
  function scallops(g, pts, dir, r, w, color) {
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
      ink(g, [a, m, b], w, color, { end: 0.25 });
    }
  }
  function tailGeom(t) {
    const { base, dir, len = 60, n = 5, spread = 0.9, w = 26, seed = 7 } = t;
    const d0 = nrm2(dir), r = rng(seed), out = [];
    const nb = perp2(d0);
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0 : i / (n - 1) - 0.5;
      const d = V.rot(d0, f * spread);
      const root = add2(base, mul2(nb, f * w * 0.8));
      out.push({ root, tip: add2(root, mul2(d, len * (1 - 0.18 * Math.abs(f) * 2) * (0.95 + 0.1 * r()))), w, point: 0.35, kind: 1 });
    }
    out.sort((a, b) => Math.abs(V.len(sub2(b.root, base))) - Math.abs(V.len(sub2(a.root, base))));
    return out;
  }
  function drawCupS(g, c) {
    const { x, y, r = 45, rot = 0, open = 0.85, side = 1 } = c;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    const s = side, rx = r * open, ry = r;
    const rimX = -s * r * 0.1, RX = rx * 0.98 + r * 0.08, RY = ry;
    g.fillStyle = gv(0.62);
    g.beginPath();
    g.ellipse(rimX, 0, RX, RY, 0, 0, TAU2);
    g.fill();
    g.save();
    g.beginPath();
    g.ellipse(rimX, 0, RX, RY, 0, 0, TAU2);
    g.clip();
    g.lineCap = "butt";
    for (let i = 0; i < 44; i++) {
      const a = i / 44 * TAU2;
      g.strokeStyle = i % 2 ? gv(0.85, 0.9) : gv(0.35, 0.85);
      g.lineWidth = wmin2(r * 0.05);
      g.beginPath();
      g.moveTo(rimX + Math.cos(a) * RX * 0.72, Math.sin(a) * RY * 0.72);
      g.lineTo(rimX + Math.cos(a) * RX * 1.02, Math.sin(a) * RY * 1.03);
      g.stroke();
    }
    g.restore();
    g.strokeStyle = gv(0.12);
    g.lineWidth = wmin2(r * 0.07);
    g.beginPath();
    g.ellipse(rimX, 0, RX, RY, 0, 0, TAU2);
    g.stroke();
    const fx = s * r * 0.14, PX = rx * 0.8, PY = ry * 0.86;
    g.fillStyle = gv(0.9);
    g.beginPath();
    g.ellipse(fx, 0, PX, PY, 0, 0, TAU2);
    g.fill();
    g.save();
    g.beginPath();
    g.ellipse(fx, 0, PX, PY, 0, 0, TAU2);
    g.clip();
    g.filter = `blur(${Math.max(0.4, r * 0.12 * PPU2).toFixed(2)}px)`;
    g.fillStyle = gv(0.98, 0.9);
    g.beginPath();
    g.ellipse(fx - s * PX * 0.25, -PY * 0.3, PX * 0.4, PY * 0.4, 0, 0, TAU2);
    g.fill();
    g.fillStyle = gv(0.62, 0.55);
    g.beginPath();
    g.ellipse(fx + s * PX * 0.5, PY * 0.45, PX * 0.45, PY * 0.5, 0, 0, TAU2);
    g.fill();
    g.filter = "none";
    g.restore();
    g.strokeStyle = gv(0.2, 0.9);
    g.lineWidth = wmin2(r * 0.06);
    g.beginPath();
    g.ellipse(fx, 0, PX, PY, 0, 0, TAU2);
    g.stroke();
    for (const k of [0.62, 0.38]) {
      g.strokeStyle = gv(0.45, 0.6);
      g.lineWidth = wmin2(r * 0.035);
      g.beginPath();
      g.ellipse(fx + s * PX * (1 - k) * 0.2, PY * (1 - k) * 0.08, PX * k, PY * k, 0, 0, TAU2);
      g.stroke();
    }
    g.restore();
  }
  function drawFootS(g, f) {
    const { x, y, rot = 0, size = 40, toes = 3, spread = 0.8, curl = 0.4, claw = 0.3, fat = 0.22, seed = 3, palm = 0.2 } = f;
    const r = rng(seed);
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.lineCap = "round";
    g.lineJoin = "round";
    const tw = size * fat, ol = wmin2(size * 0.045);
    const stroke = (q, w, c) => {
      g.strokeStyle = c;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(q[0][0], q[0][1]);
      for (const p of q) g.lineTo(p[0], p[1]);
      g.stroke();
    };
    if (f.leg) {
      const L5 = V.rot(f.leg, -rot), q = [L5, V.mix(L5, [0, 0], 0.5), [0, 0]];
      stroke(q, tw * 1.25 + ol * 2, gv(0.18));
      stroke(q, tw * 1.25, gv(0.92));
    }
    const toeP = [];
    for (let i = 0; i < toes; i++) {
      const f0 = toes === 1 ? 0 : i / (toes - 1) - 0.5;
      let d = V.rot([0, 1], f0 * spread * 2);
      const L5 = size * (1 - Math.abs(f0) * 0.25) * (0.92 + 0.16 * r());
      const pts = [mul2(perp2(d), -f0 * tw * 0.8)];
      for (let k = 0; k < 3; k++) {
        pts.push(add2(pts[pts.length - 1], mul2(d, L5 / 3)));
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
        ink(g, [add2(p, mul2(n, -tw * 0.45)), add2(p, mul2(tt, tw * 0.15)), add2(p, mul2(n, tw * 0.45))], size * 0.02, gv(0.35, 0.7), { end: 0.3 });
      }
    }
    const pr = size * palm;
    g.fillStyle = gv(0.92);
    g.beginPath();
    g.ellipse(0, pr * 0.2, pr * 0.9, pr * 0.75, 0, 0, TAU2);
    g.fill();
    g.restore();
  }
  function drawBandS(g, pts, w) {
    if (pts.length < 2) return;
    const q = sampleCurve(pts, 6);
    const nrmAt = (i) => {
      const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)];
      return perp2(nrm2(sub2(b, a)));
    };
    const line = (off, lw, c) => {
      const p = q.map((pp, i) => add2(pp, mul2(nrmAt(i), off)));
      g.strokeStyle = c;
      g.lineWidth = lw;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(p[0][0], p[0][1]);
      for (const pp of p) g.lineTo(pp[0], pp[1]);
      g.stroke();
    };
    line(0, w + wmin2(w * 0.35), gv(0.12));
    line(0, w, gv(0.78));
    line(w * 0.22, w * 0.3, gv(0.35, 0.8));
    line(-w * 0.2, w * 0.25, gv(0.96, 0.85));
  }
  function drawPlaster(g, { x, y, w = 36, h = 11, rot = 0, sx = 1 }) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(sx, 1);
    g.fillStyle = gv(0.78);
    g.beginPath();
    g.roundRect(-w / 2, -h / 2, w, h, h * 0.45);
    g.fill();
    g.strokeStyle = gv(0.25, 0.9);
    g.lineWidth = wmin2(1.3);
    g.stroke();
    g.fillStyle = gv(0.62);
    g.beginPath();
    g.roundRect(-w * 0.18, -h * 0.34, w * 0.36, h * 0.68, h * 0.2);
    g.fill();
    g.restore();
  }
  var ORDER = ["farHP", "wing:0", "tail", "body", "foot:0", "wing:1", "head", "nearHP", "foot:1"];
  function owlS17Layer(P, canvas) {
    const s = P.s ?? 1, res = P.res ?? 1, rot = P.rot ?? 0, fl = P.flip ? -1 : 1;
    const ca = Math.cos(rot), sa = Math.sin(rot);
    const toF = ([ux, uy]) => [P.x + s * (ca * fl * ux - sa * uy), P.y + s * (sa * fl * ux + ca * uy)];
    const Lf = P.light || [-0.55, -0.83];
    const Lu = nrm2([fl * (ca * Lf[0] + sa * Lf[1]), -sa * Lf[0] + ca * Lf[1]]);
    const dl = P.detail ?? clamp(s * res / 1, 0.2, 1);
    const H = headGeom(P.head);
    const body = P.body ? bodyOutline(P.body) : null;
    const wings = (P.wings || []).map((w) => wingGeom(w));
    const tail = P.tail ? tailGeom(P.tail) : [];
    const E2 = P.eyes || {};
    const eyes = [-1, 1].map((sd) => {
      const q = H.P(sd * (E2.spread ?? 0.4) + (E2.az ?? 0), E2.el ?? -0.1);
      const nz = Math.max(0.05, q.nz);
      return { x: q.x, y: q.y, nz, side: sd, r: (E2.r ?? 27) * (1 - 0.55 * (1 - nz)), sx: 0.2 + 0.8 * nz };
    });
    const B2 = P.beak || {};
    const bq = H.P(B2.az ?? 0, B2.el ?? -0.45, B2.lift ?? 1.05);
    const HP = P.headphones || {};
    const hp = HP.on ? headphoneGeom(H, HP) : null;
    const all = [...H.out];
    if (body) all.push(...body);
    wings.forEach((G2) => {
      all.push(...G2.lead);
      G2.feathers.forEach((f) => all.push(f.tip));
    });
    tail.forEach((f) => all.push(f.tip, f.root));
    (P.feet || []).forEach((f) => {
      const z2 = (f.size || 15) * 2.4;
      all.push([f.x - z2, f.y - z2], [f.x + z2, f.y + z2]);
    });
    if (hp) {
      hp.band.forEach((b) => all.push(b.p));
      hp.cups.forEach((c) => {
        const r = (HP.r ?? 45) * 1.2;
        all.push([c.x - r, c.y - r], [c.x + r, c.y + r]);
      });
    }
    let x02 = 1e9, y02 = 1e9, x12 = -1e9, y12 = -1e9;
    for (const p of all) {
      const f = toF(p);
      x02 = Math.min(x02, f[0]);
      y02 = Math.min(y02, f[1]);
      x12 = Math.max(x12, f[0]);
      y12 = Math.max(y12, f[1]);
    }
    const bl = P.blur ? Math.hypot(P.blur[0], P.blur[1]) : 0;
    const m = 12 * s + 6 + bl;
    x02 = Math.floor(x02 - m);
    y02 = Math.floor(y02 - m);
    x12 = Math.ceil(x12 + m);
    y12 = Math.ceil(y12 + m);
    const cw2 = Math.max(1, Math.round((x12 - x02) * res)), ch2 = Math.max(1, Math.round((y12 - y02) * res));
    const cv2 = canvas || document.createElement("canvas");
    if (cv2.width !== cw2 || cv2.height !== ch2) {
      cv2.width = cw2;
      cv2.height = ch2;
    }
    const g = cv2.getContext("2d", { willReadFrequently: true });
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cw2, ch2);
    g.setTransform(res * s * fl * ca, res * s * fl * sa, -res * s * sa, res * s * ca, res * (P.x - x02), res * (P.y - y02));
    PPU2 = s * res;
    setPPU(PPU2);
    const plu = { light: Lu };
    const hatchCol = gv(0.3, 0.45);
    const layers = {
      farHP() {
        if (!hp) return;
        for (const sg of hp.segs) if (!sg.front) drawBandS(g, sg.pts, HP.w ?? 13);
        for (const c of hp.cups) if (c.z < -0.02) drawCupS(g, { x: c.x, y: c.y, r: (HP.r ?? 45) * (HP.farR ?? 0.92), rot: H.roll, open: c.open, side: c.side });
      },
      tail() {
        tail.slice().reverse().forEach((f) => {
          const sh = leaf(f);
          plumage(g, blobPath2(sh), { base: 0.95, shade: 0.76, depth: f.w * 0.3, blur: f.w * 0.2, ...plu });
          ink(g, sh.slice(1, 6), 1.2, gv(0.12, 0.95), { end: 0.2 });
        });
      },
      body() {
        if (!body) return;
        const bp = blobPath2(body), b = P.body;
        plumage(g, bp, { base: 0.97, shade: 0.8, depth: b.a * 0.3, blur: b.a * 0.1, ...plu });
        softShade(g, bp, (c) => {
          const q = add2([b.x || 0, b.y || 0], V.rot([b.a * 0.1, b.b * 0.95], b.rot));
          c.ellipse(q[0], q[1], b.a * 0.9, b.b * 0.35, b.rot, 0, TAU2);
        }, 0.66, 0.35, b.b * 0.2);
        if (dl > 0.25) {
          rimHatch(g, body, { light: Lu, flow: [0, 1], len: b.a * 0.08, step: 3.6, w: 0.9, color: hatchCol, seed: 12, density: 0.8, bend: 0.6 });
          const r = rng(19);
          g.save();
          g.beginPath();
          bp(g);
          g.clip();
          for (let i = 0; i < 90; i++) {
            const a = r() * TAU2, d = Math.sqrt(r());
            const q = add2([b.x || 0, b.y || 0], V.rot([Math.cos(a) * b.a * d, Math.sin(a) * b.b * d], b.rot));
            const lower = (q[1] - (b.y || 0)) / b.b;
            if (lower < -0.2 && r() < 0.7) continue;
            flick(g, q, nrm2([0.25 * (r() - 0.5), 1]), b.a * 0.1 * (0.6 + 0.8 * r()), 0.8, gv(0.5, 0.22 + 0.15 * Math.max(0, lower)), 0.15);
          }
          g.restore();
          for (let i = 0; i < 26; i++) {
            const a = r() * TAU2, d = Math.sqrt(r()) * 0.75;
            const c = add2([b.x || 0, b.y || 0], V.rot([Math.cos(a) * b.a * d, Math.sin(a) * b.b * d], b.rot));
            const L5 = b.a * 0.05 * (0.7 + 0.6 * r());
            ink(g, [add2(c, [-L5, -L5 * 0.5]), c, add2(c, [L5, -L5 * 0.5])], 0.8, gv(0.5, 0.35), { end: 0.2 });
          }
        }
        ink(g, [...body, body[0]], 1.2, gv(0.3, 0.55), { end: 0.6, per: 3 });
      },
      head() {
        const hpth = blobPath2(H.out);
        if (P.tuft) {
          const tf = P.tuft, r = rng(tf.seed ?? 44), root = [H.x + tf.dx, H.y + tf.dy];
          for (let k = 0; k < (tf.n ?? 3); k++) {
            const f = (tf.n ?? 3) === 1 ? 0 : k / ((tf.n ?? 3) - 1) - 0.5;
            const d = [Math.cos(tf.ang + f * (tf.spread ?? 0.6)), Math.sin(tf.ang + f * (tf.spread ?? 0.6))];
            const L5 = tf.len * (1 - 0.35 * Math.abs(f)) * (0.9 + 0.2 * r()), w = tf.len * (tf.w ?? 0.34);
            const b0 = add2(root, mul2(perp2(d), -w / 2)), b1 = add2(root, mul2(perp2(d), w / 2)), tip = add2(root, mul2(d, L5));
            const sh = [b0, add2(V.mix(b0, tip, 0.55), mul2(perp2(d), -w * 0.12)), tip, add2(V.mix(b1, tip, 0.55), mul2(perp2(d), w * 0.1)), b1];
            plumage(g, blobPath2(sh), { base: 0.97, shade: 0.88, depth: 3, blur: 2, ...plu });
            ink(g, sh.slice(0, 4), 1, gv(0.3, 0.8), { end: 0.2 });
          }
        }
        plumage(g, hpth, { base: 0.97, shade: 0.82, depth: H.ry * 0.36, blur: H.ry * 0.1, keep: [0, H.ry * 0.5], ...plu });
        if (hp) {
          const nc = hp.cups.find((c) => c.z >= 0);
          if (nc) softShade(g, hpth, (c) => c.ellipse(nc.x - nc.side * (HP.r ?? 45) * 0.7, nc.y + 4, (HP.r ?? 45) * 0.5, (HP.r ?? 45) * 1.2, H.roll, 0, TAU2), 0.66, 0.45, 12);
        }
        if (dl > 0.25) rimHatch(g, H.out, { light: Lu, flow: [0, 1], len: H.ry * 0.14, step: 3, w: 0.9, color: hatchCol, seed: 22, density: 0.7, thr: 0.15 });
        ink(g, [...H.out, H.out[0]], 1.2, gv(0.3, 0.5), { end: 0.6, per: 3 });
        if (P.disc ?? 1) {
          const top = H.P(E2.az ?? 0, (E2.el ?? -0.1) + 0.5, 1);
          for (const e of eyes) {
            if (e.nz < 0.25) continue;
            const sd = e.side, R = e.r;
            const q = [
              [top.x, top.y],
              add2([e.x, e.y], V.rot([sd * R * 0.35 * e.sx, -R * 1.75], H.roll)),
              add2([e.x, e.y], V.rot([sd * R * 1.65 * e.sx, -R * 0.95], H.roll)),
              add2([e.x, e.y], V.rot([sd * R * 1.95 * e.sx, R * 0.55], H.roll)),
              add2([e.x, e.y], V.rot([sd * R * 1.2 * e.sx, R * 1.85], H.roll))
            ];
            ink(g, q, 1.1, gv(0.42, 0.7), { end: 0.15, bias: 0.4 });
          }
        }
        for (const e of eyes) {
          if (e.nz < 0.12) continue;
          drawEye(g, { x: e.x, y: e.y, r: e.r, sx: e.sx, rot: H.roll, side: e.side, state: E2.state || "wide", look: E2.look, ...E2.over || {}, ...e.side < 0 ? E2.left : E2.right });
          if (!(E2.state === "closed")) {
            const lk = (e.side < 0 ? E2.left?.look : E2.right?.look) || E2.look || [0, 0], pr = E2.over?.pupil ?? 0.26;
            const px = e.x + lk[0] * (1 - pr) * 0.95 * e.r * e.sx, py = e.y + lk[1] * (1 - pr) * 0.95 * e.r;
            g.fillStyle = gv(0.97, 0.95);
            g.beginPath();
            g.arc(px - e.r * pr * 0.3, py - e.r * pr * 0.35, Math.max(e.r * pr * 0.28, 0.5 / PPU2), 0, TAU2);
            g.fill();
          }
        }
        drawBeak(g, { x: bq.x, y: bq.y, w: B2.w ?? 26, l: B2.l ?? 30, rot: H.roll + (B2.rot ?? 0), turn: B2.turn ?? H.yaw * 1.5, open: B2.open ?? 0, smirk: 0 });
        if (P.plaster) {
          const pl = P.plaster, q = H.P(pl.az ?? 0, pl.el ?? 0.9, 1);
          if (q.nz > 0) drawPlaster(g, { x: q.x, y: q.y, w: pl.w ?? 36, h: pl.h ?? 11, rot: H.roll + (pl.rot ?? 0), sx: 0.4 + 0.6 * Math.max(0, Math.cos(H.yaw - (pl.az ?? 0))) });
        }
        if (P.freckles !== false) {
          for (const e of eyes) {
            if (e.nz < 0.5) continue;
            const c = add2([e.x, e.y], V.rot([-e.side * e.r * 0.9 * e.sx, e.r * 1.35], H.roll));
            g.fillStyle = gv(0.4, 0.6);
            for (const [dx, dy] of [[0, 0], [-3.5, 2.5]]) {
              g.beginPath();
              g.arc(c[0] + dx * e.side, c[1] + dy, Math.max(1.1, 0.6 / PPU2), 0, TAU2);
              g.fill();
            }
          }
        }
      },
      nearHP() {
        if (!hp) return;
        for (const sg of hp.segs) if (sg.front) drawBandS(g, sg.pts, HP.w ?? 13);
        for (const c of hp.cups) if (c.z >= -0.02) drawCupS(g, { x: c.x, y: c.y, r: HP.r ?? 45, rot: H.roll + (HP.cupRot ?? 0), open: HP.open ?? c.open, side: c.side });
      }
    };
    wings.forEach((G2, i) => {
      layers["wing:" + i] = () => paintWing(g, G2, plu, dl);
    });
    (P.feet || []).forEach((f, i) => {
      layers["foot:" + i] = () => drawFootS(g, f);
    });
    const order = P.order || ORDER;
    for (const name of order) if (layers[name]) layers[name]();
    PPU2 = 1;
    setPPU(1);
    if (P.tone === true && dl > 0.3) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      screentone(cv2, { pitch: 4.2 * res });
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    return { canvas: cv2, x: x02, y: y02, w: x12 - x02, h: y12 - y02, toF, H, eyes, bq, cups: hp ? hp.cups : [] };
  }
  var SCR = null;
  var SCR2 = null;
  function drawOwlS17(ctx2, P) {
    if (!SCR) SCR = document.createElement("canvas");
    const L5 = owlS17Layer(P, SCR);
    const bl = P.blur ? Math.hypot(P.blur[0], P.blur[1]) : 0;
    if (bl > 1) {
      if (!SCR2) SCR2 = document.createElement("canvas");
      const pad = Math.ceil(bl / 2) + 2, w = L5.canvas.width + 2 * pad, h = L5.canvas.height + 2 * pad;
      if (SCR2.width !== w || SCR2.height !== h) {
        SCR2.width = w;
        SCR2.height = h;
      }
      const g = SCR2.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      const n = 7, wts = [];
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1) - 0.5;
        wts.push(Math.exp(-f * f * 6));
      }
      const ws = wts.reduce((a, b) => a + b, 0);
      const sx = L5.canvas.width / L5.w;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1) - 0.5;
        g.globalAlpha = wts[i] / ws;
        g.drawImage(L5.canvas, pad + P.blur[0] * f * sx, pad + P.blur[1] * f * sx);
      }
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      ctx2.drawImage(SCR2, L5.x - pad / sx, L5.y - pad / sx, w / sx, h / sx);
    } else {
      ctx2.drawImage(L5.canvas, L5.x, L5.y, L5.w, L5.h);
    }
    return L5;
  }

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
  var E = mergePose(D, {
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
  var F = mergePose(E, {
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
  var feetU = (d, g) => [
    { x: d[0], y: d[1], rot: d[2], size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] },
    { x: g[0], y: g[1], rot: g[2], size: 18, fat: 0.22, toes: 3, spread: 0.8, curl: 0.3, seed: 5, leg: [-12, -3] }
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
    const W = (w, sh = 0) => ({ lead: w.lead.map((p, i) => rel([p[0] + sh * (0.6 + 0.4 * i / (w.lead.length - 1)), p[1]])), tips: w.tips.map((p) => rel([p[0] + sh, p[1]])) });
    return mergePose({
      root: [hx + 62, hy + 30],
      s: 0.45,
      head: { x: hx, y: hy + 2, r: 40, sx: 1.08, yaw: -0.35, pitch: 0, roll: -0.29, square: 2.1 },
      body: { x: hx + 60, y: hy + 38, a: 58, b: 42, rot: 0.3 },
      tail: { base: rel([106, 56]), dir: [1, 0.55], len: 15, n: 4, spread: 0.7, w: 9 },
      wings: [W(FAR[far]), W(NEAR[near], ns)],
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
    { t: 51.36, p: E },
    { t: 51.8, p: F },
    { t: 52.44, p: G }
  ];
  var ONES = [[52.52, L1], [52.56, L2], [52.6, L3], [52.64, L4], ...FLY.map(([t, x, y, n, f, ns, bl, o]) => [t, flyKey(x, y, n, f, { ...o || {}, ...bl ? { blur: [bl, 0] } : {} }, ns || 0)])];
  var DRAW = [];
  for (let t = 49.12; t < 49.53; t += 0.08) DRAW.push(+t.toFixed(2));
  for (let t = 49.64; t < 50.53; t += 0.08) DRAW.push(+t.toFixed(2));
  for (let t = 50.64; t < 51.53; t += 0.08) DRAW.push(+t.toFixed(2));
  for (let t = 51.64; t < 52.45; t += 0.08) DRAW.push(+t.toFixed(2));
  function drawingTime(t) {
    if (t < DRAW[0]) return t < 48.72 ? 48.72 : 48.72;
    let d = DRAW[0];
    for (const x of DRAW) if (x <= t + 1e-6) d = x;
    return d;
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

  // lab.js
  var L = window.LAB;
  var [x0, y0, x1, y1] = L.crop;
  var z = L.z;
  var cw = Math.round((x1 - x0) * z);
  var ch = Math.round((y1 - y0) * z);
  var cols = L.cols;
  var rows = Math.ceil(L.times.length / cols);
  var cv = document.getElementById("c");
  cv.width = cw * cols;
  cv.height = ch * rows;
  var ctx = cv.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cv.width, cv.height);
  L.times.forEach((t, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    ctx.save();
    ctx.beginPath();
    ctx.rect(c * cw, r * ch, cw, ch);
    ctx.clip();
    const p = owlFrame(t);
    drawOwlS17(ctx, { ...p, x: c * cw + (p.x - x0) * z, y: r * ch + (p.y - y0) * z, s: p.s * z, tone: L.tone ?? true });
    ctx.restore();
  });
  document.title = "done";
})();
