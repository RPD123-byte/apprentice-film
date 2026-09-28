# gen_zones.py : measure the cel tone zones (zones.py's rule) for every part / pose -> src/shots/s13/zonesM.js
import json, cv2, numpy as np
from common import *
JOBS = [  # name, frames, rings, thresholds, exclude boxes (hardware / features drawn as parts)
  ('head', '891-898', lambda: jsdata('silC')['head'], [0.92, 0.85, 0.75, 0.62], [(990, 380, 1130, 525), (905, 240, 1270, 420), (925, 70, 1105, 180), (1436, 40, 1600, 160), (1060, 0, 1370, 62)]),
  ('body', '891-898', lambda: jsdata('silC')['body'], [0.92, 0.85, 0.75, 0.62], []),
  ('wing', '891-898', lambda: jsdata('silC')['wing'], [0.92, 0.85, 0.75, 0.62], []),
  ('tail', '891-898', lambda: jsdata('silC')['tail'], [0.92, 0.85, 0.75, 0.62], []),
  ('nub', '891-898', lambda: jsdata('silC')['nub'], [0.92, 0.85, 0.75, 0.62], []),
  ('headF', '901-902', lambda: jsdata('silD')['headF'], [0.92, 0.85, 0.75, 0.62], [(1175, 380, 1290, 510), (1030, 250, 1420, 430), (1010, 80, 1190, 190), (800, 150, 965, 480), (1425, 150, 1560, 420), (880, 0, 1480, 95)]),
  ('headE', '912', lambda: jsdata('silX', 'SILE'), [0.92, 0.85, 0.75, 0.62], [(1100, 390, 1210, 515), (955, 250, 1365, 425), (960, 85, 1140, 200), (780, 150, 925, 470), (1395, 150, 1545, 420), (860, 0, 1480, 95)]),
  ('farA', '884-885', lambda: jsdata('silX', 'SILFAR')['A'], [0.92, 0.85, 0.75, 0.62], []),
  ('farB', '886-887', lambda: jsdata('silX', 'SILFAR')['B'], [0.92, 0.85, 0.75, 0.62], []),
]
OUT = {}
for name, fr, rf, thrs, exc in JOBS:
    M = ringmask(rf())
    for (x0, y0, x1, y1) in exc: M[y0:y1, x0:x1] = 0
    if name == 'head':   # the 3/4 cup (its measured cushion ellipse, grown 3 px) is drawn as a part
        cm = np.zeros_like(M); cv2.ellipse(cm, ((1458.6, 279.3), (2 * 87.5, 2 * 122.2), np.degrees(-0.055)), 1, -1); M &= 1 - cm
    if name == 'body':   # only where the body shows (not under the head, wing, tail or talons)
        S = jsdata('silC'); cov = ringmask(S['head']) | ringmask(S['wing']) | ringmask(jsdata('silX', 'SILFEET'))
        M &= (1 - cv2.dilate(cov, np.ones((3, 3), np.uint8)))
    Pp = srcpre(fr); P = cv2.GaussianBlur(cv2.dilate(Pp, np.ones((9, 9), np.uint8)), (0, 0), 3)
    L = []
    for t in thrs:
        Z = ((P < t) & (M > 0)).astype(np.uint8); Z = cv2.morphologyEx(Z, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        cs, _ = cv2.findContours(Z, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        for c in cs:
            if cv2.contourArea(c) < 500: continue
            a = cv2.approxPolyDP(c, 5, True).reshape(-1, 2)
            m = np.zeros_like(Z); cv2.fillPoly(m, [c], 1); m &= Z
            L.append([round(float(np.median(P[m > 0])), 3), [int(v) for v in a.ravel()]])
    OUT[name] = L; print(name, len(L), sum(len(z[1]) // 2 for z in L), 'pts')
s = ("// s13 cel tone zones (fix pass 1b), MEASURED by snapshots/s13-fix1-tools/gen_zones.py: where the source's paper tone\n"
     "// (its ink lifted out by a 9 px max filter, on the pre-grade estimate of the frame) falls under 0.92 / 0.85 / 0.75 /\n"
     "// 0.62, each area as a coarse control polygon (Douglas-Peucker 5 px) with its median level: [value, [x, y, ...]].\n"
     "// Drawn lightest first as soft flat fills under the authored strokes. Hardware and faces (drawn as parts) left out.\n"
     "export const ZONES = {\n" + ''.join(f"  {k}: {json.dumps(v, separators=(',', ':'))},\n" for k, v in OUT.items()) + "};\n")
open(ROOT + '/src/shots/s13/zonesM.js', 'w').write(s); print(len(s))
