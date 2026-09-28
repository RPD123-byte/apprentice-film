# fitmb.py layerdir frames : fit a linear motion blur (angle, length) + gaussian to the owl layer vs the source
import sys, numpy as np, cv2, math
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s18/trace2')
from grade import forward
SRC='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/src/'
d = sys.argv[1]; frames = [int(v) for v in sys.argv[2].split(',')]
def ld(p): return cv2.imread(p, 0).astype(np.float32) / 255
def mk(L, th, sg):
    n = int(max(L, 1) + 6 * sg + 3) | 1; K = np.zeros((n, n), np.float32); c = n // 2
    if L < 1: K[c, c] = 1
    else:
        for i in range(64):
            u = (i / 63 - 0.5) * L; x = c + u * math.cos(th); y = c + u * math.sin(th)
            x0, y0 = int(math.floor(x)), int(math.floor(y)); fx, fy = x - x0, y - y0
            for dx, dy, w in ((0,0,(1-fx)*(1-fy)),(1,0,fx*(1-fy)),(0,1,(1-fx)*fy),(1,1,fx*fy)): K[y0+dy, x0+dx] += w
    if sg > 0.2: K = cv2.GaussianBlur(K, (0, 0), sg)
    return K / K.sum()
for n in frames:
    Pl = ld(f'{d}/r{10000+n}.png'); Cb = ld(f'{d}/r{20000+n}.png'); Cw = ld(f'{d}/r{30000+n}.png')
    a = np.clip(1 - (Cw - Cb), 0, 1)
    S = cv2.imread(f'{SRC}f{n:04d}.png', 0).astype(np.float32)
    m = (a > 0.05).astype(np.uint8)
    if m.sum() < 100: print(n, 'no owl'); continue
    reg = cv2.dilate(m, np.ones((61, 61), np.uint8)) > 0
    ys, xs = np.nonzero(reg); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    t = (n + 0.5) / 25
    def score(K):
        ab = cv2.filter2D(a, -1, K, borderType=cv2.BORDER_CONSTANT); cb = cv2.filter2D(Cb, -1, K, borderType=cv2.BORDER_CONSTANT)
        out = Pl * (1 - ab) + cb
        G = forward(np.clip(out, 0, 1), t) * 255
        e1 = np.abs(cv2.GaussianBlur(G, (0, 0), 1.5) - cv2.GaussianBlur(S, (0, 0), 1.5))[reg].mean()
        return e1
    base = score(mk(0, 0, 0)); best = (base, 0, 0, 0)
    for L in (6, 12, 20, 30, 42):
        for thd in range(0, 180, 15):
            e = score(mk(L, math.radians(thd), 0.8))
            if e < best[0]: best = (e, L, thd, 0.8)
    # refine
    e0, L0, th0, _ = best
    for L in (L0 * 0.75, L0, L0 * 1.25):
        for thd in (th0 - 8, th0 - 4, th0, th0 + 4, th0 + 8):
            for sg in (0.5, 1.2, 2.0, 3.0):
                if L < 1: continue
                e = score(mk(L, math.radians(thd), sg))
                if e < best[0]: best = (e, L, thd, sg)
    gb = min((score(mk(0, 0, sg)), sg) for sg in (1, 2, 3, 4, 6))
    print(n, f'none {base:.2f}  gauss {gb[0]:.2f}@{gb[1]}  motion {best[0]:.2f} L {best[1]:.1f} ang {best[2]} sg {best[3]}', flush=True)
