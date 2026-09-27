# Owl silhouette on a source frame (measurement only): difference against the clean room+card frame (57.32/57.36,
# before the owl rolls in), valid while the card stands (to 61.44). Also for a render: difference against the
# render's own clean frame. Writes the mask and prints its box, area and row widths.
import sys, numpy as np, cv2
from common import frame
def mask_from(img, clean, thr=28, close=15, openr=5):
    d = cv2.GaussianBlur(np.abs(img.astype(np.float32) - clean.astype(np.float32)), (0, 0), 2.0)
    m = (d > thr).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close, close)))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (openr, openr)))
    # fill holes (the owl's white interior against the white card)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n <= 1: return m
    k = 1 + np.argmax(st[1:, 4]); m = (lab == k).astype(np.uint8)
    ff = m.copy(); h, w = m.shape; msk = np.zeros((h + 2, w + 2), np.uint8); cv2.floodFill(ff, msk, (0, 0), 1)
    return m | (1 - ff)
_DUST = None
def dust_mask(t, grow=9):
    # the skid's dust cloud (trace/dust.py outlines) is not the owl
    global _DUST
    import json, os
    if _DUST is None:
        p = '/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/dust.json'
        _DUST = json.load(open(p)) if os.path.exists(p) else {}
    m = np.zeros((946, 2206), np.uint8)
    for poly in _DUST.get(f'{t:.2f}', {}).get('polys', []): cv2.fillPoly(m, [np.array(poly, np.int32)], 1)
    return cv2.dilate(m, np.ones((grow, grow), np.uint8)) if m.any() else m
def src_mask(t):
    clean = np.mean([frame(1433), frame(1434)], 0)
    g = frame(int(round(t * 25)))
    dm = dust_mask(round(t, 2))
    if dm.any(): g = np.where(dm > 0, clean, g)
    return mask_from(g, clean)
def stats(m):
    ys, xs = np.nonzero(m)
    rows = {}
    for y in range(ys.min(), ys.max() + 1, 20):
        r = np.nonzero(m[y])[0]
        if len(r): rows[y] = (int(r.min()), int(r.max()))
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())), int(m.sum()), rows
if __name__ == '__main__':
    for t in sys.argv[1].split(','):
        m = src_mask(float(t)); b, a, rows = stats(m)
        cv2.imwrite(f'/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/om-{float(t):.2f}.png', m * 255)
        print(t, b, a)
