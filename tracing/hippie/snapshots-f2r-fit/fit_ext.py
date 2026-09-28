# Measure the headline extrusion per glyph: the shift D (dx, dy) such that face swept along 0..D (dilated by the
# keyline) best matches the non-sky mask; and the orange part's depth.
import cv2, numpy as np
im = cv2.imread('../f2r-meas/page-pre.png').astype(np.float32)
X0, Y0, X1, Y1 = 630, 80, 1510, 380
c = im[Y0:Y1, X0:X1]
b, g, r = c[..., 0], c[..., 1], c[..., 2]
sky = (r < 75) & (g < 75) & (b < 85)
# the keyline is dark too: non-sky = colours; fill small dark gaps by closing
col = (~sky).astype(np.uint8)
face = (cv2.imread('face-mask.png', 0) > 127).astype(np.uint8)
orange = ((r > 150) & (g < 125) & (b < 105) & (r > g + 60)).astype(np.uint8)
pinkv = ((r > 100) & (g < 90) & (b > 80) & ~((r > 150) & (g < 125) & (b < 105))).astype(np.uint8) | ((b > 110) & (r < 180) & (g < 110)).astype(np.uint8)
cv2.imwrite('orange-mask.png', orange * 255); cv2.imwrite('pinkv-mask.png', pinkv * 255)
n, lb, st, cen = cv2.connectedComponentsWithStats(face)
def sweep(m, dx, dy, steps=12):
    acc = np.zeros_like(m)
    for k in range(steps + 1):
        t = k / steps
        M = np.float32([[1, 0, dx * t], [0, 1, dy * t]])
        acc = np.maximum(acc, cv2.warpAffine(m, M, (m.shape[1], m.shape[0])))
    return acc
res = []
for i in range(1, n):
    x, y, w, h, a = st[i]
    if a < 1000: continue
    pad = 45
    sl = (slice(max(0, y - 6), min(face.shape[0], y + h + pad)), slice(max(0, x - pad), min(face.shape[1], x + w + pad)))
    f = (lb[sl] == i).astype(np.uint8)
    fd = cv2.dilate(f, np.ones((7, 7), np.uint8))
    tgt_all = (orange[sl] | pinkv[sl] | f)
    tgt_or = (orange[sl] | f)
    best = None
    for dy in range(8, 40, 1):
        for dx in range(-16, 17, 1):
            p = sweep(f, dx, dy)
            # only score where this glyph could reach: below/around its own face
            reg = cv2.dilate(sweep(fd, dx, dy), np.ones((5, 5), np.uint8)) > 0
            sc = np.logical_and(p > 0, tgt_all > 0)[reg].sum() / max(1, np.logical_or(p > 0, tgt_all > 0)[reg].sum())
            if best is None or sc > best[0]: best = (sc, dx, dy)
    sc, dx, dy = best
    bo = None
    for k in range(3, 26):
        t = k / 30
        p = sweep(f, dx * t / 1, dy * t / 1) if False else sweep(f, dx * k / dy if dy else 0, k)
        reg = cv2.dilate(sweep(fd, dx, dy), np.ones((5, 5), np.uint8)) > 0
        s2 = np.logical_and(p > 0, tgt_or > 0)[reg].sum() / max(1, np.logical_or(p > 0, tgt_or > 0)[reg].sum())
        if bo is None or s2 > bo[0]: bo = (s2, k)
    res.append((x + X0 + w / 2, y + Y0 + h / 2, dx, dy, bo[1], round(sc, 3)))
    print('glyph @%4d,%3d  D=(%3d,%3d)  orange depth %2d  IoU %.3f' % (x + X0 + w / 2, y + Y0 + h / 2, dx, dy, bo[1], sc))
