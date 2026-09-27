# landmark tracking by chained dense flow from a seed frame (both directions, corner-snapped), with a verification
# sheet of crops around each tracked point.   usage: seed.py F0 F1 SEEDFRAME '[[x,y],...]' out.jpg
import cv2, numpy as np, sys, json
from common import *
from tracks import samp
def load(a, b):
    d = np.load(f'{FLOW}/fl_{min(a,b)}_{max(a,b)}.npz'); return (d['fw'] if a < b else d['bw']).astype(np.float32)
def refine(g0, g1, p0, p1, r=10, win=15):
    # NCC template match of the patch around p0 (frame g0) near p1 in g1 (sub-pixel via parabola)
    x0, y0 = int(round(p0[0])), int(round(p0[1])); x1, y1 = int(round(p1[0])), int(round(p1[1]))
    if min(x0, y0) < win or x0 > W - win - 1 or y0 > H - win - 1: return p1, 0
    T = g0[y0 - win:y0 + win + 1, x0 - win:x0 + win + 1]
    ys, ye, xs, xe = y1 - win - r, y1 + win + r + 1, x1 - win - r, x1 + win + r + 1
    if ys < 0 or xs < 0 or ye > H or xe > W: return p1, 0
    Sr = g1[ys:ye, xs:xe]
    res = cv2.matchTemplate(Sr, T, cv2.TM_CCOEFF_NORMED)
    _, mv, _, ml = cv2.minMaxLoc(res)
    return (xs + ml[0] + win, ys + ml[1] + win), mv
def track(f0, f1, fs, seeds, snap=True):
    frames = [f for f in FRAMES if f0 <= f <= f1]
    imgs = {f: cv2.imread(f'{SRC}/f{f}.png', 0) for f in frames}
    T = {fs: [tuple(map(float, s)) for s in seeds]}; Q = {fs: [1.0] * len(seeds)}
    i0 = frames.index(fs)
    for seq in (frames[i0:], frames[i0::-1]):
        for a, b in zip(seq[:-1], seq[1:]):
            fl = load(a, b); P = np.array(T[a]); pr = P + samp(fl, P)
            out = []; q = []
            for k in range(len(P)):
                p = tuple(pr[k])
                if snap:
                    p2, mv = refine(imgs[a], imgs[b], T[a][k], p)
                    if mv > 0.5 and np.hypot(p2[0] - p[0], p2[1] - p[1]) < 10: p = p2
                    q.append(mv)
                else: q.append(1)
                out.append(p)
            T[b] = out; Q[b] = q
    return frames, T, Q
if __name__ == '__main__':
    f0, f1, fs = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]); seeds = json.loads(sys.argv[4]); dst = sys.argv[5]
    frames, T, Q = track(f0, f1, fs, seeds)
    json.dump({'frames': frames, 'T': {str(k): v for k, v in T.items()}, 'Q': {str(k): v for k, v in Q.items()}}, open(dst + '.json', 'w'))
    rows = []
    for k in range(len(seeds)):
        tiles = []
        for f in frames:
            x, y = T[f][k]; g = cv2.cvtColor(cv2.imread(f'{SRC}/f{f}.png', 0), cv2.COLOR_GRAY2BGR)
            pad = 120; gp = cv2.copyMakeBorder(g, pad, pad, pad, pad, cv2.BORDER_CONSTANT)
            xi, yi = int(x) + pad, int(y) + pad
            c = gp[max(0, yi - pad):yi + pad, max(0, xi - pad):xi + pad].copy()
            if c.shape[0] != 2 * pad or c.shape[1] != 2 * pad: c = np.zeros((2 * pad, 2 * pad, 3), np.uint8)
            cv2.drawMarker(c, (pad, pad), (0, 0, 255), cv2.MARKER_CROSS, 24, 2)
            cv2.putText(c, f'{f/25:.2f}', (4, 14), 0, 0.45, (0, 255, 255), 1); cv2.putText(c, f'{int(x)},{int(y)}', (4, 232), 0, 0.45, (0, 255, 0), 1)
            tiles.append(c)
        rows.append(np.hstack(tiles))
    cv2.imwrite(dst, np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 85])
