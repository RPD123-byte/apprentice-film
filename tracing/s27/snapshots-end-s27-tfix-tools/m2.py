# end-s27-tfix: per-frame metrics for a render dir against the source (and film.mp4).
#   dE8 = CIE76 on sigma8-blurred Lab; s4/s12 = mean abs RGB diff after Gaussian blur
#   inkR = right-half (x >= 1103) edge energy: mean Sobel magnitude of sigma1.2-blurred luma (grain mostly removed)
#   sharp = same over the whole frame; grain = std of (luma - sigma2 blur) where the sigma4 gradient is low (flat areas)
# Usage: python3 m2.py WORK RENDERDIR PREFIX F0 F1 [out.json]
import cv2, numpy as np, json, sys
W, RD, PF, F0, F1 = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
def blur(a, s): return cv2.GaussianBlur(a, (0, 0), s)
def lab(a): return cv2.cvtColor((a / 255).astype(np.float32), cv2.COLOR_BGR2Lab)
def diff(a, b):
    s4 = np.abs(blur(a, 4) - blur(b, 4)).mean(); s12 = np.abs(blur(a, 12) - blur(b, 12)).mean()
    de = np.sqrt(((lab(blur(a, 8)) - lab(blur(b, 8))) ** 2).sum(-1)).mean()
    return float(de), float(s4), float(s12)
def feats(a):
    y = cv2.cvtColor(a.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
    yb = blur(y, 1.2); gx = cv2.Sobel(yb, cv2.CV_32F, 1, 0); gy = cv2.Sobel(yb, cv2.CV_32F, 0, 1); g = np.sqrt(gx * gx + gy * gy) / 8
    y4 = blur(y, 4); g4 = np.sqrt(cv2.Sobel(y4, cv2.CV_32F, 1, 0) ** 2 + cv2.Sobel(y4, cv2.CV_32F, 0, 1) ** 2) / 8
    flat = (g4 < 0.6) & (y4 > 60)
    r = y - blur(y, 2)
    return float(g[:, 1103:].mean()), float(g.mean()), float(r[flat].std()) if flat.sum() > 1000 else -1
R = {}
for F in range(F0, F1 + 1):
    s = cv2.imread(f'{W}/src/s{F}.png'); r = cv2.imread(f'{RD}/{PF}{F}.png')
    if r is None or s is None: continue
    s = s.astype(np.float32); r = r.astype(np.float32)
    R[F] = {'t': round(F / 25, 2), 'd': diff(r, s), 'fr': feats(r), 'fs': feats(s)}
if len(sys.argv) > 6: json.dump(R, open(sys.argv[6], 'w'))
STR = [('whip', 117.52, 117.90), ('hold', 117.92, 119.8), ('turn', 119.84, 124.6), ('hold2', 124.64, 126.3), ('owl', 126.32, 127.5),
       ('orbit', 127.52, 128.4), ('edge-on', 128.44, 128.8), ('end', 128.84, 129.29), ('ALL s27', 117.52, 129.29)]
for n, a, b in STR:
    ks = [F for F in R if a - 1e-6 <= F / 25 <= b + 1e-6]
    if not ks: continue
    d = np.mean([R[k]['d'] for k in ks], 0); fr = np.mean([R[k]['fr'] for k in ks], 0); fs = np.mean([R[k]['fs'] for k in ks], 0)
    print(f'{n:8s} n={len(ks):3d} dE8 {d[0]:.2f} s4 {d[1]:.2f} s12 {d[2]:.2f} | inkR {fr[0]:.2f}/{fs[0]:.2f} sharp {fr[1]:.2f}/{fs[1]:.2f} grain {fr[2]:.2f}/{fs[2]:.2f}')
