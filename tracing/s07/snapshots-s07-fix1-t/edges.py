# edges.py : outline edges of the hands on source frame 740 (BASE): pixels where a wide light area (skin) meets
# something dark (an ink outline or a key), inside the hands' moving-region mask; linked into chains, simplified.
import cv2, numpy as np, json, sys, re
from skimage.morphology import skeletonize
S = '/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src/n0740.png'
g = cv2.cvtColor(cv2.imread(S), cv2.COLOR_BGR2GRAY).astype(np.float32)
X0, Y0, X1, Y1 = 560, 470, 1200, 860
gb = cv2.GaussianBlur(g, (0, 0), 0.8)
wide = cv2.blur((gb > 165).astype(np.float32), (9, 9)) > 0.7      # wide light areas (skin, deck)
dark = gb < 95
# edge pixels: dark pixels with a wide-light pixel within 2 px
wl = cv2.dilate(wide.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))) > 0
E = dark & wl
# the moving-region mask of the hands layer
src = open('/Users/computer/rootline/apprentice-film/src/shots/s07/data/hands.js').read()
import base64
mk = re.search(r'export const MASK = \["(\w+)", "([^"]+)"\]', src)
arr = np.frombuffer(base64.b64decode(mk.group(2)), {'i16': np.int16, 'u16': np.uint16}.get(mk.group(1), np.int16))
M = np.zeros(g.shape, np.uint8); i = 0
while i < len(arr):
    n = int(arr[i]); i += 1; P = arr[i:i + 2 * n].reshape(-1, 2).astype(np.int32); i += 2 * n
    cv2.fillPoly(M, [P], 1)
E = E & (M > 0); print("E", E.sum(), "M", M.sum(), "wl", wl.sum(), "dark", dark.sum())
sk = skeletonize(cv2.morphologyEx(E.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8)) > 0)
cs, _ = cv2.findContours(sk.astype(np.uint8), cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
vis = cv2.cvtColor(cv2.imread(S)[Y0:Y1, X0:X1], cv2.COLOR_BGR2GRAY); vis = cv2.cvtColor((vis * 0.6 + 80).astype(np.uint8), cv2.COLOR_GRAY2BGR)
vis = cv2.resize(vis, None, fx=2, fy=2)
ys, xs = np.nonzero(sk)
for y, x in zip(ys, xs): cv2.circle(vis, ((x - X0) * 2, (y - Y0) * 2), 1, (0, 0, 255), -1)
cv2.polylines(vis, [((c[:, 0, :] - [X0, Y0]) * 2).astype(np.int32) for c in cv2.findContours(M, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0]], True, (0, 200, 0), 1)
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/s07-fix1-t/c_edges.png', vis)
np.save('/Users/computer/rootline/apprentice-film/snapshots/s07-fix1-t/edges_sk.npy', sk)
print(sk.sum(), 'skeleton px')
# ---- restrict to coarse hand regions (by eye, base frame 740), chain, simplify
HL = np.array([(585, 735), (600, 690), (640, 660), (690, 635), (750, 630), (800, 650), (860, 690), (900, 750), (900, 860), (740, 860), (660, 830), (600, 800), (585, 770)], np.int32)
HR = np.array([(865, 650), (880, 610), (920, 575), (960, 550), (1010, 548), (1060, 553), (1120, 570), (1200, 590), (1200, 740), (1100, 735), (990, 720), (920, 710), (890, 690), (868, 672)], np.int32)
R = np.zeros(g.shape, np.uint8); cv2.fillPoly(R, [HL, HR], 1)
sk2 = sk & (R > 0)
H_, W_ = sk2.shape
ys, xs = np.nonzero(sk2)
S2 = set(zip(ys.tolist(), xs.tolist()))
nb = lambda p: [(p[0] + dy, p[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (p[0] + dy, p[1] + dx) in S2]
deg = {p: len(nb(p)) for p in S2}
used = set(); chains = []
def walk(p, q):
    ch = [p, q]; used.add((p, q)); used.add((q, p))
    while deg[q] == 2:
        nx = [r for r in nb(q) if r != ch[-2] and (q, r) not in used]
        if not nx: break
        r = nx[0]; used.add((q, r)); used.add((r, q)); ch.append(r); q = r
    return ch
for p in S2:
    if deg[p] != 2:
        for q in nb(p):
            if (p, q) not in used: chains.append(walk(p, q))
for p in S2:
    if deg[p] == 2 and not any((p, q) in used for q in nb(p)): chains.append(walk(p, nb(p)[0]))
# join chains whose ends meet within 3 px with similar direction (greedy)
def ends(c):
    a = np.array(c[0][::-1], float); b = np.array(c[-1][::-1], float)
    da = a - np.array(c[min(4, len(c) - 1)][::-1], float); db = b - np.array(c[max(0, len(c) - 5)][::-1], float)
    return a, da / (np.linalg.norm(da) + 1e-6), b, db / (np.linalg.norm(db) + 1e-6)
chains = [c for c in chains if len(c) >= 3]
changed = True
while changed:
    changed = False
    for i in range(len(chains)):
        for j in range(len(chains)):
            if i == j or not chains[i] or not chains[j]: continue
            a1, d1, b1, e1 = ends(chains[i]); a2, d2, b2, e2 = ends(chains[j])
            # end of i to start of j
            v = a2 - b1; dd = np.linalg.norm(v)
            if dd < 4 and (dd < 1.5 or (e1 @ v / dd > 0.5 and -d2 @ v / dd > 0.5)):
                chains[i] = chains[i] + chains[j]; chains[j] = []; changed = True; continue
            v = b2 - b1; dd = np.linalg.norm(v)
            if dd < 4 and (dd < 1.5 or (e1 @ v / dd > 0.5 and -e2 @ v / dd > 0.5)):
                chains[i] = chains[i] + chains[j][::-1]; chains[j] = []; changed = True; continue
    chains = [c for c in chains if c]
out = []
for c in chains:
    if len(c) < 8: continue
    pts = np.array([[x, y] for y, x in c], np.float32) + 0.5   # pixel centres
    ap = cv2.approxPolyDP(pts.reshape(-1, 1, 2), 0.7, False)[:, 0, :]
    out.append(ap.round(1).tolist())
json.dump(out, open('/Users/computer/rootline/apprentice-film/snapshots/s07-fix1-t/handlines.json', 'w'))
print(len(out), 'chains', sum(len(c) for c in out), 'points', sum(len(c) for c in chains), 'px')
vis = cv2.cvtColor(cv2.imread(S)[Y0:Y1, X0:X1], cv2.COLOR_BGR2GRAY); vis = cv2.cvtColor((vis * 0.6 + 80).astype(np.uint8), cv2.COLOR_GRAY2BGR)
vis = cv2.resize(vis, None, fx=2, fy=2)
rng = np.random.RandomState(5)
for k, c in enumerate(out):
    col = tuple(int(v) for v in rng.randint(0, 220, 3))
    P = ((np.array(c) - [X0, Y0]) * 2).astype(np.int32)
    cv2.polylines(vis, [P], False, col, 2); cv2.putText(vis, str(k), tuple(P[len(P) // 2]), 0, 0.35, col, 1)
cv2.polylines(vis, [(HL - [X0, Y0]) * 2, (HR - [X0, Y0]) * 2], True, (0, 180, 0), 1)
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/s07-fix1-t/c_hl.png', vis)
