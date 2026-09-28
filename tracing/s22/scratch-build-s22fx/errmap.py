import cv2, numpy as np, sys
sys.argv = [sys.argv[0]] + sys.argv[1:]
exec(open('owlm.py').read().split('rd = sys.argv[1]')[0])
rd = sys.argv[1]; out = sys.argv[3]
tiles = []
for F in map(int, sys.argv[2].split(',')):
    t = F / 25; side, cup = state(t)
    a, b, c, d = R[side]
    A = np.array([[a, c, 0], [b, d, 0]], np.float32); A[:, 2] = np.array(cup) - A[:, :2] @ np.array([115, 60])
    Ai = cv2.invertAffineTransform(A)
    ra = cv2.warpAffine(g(__import__('rmap').rimg(F)), Ai, (330, 172), flags=cv2.INTER_LINEAR)
    sb = cv2.warpAffine(g(np.array(fr[F - 1863])), Ai, (330, 172), flags=cv2.INTER_LINEAR)
    dd = cv2.GaussianBlur(ra, (0, 0), 2) - cv2.GaussianBlur(sb, (0, 0), 2)
    hm = cv2.applyColorMap(np.clip(128 + dd * 2, 0, 255).astype(np.uint8), cv2.COLORMAP_JET)
    tiles.append(np.hstack([cv2.cvtColor(ra.astype(np.uint8), cv2.COLOR_GRAY2BGR), cv2.cvtColor(sb.astype(np.uint8), cv2.COLOR_GRAY2BGR), hm]))
cv2.imwrite(out, cv2.resize(np.vstack(tiles), None, fx=1.5, fy=1.5))
