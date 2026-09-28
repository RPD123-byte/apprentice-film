# tzone.py F [params-json] [outpng]: trace the owl zone of source frame F; print stats; optional graded preview over the source
import cv2, numpy as np, sys, json, time
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, raster
from gradeio import grade, ungrade
from codec import deep
from owlmask import zone, src
def run(F, P, z=None):
    f = src(F); t = F / 25
    U = ungrade(f, t); U8 = np.clip(U * 255 + 0.5, 0, 255).astype(np.uint8)
    if z is None: z = zone(F)
    ys, xs = np.nonzero(z); x0, x1, y0, y1 = max(0, xs.min() - 4), min(2206, xs.max() + 5), max(0, ys.min() - 4), min(946, ys.max() + 5)
    regs, inks = trace(U8[y0:y1, x0:x1], z[y0:y1, x0:x1], (x0, y0), P)
    return f, U, z, pack(regs, inks), (regs, inks)
if __name__ == '__main__':
    F = int(sys.argv[1]); P = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    t0 = time.time(); f, U, z, pk, (regs, inks) = run(F, P)
    s = json.dumps(deep(pk), separators=(',', ':'))
    print(F, 'regions', len(regs), 'inkcols', len(inks), 'inkpolys', sum(len(v) for v in inks.values()), 'bytes', len(s), 'time %.1f' % (time.time() - t0))
    if len(sys.argv) > 3:
        pre = raster(f.shape[:2], pk, bg=U[..., :] * 255)
        g = np.clip(grade(pre[..., ::-1] / 255.0, F / 25)[..., ::-1] * 255, 0, 255).astype(np.uint8)
        # outside the zone: the (regraded) source; inside: the trace
        cv2.imwrite(sys.argv[3], g)
        def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), s), cv2.COLOR_BGR2LAB)
        for sg in (2, 4, 8):
            d = np.sqrt(((lab(g, sg) - lab(f, sg)) ** 2).sum(2)); print('zone s%d %.2f' % (sg, d[z > 0].mean()))
