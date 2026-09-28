#!/usr/bin/env python3
# ftest2.py F 'zone-json' 'params-json' [out.png]: trace one colour-owl frame (zone variant + trace params), composite it
# feathered over our own colour page (raw page render pageraw/p{F}.png + the F tone LUT), grade (python port + WebGL bias),
# and score against the source round the owl (measurement only).
import cv2, numpy as np, sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools')
from vtrace import trace, pack, raster, outline, fl
from gradeio import grade, ungrade
import owlmask as o
from zone2 import fzone
T = '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/'
_B = json.load(open(T + 'webglbias.json')); BX = np.array(_B['x'], np.float32); BIAS = [np.array(v, np.float32) for v in _B['bias']]
TONE = json.load(open(T + 'tone_offs.json'))['F']  # [R, G, B] offset strings
LUT = [np.array([min(255, x + int(TONE[c][x])) for x in range(256)], np.uint8) for c in range(3)]
def lut_bgr(im):  # uint8 BGR
    return np.stack([LUT[2][im[..., 0]], LUT[1][im[..., 1]], LUT[0][im[..., 2]]], -1)
def gradeW(pre_bgr01, t):
    g = grade(pre_bgr01, t).astype(np.float32)
    for c in range(3): g[..., c] += np.interp(g[..., c] * 255, BX, BIAS[c]) / 255
    return np.clip(g, 0, 1)
def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32), (0, 0), s), cv2.COLOR_BGR2LAB)
def run(F, Z, P, feather=1.5, inkalpha=1.0, out=None, blur=0):
    f = o.src(F); U = ungrade(f, F / 25); U8 = np.clip(U * 255 + 0.5, 0, 255).astype(np.uint8)
    z = fzone(F, **Z)
    ys, xs = np.nonzero(z); x0, x1, y0, y1 = max(0, xs.min() - 4), min(2206, xs.max() + 5), max(0, ys.min() - 4), min(946, ys.max() + 5)
    regs, inks = trace(U8[y0:y1, x0:x1], z[y0:y1, x0:x1], (x0, y0), P)
    pk = pack(regs, inks)
    # owl raster (regions, then inks at inkalpha) on a transparent layer
    base = raster(f.shape[:2], [pk[0], []]); full = raster(f.shape[:2], pk)
    cov = raster(f.shape[:2], [[['#ffffff'] + r[1:] for r in pk[0]], []])[..., 0] / 255
    owl = base + inkalpha * (full - base)
    if blur: owl = cv2.GaussianBlur(owl, (0, 0), blur)
    owl = lut_bgr(np.clip(owl + 0.5, 0, 255).astype(np.uint8)).astype(np.float32)
    zo = outline(z, (0, 0), 1.0); zm = np.zeros(z.shape, np.float32); cv2.fillPoly(zm, [np.int32(np.round(p)) for p in zo], 1)
    a = cv2.GaussianBlur(zm, (0, 0), feather) * zm if feather > 0 else zm   # destination-in with the blurred zone
    a = np.minimum(a, np.clip(cov, 0, 1))
    page = lut_bgr(cv2.imread(T + f'pageraw/r{F}.png')).astype(np.float32)
    pre = page * (1 - a[..., None]) + owl * a[..., None]
    g = gradeW(pre / 255, F / 25) * 255
    s = f.astype(np.float32)
    bx = (max(0, x0 - 30), max(0, y0 - 30), min(2206, x1 + 30), min(946, y1 + 30))
    sil = fzone(F, grow=0, dark=0)
    band = cv2.dilate(z, np.ones((9, 9), np.uint8)) - cv2.erode(z, np.ones((9, 9), np.uint8))
    res = {}
    for sg in (1.5, 4):
        dE = np.sqrt(((lab(g / 255, sg) - lab(s / 255, sg)) ** 2).sum(2))
        res[f'box{sg}'] = float(dE[bx[1]:bx[3], bx[0]:bx[2]].mean())
        res[f'sil{sg}'] = float(dE[sil > 0].mean())
        res[f'edge{sg}'] = float(dE[band > 0].mean())
    if out:
        c = lambda im: im[bx[1]:bx[3], bx[0]:bx[2]]
        cv2.imwrite(out, np.hstack([c(np.clip(g, 0, 255).astype(np.uint8)), c(f)]))
    return res, len(json.dumps(pk))
if __name__ == '__main__':
    F = int(sys.argv[1]); Z = json.loads(sys.argv[2]); P = json.loads(sys.argv[3])
    ex = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    res, n = run(F, Z, P, out=ex.pop('out', None), **ex)
    print(F, ' '.join(f'{k}={v:.2f}' for k, v in res.items()), 'bytes', n)
