import sys, json; sys.path.insert(0, '.')
import numpy as np, cv2
from tone import raster
name = sys.argv[1]
S_ = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/'
if name == 'F':
    P = np.nan_to_num(np.load('plateF.npy'), nan=0); M = np.load('maskF.npy'); off = np.array([600, -80])
else:
    P = np.load(f'plate{name}.npy'); M = np.load(f'mask{name}.npy'); off = np.array([0, 0])
L = [{'v': l['v'], 'paths': [np.array(p) - off for p in l['paths']]} for l in json.load(open(f'out/owl{name}.json'))]
R = cv2.GaussianBlur(raster(L, P.shape, ss=2), (0, 0), 0.6)
St = json.load(open(f'out/strokes{name}.json'))
ss = 4
big = cv2.resize(R, None, fx=ss, fy=ss, interpolation=cv2.INTER_LINEAR)
for s in St:
    for a, b in zip(s[:-1], s[1:]):
        w = (a[2] + b[2]) / 2; v = (a[3] + b[3]) / 2
        p = (np.array(a[:2]) - off) * ss; q = (np.array(b[:2]) - off) * ss
        cv2.line(big, tuple(np.int32(p)), tuple(np.int32(q)), float(v), max(1, int(round(w * ss))), cv2.LINE_AA)
R2 = cv2.GaussianBlur(cv2.resize(big, (P.shape[1], P.shape[0]), interpolation=cv2.INTER_AREA), (0, 0), 0.3)
Pm = np.where(M > 0, P, 0)
for nm, X in (('tone', R), ('tone+strokes', R2)):
    e0 = np.abs(X - Pm)[M > 0].mean(); e1 = np.abs(cv2.GaussianBlur(X, (0, 0), 1) - cv2.GaussianBlur(Pm, (0, 0), 1))[M > 0].mean()
    print(nm, 'err %.2f σ1 %.2f' % (e0, e1))
ys, xs = np.nonzero(M); cy, cx = int(np.median(ys)), int(np.median(xs))
y0, x0 = max(0, cy - 250), max(0, cx - 250)
cv2.imwrite(S_ + f'strk{name}.png', np.hstack([R[y0:y0 + 400, x0:x0 + 450], R2[y0:y0 + 400, x0:x0 + 450], Pm[y0:y0 + 400, x0:x0 + 450]]).clip(0, 255).astype(np.uint8))
