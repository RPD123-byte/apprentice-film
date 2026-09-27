# Plates, masks and tone traces of the held drawings H (98.96–99.28) and J (99.48–100.44). Measurement only.
import sys, json; sys.path.insert(0, '.')
from common import *
from shifts import shift
from mask import silhouette, show
from tone import trace, npts
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/'
LV = [12, 25, 38, 52, 65, 78, 92, 105, 118, 132, 145, 158, 172, 185, 198, 212, 225, 238]   # 18 levels
def aligned(k, dx, dy):
    """frame k resampled so that the drawing sits at its reference position (drawing at k is shifted by dx, dy)"""
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    return cv2.warpAffine(U(k), M, (2206, 946), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
def obj_mask(k):
    d = json.load(open(f'out/lines_k{k:02d}.json'))
    m = np.zeros((946, 2206), np.uint8)
    if d.get('obj'):
        for p in d['obj'][0]['paths']:
            t = np.zeros_like(m); cv2.fillPoly(t, [np.int32(np.round(np.array(p)))], 1); m ^= t
    return m
def build(name, ref, value_ks, mask_ks, head_box, mask_kw, out_extra=None, add_obj=None):
    sh = {k: (0.0, 0.0) if k == ref else shift(k, ref, head_box)[:2] for k in set(value_ks) | set(mask_ks)}
    print(name, 'shifts', sh)
    V = np.median(np.stack([aligned(k, *sh[k]) for k in value_ks]), 0)
    Mn = np.min(np.stack([aligned(k, *sh[k]) for k in mask_ks]), 0)
    M = silhouette(Mn, **mask_kw)
    if add_obj is not None:
        import os
        fn = f'mask{name}_extra.npy'
        if not os.path.exists(fn): np.save(fn, obj_mask(add_obj))
        M = M | np.load(fn)
    np.save(f'plate{name}.npy', V.astype(np.float32)); np.save(f'mask{name}.npy', M)
    show(V, M, S + f'm{name}.png')
    L = trace(V, M, LV, sigma=0.5, eps=0.4, min_area=1.5)
    json.dump([{'t': l['t'], 'v': l['v'], 'paths': [p.round(2).tolist() for p in l['paths']]} for l in L], open(f'out/owl{name}.json', 'w'))
    print(name, 'points', npts(L))
if __name__ == '__main__':
    which = sys.argv[1]
    if which == 'H':
        build('H', 57, [54, 57, 60, 61, 62], [54, 57, 60, 61, 62], (950, 250, 1450, 700),
              dict(thr_hi=30, thr_lo=9, lo_polys=[[(880, 150), (1450, 100), (1500, 450), (1000, 600), (880, 500)]], open_r=10, lim=40, dilate=2), add_obj=60)
    if which == 'J':
        build('J', 75, [75], [75, 82, 83, 84, 85, 86, 87, 88, 89, 90], (800, 300, 1250, 700),
              dict(thr_hi=30, thr_lo=9, lo_polys=[[(820, 230), (1300, 230), (1300, 600), (820, 600)]], open_r=10, lim=40, dilate=2), add_obj=75)
