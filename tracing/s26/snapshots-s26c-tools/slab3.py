#!/usr/bin/env python3
# Beat E refinement: per frame, the shard's outline (hull of the shard mask minus the owl) and its two tones: the dark
# base and the lit (grey, streaked) part, whose outline is simplified to <= ~12 vertices (approxPolyDP 14 px); the two
# pre-grade grey levels are the medians inside each part. Coordinates and two numbers only.
import cv2, numpy as np, json, sys
sys.path.insert(0, '.')
from grade import ungrade
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
W, H = 2206, 946
old = json.load(open(f'{M}/slab2.json')); out = {}
for F in range(2842, 2854):
    s = cv2.imread(f'{M}/src/{F}.png'); p = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s26c-out/pagesE/r{F}.png')
    u = ungrade(s, F / 25)
    lab = lambda im: cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), 6), cv2.COLOR_BGR2LAB)
    dE = np.sqrt(((lab(s) - lab(p)) ** 2).sum(2))
    hsv = cv2.cvtColor(cv2.GaussianBlur(s, (0, 0), 3), cv2.COLOR_BGR2HSV)
    g = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY).astype(np.float32)
    hf = cv2.GaussianBlur(np.abs(g - cv2.GaussianBlur(g, (0, 0), 2)), (0, 0), 8)
    m = ((dE > 14) & (hsv[..., 1] < 90) & (hf < 4.0)).astype(np.uint8)
    if F <= 2843: m[:560, :] = 0; m[:, 700:] = 0
    fm = f'/Users/computer/rootline/apprentice-film/snapshots/s26b-meas/fit/m/{F}.bin'
    try:
        if F >= 2852: raise FileNotFoundError
        owl = np.fromfile(fm, np.uint8).reshape(473, 1103); owl = cv2.dilate(cv2.resize(owl, (W, H)), np.ones((15, 15), np.uint8)) > 100
        m[owl] = 0
    except FileNotFoundError: owl = np.zeros((H, W), bool)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((11, 11), np.uint8)); m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((31, 31), np.uint8))
    n, labm, st, cen = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    big = 1 + int(np.argmax(st[1:, 4])) if n > 1 else None
    for i in range(1, n):
        if (F >= 2848 and st[i, 4] > 20000) or i == big: keep[labm == i] = 1
    cs, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if F >= 2852 or not cs: poly = np.array(old[str(F)]['poly'])
    else: hull = cv2.convexHull(np.vstack(cs)); poly = cv2.approxPolyDP(hull, 10, True).reshape(-1, 2)
    inside = np.zeros((H, W), np.uint8); cv2.fillPoly(inside, [poly.astype(np.int32)], 1)
    inside[owl] = 0
    gy = cv2.GaussianBlur(cv2.cvtColor(u, cv2.COLOR_BGR2GRAY), (0, 0), 6)
    lit = ((gy > 0.14) & (inside > 0)).astype(np.uint8)
    lit = cv2.morphologyEx(lit, cv2.MORPH_OPEN, np.ones((21, 21), np.uint8))
    cs2, _ = cv2.findContours(lit, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    greys = [cv2.approxPolyDP(c, 14, True).reshape(-1, 2).tolist() for c in cs2 if cv2.contourArea(c) > 8000]
    vD = float(np.median(gy[(inside > 0) & (lit == 0)])) if ((inside > 0) & (lit == 0)).any() else 0.05
    vG = float(np.median(gy[lit > 0])) if lit.any() else 0.3
    out[F] = {'poly': poly.tolist(), 'grey': greys, 'vD': vD, 'vG': vG}
    print(F, len(poly), [len(q) for q in greys], round(vD, 3), round(vG, 3))
json.dump(out, open(f'{M}/slab3.json', 'w'))
