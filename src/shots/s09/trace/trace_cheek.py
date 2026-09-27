#!/usr/bin/env python3
# Measure the pale cheek outline (with the thin black lock spikes cut into it) and the lit neck patch of s09 on
# source frames 815-818. Prints JS polygons (frame px). Outlines only, no pixels.
import cv2, numpy as np, sys, json
src = sys.argv[1]
g0 = np.mean([cv2.imread(f'{src}/f{n:04d}.png', 0).astype(np.float32) for n in (815, 816, 817, 818)], axis=0)
def outline(x0, y0, x1, y1, thr, sig, eps, pick):
    a = cv2.GaussianBlur(g0, (0, 0), sig)[y0:y1, x0:x1]
    m = (a > thr).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    i = pick(st, n)
    mm = (lab == i).astype(np.uint8)
    cs, _ = cv2.findContours(mm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    c = cv2.approxPolyDP(c, eps, True)[:, 0, :]
    return [[int(p[0] + x0), int(p[1] + y0)] for p in c]
big = lambda st, n: 1 + int(np.argmax(st[1:, 4]))
cheek = outline(0, 640, 200, 946, 110, 0.8, 0.9, big)
neck = outline(175, 800, 275, 946, 80, 1.6, 1.2, big)
print('export const CHEEK_T = ' + json.dumps(cheek, separators=(',', ':')) + ';')
print('export const NECK_T = ' + json.dumps(neck, separators=(',', ':')) + ';')
# the striped shirt showing under the hair at the bottom (x 300-620, y 820-946), between the black locks
b = cv2.GaussianBlur(g0, (0, 0), 3.0)
m = np.zeros(g0.shape, np.uint8)
m[820:946, 300:630] = (b[820:946, 300:630] > 42).astype(np.uint8)
ys, xs = np.mgrid[0:g0.shape[0], 0:g0.shape[1]]
# drop the slab (its upper-left edge runs (757,740) -> (570,946))
edge = 757 + (ys - 740) * (570 - 757) / (946 - 740)
m[xs > edge - 6] = 0
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
zones = []
for i in range(1, n):
    if st[i, 4] < 120: continue
    cs, _ = cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = cv2.approxPolyDP(max(cs, key=cv2.contourArea), 1.5, True)[:, 0, :]
    zones.append([[int(p[0]), int(p[1])] for p in c])
print('export const SHIRT_T = ' + json.dumps(zones, separators=(',', ':')) + ';')
