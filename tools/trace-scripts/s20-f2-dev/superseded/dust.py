# Dust cloud measurement for s20 (MEASUREMENT script, not loaded by the film). The source redraws its cartoon dust
# puffs every frame, so they are measured per frame as circles: pixels that differ from the clean room (dusty
# scissors before 65.52) and are not the owl (its key silhouette placed by the fit) form the cloud mask; greedy
# inscribed circles (distance transform maxima) describe it; each circle keeps the mean value seen inside it.
# Output: src/shots/s20/data/dust.js  DUST = { "t": [[x, y, r, v], ...], ... } (setup-A frame px, pre-grade value).
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import composite2 as C
M = C.M; OUT = C.OUT
Af = np.load(OUT + '/Afull.npy'); Gr = np.load(OUT + '/grimy.npy')
sc = C.poly_mask([C.SC_POLY], 2)
fits = {}
for k in ('rear', 'front', 'stare1', 'stare2', 'flap0', 'flap1', 'flap2', 'flap3'):
    p = OUT + '/fits_%s.json' % k
    if os.path.exists(p): fits[k] = json.load(open(p))
sel = {}
for line in open(os.path.join(os.path.dirname(__file__), '..', 'data', 'owlframes.js')):
    line = line.strip()
    if line.startswith('"'):
        t = line.split('"')[1]; arr = json.loads('[' + line.split('[', 1)[1].rstrip(',').rstrip(']') + ']'); sel[t] = arr
masks = {}
def owl_mask(n):
    t = '%.2f' % (n / 25)
    if t not in sel: return None
    k, a, b, c, d, e, f = sel[t][:7]
    if k not in masks: masks[k] = np.load(OUT + '/key_%s_mask.npy' % k).astype(np.uint8)
    Mm = np.array([[a, c, e + M - a * M - c * M], [b, d, f + M - b * M - d * M]], np.float32)
    m = cv2.warpAffine(masks[k], Mm, (C.WW, C.HH), flags=cv2.INTER_NEAREST)
    return cv2.dilate(m, np.ones((7, 7), np.uint8)) > 0
REGION = C.poly_mask([[(560, 300), (1150, 300), (1150, 900), (560, 900)]])
# the scissors themselves change (cleaned) under the cloud: their silhouette is not dust
SCM = cv2.dilate(np.load(OUT + '/scmask.npy').astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
# (measured: keeping the blade area in the cloud mask matches the source better — dust does drift over the blades)
out = {}
for n in range(1609, 1680):
    t = n / 25
    f, _ = C.to_margin(C.pre(n), C.affine_to(C.camA(n)))
    ref = np.where(sc, Gr if t < 65.5 else Af, Af)
    d = cv2.GaussianBlur(f, (0, 0), 2) - cv2.GaussianBlur(ref, (0, 0), 2)
    om = owl_mask(n)
    if om is None:
        # a rig-drawn frame (no measured owl silhouette): no dust yet before 64.44; otherwise reuse the previous frame
        if t < 64.44: out['%.2f' % t] = []
        else: out['%.2f' % t] = out['%.2f' % ((n - 1) / 25)]
        continue
    # (measured: a lower threshold for the faint late haze fits worse — the 0.05 mask is kept all through)
    m = (np.abs(d) > 0.05) & REGION
    if om is not None: m &= ~om
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    circ = []
    work = m.copy()
    for _ in range(90):
        dt = cv2.distanceTransform(work, cv2.DIST_L2, 5)
        y, x = np.unravel_index(np.argmax(dt), dt.shape); r = float(dt[y, x])
        if r < 11: break
        disc = np.zeros_like(work); cv2.circle(disc, (int(x), int(y)), int(r), 1, -1)
        v = float(np.median(f[disc > 0])); lift = float(np.median(d[disc > 0]))
        circ.append([int(x - M), int(y - M), round(r, 1), round(v, 3), round(lift, 3)])
        cv2.circle(work, (int(x), int(y)), int(r * 0.9), 0, -1)
    out['%.2f' % t] = circ
    print('%.2f circles %d  area %d' % (t, len(circ), int(m.sum())))
lines = ["// Dust puffs per source frame (s20/trace/dust.py): circles [x, y, r, value, lift] (setup-A frame px; pre-grade value",
         "// inside the circle and its difference from the clean room).",
         "export const DUST = {"]
for t, c in out.items():
    lines.append('  "%s": %s,' % (t, json.dumps(c, separators=(',', ':'))))
lines.append("};")
open(os.path.join(os.path.dirname(__file__), '..', 'data', 'dust.js'), 'w').write('\n'.join(lines) + '\n')
