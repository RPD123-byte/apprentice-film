# emap.py DIR n x0 y0 x1 y1 [sig] -> render | source | signed sigma error (red: render darker, green: brighter)
import sys, cv2, numpy as np; sys.path.insert(0, '.')
import h16
d, n = sys.argv[1], int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); sg = float(sys.argv[7]) if len(sys.argv) > 7 else 4
R = h16.gray(cv2.imread(f'{d}/r{n}.png').astype(np.float32)); S = h16.gray(h16.src(n))
e = cv2.GaussianBlur(R, (0, 0), sg) - cv2.GaussianBlur(S, (0, 0), sg)
e = e[y0:y1, x0:x1]; k = 255 / 40
vis = np.zeros(e.shape + (3,), np.uint8); vis[..., 2] = np.clip(-e * k, 0, 255); vis[..., 1] = np.clip(e * k, 0, 255)
r = cv2.cvtColor(R[y0:y1, x0:x1].astype(np.uint8), cv2.COLOR_GRAY2BGR); s = cv2.cvtColor(S[y0:y1, x0:x1].astype(np.uint8), cv2.COLOR_GRAY2BGR)
cv2.imwrite(f'../s16-fix1-crops/e{n}.jpg', np.hstack([r, s, vis]))
print('mean signed', e.mean().round(2), 'abs', np.abs(e).mean().round(2))
