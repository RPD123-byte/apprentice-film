# latesf.py DIR [DIR...]: owl-footprint metrics for the late drawings (79.80-81.68) and the walk (81.72-83.92), single
# frames: MAE of σ0.7 images, high-pass MAE (σ0.7 − σ6), gradient energy render/source; footprint = source σ8 > 150 in the top margin (y < 126)
import sys, glob, re, os, cv2, numpy as np
sys.path.insert(0, '.')
from run import src, gray
for d in sys.argv[1:]:
    acc = {'late': [], 'walk': []}
    for p in sorted(glob.glob(f'{d}/r*.png')):
        F = int(re.search(r'r(\d+)\.png', p).group(1)); t = F / 25
        k = 'late' if 79.79 < t < 81.7 else ('walk' if 81.7 < t < 83.95 else None)
        if not k: continue
        a = gray(cv2.imread(p)); b = gray(src(F))
        m = (cv2.GaussianBlur(b, (0, 0), 8) > 150); m[126:] = False
        if m.sum() < 300: continue
        a1 = cv2.GaussianBlur(a, (0, 0), 0.7); b1 = cv2.GaussianBlur(b, (0, 0), 0.7)
        hp = lambda x: x - cv2.GaussianBlur(x, (0, 0), 6)
        gr = lambda x: np.hypot(cv2.Sobel(x, cv2.CV_32F, 1, 0), cv2.Sobel(x, cv2.CV_32F, 0, 1))[m].mean()
        acc[k].append((np.abs(a1 - b1)[m].mean(), np.abs(hp(a1) - hp(b1))[m].mean(), gr(a1), gr(b1)))
    for k, L in acc.items():
        if L: A = np.array(L).mean(0); print(f'{d} {k:4s} n={len(L)} MAE {A[0]:.2f} hpMAE {A[1]:.2f} grad r/s {A[2]:.1f}/{A[3]:.1f}')
