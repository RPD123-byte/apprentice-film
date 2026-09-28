import sys; sys.path.insert(0, '.')
from common import *
from scipy import ndimage
P = np.load('plateF.npy'); n = np.load('plateF_n.npy')
P = np.nan_to_num(P, nan=0)
out = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/'
print(np.percentile(P, [10, 30, 50, 70, 90]))
for thr in (12, 20, 30):
    m = (cv2.GaussianBlur(P, (0, 0), 1.5) > thr).astype(np.uint8)
    op = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
    nl, lab, st, _ = cv2.connectedComponentsWithStats(op)
    big = 1 + np.argmax(st[1:, 4])
    seed = (lab == big).astype(np.uint8)
    # geodesic reconstruction inside m, limited to 40 px from the seed
    lim = cv2.dilate(seed, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (81, 81)))
    rec = seed.copy()
    for it in range(200):
        nr = cv2.dilate(rec, np.ones((3, 3), np.uint8)) & m & lim
        if (nr == rec).all(): break
        rec = nr
    fill = ndimage.binary_fill_holes(rec).astype(np.uint8)
    print(thr, 'seed', st[big, 4], 'rec', rec.sum(), 'fill', fill.sum())
    vis = cv2.cvtColor(np.clip(P, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    cs, _ = cv2.findContours(fill, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(vis, cs, -1, (0, 0, 255), 1)
    cv2.imwrite(out + f'maskF_{thr}.png', vis)
    np.save(f'maskF_{thr}.npy', fill)
