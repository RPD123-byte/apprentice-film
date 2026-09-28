#!/usr/bin/env python3
# Beat F (2853-2937): temporally cleaned head / body poses and the face features in head units, written to
# src/shots/s26/featF.js. Inputs: the previous per-frame rig fits (rigF.json) and the colour blobs (featF.json).
# Robust smoothing: running median over 5 frames, then a 3-tap mean; the perched frames 2931-2937 (the source owl is
# still there: frame differences ~ grain level) hold one pose.
import json, numpy as np
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
rig = json.load(open(f'{M}/rigF.json')); ft = json.load(open(f'{M}/featF.json'))
Fs = list(range(2853, 2938))
def med(a, k=5):
    a = np.asarray(a, float); out = a.copy(); h = k // 2
    for i in range(len(a)):
        w = a[max(0, i - h):i + h + 1]; w = w[np.isfinite(w)]
        out[i] = np.median(w) if len(w) else np.nan
    return out
def mean3(a):
    a = np.asarray(a, float); out = a.copy()
    for i in range(1, len(a) - 1): out[i] = (a[i - 1] + 2 * a[i] + a[i + 1]) / 4
    return out
def clean(a, hold=True, k=5):
    a = mean3(med(a, k))
    if hold:
        i0 = Fs.index(2931); a[i0:] = np.median(a[i0:])
    return a
eL = np.array([rig[str(F)]['eyes'][0][:2] for F in Fs]); eR = np.array([rig[str(F)]['eyes'][1][:2] for F in Fs])
yaw = np.array([rig[str(F)]['yaw'] for F in Fs])
eLx, eLy, eRx, eRy = [clean(v) for v in (eL[:, 0], eL[:, 1], eR[:, 0], eR[:, 1])]
yawS = clean(yaw)
mid = np.stack([(eLx + eRx) / 2, (eLy + eRy) / 2], 1)
d = np.hypot(eRx - eLx, eRy - eLy); ang = np.arctan2(eRy - eLy, eRx - eLx)
EYESP, EYEY = 0.43, 0.1
SP = 0.4 + 0.03 * np.abs(yawS); SH = 0.4
r = d / (2 * SP)
# head centre: the eye midpoint sits at (0.12 yaw, EYEY) head units (owlColour.js eyeLayout)
cx = mid[:, 0] - (np.cos(ang) * SH * yawS - np.sin(ang) * EYEY) * r
cy = mid[:, 1] - (np.sin(ang) * SH * yawS + np.cos(ang) * EYEY) * r
def loc(i, p):
    c, s = np.cos(-ang[i]), np.sin(-ang[i]); dx, dy = p[0] - cx[i], p[1] - cy[i]
    return ((dx * c - dy * s) / r[i], (dx * s + dy * c) / r[i])
feat = {k: [] for k in ('beak', 'plaster', 'cupL', 'cupR')}
for i, F in enumerate(Fs):
    f = ft.get(str(F), {})
    for k in feat:
        feat[k].append(loc(i, f[k][:2]) if k in f else (np.nan, np.nan))
FEAT = {}
lim = {'beak': ((-0.5, 0.6), (0.2, 0.8)), 'plaster': ((-0.8, 0.8), (-0.95, -0.2)), 'cupL': ((-1.6, -0.8), (-0.5, 0.4)), 'cupR': ((0.8, 1.6), (-0.5, 0.4))}
for k, v in feat.items():
    v = np.array(v, float)
    for j in (0, 1):
        lo, hi = lim[k][j]; bad = (v[:, j] < lo) | (v[:, j] > hi); v[bad, :] = np.nan
    FEAT[k] = np.stack([clean(v[:, 0], k=7), clean(v[:, 1], k=7)], 1)
    for j in (0, 1):   # fill gaps by interpolation
        a = FEAT[k][:, j]; ok = np.isfinite(a)
        FEAT[k][:, j] = np.interp(np.arange(len(a)), np.where(ok)[0], a[ok])
# body, skull size and feet: the per-frame refit against the masks (fitF.mjs, eyes pinned), smoothed; perched hold
import os
if os.path.exists(f'{M}/fitF.json'): fit = json.load(open(f'{M}/fitF.json'))
else:   # first pass: the previous fits' body / feet, no skull rescale
    fit = {str(F): {'body': rig[str(F)]['body'], 'head': {'r': r[i]}, 'feet': rig[str(F)]['feet'], 'wings': rig[str(F)]['wings'] if F >= 2926 else None} for i, F in enumerate(Fs)}
