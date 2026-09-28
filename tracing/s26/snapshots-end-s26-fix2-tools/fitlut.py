#!/usr/bin/env python3
# fitlut.py: tone-curve fit for s26's traced colours (measurement only). Raw (pre-grade) harness renders vs the source.
#   quantile curves per beat group (render blurred sigma 4 vs ungraded source blurred sigma 4), and evaluation of candidate
#   LUTs through the python port of the grade (gradeio.grade) against the source at sigma 4 / 12.
import cv2, numpy as np, sys, glob, re, json
from multiprocessing import Pool
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from gradeio import grade, ungrade
RAW = '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-raw/'
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src/'
Fs = sorted(int(re.search(r'(\d+)\.png$', p).group(1)) for p in glob.glob(RAW + 'r*.png'))
_B = json.load(open('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/webglbias.json')); BX = np.array(_B['x'], np.float32); BIAS = [np.array(v, np.float32) for v in _B['bias']]
BASE = '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-base/'
def quant2(F):
    # graded-domain quantiles (the WebGL render vs the source) and the pre-grade -> graded map (raw vs WebGL)
    w = cv2.GaussianBlur(cv2.imread(BASE + f'r{F}.png').astype(np.float32), (0, 0), 4)
    s = cv2.GaussianBlur(cv2.imread(SRC + f'{F}.png').astype(np.float32), (0, 0), 4)
    r = cv2.GaussianBlur(cv2.imread(RAW + f'r{F}.png').astype(np.float32), (0, 0), 4)
    q = np.linspace(0.5, 99.5, 100)
    G = np.zeros((3, 256)); N = np.zeros((3, 256))
    for c in range(3):
        b = np.clip(np.round(r[..., c]).astype(int), 0, 255).ravel()
        G[c] += np.bincount(b, w[..., c].ravel(), 256); N[c] += np.bincount(b, None, 256)
    return F, np.percentile(w.reshape(-1, 3), q, 0), np.percentile(s.reshape(-1, 3), q, 0), G, N
def lab(f, s): return cv2.cvtColor(cv2.GaussianBlur(f, (0, 0), s), cv2.COLOR_BGR2LAB)
def quant(F):
    r = cv2.imread(RAW + f'r{F}.png').astype(np.float32) / 255
    u = ungrade(cv2.imread(SRC + f'{F}.png'), F / 25)
    rb, ub = cv2.GaussianBlur(r, (0, 0), 4), cv2.GaussianBlur(u, (0, 0), 4)
    q = np.linspace(0.5, 99.5, 100)
    return F, np.percentile(rb.reshape(-1, 3), q, 0), np.percentile(ub.reshape(-1, 3), q, 0)
def evalF(args):
    F, luts = args[:2]; sat = args[2] if len(args) > 2 else 0
    r = cv2.imread(RAW + f'r{F}.png'); s = cv2.imread(SRC + f'{F}.png').astype(np.float32) / 255
    L = luts[0] if F <= 2853 else luts[1]
    if L is not None:
        L = np.asarray(L, np.float32)
        r2 = np.stack([L[c][r[..., c]] for c in range(3)], -1) / 255   # L in BGR order
    else: r2 = r.astype(np.float32) / 255
    if sat and F >= 2818:
        # saturation boost about the pixel's luma (F group only; D/E only on the colour page is not separable here)
        if F >= 2854:
            y = (r2 * np.float32([0.114, 0.587, 0.299])).sum(2, keepdims=True); r2 = np.clip(y + (r2 - y) * (1 + sat), 0, 1)
    g = grade(r2, F / 25).astype(np.float32)
    for c in range(3): g[..., c] += np.interp(g[..., c] * 255, BX, BIAS[c]) / 255   # the WebGL grade runs ~2 codes darker
    return F, [float(np.sqrt(((lab(g, sg) - lab(s, sg)) ** 2).sum(2)).mean()) for sg in (4, 12)]
BEATS = [('A', 2763, 2788), ('C', 2789, 2817), ('D', 2818, 2842), ('E', 2843, 2853), ('F1', 2854, 2887), ('F2', 2888, 2938)]
def report(res, tag):
    out = [tag]
    for nm, a, b in BEATS:
        v = [x for F, x in res if a <= F <= b]
        if v: out.append(f'{nm} {np.mean([x[0] for x in v]):.2f}/{np.mean([x[1] for x in v]):.2f}')
    out.append(f'ALL {np.mean([x[0] for _, x in res]):.2f}/{np.mean([x[1] for _, x in res]):.2f}')
    print('  '.join(out), flush=True)
def curve(qr, qs, alpha, lo=4, hi=210, top=235):
    """a monotone LUT (256) from matched quantiles (0..1 floats, one channel), strength alpha, tapered to identity below lo
    and above hi..top"""
    x = np.arange(256) / 255
    qr, idx = np.unique(qr, return_index=True); qs = qs[idx]
    m = np.interp(x, qr, qs, left=np.nan, right=np.nan)
    d = m - x
    # outside the measured range: no change; smooth the offset
    d = np.where(np.isnan(d), 0, d)
    d = np.convolve(np.pad(d, 12, mode='edge'), np.ones(25) / 25, mode='same')[12:-12]
    w = np.clip((x * 255 - lo) / 12, 0, 1) * np.clip((top - x * 255) / (top - hi), 0, 1)
    y = np.clip(x + alpha * d * w, 0, 1)
    y = np.maximum.accumulate(y)
    return np.round(y * 255).astype(int).tolist()
