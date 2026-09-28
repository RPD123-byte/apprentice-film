# Pick detected faces by index -> JS items ["f", ink, [x,y,...], hull?] (hull: convex hull flat list, drawn in the
# tape ink under the face so tape notches read dark). Usage: facepick.py faces.json "i,j,k" [--nohull i,j] [--col i=#hex]
import sys, json, numpy as np, cv2
F = json.load(open(sys.argv[1])); sel = [int(v) for v in sys.argv[2].split(',') if v.strip()]
a = sys.argv
nohull = set(int(v) for v in a[a.index('--nohull') + 1].split(',')) if '--nohull' in a else set()
cols = {}
if '--col' in a:
    for kv in a[a.index('--col') + 1].split(','):
        k, v = kv.split('='); cols[int(k)] = v
out = []
for i in sel:
    f = F[i]; P = np.array(f['pts'], np.int32)
    item = ["f", cols.get(i, f['col']), [int(v) for v in P.flatten()]]
    if i not in nohull:
        h = cv2.convexHull(P)[:, 0]
        ha = cv2.contourArea(h); pa = cv2.contourArea(P)
        if ha > pa * 1.04: item.append([int(v) for v in h.flatten()])
    out.append(item)
print(',\n'.join('  ' + json.dumps(it, separators=(',', ':')) for it in out) + ',')
