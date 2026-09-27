#!/usr/bin/env python3
# s02 designer ink as OUTLINES (measurement script, not loaded by the film): the line work of the averaged stare frames
# (grade inverted, see invgrade.py) split into two ink levels relative to the local paper (the envelope):
#   grey  r < 0.75 (the soft hatching, the grey bags, the knit)   ink  r < 0.45 (lines, hair, brows, lids)
# (plus absolute floors where the paper itself is dark), each level's regions vectorized at 2x as contours with holes
# (even-odd), simplified to 0.35 px, and given the mean paint value of their own pixels. Same class of measurement
# as the pass-1 hair masses — shapes and values only, no pixels are stored.
# Usage: trace_poster.py geo.json dbgdir(with A/E0/E1.npy from trace_designer.py) out.json
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import levels as lv
geo, dbg, out = sys.argv[1:4]
G = json.load(open(geo)); W, H = 2206, 946; SS = 2
import os; PALE = float(os.environ.get('PALE', 0.9))
A = np.load(f'{dbg}/A.npy').astype(np.float32); E0 = np.load(f'{dbg}/E0.npy').astype(np.float32); E1 = np.load(f'{dbg}/E1.npy').astype(np.float32)

def poly_mask(pts, grow=0, s=1):
    m = np.zeros((H * s, W * s), np.uint8)
    cv2.fillPoly(m, [np.round(np.array(pts) * s).astype(np.int32)], 1)
    if grow > 0: m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow * s + 1, 2 * grow * s + 1)))
    return m
flat = lambda f: [[f[i], f[i + 1]] for i in range(0, len(f), 2)]
up = lambda m: cv2.resize(m, (W * SS, H * SS), interpolation=cv2.INTER_NEAREST)
hair_out = np.zeros((H, W), np.uint8)
for p in G['HAIR']: hair_out |= poly_mask(flat(p['o']))
designer = poly_mask(G['HOODIE']) | poly_mask(G['SKIN']) | poly_mask(G['BEANIE']) | hair_out
designer = cv2.dilate(designer, np.ones((7, 7), np.uint8))
L = G['LAPTOP']; designer[L['y'] + 22:, L['x0'] - 4:L['x1'] + 4] = 0     # the lid's lit top edge (y 806-834) is traced too
designer[:, 2060:] = 0; designer[:, :0] = 0
pencil = np.zeros((H, W), np.uint8)       # the pencil is traced with the face (its ground is painted in designer2.js)
drops = np.zeros((H, W), np.uint8)
for d in G['DROPS']:
    slide = d.get('dy', 0)
    x0 = min(d['top'][0], d['bot'][0]) - 10; x1 = max(d['top'][0], d['bot'][0]) + 12 + abs(d.get('dx', 0))
    y0 = d['top'][1] - 7 - d.get('grow', 0); y1 = d['bot'][1] + slide + 7
    drops[int(y0):int(y1), int(x0):int(x1)] = 1
EYEREG = [(845, 322, 138, 72), (1234, 318, 138, 72)]
eyes = np.zeros((H, W), np.uint8)
for cx, cy, rx, ry in EYEREG: cv2.ellipse(eyes, (cx, cy), (rx, ry), 0, 0, 360, 1, -1)
IRIS0 = [(852.5, 323.5), (1232.5, 318.5)]

def levels(P):
    P2 = cv2.resize(P, (W * SS, H * SS), interpolation=cv2.INTER_CUBIC)
    env = cv2.GaussianBlur(cv2.dilate(P2, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (27, 27))), (0, 0), 6)
    r = P2 / np.maximum(env, 0.05)
    pale = (r < PALE) | (P2 < 0.5)
    grey = (r < 0.75) | (P2 < 0.3)
    ink = (r < 0.45) | (P2 < 0.12)
    # drop specks (grain) smaller than ~1 px^2 (the pale level: ~2 px^2)
    k = np.ones((2, 2), np.uint8)
    pale = cv2.morphologyEx(pale.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    grey = cv2.morphologyEx(grey.astype(np.uint8), cv2.MORPH_OPEN, k); ink = cv2.morphologyEx(ink.astype(np.uint8), cv2.MORPH_OPEN, k)
    return P2, pale | grey, grey, ink

def run(P, region, name):
    P2, pale, grey, ink = levels(P)
    R2 = up(region)
    p = pale & R2; g = grey & R2; i = ink & R2
    res = {'pale': lv.vectorize(P2, p, p & (1 - g), eps=1.2), 'grey': lv.vectorize(P2, g, g & (1 - i), eps=0.9), 'ink': lv.vectorize(P2, i, i, eps=0.7)}
    print(name, {k: len(v) for k, v in res.items()}, sum(len(q) for v in res.values() for s in v for q in s['r']), 'points', flush=True)
    return res

eyes_in = cv2.erode(eyes, np.ones((3, 3), np.uint8)); eyes_out = cv2.dilate(eyes, np.ones((3, 3), np.uint8))
reg = designer.copy(); reg[eyes_in > 0] = 0; reg[drops > 0] = 0; reg[pencil > 0] = 0
face = run(A, reg, 'face')
res = {'face': face}
disk = lambda k, rad: cv2.circle(np.zeros((H, W), np.uint8), (int(IRIS0[k][0]), int(IRIS0[k][1])), rad, 1, -1)
iris = disk(0, 33) | disk(1, 33)          # the iris with its dark limbal ring (r 28 + ~4 px of ring and anti-aliasing)
e0 = eyes_out.copy(); e0[iris > 0] = 0; e0[drops > 0] = 0
res['eye0'] = run(E0, e0, 'eye0')
ir = cv2.dilate(iris, np.ones((3, 3), np.uint8)); res['iris0'] = run(E0, ir, 'iris0')
e1 = eyes_out.copy(); e1[drops > 0] = 0
res['eye1'] = run(E1, e1, 'eye1')
json.dump(res, open(out, 'w'))
# preview (python fill of the shapes over white, for a quick look)
prev = np.ones((H * SS, W * SS), np.float32)
for part in ('face', 'eye0', 'iris0'):
    for lev in ('pale', 'grey', 'ink'):
        for s in res[part][lev]:
            mm = np.zeros((H * SS, W * SS), np.uint8)
            cv2.fillPoly(mm, [np.array(q, np.int32) for q in s['r']], 1)
            prev[mm > 0] = s['v']
cv2.imwrite(f'{dbg}/poster.png', (cv2.resize(prev, (W, H), interpolation=cv2.INTER_AREA) * 255).astype(np.uint8))
