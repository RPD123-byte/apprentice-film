#!/usr/bin/env python3
# s16: trace the clean static plate (build_plate.py) into geometry: tone levels of a median-smoothed value study
# plus dark and pale ink centre-lines, with one strength per stroke fitted by least squares. Writes
# src/shots/s16/data/plate.js (frame px; the plate reaches M px past every edge of the frame).
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
import tr, cv2, numpy as np
from multiprocessing import Pool

OUT = '/Users/computer/rootline/apprentice-film/snapshots/s16-p2-tools'
DATA = '/Users/computer/rootline/apprentice-film/src/shots/s16/data'
W, H, M = 2206, 946, 90
CFG = dict(med=3, med_dyn=5, K=32, blur=0.6, nlm=5,
           s3=dict(hi=0.035, lo=0.015, dmin=0.015, valley=0.01, minlen=3))

def base_of(Y, mask, cfg, pad=0):
    Bm = cv2.medianBlur((np.clip(Y, 0, 1) * 255).astype(np.uint8), cfg['med']).astype(np.float32) / 255
    L = tr.levels(Bm, mask, [(k + 0.5) / cfg['K'] for k in range(cfg['K'])], minarea=4, eps=0.7)
    Br = tr.render_levels(L, Y.shape, ss=4, blur=cfg['blur'])
    return L, Br

def _mid(st):
    P = np.array([[p[0], p[1]] for p in st]); d = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))])
    h = d[-1] / 2; i = int(np.searchsorted(d, h)); i = max(1, min(len(P) - 1, i))
    return P[i]

