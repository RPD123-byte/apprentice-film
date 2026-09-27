# dense-flow (Farneback) point tracks over a stretch of unique frames; seeds on textured points, owl masked.
import cv2, numpy as np, sys
from common import *
def load(a, b):
    d = np.load(f'{FLOW}/fl_{a}_{b}.npz'); return d['fw'].astype(np.float32), d['bw'].astype(np.float32)
def samp(fl, p):
    # bilinear sample of a half-res flow at full-res points p (N,2)
    x = np.clip(p[:, 0] / 2, 0, fl.shape[1] - 1.001); y = np.clip(p[:, 1] / 2, 0, fl.shape[0] - 1.001)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = (x - x0)[:, None]; fy = (y - y0)[:, None]
    return fl[y0, x0] * (1 - fx) * (1 - fy) + fl[y0, x0 + 1] * fx * (1 - fy) + fl[y0 + 1, x0] * (1 - fx) * fy + fl[y0 + 1, x0 + 1] * fx * fy
def build(f0, f1, spacing=26, fbth=1.5, minlen=4):
    frames = [f for f in FRAMES if f0 <= f <= f1]
    tracks = []   # list of dict frame->(x,y)
    live = []     # indices into tracks
    for k, f in enumerate(frames):
        g = cv2.imread(f'{SRC}/f{f}.png', 0)
        m = owlmask(f, 1.05)
        if k > 0:
            a = frames[k - 1]; fw, bw = load(a, f)
            if live:
                P = np.array([tracks[i][a] for i in live])
                Q = P + samp(fw, P)
                back = samp(bw, Q); fb = np.hypot(*(P - (Q + back)).T)
                ok = (fb < fbth) & (Q[:, 0] > 3) & (Q[:, 0] < W - 3) & (Q[:, 1] > 3) & (Q[:, 1] < H - 3)
                ok &= m[Q[:, 1].astype(int).clip(0, H - 1), Q[:, 0].astype(int).clip(0, W - 1)]
                nl = []
                for i, q, o in zip(live, Q, ok):
                    if o: tracks[i][f] = (float(q[0]), float(q[1])); nl.append(i)
                live = nl
        # seed: corner response, away from live tracks
        resp = cv2.cornerMinEigenVal(g, 7)
        occ = np.zeros((H // spacing + 1, W // spacing + 1), bool)
        for i in live:
            x, y = tracks[i][f]; occ[int(y) // spacing, int(x) // spacing] = True
        for gy in range(0, H // spacing):
            for gx in range(0, W // spacing):
                if occ[gy, gx]: continue
                y0, x0 = gy * spacing, gx * spacing
                blk = resp[y0:y0 + spacing, x0:x0 + spacing]
                j = np.argmax(blk); yy, xx = divmod(j, blk.shape[1])
                if blk[yy, xx] < 0.0006: continue
                X, Y = x0 + xx, y0 + yy
                if X < 5 or X > W - 5 or Y < 5 or Y > H - 5 or not m[Y, X]: continue
                tracks.append({f: (float(X), float(Y))}); live.append(len(tracks) - 1)
    tracks = [t for t in tracks if len(t) >= minlen]
    return frames, tracks
if __name__ == '__main__':
    import pickle
    f0, f1 = int(sys.argv[1]), int(sys.argv[2])
    frames, tr = build(f0, f1)
    L = np.array([len(t) for t in tr])
    print('frames', len(frames), 'tracks', len(tr), 'mean len', L.mean(), 'max', L.max(), 'per-frame obs', sum(L) / len(frames))
    pickle.dump((frames, tr), open(f'tr_{f0}_{f1}.pkl', 'wb'))
