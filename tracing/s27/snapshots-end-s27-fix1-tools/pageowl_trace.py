# Trace the page owl (registered, un-graded median in page px, pageowl_median.py) inside its mask: colour regions (k-means,
# posterized polygons, region-mean colours) + ink polygons (measured tones) + outline, the method of s27-k-tools/owl_vec.py.
# Writes src/shots/s27/pageOwl.js (page px x2, codec strings). Measurement -> vector data only.
import cv2, numpy as np, json, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from codec import enc
W = '/Users/computer/rootline/apprentice-film/snapshots/end-s27-fix1-work'
PX0, PY0 = 1860, 0
K = int(sys.argv[1]) if len(sys.argv) > 1 else 14
S = 4
def contours_of(mk, eps, minarea, smooth, off):
    M = cv2.resize(mk.astype(np.float32), None, fx=S, fy=S, interpolation=cv2.INTER_LINEAR)
    if smooth: M = cv2.GaussianBlur(M, (0, 0), smooth * S)
    B = (M > 0.5).astype(np.uint8)
    cnts, hier = cv2.findContours(B, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None: return out
    for i, c in enumerate(cnts):
        if hier[0][i][3] >= 0 or cv2.contourArea(c) < minarea * S * S: continue
        o = cv2.approxPolyDP(c, eps * S, True).reshape(-1, 2) / S + off
        holes = []; j = hier[0][i][2]
        while j >= 0:
            if cv2.contourArea(cnts[j]) >= minarea * S * S * 0.5: holes.append(cv2.approxPolyDP(cnts[j], eps * S, True).reshape(-1, 2) / S + off)
            j = hier[0][j][0]
        out.append((o, holes))
    return out
fl = lambda p: [int(round(v * 2)) for xy in p for v in xy]
u8 = cv2.imread(f'{W}/pageowl_med.png'); mk = (cv2.imread(f'{W}/pageowl_mask2.png', 0) > 0).astype(np.uint8)
off = np.array([PX0 - 0.5, PY0 - 0.5])          # pixel centres
g = cv2.cvtColor(u8, cv2.COLOR_BGR2GRAY)
bh = cv2.morphologyEx(g, cv2.MORPH_BLACKHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))).astype(np.float32)
ink = (((bh > 26) & (g < 150)) | (g < 70)).astype(np.uint8) * cv2.erode(mk, np.ones((3, 3), np.uint8))
n_, cc, st, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)
small = np.nonzero(st[1:, 4] < 6)[0] + 1
if len(small): ink[np.isin(cc, small)] = 0
clean = cv2.inpaint(u8, cv2.dilate(ink, np.ones((3, 3), np.uint8)) * 255, 4, cv2.INPAINT_TELEA)
clean = cv2.bilateralFilter(clean, 7, 20, 5)
lab = cv2.cvtColor(clean, cv2.COLOR_BGR2LAB).astype(np.float32)
yy, xx = np.nonzero(mk); cv2.setRNGSeed(3)
k = min(K, max(4, len(xx) // 400))
_, lb, cen = cv2.kmeans(lab[yy, xx], k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.3), 3, cv2.KMEANS_PP_CENTERS)
Lb = np.full(mk.shape, -1, np.int32); Lb[yy, xx] = lb.ravel()
for it in range(2):
    votes = np.stack([cv2.boxFilter((Lb == j).astype(np.float32), -1, (3, 3)) for j in range(k)])
    Lb = np.where(mk > 0, np.argmax(votes, 0), -1)
regs = []; cf = clean.astype(np.float32)
for j in range(k):
    for o, h in contours_of(Lb == j, 0.5, 3, 0.6, off):
        M = np.zeros(mk.shape, np.uint8); cv2.fillPoly(M, [np.int32(np.round(o - off))], 1)
        for hh in h: cv2.fillPoly(M, [np.int32(np.round(hh - off))], 0)
        M &= (Lb == j).astype(np.uint8); q = np.nonzero(M)
        if len(q[0]) == 0: continue
        col = cf[q].mean(0)[::-1]; regs.append((len(q[0]), '#%02x%02x%02x' % tuple(int(v) for v in col), o, h))
regs.sort(key=lambda r: -r[0])
inks = {}
for o, h in contours_of(ink, 0.35, 1.0, 0.45, off):
    M = np.zeros(mk.shape, np.uint8); cv2.fillPoly(M, [np.int32(np.round(o - off))], 1); q = np.nonzero(M & ink)
    if len(q[0]) == 0: continue
    v = u8[q].astype(np.float32); lum = v.sum(1); sel = v[lum <= np.percentile(lum, 40)]; c = sel.mean(0)[::-1]
    c = (np.round(c / 12) * 12).clip(0, 255); key = '#%02x%02x%02x' % tuple(int(x) for x in c)
    inks.setdefault(key, []).append([fl(o)] + [fl(x) for x in h])
cnts, _ = cv2.findContours(mk, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cnts, key=cv2.contourArea)
outl = fl(cv2.approxPolyDP(c, 0.6, True).reshape(-1, 2) + off)
R = [[r[1], enc(fl(r[2]))] + [enc(fl(x)) for x in r[3]] for r in regs]
I = [[col] + [[enc(p) for p in poly] for poly in polys] for col, polys in inks.items()]
with open('/Users/computer/rootline/apprentice-film/src/shots/s27/pageOwl.js', 'w') as f:
    f.write('// s27 (end-s27-fix1): the owl as it sits on the colour page (the user\'s own character), traced in PAGE px (x2) from a\n')
    f.write('// registered, un-graded median of the source over the frontal hold 118.20-119.60 (each frame warped into page coordinates\n')
    f.write('// by the shot\'s own screen track): colour regions [colour, outer, ...holes] + ink [colour, [outer, ...holes], ...] +\n')
    f.write('// outline, codec strings (codec.js poly()). Painted into the page texture by s27.js, so it turns with the page as in\n')
    f.write('// the source. Scripts: snapshots/end-s27-fix1-tools (pageowl_median.py, pageowl_trace.py).\n')
    f.write('export const PAGE_OWL_REGIONS = %s;\n' % json.dumps(R, separators=(',', ':')))
    f.write('export const PAGE_OWL_INK = %s;\n' % json.dumps(I, separators=(',', ':')))
    f.write('export const PAGE_OWL_OUTLINE = %s;\n' % json.dumps(enc(outl)))
print('regions', len(R), 'ink tones', len(I))
