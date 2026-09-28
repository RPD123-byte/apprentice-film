import sys, json, time; sys.path.insert(0, '.')
from common import *
from tone import trace, raster, npts, encode_path
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/'
P = np.nan_to_num(np.load('plateF.npy'), nan=0); M = np.load('maskF.npy')
Pm = np.where(M > 0, P, 0)
for name, lv, sg, eps in [
    ('a', [12, 28, 48, 70, 95, 120, 145, 170, 192, 210, 225, 238], 0.7, 0.4),
    ('b', [14, 40, 75, 110, 150, 185, 212, 234], 0.8, 0.45),
    ('c', [12, 28, 48, 70, 95, 120, 145, 170, 192, 210, 225, 238], 1.0, 0.5),
]:
    t0 = time.time()
    L = trace(P, M, lv, sigma=sg, eps=eps, min_area=2.0)
    R = raster(L, P.shape)
    e1 = np.abs(cv2.GaussianBlur(R, (0, 0), 1) - cv2.GaussianBlur(Pm, (0, 0), 1))[M > 0].mean()
    e0 = np.abs(R - Pm)[M > 0].mean()
    size = sum(len(encode_path(p)) for l in L for p in l['paths'])
    print(name, 'pts', npts(L), 'paths', sum(len(l['paths']) for l in L), 'bytes', size, 'err raw %.2f  σ1 %.2f' % (e0, e1), '%.1fs' % (time.time() - t0))
    cv2.imwrite(S + f'rF_{name}.png', np.clip(R, 0, 255).astype(np.uint8))
    json.dump([{'t': l['t'], 'v': l['v'], 'paths': [p.round(2).tolist() for p in l['paths']]} for l in L], open(f'toneF_{name}.json', 'w'))
