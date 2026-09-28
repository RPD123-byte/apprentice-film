# fix pass 1: the review's named regions, render vs source: tiles_f1.py dir [dir_before]
import cv2, numpy as np, glob, re, sys
R = {'bay/synth x1472-1840 y315-630': (1472, 315, 1840, 630), 'far right x1840-2206 y315-630': (1840, 315, 2206, 630),
     'floor x368-736 y630-946': (368, 630, 736, 946), 'floor x1104-1472 y630-946': (1104, 630, 1472, 946),
     'ceiling x1000-1600 y0-120': (1000, 0, 1600, 120), 'speaker x60-480 y280-700': (60, 280, 480, 700)}
def stats(d, t):
    fs = glob.glob(f'{d}/frame-*-at-{t}s.png')
    if not fs: return None
    a = cv2.cvtColor(cv2.imread(fs[0]), cv2.COLOR_BGR2GRAY).astype(float); b = cv2.cvtColor(cv2.imread(fs[0].replace('frame-', 'ref-')), cv2.COLOR_BGR2GRAY).astype(float)
    A = cv2.GaussianBlur(a, (0, 0), 8); B = cv2.GaussianBlur(b, (0, 0), 8)
    out = {}
    for k, (x0, y0, x1, y1) in R.items():
        out[k] = ((A - B)[y0:y1, x0:x1].mean(), np.abs(A - B)[y0:y1, x0:x1].mean(), np.percentile(a[y0:y1, x0:x1], 95), np.percentile(b[y0:y1, x0:x1], 95))
    return out
for t in ['40', '40.16', '40.32', '40.48', '40.56', '40.6', '40.64']:
    for d in sys.argv[1:]:
        s = stats(d, t)
        if not s: continue
        print(t, d.split('/')[-1], ' | '.join(f'{k.split(" ")[0]} {v[0]:+.1f}/{v[1]:.1f} p95 {v[2]:.0f}:{v[3]:.0f}' for k, v in s.items()))
