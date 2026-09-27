# The in-between frames k63–67 (the whirl and the first settle frame): each is its own drawing, traced from its one
# frame (lower fidelity: 7 levels). Measurement only.
import sys, json; sys.path.insert(0, '.')
from common import *
from mask import silhouette, show
from tone import trace, npts
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24p2/'
LVW = [12, 40, 80, 125, 170, 205, 232]
def run(k, **kw):
    u = U(k)
    M = silhouette(u, **kw)
    np.save(f'maskW{k}.npy', M)
    show(u, M, S + f'mW{k}.png')
    L = trace(cv2.bilateralFilter(u, 5, 20, 3), M, LVW, sigma=1.0, eps=0.7, min_area=4.0)
    json.dump([{'t': l['t'], 'v': l['v'], 'paths': [p.round(2).tolist() for p in l['paths']]} for l in L], open(f'out/owlW{k}.json', 'w'))
    print(k, 'points', npts(L), 'mask', M.sum())
if __name__ == '__main__':
    for k in [int(a) for a in sys.argv[1:]]:
        run(k, thr_hi=30, thr_lo=9, lo_polys=[], open_r=12, lim=10, dilate=2, keep=4, min_comp=15000, max_elong=5, strip_lines=32.3)
