# end-s27-tfix: object mask for tracing the room at key frame F: our own layers as drawn (room-mask render, magenta = room)
# grown by GrabCut onto the source's objects where ours are offset (within GCR px, never shrunk). Usage: keymask2.py F plate.png out.png
import cv2, numpy as np, sys, os
F, PL, OUT = int(sys.argv[1]), sys.argv[2], sys.argv[3]
WORK = '/Users/computer/rootline/apprentice-film/snapshots/end-s27-tfix-work'
m = cv2.imread(f'{WORK}/mask/v0_r{F}.png'); obj = (~((m[..., 2] > 240) & (m[..., 1] < 20) & (m[..., 0] > 240))).astype(np.uint8)
f = cv2.bilateralFilter(cv2.imread(PL), 7, 30, 5)
E = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
g = np.full(obj.shape, cv2.GC_BGD, np.uint8)
g[cv2.dilate(obj, E(int(os.environ.get('GCR', '30')))) > 0] = cv2.GC_PR_BGD; g[obj > 0] = cv2.GC_PR_FGD; g[cv2.erode(obj, E(12)) > 0] = cv2.GC_FGD
bg = np.zeros((1, 65)); fg = np.zeros((1, 65))
cv2.grabCut(f, g, None, bg, fg, 5, cv2.GC_INIT_WITH_MASK)
add = ((g == cv2.GC_FGD) | (g == cv2.GC_PR_FGD)).astype(np.uint8)
obj |= cv2.dilate(add, E(3))
o = np.full(m.shape, (255, 0, 255), np.uint8); o[obj > 0] = 0; cv2.imwrite(OUT, o)
ov = cv2.imread(PL); ov[obj > 0] = (ov[obj > 0] * 0.5 + np.array([0, 0, 255]) * 0.5).astype(np.uint8)
cv2.imwrite(OUT.replace('.png', '_ov.jpg'), cv2.resize(ov, None, fx=0.4, fy=0.4))
print('mask', F, int(add.sum()))
