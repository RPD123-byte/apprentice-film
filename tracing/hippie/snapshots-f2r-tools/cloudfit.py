# Clouds as layered circle-unions (measurement -> primitives). spec JSON list of clouds:
# [{"name":..., "poly":[[x,y],...], "layers":[{"cls":"pinkL,magenta,...", "col":"#..", "line":2.6, "soft":0, "clip":-1,
#    "rmin":7, "max":40, "cover":0.98, "close":5}], ...}]
# Output: JS fragment "const CLOUDS = [...]" with layers {c:[[x,y,r]..], col, line, soft, clip}
import sys, json, numpy as np, cv2
keys = ['cream', 'gold', 'orange', 'magenta', 'indigo', 'sky', 'ink', 'pinkL', 'lav', 'green', 'white', 'skin', 'brown', 'blue', 'teal', 'grey', 'yellow', 'peach', 'jacket']
STRIP = '--strip' in sys.argv
idx = np.load('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/classidx' + ('-strip' if STRIP else '') + '.npy')
OX, OY = (-440, 60) if STRIP else (0, 0)
def fit(mask, rmin, mx, cover):
    tot = mask.sum(); rem = mask.copy(); cov = np.zeros_like(mask); circles = []
    dt = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    while len(circles) < mx and tot > 0:
        dt2 = dt * rem
        y, x = np.unravel_index(np.argmax(dt2), dt2.shape); r = dt2[y, x]
        if r < rmin: break
        circles.append([int(x), int(y), round(float(r) + 1.0, 1)])
        cv2.circle(cov, (int(x), int(y)), int(round(r + 1)), 1, -1)
        rem = mask * (1 - cov)
        if 1 - rem.sum() / tot > cover: break
    return circles, (cov * mask).sum() / max(1, tot)
spec = json.load(open(sys.argv[1])); out = []
for cl in spec:
    R = np.zeros(idx.shape, np.uint8); cv2.fillPoly(R, [np.array(cl['poly'], np.int32) - np.array([OX, OY], np.int32)], 1)
    L = []
    for ly in cl['layers']:
        M = np.isin(idx, [keys.index(c) for c in ly['cls'].split(',')]).astype(np.uint8) * R
        k = ly.get('close', 5)
        if k: M = cv2.morphologyEx(M, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
        M = cv2.morphologyEx(M, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        if ly.get('line'):
            from scipy.ndimage import binary_fill_holes
            M = binary_fill_holes(M).astype(np.uint8)
        c, got = fit(M, ly.get('rmin', 7), ly.get('max', 40), ly.get('cover', 0.98))
        print(f"// {cl['name']} {ly['cls'][:30]}: {len(c)} circles, cover {got:.3f}", file=sys.stderr)
        c = [[x + OX, y + OY, r] for x, y, r in c]
        d = {'c': c, 'col': ly['col']}
        for kk in ('line', 'soft', 'clip', 'grad'):
            if kk in ly: d[kk] = ly[kk]
        L.append(d)
    out.append({'name': cl['name'], 'layers': L})
name = 'CLOUDS_X' if STRIP else 'CLOUDS'
print('const ' + name + ' = ' + json.dumps(out, separators=(',', ':')) + ';')
