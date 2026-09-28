# Fit the whip's radial zoom blur (s27/gl.js zoomBlur model) to a source frame, simulated in graded space on an
# unblurred render (half res). usage: whipfit.py k [sym]   (k = 25 fps frame index)
import cv2, numpy as np, sys, os
from scipy.optimize import minimize
REF = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref'
P = '/Users/computer/rootline/apprentice-film/snapshots/s27t-noblur'
k = int(sys.argv[1]); sym = int(sys.argv[2]) if len(sys.argv) > 2 else 0
S2 = 2
src = cv2.imread(f'{REF}/src/{k:05d}.png'); ren = cv2.imread(f'{P}/frame-{k:05d}.png')
src = cv2.resize(src, (2206 // S2, 946 // S2), interpolation=cv2.INTER_AREA).astype(np.float32)
ren = cv2.resize(ren, (2206 // S2, 946 // S2), interpolation=cv2.INTER_AREA).astype(np.float32)
H, W = src.shape[:2]
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def lab(im): return cv2.cvtColor(np.clip(cv2.GaussianBlur(im, (0, 0), 4), 0, 255) / 255, cv2.COLOR_BGR2Lab)
LS = lab(src)
def sim(p, img=ren):
    cx, cy, amt, floor, z, fl, fr = p
    cx /= S2; cy /= S2
    # zoom about WHIP_C first
    zc = (1078 / S2, 440 / S2)
    mx = zc[0] + (xx - zc[0]) / z; my = zc[1] + (yy - zc[1]) / z
    base = cv2.remap(img, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    dx = (xx - cx) / H; dy = (yy - cy) / H
    re = np.sqrt(dx * dx + (0.55 * dy) ** 2)
    kk = amt * (floor + (1 - floor) * np.clip((re - 0.05) / 0.45, 0, 1))
    acc = np.zeros_like(base); n = 32
    for i in range(n):
        u = i / (n - 1); s = 1 - kk * ((u - 0.5) if sym else u)
        acc += cv2.remap(base, (cx + (xx - cx) * s).astype(np.float32), (cy + (yy - cy) * s).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    out = acc / n
    out = out * (1 - fl) + fr * fl        # wash toward a grey level fr (graded space)
    return out
def err(p):
    return np.linalg.norm(lab(sim(p)) - LS, axis=2).mean()
p0 = [1085, 300, 0.17, 0.5, 1.0, 0.0, 200] if len(sys.argv) < 4 else [float(v) for v in sys.argv[3].split(',')]
print('start', p0, err(p0))
bounds = [(700, 1500), (100, 700), (0.0, 0.8), (0, 1), (0.8, 1.4), (0, 0.9), (100, 255)]
r = minimize(err, p0, method='Powell', bounds=bounds, options={'maxiter': 3000, 'xtol': 1e-3, 'ftol': 1e-4})
print('fit', [round(v, 4) for v in r.x], round(r.fun, 3))
out = sim(r.x)
cv2.imwrite(f'/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/whipfit-{k}-{sym}.jpg', np.vstack([src, np.clip(out, 0, 255)]).astype(np.uint8))
