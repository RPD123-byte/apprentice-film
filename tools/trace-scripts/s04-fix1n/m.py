# m.py DIR [T0 T1] -- per-frame metrics of harness renders DIR/r-T.png against the source:
#  s6/s2 blurred MAE, and motion-compensated frame residual (render vs source; both warped by the SOURCE's DIS flow)
import cv2, glob, re, sys, numpy as np, os
d = sys.argv[1]
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap = cv2.VideoCapture(V)
_c = {}
def src(fi):
    if fi not in _c:
        cap.set(cv2.CAP_PROP_POS_FRAMES, fi); ok, f = cap.read(); _c[fi] = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
    return _c[fi]
fs = sorted(glob.glob(d + '/r-*.png'), key=lambda p: float(re.search(r'r-([\d.]+)\.png', p).group(1)))
if len(sys.argv) > 3:
    a, b = float(sys.argv[2]), float(sys.argv[3]); fs = [f for f in fs if a - 1e-6 <= float(re.search(r'r-([\d.]+)\.png', f).group(1)) <= b + 1e-6]
b6 = lambda x: cv2.GaussianBlur(x, (0, 0), 6); b2 = lambda x: cv2.GaussianBlur(x, (0, 0), 2); b1 = lambda x: cv2.GaussianBlur(x, (0, 0), 1.5)
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
H, W = 946, 2206
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
prev = None; rows = []
for f in fs:
    t = float(re.search(r'r-([\d.]+)\.png', f).group(1)); fi = int(round(t * 25))
    R = cv2.imread(f, 0).astype(np.float32); S = src(fi)
    m6 = np.abs(b6(R) - b6(S)).mean(); m2 = np.abs(b2(R) - b2(S)).mean()
    ratio = rr = rs = float('nan')
    if prev is not None and prev[0] == fi - 1:
        Sp = src(fi - 1); Rp = prev[1]
        fl = dis.calc(S.astype(np.uint8), Sp.astype(np.uint8), None)
        Swp = cv2.remap(Sp, xx + fl[..., 0], yy + fl[..., 1], cv2.INTER_LINEAR)
        Rwp = cv2.remap(Rp, xx + fl[..., 0], yy + fl[..., 1], cv2.INTER_LINEAR)
        rs = np.abs(b1(S) - b1(Swp))[40:-40, 40:-40].mean(); rr = np.abs(b1(R) - b1(Rwp))[40:-40, 40:-40].mean(); ratio = rr / max(rs, 0.3)
    rows.append((t, m6, m2, rr, rs, ratio)); prev = (fi, R)
for t, m6, m2, rr, rs, ratio in rows:
    fl = ' <<' if ratio == ratio and ratio > 1.8 else ''
    print(f"{t:6.2f} s6 {m6:5.2f} s2 {m2:5.2f}  res R {rr:5.2f} S {rs:5.2f} x{ratio:4.2f}{fl}")
a = np.array([r[1:3] for r in rows]); print(f"mean s6 {a[:,0].mean():.2f} max {a[:,0].max():.2f}  s2 {a[:,1].mean():.2f}")
q = np.array([r[5] for r in rows if r[5] == r[5]]); 
if len(q): print(f"residual ratio mean {q.mean():.2f} max {q.max():.2f} n>1.8 {int((q>1.8).sum())}")
