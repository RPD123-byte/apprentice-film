# Mean Lab difference (render - source) per block of a GxG grid, heavily blurred; plus the texture level
# (std of the high-pass, σ1.2 - σ4 band) of render and source on each block.
# usage: blockerr.py RENDERDIR k [gx gy]
import cv2, numpy as np, sys, os
REF = os.environ.get('REF', '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref')
d, k = sys.argv[1], int(sys.argv[2]); gx = int(sys.argv[3]) if len(sys.argv) > 3 else 6; gy = int(sys.argv[4]) if len(sys.argv) > 4 else 3
R = cv2.imread(os.path.join(d, 'frame-%05d.png' % k)); S = cv2.imread(os.path.join(REF, 'src', '%05d.png' % k))
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im, (0, 0), 6).astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
LR, LS = lab(R), lab(S)
def tex(im):
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    return cv2.GaussianBlur(g, (0, 0), 0.8) - cv2.GaussianBlur(g, (0, 0), 3)
TR, TS = tex(R), tex(S)
H, W = R.shape[:2]
print('block (x0,y0)   dL    da    db   | tex render/source')
for j in range(gy):
    for i in range(gx):
        x0, x1, y0, y1 = W * i // gx, W * (i + 1) // gx, H * j // gy, H * (j + 1) // gy
        dd = (LR[y0:y1, x0:x1] - LS[y0:y1, x0:x1]).reshape(-1, 3).mean(0)
        print(f'({x0:4d},{y0:3d})  {dd[0]:5.1f} {dd[1]:5.1f} {dd[2]:5.1f}  | {TR[y0:y1,x0:x1].std():4.1f}/{TS[y0:y1,x0:x1].std():4.1f}')
dd = (LR - LS).reshape(-1, 3).mean(0); print(f'ALL  {dd[0]:5.1f} {dd[1]:5.1f} {dd[2]:5.1f}  | tex {TR.std():4.1f}/{TS.std():4.1f}')