def _tile(args):
    """trace one tile (its ridges with a margin round it); keep the strokes whose middle lies in the tile"""
    Y, Br, box, pad = args
    x0, y0, x1, y1 = box
    m = np.zeros(Y.shape, bool); m[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = True
    keep = lambda st: x0 <= _mid(st)[0] < x1 and y0 <= _mid(st)[1] < y1
    Sd = [s for s in tr.strokes3(Y, Br, m, 'dark', **CFG['s3']) if keep(s)]
    Sb = [s for s in tr.strokes3(Y, Br, m, 'bright', **CFG['s3']) if keep(s)]
    return Sd, Sb

def trace_tiles(Y, Br, box=None, tile=240, pad=48, procs=8, skip=None):
    """strokes over box (default: all), traced in overlapping tiles in parallel, then one global strength fit"""
    Hh, Ww = Y.shape
    X0, Y0, X1, Y1 = box or (0, 0, Ww, Hh)
    jobs = []
    for y0 in range(Y0, Y1, tile):
        for x0 in range(X0, X1, tile):
            b = (x0, y0, min(X1, x0 + tile), min(Y1, y0 + tile))
            if skip and skip(b): continue
            jobs.append((Y, Br, b, pad))
    with Pool(procs) as p:
        res = p.map(_tile, jobs, chunksize=1)
    Sd = [s for d, b in res for s in d]; Sb = [s for d, b in res for s in b]
    (Sd, Sb), g = tr.fit_gains_global(Y, Br, [(Sd, 'dark'), (Sb, 'bright')], procs=procs)
    return Sd, Sb

def shift(L, S1, S2, dx, dy):
    """rings are canvas units already; strokes are pixel-centre coords (+0.5 to canvas units)"""
    L2 = [[v, [r + [dx, dy] for r in rings]] for v, rings in L]
    f = lambda S: [[[p[0] + dx + 0.5, p[1] + dy + 0.5, p[2], p[3]] for p in st] for st in S]
    return L2, f(S1), f(S2)

def enc_ring(r):
    """a closed outline in canvas units -> half-pixel integers, first point absolute, then deltas"""
    q = np.round(np.asarray(r, float) * 2).astype(int)
    out = [int(q[0, 0]), int(q[0, 1])]
    for k in range(1, len(q)): out += [int(q[k, 0] - q[k - 1, 0]), int(q[k, 1] - q[k - 1, 1])]
    return '[' + ','.join(map(str, out)) + ']'

def enc_stroke(st):
    """x, y in half px (first absolute, then deltas), w in 0.1 px, a in 0.01"""
    out = []; px = py = 0
    for k, p in enumerate(st):
        x, y = int(round(p[0] * 2)), int(round(p[1] * 2))
        if k == 0: out += [x, y]
        else: out += [x - px, y - py]
        px, py = x, y
        out += [int(round(p[2] * 10)), int(round(p[3] * 100))]
    return '[' + ','.join(map(str, out)) + ']'

def js_drawing(name, L, D, B, box, extra=''):
    """compact form, decoded by src/shots/s16/vec.js (decode): L = [[value*1000, ring, ...]], rings and strokes
    delta-coded integers (see enc_ring / enc_stroke)"""
    out = ['export const %s = {' % name, '  box: [%d, %d, %d, %d],' % tuple(box), '  L: [']
    for v, rings in L:
        if not rings: continue
        out.append('[%d,%s],' % (int(round(v * 1000)), ','.join(enc_ring(r) for r in rings)))
    out.append('  ],'); out.append('  D: [')
    for st in D:
        if len(st) >= 2: out.append(enc_stroke(st) + ',')
    out.append('  ],'); out.append('  B: [')
    for st in B:
        if len(st) >= 2: out.append(enc_stroke(st) + ',')
    out.append('  ],')
    if extra: out.append(extra)
    out.append('};')
    return '\n'.join(out) + '\n'

if __name__ == '__main__':
    E = np.load(f'{OUT}/plateE.npy')
    Yd = tr.denoise(E, CFG['nlm'])
    mask = np.ones(E.shape, bool)
    t0 = time.time()
    L, Br = base_of(Yd, mask, CFG)
    print('levels', sum(len(r) for _, r in L), 'rings', sum(len(p) for _, r in L for p in r), 'pts', round(time.time() - t0), 's', flush=True)
    # tiles that are flat black (nothing to trace) are skipped
    flat = lambda b: Yd[b[1]:b[3], b[0]:b[2]].max() < 0.04
    Sd, Sb = trace_tiles(Yd, Br, skip=flat)
    print('traced+fitted', len(Sd), len(Sb), round(time.time() - t0), 's', flush=True)
    if os.environ.get('PREVIEW'):
      R = tr.render_strokes(Br, Sd, polarity='dark'); R = tr.render_strokes(R, Sb, polarity='bright')
      for s in (1, 2, 4):
        print('sigma', s, 'err', round(np.abs(cv2.GaussianBlur(R, (0, 0), s) - cv2.GaussianBlur(E, (0, 0), s))[M:M + H, M:M + W].mean() * 255, 2), 'vs denoised', round(np.abs(cv2.GaussianBlur(R, (0, 0), s) - cv2.GaussianBlur(Yd, (0, 0), s))[M:M + H, M:M + W].mean() * 255, 2))
      np.save(f'{OUT}/plate_render.npy', R)
    L, Sd, Sb = shift(L, Sd, Sb, -M, -M)
    os.makedirs(DATA, exist_ok=True)
    hdr = ('// s16 static plate: the designer at his desk, the laptop, mug, books, cables (source frame 1175 = 47.00 s, the owl\'s\n'
           '// place from 1153, the steam and both irises removed). GEOMETRY measured by src/shots/s16/trace/trace_plate.py:\n'
           '// tone levels (outlines of a median-smoothed value study, painted in order) and ink centre-lines with a width and a\n'
           '// fitted strength per point. Frame px; it reaches %d px past each edge for the camera jolt and pull-back.\n' % M)
    open(f'{DATA}/plate.js', 'w').write(hdr + js_drawing('PLATE', L, Sd, Sb, (-M, -M, W + M, H + M)))
    print('wrote', os.path.getsize(f'{DATA}/plate.js') // 1024, 'KB', round(time.time() - t0), 's')
