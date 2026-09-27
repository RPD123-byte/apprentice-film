# Per-layer light over the dolly: for every source frame 40.00-40.64, fit a gain and a screen-space linear ramp per
# room layer so the render matches the source on that layer's visible area (pre-grade values, owl masked).
# light3.py renderdir [k]   (renderdir: a tools/compare.sh output over 40.00..40.64 step 0.04) -> updates ../light3.js
import sys, cv2, numpy as np, glob, re, json
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
from tone3 import faces, visible_masks, owl_mask
OUT = ROOT + '/src/shots/s14/light3.js'
LAY = ['back', 'ceiling', 'floor', 'left', 'kbd', 'aside', 'right', 'late', 'synth', 'under', 'deskBase', 'deskLeg', 'deskTop']
TS = [round(40.0 + 0.04 * k, 2) for k in range(17)]
def read():
    try:
        s = open(OUT).read()
        m = re.search(r'export const LIGHT = (\{.*\});', s, re.S)
        return json.loads(m.group(1))
    except Exception:
        return {'t': TS, 'g': {}}
def main():
    rd = sys.argv[1]; k = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
    cur = read()
    if cur.get('t') != TS: cur = {'t': TS, 'g': {}}
    items = faces()
    frames = {}
    for f in glob.glob(rd + '/frame-*.png'):
        t = round(float(re.search(r'at-([\d.]+)s', f).group(1)), 2)
        frames[t] = f
    rep = []
    for i, t in enumerate(TS):
        tt = t if t in frames else None
        if tt is None: continue
        R = cv2.imread(frames[tt]); S = src(t)
        Vr = pregrade(luma(R), t); Vs = pregrade(luma(S), t)
        om = owl_mask(luma(S), t) | owl_mask(luma(R), t)
        vis = visible_masks(items, t)
        lm = {L: np.zeros((H, W), bool) for L in LAY}
        for (n, e), m in zip(items, vis): lm[e[0]] |= m.astype(bool)
        row = []
        for L in LAY:
            m = lm[L] & ~om & (Vr > 0.02) & (Vs > 0.005)
            ys, xs = np.nonzero(m)
            g0 = cur['g'].get(L, [[1, 0, 0]] * len(TS))[i]
            if len(xs) < 800:
                row.append((L, None)); continue
            if len(xs) > 60000:
                sel = np.linspace(0, len(xs) - 1, 60000).astype(int); xs, ys = xs[sel], ys[sel]
            vr = Vr[ys, xs]; vs = Vs[ys, xs]
            dx = (xs - W / 2) / 1000.0; dy = (ys - H / 2) / 1000.0
            # vs ~ vr * (a + b dx + c dy)   (vr already carries the current gain g0)
            A = np.stack([vr, vr * dx, vr * dy], 1)
            ext = max(np.ptp(xs), 1) / 1000.0, max(np.ptp(ys), 1) / 1000.0
            sol, *_ = np.linalg.lstsq(A, vs, rcond=None)
            a, b, c = sol
            # robust fallback: if the ramp fit is wild, a plain ratio of means
            if not (0.3 < a < 4) or abs(b) * ext[0] > 1.5 or abs(c) * ext[1] > 1.5:
                a = float(vs.mean() / max(1e-4, vr.mean())); b = c = 0.0
            if ext[0] < 0.25: b = 0.0
            if ext[1] < 0.2: c = 0.0
            if len(xs) < 5000: b = c = 0.0; a = float((vs.mean() + 1e-4) / (vr.mean() + 1e-4))
            a = 1 + k * (a - 1); b *= k; c *= k
            # compose with the current gain: new(x) = g0(x) * (a + b dx + c dy); keep it linear (drop the cross term)
            G0, gx0, gy0 = g0
            G = G0 * a; gx = (G0 * b / 1000.0 + gx0 * a); gy = (G0 * c / 1000.0 + gy0 * a)
            G = float(np.clip(G, 0.5, 2.0))
            # keep the ramp's corner multipliers within [0.6, 1.5] (a barely visible layer must not go black)
            rx, ry = gx / G, gy / G
            for _ in range(20):
                cs = [1 + rx * dx + ry * dy for dx in (-W / 2, W / 2) for dy in (-H / 2, H / 2)]
                if min(cs) >= 0.6 and max(cs) <= 1.5: break
                rx *= 0.8; ry *= 0.8
            gx, gy = rx * G, ry * G
            row.append((L, [round(G, 4), round(gx, 7), round(gy, 7)]))
            rep.append((t, L, round(float(np.abs(vs.mean() - vr.mean())), 3)))
        for L, v in row:
            arr = cur['g'].setdefault(L, [[1, 0, 0] for _ in TS])
            if v is not None: arr[i] = v
        print(t, ' '.join(f'{L}:{v[0]:.2f}' for L, v in row if v), flush=True)
    # hold layers' gains for frames where they were not fitted (copy the nearest fitted)
    s = '// s14 round 3: per-layer light over the dolly (trace3/light3.py): t = source frame times; g[layer][k] = [gain,\n' \
        '// d gain/dx, d gain/dy] (screen px, about the frame centre)\nexport const LIGHT = ' + json.dumps(cur) + ';\n'
    open(OUT, 'w').write(s)
main()
