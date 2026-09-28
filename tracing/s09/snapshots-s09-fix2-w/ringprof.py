# ring-band mean vs angle for source and render: band between ellipse A (t=0) and B (t=1) in [cx,cy,rx,ry]
import cv2, numpy as np, sys, glob, json
d, idx = sys.argv[1], sys.argv[2]; A = json.loads(sys.argv[3]); B = json.loads(sys.argv[4])
r = cv2.imread(glob.glob(f"{d}/frame-{idx}-*.png")[0], 0).astype(float); s = cv2.imread(glob.glob(f"{d}/ref-{idx}-*.png")[0], 0).astype(float)
def samp(img, th):
    vals = []
    for t in np.linspace(0.05, 0.95, 10):
        E = [a + (b - a) * t for a, b in zip(A, B)]
        x, y = E[0] + np.cos(th) * E[2], E[1] + np.sin(th) * E[3]
        if 0 <= x < img.shape[1] - 1 and 0 <= y < img.shape[0] - 1: vals.append(img[int(round(y)), int(round(x))])
    return (np.mean(vals), np.max(vals)) if vals else (np.nan, np.nan)
for th in np.arange(-np.pi, np.pi, 0.2):
    a, b = samp(s, th), samp(r, th)
    print('%+5.2f  src %5.0f/%3.0f  ren %5.0f/%3.0f' % (th, a[0], a[1], b[0], b[1]))
