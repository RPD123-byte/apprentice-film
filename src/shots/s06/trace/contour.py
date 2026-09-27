#!/usr/bin/env python3
# contour.py: single contour lines of s06 FITTED on the source along a rough hand-placed guide (measurement only).
# For every sample along the guide (every `step` px) the cross profile of the neutral mean (ungraded) is searched for
# its darkest point within +-R px; the offsets are median- and mean-smoothed along the line, and each point gets the
# ink mass of its profile as width, the centre value and the ground. The result is one clean tapered centre-line per
# contour (no skeleton branches). Writes src/shots/s06/data/contour.js: CONTOUR[name] = [stroke, ...] (x y w v b).
# usage: contour.py [name ...]   (configs: trace/cfg/contour.json)
import cv2, numpy as np, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
SRC = os.path.join(ROOT, 'snapshots/s06-r2-src')
DATA = os.path.join(HERE, '../data')
DBG = os.path.join(ROOT, 'snapshots/s06-fix1p-hatch'); os.makedirs(DBG, exist_ok=True)
CFG = json.load(open(os.path.join(HERE, 'cfg/contour.json')))
pre = np.load(os.path.join(SRC, 'neutral_pre.npy')).astype(np.float32)
H, W = pre.shape

def resample(P, step):
    P = np.array(P, float); d = np.r_[0, np.cumsum(np.hypot(*np.diff(P, axis=0).T))]
    n = max(2, int(d[-1] / step) + 1); s = np.linspace(0, d[-1], n)
    return np.stack([np.interp(s, d, P[:, 0]), np.interp(s, d, P[:, 1])], 1)

def fit(C, src):
    sg = C.get('sigma', 0.8); g = cv2.GaussianBlur(src, (0, 0), sg) if sg > 0 else src
    P = resample(C['guide'], C.get('step', 2.0)); R = C.get('R', 6); dt = 0.25
    T = np.gradient(P, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True) + 1e-9; N = np.stack([-T[:, 1], T[:, 0]], 1)
    ts = np.arange(-R - 6, R + 6 + 1e-6, dt)
    X = (P[:, None, 0] + N[:, None, 0] * ts[None]).astype(np.float32); Y = (P[:, None, 1] + N[:, None, 1] * ts[None]).astype(np.float32)
    prof = cv2.remap(g, X, Y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    inner = np.abs(ts) <= R
    pen = C.get('pen', 0.002) * np.abs(ts)
    off = np.array([ts[inner][np.argmin(prof[i][inner] + pen[inner])] for i in range(len(P))])
    # smooth the offsets: median 5, mean k
    k = C.get('smooth', 7)
    om = np.array([np.median(off[max(0, i - 2):i + 3]) for i in range(len(off))])
    op = np.pad(om, k // 2, mode='edge'); off_s = np.convolve(op, np.ones(k) / k, 'valid')
    out = []
    for i in range(len(P)):
        c = P[i] + N[i] * off_s[i]
        pr = prof[i]; j0 = np.argmin(np.abs(ts - off_s[i]))
        nt = int(6 / dt)
        grl = float(np.percentile(pr[:nt], 80)); grr = float(np.percentile(pr[-nt:], 80))
        if C.get('ground') is not None: grl = grr = C['ground']
        vmin = float(np.min(pr[max(0, j0 - 4):j0 + 5]))
        gr = (grl + grr) / 2; depth = max(grl, grr) - vmin
        # width: full width at half depth, each side against its own ground (one side may be a grey shadow)
        wwin = C.get('wwin', 5)
        hl = vmin + (grl - vmin) / 2; hr = vmin + (grr - vmin) / 2; jl = j0; jr = j0
        while jl > 0 and pr[jl] < hl and abs(ts[jl] - off_s[i]) < wwin: jl -= 1
        while jr < len(pr) - 1 and pr[jr] < hr and abs(ts[jr] - off_s[i]) < wwin: jr += 1
        w = (jr - jl) * dt
        out.append([float(c[0]), float(c[1]), w, vmin, float(gr), depth])
    A = np.array(out)
    # smooth width and value along the line
    for col in (2, 3):
        a = np.pad(A[:, col], 2, mode='edge'); A[:, col] = np.convolve(a, np.ones(5) / 5, 'valid')
    # break where the line is too faint
    on = A[:, 5] >= C.get('minD', 0.12)
    strokes = []; i = 0
    while i < len(A):
        if not on[i]: i += 1; continue
        j = i
        while j < len(A) and on[j]: j += 1
        if j - i >= 3: strokes.append(A[i:j, :5].tolist())
        i = j
    return strokes

if __name__ == '__main__':
    names = sys.argv[1:] or [k for k in CFG if not k.startswith('_')]
    outp = os.path.join(DBG, 'contour.json')
    res = json.load(open(outp)) if os.path.exists(outp) else {}
    for n in names:
        C = CFG[n]; src = pre
        if C.get('npy'):   # a graded mean (e.g. owl_pre.npy), the film's grade undone
            import grade
            src, _ = grade.ungrade(np.clip(np.load(os.path.join(SRC, C['npy'])).astype(np.float32) / 255, 0, 1))
        elif C.get('frame'):   # fit on one source frame (graded -> the film's grade undone roughly with the neutral ratio)
            import grade
            f = cv2.imread(os.path.join(SRC, 'f%03d.png' % C['frame']), 0).astype(np.float32) / 255
            src, _ = grade.ungrade(f)
        res[n] = fit(C, src)
        print(n, len(res[n]), 'strokes', [len(s) for s in res[n]], 'w', [round(float(np.median([p[2] for p in s])), 2) for s in res[n]], 'v', [round(float(np.median([p[3] for p in s])), 2) for s in res[n]])
    json.dump(res, open(outp, 'w'))
    L = ['// s06 contour lines FITTED on the source (trace/contour.py): along a hand-placed guide, the darkest point of',
         '// each cross profile (smoothed), with the profile\'s ink mass as width. x y w v b per point. No pixels are stored.',
         'export const CONTOUR = {']
    for n, S in res.items():
        L.append(f' {json.dumps(n)}: [')
        for s in S:
            flat = []
            for p in s: flat += [round(p[0] * 4) / 4, round(p[1] * 4) / 4, round(p[2], 2), round(p[3], 3), round(p[4], 2)]
            L.append('  [' + ','.join('%g' % f for f in flat) + '],')
        L.append(' ],')
    L.append('};')
    open(os.path.join(DATA, 'contour.js'), 'w').write('\n'.join(L) + '\n')
    print('wrote data/contour.js')
