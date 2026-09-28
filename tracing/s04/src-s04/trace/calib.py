#!/usr/bin/env python3
# calib.py key.json -- calibrate a traced key against its own source frame (blurred sigma 6, paint space graded):
# the ink-line width factor wk (from a small set) and one tone offset that cancels the remaining mean bias.
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import preview as PV
from grade import grade
PV.SS = 1
KP = sys.argv[1]; K = json.load(open(KP)); T = K["t"]
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap = cv2.VideoCapture(V); cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(T * 25))); ok, fr = cap.read()
F = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY).astype(np.float32)
m = np.ones(F.shape, bool)
for c in K.get("cut", []):
    mm = np.zeros(F.shape, np.uint8); cv2.fillPoly(mm, [np.array(c, np.int32)], 1); m &= mm == 0
bl = lambda x: cv2.GaussianBlur(x, (0, 0), 6)
b2 = lambda x: cv2.GaussianBlur(x, (0, 0), 2)
Fb = bl(F); F2 = b2(F)
MINC = float(os.environ.get("MINC", "0")); WKS = [float(v) for v in os.environ.get("WKS", "0.6").split(",")]
def filt(sts, sign):
    return [st for st in sts if max((q[4] - q[3]) if sign > 0 else (q[3] - q[4]) for q in st) >= MINC]
K["dark"] = filt(K["dark"], 1); K["bright"] = filt(K["bright"], -1)
def score(wk, shift):
    K2 = dict(K); K2["tone"] = [dict(b, v=float(np.clip(b["v"] + shift, 0, 255))) for b in K["tone"]]
    img, a = PV.render(K2, {"wk": wk, "bw": wk, "tblur": 1.2})
    G = grade(img, T); e = (bl(G) - Fb)[m]; e2 = (b2(G) - F2)[m]
    return 0.5 * (float(np.abs(e).mean()) + float(np.abs(e2).mean())), float(e.mean())
best = None
for wk in WKS:          # line weight fixed (a visual match of the source's line weight; the blurred metric alone
                           # prefers thinner lines, because partly traced hatching is better hidden when faint)
    mae, sb = score(wk, 0)
    if best is None or mae < best[0]: best = (mae, sb, wk)
mae0, sb, wk = best
shift = -sb * 1.1
mae1, sb1 = score(wk, shift)
if mae1 > mae0: shift, mae1, sb1 = 0, mae0, sb
K["cal"] = {"wk": wk, "tshift": round(shift, 1)}
json.dump(K, open(KP, "w"))
print(f"{T:.2f} calib: wk {wk}, tone shift {shift:+.1f} -> MAE(s6+s2)/2 {mae1:.2f} (bias {sb1:+.2f}; before shift {mae0:.2f})")
