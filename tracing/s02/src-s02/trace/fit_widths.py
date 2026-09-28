#!/usr/bin/env python3
# Fit the traced strokes' widths so the redrawn ink carries the source's tone (measurement script, not loaded).
# The ground (everything the designer draws except the strokes) is rendered by the film's own code in snapshots/s02-lab
# (strokes off) and brought back to paint values with the same grade inversion as the tracer. The strokes are then
# rasterized here with the geometry of designer2.js inkSet (Catmull-Rom, 3 samples per span, width interpolation,
# tip taper), and each stroke's width is scaled until the blurred result matches the source's paint estimate along it
# (dense cross-hatching measures too wide: neighbouring lines merge above half maximum).
# Usage: fit_widths.py trace.json dbgdir ground_face.png t_face ground_stare.png t_stare ground_look.png t_look out.json
import cv2, numpy as np, json, sys, importlib.util, os
spec = importlib.util.spec_from_file_location('td', os.path.join(os.path.dirname(__file__), 'invgrade.py'))
ig = importlib.util.module_from_spec(spec); spec.loader.exec_module(ig)
tr, dbg, gf, tf, g0, t0, g1, t1, out = sys.argv[1:10]
R = json.load(open(tr))
A = np.load(f'{dbg}/A.npy'); E0 = np.load(f'{dbg}/E0.npy'); E1 = np.load(f'{dbg}/E1.npy')
H, W = A.shape
CAL = dict(tip=2.5, tipMin=0.4, wMin=0.55)

def catmull(pts, per):
    n = len(pts); out = []
    P = lambda i: pts[max(0, min(n - 1, i))]
    for i in range(n - 1):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        for j in range(per):
            t = j / per; t2 = t * t; t3 = t2 * t
            out.append([0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in (0, 1)])
    out.append(list(pts[-1])); return out

def poly_of(s, scale):
    pts = [p[:2] for p in s['p']]; w = [p[2] for p in s['p']]; n = len(pts)
    if n < 2: return None
    per = 3; q = catmull(pts, per) if n > 2 else [pts[0], pts[1]]
    q = np.array(q); m = len(q) - 1
    S = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(q, axis=0).T))]); Lt = S[-1]
    Lp, Rp = [], []
    for i in range(len(q)):
        u = i / m; f = i / per if n > 2 else u
        a = min(n - 1, int(np.floor(f))); b = min(n - 1, a + 1); t = f - a
        ww = (w[a] + (w[b] - w[a]) * t) * scale
        e = min(1, S[i] / CAL['tip'], (Lt - S[i]) / CAL['tip'])
        hw = max(CAL['wMin'], ww) * (CAL['tipMin'] + (1 - CAL['tipMin']) * np.sqrt(max(0, e))) / 2
        pa = q[max(0, i - 1)]; pb = q[min(len(q) - 1, i + 1)]; d = pb - pa; dn = np.hypot(*d) or 1; d = d / dn
        Lp.append([q[i][0] - d[1] * hw, q[i][1] + d[0] * hw]); Rp.append([q[i][0] + d[1] * hw, q[i][1] - d[0] * hw])
    return np.array(Lp + Rp[::-1])

def raster(base, sets, SS=4):
    # 4x supersampled binary fills, area-downsampled: exact coverage, like the canvas's antialiasing
    big = cv2.resize(np.clip(base * 255, 0, 255).astype(np.uint8), (W * SS, H * SS), interpolation=cv2.INTER_NEAREST)
    for S, sc in sets:
        for s, k in zip(S, sc):
            P = poly_of(s, k)
            if P is None: continue
            c = int(round(np.clip(s['v'], 0, 1) * 255))
            cv2.fillPoly(big, [np.round((P * SS - 0.5 * (SS - 1)) * 4).astype(np.int32)], c, lineType=cv2.LINE_8, shift=2)
    small = cv2.resize(big, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    # the base keeps its own pixels where no stroke touched (nearest-upsampling is exact for it)
    return small

def fit(base, target, sets, region, name, iters=9, sig=1.6, gain=2.2):
    scales = [np.ones(len(S)) for S, _ in sets]
    tb = cv2.GaussianBlur(target, (0, 0), sig)
    for it in range(iters):
        Rr = raster(base, [(S, sc) for (S, bright), sc in zip(sets, scales)])
        e = cv2.GaussianBlur(Rr, (0, 0), sig) - tb
        err = np.abs(cv2.GaussianBlur(Rr, (0, 0), 4) - cv2.GaussianBlur(target, (0, 0), 4))[region > 0].mean()
        print(f'{name} iter {it} blur4 MAE {err * 255:.2f}', flush=True)
        for (S, bright), sc in zip(sets, scales):
            for j, s in enumerate(S):
                p = np.array(s['p']); xi = np.clip(np.round(p[:, 0]).astype(int), 0, W - 1); yi = np.clip(np.round(p[:, 1]).astype(int), 0, H - 1)
                em = float(e[yi, xi].mean())
                d = -em if bright else em        # dark stroke: render too dark (em < 0) -> thinner
                sc[j] = float(np.clip(sc[j] * np.exp(gain * d), 0.15, 2.5))
    cv2.imwrite(f'{dbg}/fit-{name}.png', np.clip(np.hstack([Rr, target]) * 255, 0, 255).astype(np.uint8))
    return scales

face_reg = (A > -1).astype(np.uint8)
eyes = np.zeros((H, W), np.uint8)
for cx, cy, rx, ry in [(845, 322, 138, 72), (1234, 318, 138, 72)]: cv2.ellipse(eyes, (cx, cy), (rx, ry), 0, 0, 360, 1, -1)
face_reg[:, :500] = 0; face_reg[:, 2100:] = 0; face_reg[800:] = 0; face_reg[eyes > 0] = 0
Bf = ig.paint_of(cv2.cvtColor(cv2.imread(gf), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255, float(tf))
sd, sl = fit(Bf, A, [(R['dark'], False), (R['light'], True)], face_reg, 'face')
B0 = ig.paint_of(cv2.cvtColor(cv2.imread(g0), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255, float(t0))
(s0,) = fit(B0, E0, [(R['eye0'], False)], eyes, 'eye0')
B1 = ig.paint_of(cv2.cvtColor(cv2.imread(g1), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255, float(t1))
(s1,) = fit(B1, E1, [(R['eye1'], False)], eyes, 'eye1')
for S, sc in [(R['dark'], sd), (R['light'], sl), (R['eye0'], s0), (R['eye1'], s1)]:
    for s, k in zip(S, sc):
        for p in s['p']: p[2] = round(p[2] * k, 2)
json.dump(R, open(out, 'w'))
print('scales: dark median %.2f light %.2f eye0 %.2f eye1 %.2f' % tuple(np.median(x) for x in (sd, sl, s0, s1)))
