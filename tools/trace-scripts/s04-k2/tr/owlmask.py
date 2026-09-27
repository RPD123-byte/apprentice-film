#!/usr/bin/env python3
# owlmask.py F0 F1 out.js -- where the hold key's frame (20.56), carried by its STORED flow, fails to show source
# frame f (the owl gliding in / landing / folding its wings): residual > thr, closed, dilated -> outline polygons.
# s04 draws the hold key there as the base and the per-frame keys only inside these outlines (feathered).
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from grade import flick
F0, F1, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
def fr(i):   # the film's flicker divided out, so it does not count as a change
    cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = cap.read(); return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32) / flick(i / 25)
K = json.load(open('tr/d20.56.json')); A = fr(514); H, W = A.shape
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
res = {}
for f in range(F0, F1 + 1):
    o = str(f - 514); fl = K["flows"].get(o)
    if fl:
        g = np.array(fl["v"], np.float32).reshape(fl["ny"], fl["nx"], 2) / 4; st = fl["step"]
        fx = cv2.remap(g[..., 0], xx / st, yy / st, cv2.INTER_LINEAR); fy = cv2.remap(g[..., 1], xx / st, yy / st, cv2.INTER_LINEAR)
        Wp = cv2.remap(A, xx + fx, yy + fy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    else: Wp = A
    B = fr(f)
    r = np.abs(cv2.GaussianBlur(Wp, (0, 0), 3) - cv2.GaussianBlur(B, (0, 0), 3))
    m = (cv2.GaussianBlur(r, (0, 0), 6) > 5).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (81, 81)))
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polys = []
    for c in cs:
        if cv2.contourArea(c) < 3000: continue
        a = cv2.approxPolyDP(c, 4, True)[:, 0, :]
        polys.append([[int(p[0]), int(p[1])] for p in a])
    area = sum(cv2.contourArea(np.array(p)) for p in polys)
    print(f, f"{f/25:.2f}", len(polys), "polys, area frac", round(area / (W * H), 3))
    res[f] = polys
hdr = "// s04: where the owl's per-frame keys are drawn over the carried hold key, frames %d-%d (measured by\n// snapshots/s04-k2/tr/owlmask.py: residual of the carried 20.56 frame against each source frame; outlines only).\n" % (F0, F1)
open(OUT, "w").write(hdr + "export const OWL_MASK = " + json.dumps({str(k): v for k, v in res.items()}, separators=(",", ":")) + ";\n")
