# Picked faces -> quads (4 measured corners of the face, occlusion-completed via its hull) + tape squares (the dark
# notches inside the hull whose source colour is tape-like). Usage: facepick2.py faces.json "i,j" [--keep i,j]
#   --keep: keep the detected polygon instead of a quad for these (irregular faces).  --n i=5: vertex count
import sys, json, numpy as np, cv2
F = json.load(open(sys.argv[1])); sel = [int(v) for v in sys.argv[2].split(',') if v.strip()]
a = sys.argv
keep = set(int(v) for v in a[a.index('--keep') + 1].split(',')) if '--keep' in a else set()
nv = {}
if '--n' in a:
    for kv in a[a.index('--n') + 1].split(','): k, v = kv.split('='); nv[int(k)] = int(v)
im = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-pre.png')
H, W = im.shape[:2]
def approx_n(h, n):
    peri = cv2.arcLength(h, True)
    for e in np.linspace(0.005, 0.2, 80):
        ap = cv2.approxPolyDP(h, e * peri, True)
        if len(ap) <= n: return ap[:, 0]
    return ap[:, 0]
out = []
for i in sel:
    f = F[i]; P = np.array(f['pts'], np.int32)
    h = cv2.convexHull(P)
    Q = P if i in keep else approx_n(h, nv.get(i, 4))
    tapes = []
    mh = np.zeros((H, W), np.uint8); cv2.fillPoly(mh, [h[:, 0]], 1)
    mf = np.zeros((H, W), np.uint8); cv2.fillPoly(mf, [P], 1)
    notch = cv2.morphologyEx(mh * (1 - mf), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lb, st, cen = cv2.connectedComponentsWithStats(notch)
    for j in range(1, n):
        if st[j, 4] < 60: continue
        m = lb == j; col = np.median(im[m], axis=0)
        hsv = cv2.cvtColor(np.uint8([[col]]), cv2.COLOR_BGR2HSV)[0, 0]
        if 38 <= hsv[2] <= 110 and hsv[1] < 120:
            cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            t = approx_n(cv2.convexHull(max(cs, key=cv2.contourArea)), 4)
            tapes.append([int(v) for v in t.flatten()])
    item = ["q", f['col'], [int(v) for v in np.array(Q).flatten()]]
    if tapes: item.append(tapes)
    out.append(item)
print(',\n'.join('  ' + json.dumps(it, separators=(',', ':')) for it in out) + ',')
