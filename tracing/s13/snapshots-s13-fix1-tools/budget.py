# budget.py RENDERDIR FRAME : where the sigma-8 error mass sits: silhouette edge band, background, hardware/features,
# fur interior (fractions of the frame's total |err|)
import sys, numpy as np, cv2
from cfg import *
d, f = sys.argv[1], int(sys.argv[2])
R = cv2.GaussianBlur(cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32), (0, 0), 8); Sraw = src(f); S = cv2.GaussianBlur(Sraw, (0, 0), 8)
E = np.abs(R - S); tot = E.sum()
lit = (cv2.GaussianBlur(Sraw, (0, 0), 1) > 70).astype(np.uint8)
edge = cv2.dilate(lit, np.ones((25, 25), np.uint8)) & ~cv2.erode(lit, np.ones((25, 25), np.uint8)) & 1
bg = (1 - cv2.dilate(lit, np.ones((25, 25), np.uint8))) & 1
feat = np.zeros_like(lit)
part = 'headF' if 901 <= f <= 911 else 'headE' if f == 912 else 'head'
feat = apply_exb(np.ones_like(lit), part); feat = 1 - feat
feat &= (1 - edge) & (1 - bg)
feet = np.zeros_like(lit); feet[840:, 1140:1640] = 1; feet &= (1 - edge) & (1 - bg) & (1 - feat)
fur = (1 - edge) & (1 - bg) & (1 - feat) & (1 - feet)
for n, m in [('silhouette band +-12px', edge), ('background', bg), ('features (eyes, beak, bandage, cups)', feat), ('feet', feet), ('fur interior', fur)]:
    print(f'{n:40s} area {m.sum() / m.size * 100:5.1f}%  error share {E[m > 0].sum() / tot * 100:5.1f}%  mean |err| {E[m > 0].mean():5.2f}')
