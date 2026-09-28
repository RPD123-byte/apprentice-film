# pgm.py DIR... : page-space colour error (s3, s8) of frame 745 vs the source screen mean, per element box
import cv2, numpy as np, sys, os
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s07-fix2-cmp/tools')
from rect import rect
b = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src_screen_mean.png').astype(np.float32)
R = dict(all=(0, 0, 1600, 1000), robot=(150, 720, 320, 900), puffs=(20, 860, 250, 1000), cam=(230, 330, 370, 475), smiley=(470, 130, 590, 245), daisy=(1180, 700, 1490, 1000), spark=(1060, 100, 1125, 170), apple=(1070, 690, 1160, 780), rainL=(0, 380, 460, 900), purple=(0, 380, 300, 700))
bs = {s: cv2.GaussianBlur(b, (0, 0), s) for s in (3, 8)}
for d in sys.argv[1:]:
    a = rect(cv2.imread(f'{d}/r0745.png')).astype(np.float32)
    out = []
    for s in (3, 8):
        e = np.abs(cv2.GaussianBlur(a, (0, 0), s) - bs[s]).mean(2)
        out.append({k: e[y0:y1, x0:x1].mean() for k, (x0, y0, x1, y1) in R.items()})
    print(os.path.basename(d).ljust(8), ' '.join('%s %.2f/%.2f' % (k, out[0][k], out[1][k]) for k in R))