def gam(gs, lo=4, hi=210, top=235):
    x = np.arange(256) / 255; out = []
    for g in gs:
        w = np.clip((x * 255 - lo) / 12, 0, 1) * np.clip((top - x * 255) / (top - hi), 0, 1)
        y = np.maximum.accumulate(np.clip(x + w * (x ** g - x), 0, 1))
        out.append(np.round(y * 255).astype(int).tolist())
    return out  # BGR order expected by caller
if __name__ == '__main__':
    mode = sys.argv[1]
    with Pool(10) as pool:
        if mode == 'quant':
            Q = pool.map(quant, Fs)
            groups = {'AE': [q for q in Q if q[0] <= 2853], 'F': [q for q in Q if q[0] >= 2854], 'A': [q for q in Q if q[0] <= 2788], 'C': [q for q in Q if 2789 <= q[0] <= 2817], 'D': [q for q in Q if 2818 <= q[0] <= 2853]}
            res = {}
            for k, v in groups.items():
                qr = np.mean([x[1] for x in v], 0); qs = np.mean([x[2] for x in v], 0)
                res[k] = [qr.tolist(), qs.tolist()]
                print(k, 'p10/50/90 render', (qr[[10, 50, 90]] * 255).round(1).tolist(), 'src', (qs[[10, 50, 90]] * 255).round(1).tolist())
            json.dump(res, open('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/quant.json', 'w'))
        elif mode == 'quant2':
            Q = pool.map(quant2, Fs)
            res = {}
            for k, sel in (('AE', lambda F: F <= 2853), ('F', lambda F: F >= 2854)):
                v = [x for x in Q if sel(x[0])]
                qw = np.mean([x[1] for x in v], 0); qs = np.mean([x[2] for x in v], 0)
                G = sum(x[3] for x in v); N = sum(x[4] for x in v)
                luts = {}
                for a in (0.5, 0.7, 0.85, 1.0):
                    L = []
                    for c in range(3):
                        ok = N[c] > 200; xs = np.nonzero(ok)[0].astype(float); gx = np.maximum.accumulate(G[c][ok] / N[c][ok])
                        Gf = lambda x: np.interp(x, xs, gx)                     # pre-grade code -> graded code
                        Gi = lambda y: np.interp(y, gx + np.arange(len(gx)) * 1e-4, xs)
                        x = np.arange(256).astype(float)
                        uq, ui = np.unique(qw[:, c], return_index=True)
                        tgt = np.interp(Gf(x), uq, qs[ui, c], left=np.nan, right=np.nan)
                        pre = Gi(tgt); d = np.where(np.isnan(pre), 0, pre - x)
                        d = np.convolve(np.pad(d, 12, mode='edge'), np.ones(25) / 25, mode='same')[12:-12]
                        wt = np.clip((x - 4) / 12, 0, 1) * np.clip((235 - x) / 25, 0, 1)
                        y = np.maximum.accumulate(np.clip(x + a * d * wt, 0, 255))
                        L.append(np.round(y).astype(int).tolist())
                    luts[a] = L
                res[k] = luts
                print(k, 'graded p10/50/90 render', qw[[10, 50, 90]].round(1).tolist(), 'src', qs[[10, 50, 90]].round(1).tolist())
                for c, n in ((2, 'R'), (1, 'G'), (0, 'B')): print('  ', n, 'a=1 lut @16,32,64,96,128,160,200,230:', [res[k][1.0][c][i] for i in (16, 32, 64, 96, 128, 160, 200, 230)])
            json.dump({k: {str(a): L for a, L in v.items()} for k, v in res.items()}, open('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/quant2.json', 'w'))
        elif mode == 'eval2':
            Q = json.load(open('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/quant2.json'))
            report(pool.map(evalF, [(F, (None, None)) for F in Fs]), 'none      ')
            for a in sys.argv[2].split(','):
                L = [Q['AE'][a], Q['F'][a]]
                report(pool.map(evalF, [(F, L) for F in Fs]), f'q2 a={a}')
        elif mode == 'sat':
            Q = json.load(open('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/quant2.json'))
            for a in sys.argv[2].split(','):
                for sat in [float(v) for v in sys.argv[3].split(',')]:
                    L = [Q['AE'][a], Q['F'][a]]
                    report(pool.map(evalF, [(F, L, sat) for F in Fs if F >= 2854]), f'q2 a={a} sat={sat}')
        elif mode == 'eval':
            Q = json.load(open('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/quant.json'))
            report(pool.map(evalF, [(F, (None, None)) for F in Fs]), 'none      ')
            for a in [float(v) for v in sys.argv[2].split(',')]:
                L = [[curve(np.array(Q[g][0])[:, c], np.array(Q[g][1])[:, c], a) for c in range(3)] for g in ('AE', 'F')]
                report(pool.map(evalF, [(F, L) for F in Fs]), f'quant a={a}')
                json.dump(L, open(f'/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/lut_q{a}.json', 'w'))
        elif mode == 'gamma':
            for spec in sys.argv[2:]:
                ae, f = spec.split('/')
                L = [gam([float(v) for v in ae.split(',')][::-1]), gam([float(v) for v in f.split(',')][::-1])]  # given RGB
                report(pool.map(evalF, [(F, L) for F in Fs]), f'gamma {spec}')
