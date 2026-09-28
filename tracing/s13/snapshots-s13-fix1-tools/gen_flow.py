# gen_flow.py : run the coarse fur statistics (flow.py's measure) for every part / pose and write
# src/shots/s13/flowM.js  (anchors [x, y, angle, coherence, coverage, depth], 40 px grid, features excluded)
import json, subprocess, numpy as np, cv2, sys
from common import *
from strokestats import stats
from cfg import *
OUT = {}
for name, fr, mod, key in JOBS:
    I = src(fr); M = ringmask(rings_for(mod, key))
    gx = cv2.Sobel(cv2.GaussianBlur(I, (0, 0), 1.2), cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(cv2.GaussianBlur(I, (0, 0), 1.2), cv2.CV_32F, 0, 1, ksize=3)
    si = SP * 0.5
    Jxx = cv2.GaussianBlur(gx * gx, (0, 0), si); Jyy = cv2.GaussianBlur(gy * gy, (0, 0), si); Jxy = cv2.GaussianBlur(gx * gy, (0, 0), si)
    bg = cv2.GaussianBlur(cv2.dilate(I, np.ones((9, 9), np.uint8)), (0, 0), 3)
    dk = np.clip(bg - I, 0, 255); ink = (dk >= 28).astype(np.float32); Mf = M.astype(np.float32)
    cov = cv2.GaussianBlur(ink * Mf, (0, 0), si) / np.maximum(1e-3, cv2.GaussianBlur(Mf, (0, 0), si))
    dep = cv2.GaussianBlur(dk * ink * Mf, (0, 0), si) / np.maximum(1e-3, cv2.GaussianBlur(ink * Mf, (0, 0), si))
    er = cv2.erode(M, np.ones((7, 7), np.uint8)); ys, xs = np.nonzero(er)
    A = []
    for y in range(ys.min() + SP // 2, ys.max(), SP):
        for x in range(xs.min() + SP // 2, xs.max(), SP):
            if not er[y, x] or any(f(x, y) for f in EXC[name]): continue
            a, b, c = Jxx[y, x], Jyy[y, x], Jxy[y, x]
            th = 0.5 * np.arctan2(2 * c, a - b) + np.pi / 2; th = (th + np.pi / 2) % np.pi - np.pi / 2
            l1 = 0.5 * (a + b) + np.sqrt(0.25 * (a - b) ** 2 + c * c); l2 = 0.5 * (a + b) - np.sqrt(0.25 * (a - b) ** 2 + c * c)
            coh = ((l1 - l2) / (l1 + l2 + 1e-6)) ** 2
            A.append([int(x), int(y), round(float(th), 2), round(float(coh), 2), round(float(cov[y, x]), 2), int(round(float(dep[y, x])))])
    Mx = M.copy()
    apply_exb(Mx, name)
    KX = keylines_mask(name)
    ST = stats(fr, Mx, A, excl=KX); SF = stats(fr, Mx, A, tier='faint', excl=KX)
    A = [a + s + t for a, s, t in zip(A, ST, SF)]
    OUT[name] = A; print(name, len(A), 'with strokes', sum(1 for a in A if a[9] > 0))
s = ("// s13 coarse fur statistics (fix pass 1b), MEASURED on the source by snapshots/s13-fix1-tools/gen_flow.py: per part and\n"
     "// pose, anchors on a 40 px grid inside the part's measured outline (eyes, beak, bandage, headphones left out):\n"
     "// [x, y, stroke angle (rad, undirected), coherence 0..1, ink coverage 0..1, mean ink depth (levels), and the hatching\n"
     "// texture statistics of ./strokestats.py: median stroke length (px), width (px), value (pre-grade), strokes per 10k px^2; the same for the\n"
     "// faint tier (0.06-0.18 under the paper)].\n"
     "// These steer the\n"
     "// authored, seeded stroke rules in ./fur.js (where the hatching runs and how dense it is); no stroke is copied.\n"
     "export const FLOW = {\n" + ''.join(f"  {k}: {json.dumps(v, separators=(',', ':'))},\n" for k, v in OUT.items()) + "};\n")
open(ROOT + '/src/shots/s13/flowM.js', 'w').write(s); print(len(s), 'bytes')
