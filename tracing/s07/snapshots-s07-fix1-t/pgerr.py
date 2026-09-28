# pgerr.py DIR [DIR2...] : rectified page-space error (sigma 3 and 8, colour) of frame 745 vs the source screen mean, by region
import cv2, numpy as np, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s07-fix1-t')
from rect import rect
b = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src_screen_mean.png').astype(np.float32)
R = dict(all=(0, 0, 1600, 1000), rainL=(0, 380, 460, 900), rainL2=(0, 380, 250, 800), robot=(150, 720, 320, 900), plume=(120, 450, 280, 640), fan=(450, 150, 1000, 520), ticket=(620, 760, 980, 900))
for d in sys.argv[1:]:
    a = rect(cv2.imread(f'{d}/r0745.png')).astype(np.float32)
    out = []
    for s in (3, 8):
        e = np.abs(cv2.GaussianBlur(a, (0, 0), s) - cv2.GaussianBlur(b, (0, 0), s)).mean(2)
        out.append(' '.join('%s %.2f' % (k, e[y0:y1, x0:x1].mean()) for k, (x0, y0, x1, y1) in R.items()))
    print(d, '\n   s3:', out[0], '\n   s8:', out[1])
