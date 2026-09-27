# edge.py DIR : light-page left edge (plate x) in render vs source, rows 110-250 of the screen
import cv2, glob, sys, re, numpy as np
src = open('/Users/computer/rootline/apprentice-film/src/shots/s01_birdseye.js').read()
cam = [list(map(float, m)) for m in re.findall(r'\[(\d\.\d\d), (1\.\d+), (-?[\d.]+), (-?[\d.]+)\]', src)]
def camat(t):
    if t <= cam[0][0]: return cam[0][1:]
    for i in range(1, len(cam)):
        if t <= cam[i][0]:
            a, b = cam[i-1], cam[i]; u = (t - a[0]) / (b[0] - a[0]); return [a[k] + (b[k]-a[k])*u for k in (1,2,3)]
    return cam[-1][1:]
def toplate(f, t, x0, y0, x1, y1, k=2):
    s, tx, ty = camat(t)
    Minv = np.float32([[s/k, 0, s*x0+tx], [0, s/k, s*y0+ty]])
    return cv2.warpAffine(f, Minv, (int((x1-x0)*k), int((y1-y0)*k)), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_CUBIC)
for f in sorted(glob.glob(sys.argv[1] + '/frame-*.png')):
    t = float(re.search(r'at-([\d.]+)s', f).group(1)); tt = np.ceil(t*25-1e-6)/25
    res = []
    for g in (f, f.replace('frame-', 'ref-')):
        im = cv2.imread(g, 0).astype(np.float32)
        tref = tt if g == f else round(t*25)/25
        pl = toplate(im, tref, 860, 110, 1280, 250, 2)
        prof = pl.mean(0)
        sm = np.convolve(prof, np.ones(5)/5, 'same')
        thr = (np.percentile(sm, 10) + np.percentile(sm, 90)) / 2
        idx = np.where(sm > thr)[0]
        res.append(860 + idx[0]/2 if len(idx) else -1)
    print(f'{t:.2f}  render edge {res[0]:7.1f}  source edge {res[1]:7.1f}  diff {res[1]-res[0]:+.1f}')
