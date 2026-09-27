# Median plate of a rigidly moving drawing: frames ks, per-frame shift (dx,dy) of the drawing relative to the plate's
# frame; plate covers box [X0,Y0,X1,Y1] in the reference frame's coordinates. Output: float32 npy (pre-grade 0..255)
# plus a count map. Measurement only.
import sys, json; sys.path.insert(0, '.')
from common import *
def build(ks, shifts, box, halation=True):
    X0, Y0, X1, Y1 = box
    w, h = X1 - X0, Y1 - Y0
    stack = []; valid = []
    for k in ks:
        dx, dy = shifts[k]
        u = U(k, halation)
        # plate pixel (x,y) (ref coords) <- frame pixel (x+dx, y+dy)
        M = np.float32([[1, 0, X0 + dx], [0, 1, Y0 + dy]])
        s = cv2.warpAffine(u, M, (w, h), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_CONSTANT, borderValue=-1)
        v = cv2.warpAffine(np.ones_like(u), M, (w, h), flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        # stay 3 px clear of the frame edge
        v = cv2.erode(v, np.ones((7, 7), np.uint8))
        s[v < 0.5] = np.nan
        stack.append(s)
    S = np.stack(stack)
    P = np.nanmedian(S, axis=0)
    n = np.isfinite(S).sum(0)
    return P, n, S
if __name__ == '__main__':
    tr = json.load(open('ftrack.json'))
    sh = {int(k): (v[0], v[1]) for k, v in tr.items()}
    box = [600, -80, 1980, 946]
    P, n, S = build(range(24, 54), sh, box)
    np.save('plateF.npy', P.astype(np.float32)); np.save('plateF_n.npy', n)
    lo = np.nanpercentile(S, 25, axis=0); hi = np.nanpercentile(S, 75, axis=0)
    np.save('plateF_iqr.npy', (hi - lo).astype(np.float32))
    cv2.imwrite(sys.argv[1] if len(sys.argv) > 1 else 'plateF.png', np.nan_to_num(P, nan=128).clip(0, 255).astype(np.uint8))
    print(P.shape, np.nanmin(n), n.max())
