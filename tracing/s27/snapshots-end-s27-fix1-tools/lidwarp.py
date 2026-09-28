# warp frames into lid-back coordinates (u: image-left edge -> image-right edge of the lid seen from behind, v: top->bottom)
# using the shot's own lid corners/mapping. lidwarp.py OUT F1,F2 dir1:prefix [dir2:prefix ...]
import cv2, numpy as np, sys, json, subprocess
_C = {}
def corners(F):
    if F not in _C: _C[F] = json.loads(subprocess.check_output(['node', '/Users/computer/rootline/apprentice-film/snapshots/end-s27-fix1-tools/lidcorners.mjs', str(F)]))[str(F)]
    return _C[F]
LX0, LY0, LX1, LY1 = -93, -234, 2268, 1170
NU, NV = 400, 236
def maps(F):
    c = np.array(corners(F), np.float64)            # front TL, TR, BR, BL
    t = F / 25
    uu, vv = np.meshgrid((np.arange(NU) + 0.5) / NU, (np.arange(NV) + 0.5) / NV)
    xf = LX1 - uu * (LX1 - LX0); yf = LY0 + vv * (LY1 - LY0)          # back seen from behind: mirrored x
    a = (xf - LX0) / (LX1 - LX0); b = (yf - LY0) / (LY1 - LY0)
    if 128.44 < t < 128.8:
        X = (1 - a) * (1 - b) * c[0, 0] + a * (1 - b) * c[1, 0] + a * b * c[2, 0] + (1 - a) * b * c[3, 0]
        Y = (1 - a) * (1 - b) * c[0, 1] + a * (1 - b) * c[1, 1] + a * b * c[2, 1] + (1 - a) * b * c[3, 1]
    else:
        H = cv2.getPerspectiveTransform(np.float32([[LX0, LY0], [LX1, LY0], [LX1, LY1], [LX0, LY1]]), np.float32(c))
        p = np.stack([xf.ravel(), yf.ravel(), np.ones(xf.size)]); q = H @ p
        X = (q[0] / q[2]).reshape(xf.shape); Y = (q[1] / q[2]).reshape(xf.shape)
    return X.astype(np.float32), Y.astype(np.float32)
if __name__ == '__main__':
    OUT = sys.argv[1]; fr = list(map(int, sys.argv[2].split(','))); dirs = [d.split(':') for d in sys.argv[3:]]
    rows = []
    for F in fr:
        X, Y = maps(F); r = []
        for d, p in dirs:
            im = cv2.imread(f'{d}/{p}{F}.png'); w = cv2.remap(im, X, Y, cv2.INTER_LINEAR)
            cv2.putText(w, f'{d} {F/25:.2f}', (5, 18), 0, 0.5, (0, 0, 255), 1); r += [w, np.full((NV, 3, 3), 255, np.uint8)]
        rows += [np.hstack(r[:-1]), np.full((3, sum(a.shape[1] for a in r[:-1]), 3), 255, np.uint8)]
    cv2.imwrite(OUT, np.vstack(rows[:-1]), [cv2.IMWRITE_JPEG_QUALITY, 90])
