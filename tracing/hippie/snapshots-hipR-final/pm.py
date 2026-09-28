# page-harness metric: pm.py dir [dir ...] -> ΔE σ2/4/8/12 page@117.4 (owl corner masked), strip@92 (strip rect)
import cv2, numpy as np, sys, glob, re, os
def find(d, t):
    for f in glob.glob(os.path.join(d, 'frame-*-at-*.png')):
        m = re.search(r'at-([\d.]+)s', f)
        if m and abs(float(m.group(1)) - t) < 0.01: return f
def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im, (0, 0), s).astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
for d in sys.argv[1:]:
    out = []
    for t, reg in ((117.4, None), (92.0, (193, 185, 1976, 362))):
        f = find(d, t)
        if not f: continue
        R = cv2.imread(f); S = cv2.imread(f'hipR-ref/src-{t:.1f}.png')
        m = np.zeros(S.shape[:2], bool)
        if reg: m[reg[1]:reg[3], reg[0]:reg[2]] = True
        else: m[:] = True; m[40:260, 1920:] = False
        out.append(f'{t}: ' + ' '.join(f'{np.linalg.norm(lab(R, s) - lab(S, s), axis=2)[m].mean():5.2f}' for s in (2, 4, 8, 12)))
    print(f'{d:22s}', '   '.join(out))
