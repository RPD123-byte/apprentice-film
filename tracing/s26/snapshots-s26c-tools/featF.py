#!/usr/bin/env python3
# Colour-owl face features per source frame in F (measurement): orange blobs (cups, beak) and the peach plaster,
# found by colour inside the owl mask, assigned by their position in the rig head frame (eyes pinned by the fits).
import cv2, numpy as np, json, sys
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
rig = json.load(open(f'{M}/rigF.json'))
res = {}
for Fs, g in sorted(rig.items(), key=lambda kv: int(kv[0])):
    F = int(Fs); s = cv2.imread(f'{M}/src/{F}.png')
    if s is None: continue
    Hh, Ww = s.shape[:2]
    mk = np.fromfile(f'/Users/computer/rootline/apprentice-film/snapshots/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
    mk = cv2.dilate(cv2.resize(mk, (Ww, Hh)), np.ones((9, 9), np.uint8)) > 100
    hsv = cv2.cvtColor(cv2.GaussianBlur(s, (0, 0), 1.0), cv2.COLOR_BGR2HSV).astype(np.int32)
    h, sa, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    x, y, r, rot = g['x'], g['y'], g['r'], g['rot']
    ca, sn = np.cos(-rot), np.sin(-rot)
    yy, xx = np.mgrid[0:Hh, 0:Ww]
    lx = ((xx - x) * ca - (yy - y) * sn) / r; ly = ((xx - x) * sn + (yy - y) * ca) / r
    near = (np.abs(lx) < 2.0) & (ly > -1.6) & (ly < 1.3) & mk
    orange = near & (h >= 6) & (h <= 22) & (sa > 120) & (v > 120)
    peach = near & (h <= 14) & (sa > 45) & (sa < 125) & (v > 130) & (ly < 0.05) & (np.abs(lx) < 1.0)
    out = {}
    n, lab, st, cen = cv2.connectedComponentsWithStats(orange.astype(np.uint8))
    blobs = []
    for i in range(1, n):
        if st[i, 4] < max(12, 0.002 * r * r): continue
        cx, cy = cen[i]; qx = ((cx - x) * ca - (cy - y) * sn) / r; qy = ((cx - x) * sn + (cy - y) * ca) / r
        blobs.append((st[i, 4], qx, qy, cx, cy, st[i, :4].tolist()))
    beak = [b for b in blobs if abs(b[1]) < 0.55 and 0.15 < b[2] < 0.95]
    cupL = [b for b in blobs if b[1] < -0.6 and -0.8 < b[2] < 0.9]
    cupR = [b for b in blobs if b[1] > 0.6 and -0.8 < b[2] < 0.9]
    if beak: b = max(beak); out['beak'] = [b[3], b[4], b[0]] + b[5]
    if cupL: b = max(cupL); out['cupL'] = [b[3], b[4], b[0]] + b[5]
    if cupR: b = max(cupR); out['cupR'] = [b[3], b[4], b[0]] + b[5]
    n, lab, st, cen = cv2.connectedComponentsWithStats(peach.astype(np.uint8))
    pb = [(st[i, 4], cen[i][0], cen[i][1], st[i, :4].tolist()) for i in range(1, n) if st[i, 4] > max(10, 0.004 * r * r)]
    if pb: b = max(pb); out['plaster'] = [b[1], b[2], b[0]] + b[3]
    # eyes: dark blobs (iris + ring) near the rig's eyes
    for k, e in enumerate(g['eyes']):
        ex, ey, er = e
        R = int(max(8, er * 1.3))
        x0, y0 = int(ex - R), int(ey - R)
        sub = v[y0:y0 + 2 * R, x0:x0 + 2 * R]
        if sub.size == 0: continue
        dk = (sub < 85).astype(np.uint8)
        yy2, xx2 = np.mgrid[0:sub.shape[0], 0:sub.shape[1]]
        wgt = dk * np.exp(-(((xx2 - R) ** 2 + (yy2 - R) ** 2) / (2 * (R * 0.7) ** 2)))
        if wgt.sum() > 3:
            out['eye%d' % k] = [float(x0 + (wgt * xx2).sum() / wgt.sum()), float(y0 + (wgt * yy2).sum() / wgt.sum()), float(dk.sum())]
    res[F] = {k: [float(q) for q in vv] for k, vv in out.items()}
    print(F, 'r%.0f' % r, {k: [round(v, 0) for v in vv[:3]] for k, vv in out.items()})
json.dump(res, open(f'{M}/featF.json', 'w'))
