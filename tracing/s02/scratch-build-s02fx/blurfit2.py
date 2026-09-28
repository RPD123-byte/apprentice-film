# blur fit robust to local misregistration: per-tile shifts (phase correlation), then a global (L, sigma) grid on the
# tile-registered reference. Reference = the sharp stare (look) average or the hold average, in paint values.
import sys, json, numpy as np, cv2, re
sys.path.insert(0, '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx')
from common import *
cp = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s02fx/'
fs = [int(v) for v in sys.argv[1].split(',')]
extract(fs)
SR = np.load(cp + 'stare_ref.npy'); BR = np.load(cp + 'box_ref.npy'); HOLD = off(400)
s02 = open(ROOT + '/src/shots/s02.js').read()
ROWS = [[float(v) for v in r.split(',')] for r in re.findall(r'\[([^\[\]]+)\]', re.search(r'const ROOT = \[(.*?)\];', s02, re.S).group(1))]
rootd = {int(round(r[0] * 25)): r for r in ROWS}
DES = np.zeros((H, W), np.uint8); cv2.rectangle(DES, (540, 0), (1560, H), 1, -1)
Ls = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 23, 26]; Ss = [0, 0.4, 0.7, 1.0, 1.3, 1.6, 2.0, 2.4, 2.8, 3.2]
T = 112
out = []
for f in fs:
    P = paint(f); ox, oy = off(f); d = pandir(f)
    for name, R, dx, dy in (('stare', SR, ox, oy), ('box', BR, ox - HOLD[0], oy - HOLD[1])):
        valid = np.ones((H, W), np.float32)
        if name == 'stare' and ('--des' not in sys.argv or f > 400): valid *= 1 - DES
        Rs = shift(R, dx, dy); Vs = shift(valid, dx, dy)
        m = cv2.erode((Vs > 0.99).astype(np.uint8), np.ones((41, 41), np.uint8)) > 0
        if name == 'box' and f in rootd and f >= 400:
            _, x, y, s, _r = rootd[f]; mm = np.ones((H, W), np.uint8)
            cv2.rectangle(mm, (int(x - 520 * s), int(y - 480 * s)), (int(x + 520 * s), int(y + 380 * s)), 0, -1)
            sx, sy = 930 + dx, 36 + dy; cv2.rectangle(mm, (int(sx), int(sy)), (int(sx + 320), int(sy + 336)), 0, -1)
            m &= mm > 0
        tiles = []
        for ty in range(8, H - T - 8, T):
            for tx in range(8, W - T - 8, T):
                if not m[ty:ty + T, tx:tx + T].all(): continue
                r0 = Rs[ty:ty + T, tx:tx + T]
                if r0.std() < 0.04: continue
                tiles.append((tx, ty))
        if len(tiles) < 4: continue
        # per-tile shift: phase correlation of the source tile against the reference blurred at a middle guess
        guess = blur(Rs, 8, d, 1.2)
        sh = []
        win = cv2.createHanningWindow((T, T), cv2.CV_32F)
        for tx, ty in tiles:
            (sx, sy), resp = cv2.phaseCorrelate(guess[ty:ty + T, tx:tx + T].astype(np.float32), P[ty:ty + T, tx:tx + T].astype(np.float32), win)
            sh.append((float(np.clip(sx, -6, 6)), float(np.clip(sy, -6, 6))))
        pad = 16
        def tile_err(L, s):
            e = 0; n = 0
            for (tx, ty), (sx, sy) in zip(tiles, sh):
                a = Rs[ty - pad:ty + T + pad, tx - pad:tx + T + pad] if ty >= pad and tx >= pad and ty + T + pad <= H and tx + T + pad <= W else None
                if a is None: continue
                b = blur(a, L, d, s); b = shift(b, sx, sy)[pad:-pad, pad:-pad]
                e += float(np.sum((b - P[ty:ty + T, tx:tx + T]) ** 2)); n += T * T
            return e / max(1, n)
        res = {(L, s): tile_err(L, s) for L in Ls for s in Ss}
        (L, s) = min(res, key=res.get)
        for L2 in np.arange(max(0, L - 1.5), L + 1.6, 0.5):
            for s2 in np.arange(max(0, s - 0.3), s + 0.31, 0.1): res[(round(float(L2), 2), round(float(s2), 2))] = tile_err(L2, s2)
        (L, s) = min(res, key=res.get)
        rec = dict(f=f, ref=name, L=float(L), s=float(s), e=res[(L, s)] * 1e4, ntiles=len(tiles), shifts=np.round(np.median(np.array(sh), 0), 2).tolist(), shiftsd=np.round(np.std(np.array(sh), 0), 2).tolist())
        print(rec, flush=True); out.append(rec)
json.dump(out, open(cp + 'blurfit2-%s.json' % sys.argv[2], 'w'))