body = {k: clean([fit[str(F)]['body'][k] for F in Fs]) for k in ('x', 'y', 'rx', 'ry')}
body['rot'] = clean(np.unwrap([fit[str(F)]['body']['rot'] for F in Fs]))
rk = clean([fit[str(F)]['head']['r'] / r[i] for i, F in enumerate(Fs)])
r2 = r * rk; eyeSp = SP / rk
cx = mid[:, 0] - (np.cos(ang) * SH * yawS - np.sin(ang) * EYEY) * r2
cy = mid[:, 1] - (np.sin(ang) * SH * yawS + np.cos(ang) * EYEY) * r2
# features were measured in the pre-refit head units: rescale about the eye midpoint
for k in FEAT:
    FEAT[k] = np.stack([(FEAT[k][:, 0] - SH * yawS) / rk + SH * yawS, (FEAT[k][:, 1] - EYEY) / rk + EYEY], 1)
r = r2
feet = {}
for j in (0, 1):
    for q in ('x', 'y', 'size'):
        a = [fit[str(F)]['feet'][j][q] for F in Fs]
        feet[f'feet.{j}.{q}'] = mean3(med(a, 3))
wk = {}
for j in (0, 1):
    for q, idx in (('S', 0), ('S', 1), ('T', 0), ('T', 1)):
        a = [fit[str(F)]['wings'][j][q][idx] if fit[str(F)].get('wings') else np.nan for F in Fs]
        wk[f'wings.{j}.{q}.{idx}'] = np.array(a, float)
    wk[f'wings.{j}.w'] = np.array([fit[str(F)]['wings'][j].get('w', 16) if fit[str(F)].get('wings') else np.nan for F in Fs], float)
i0 = Fs.index(2931)
for k in wk: wk[k][i0:] = np.nanmedian(wk[k][i0:])
rows = []
for i, F in enumerate(Fs):
    row = [cx[i], cy[i], r[i], ang[i], yawS[i], eyeSp[i], *FEAT['beak'][i], *FEAT['plaster'][i], *FEAT['cupL'][i], *FEAT['cupR'][i],
           body['x'][i], body['y'][i], body['rx'][i], body['ry'][i], body['rot'][i]] + [feet[k][i] for k in feet] + [wk[k][i] for k in wk]
    rows.append([None if not np.isfinite(v) else round(float(v), 4) for v in row])
    if F % 6 == 0 or F > 2928: print(F, rows[-1][:8])
keys = ["head.x", "head.y", "head.r", "head.rot", "head.yaw", "eyeSp", "beak.x", "beak.y", "plaster.x", "plaster.y", "cupL.x", "cupL.y", "cupR.x", "cupR.y", "body.x", "body.y", "body.rx", "body.ry", "body.rot"] + list(feet) + list(wk)
js = ["// s26 beat F (114.12–117.52): the colour owl's head and body per source frame, cleaned (measurements only).",
      "// Head: from the previous per-frame fits' eye pair (pinned by tracked pupils) and yaw, median-5 + 3-tap smoothed;",
      "// centre / size / roll follow from the eyes (half spacing 0.4 + 0.03|yaw|, pair shifted 0.4 yaw, height 0.1). Face features (beak,",
      "// plaster, cups) = centres of the orange / peach blobs inside the owl mask on each source frame, in head units,",
      "// median-7 smoothed. Body, skull size, feet (and the folded wings when perched): refitted per frame to the source owl",
      "// mask with the eyes pinned (snapshots/s26c-tools/fitF.mjs, IoU 0.83 -> 0.86), median-5 smoothed. 2931–2937 (perched, still)",
      "// hold one pose. Built by snapshots/s26c-tools/smoothF.py.",
      "export const FEAT_F_KEYS = " + json.dumps(keys) + ";",
      "export const FEAT_F = {"]
for F, row in zip(Fs, rows): js.append(f"  {F}: {json.dumps(row)},")
js.append("};")
open('/Users/computer/rootline/apprentice-film/src/shots/s26/featF.js', 'w').write("\n".join(js) + "\n")
print('wrote featF.js')
