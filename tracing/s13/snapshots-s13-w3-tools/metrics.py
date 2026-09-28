# s13 metrics: exact frame pairs (render OUT/r<f>.png vs source snapshots/s13-w3-src/f<f>.png).
# Usage: python3 metrics.py OUT [--regions] [--json out.json]
import cv2, numpy as np, sys, glob, re, json
out = sys.argv[1]; SRC = '/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
REG = {  # reviewer's boxes (x0,y0,x1,y1) and a few more
 'cup3q': (1370, 20, 1560, 420), 'cupL_D': (820, 180, 980, 500), 'cupR_D': (1380, 140, 1520, 440),
 'undercup': (1430, 395, 1525, 475), 'wingroot': (1480, 480, 1700, 700), 'beakC': (1000, 390, 1110, 510),
 'beakD': (1190, 385, 1285, 505), 'bandD': (880, 0, 1480, 250), 'lowfaceD': (880, 400, 1180, 640),
 'tail': (1560, 640, 1860, 946), 'footL': (1160, 840, 1330, 946), 'footR': (1330, 840, 1560, 946),
 'chest': (960, 480, 1420, 820), 'eyes': (880, 250, 1260, 470), 'wing': (1600, 250, 2206, 700),
 'nub': (700, 150, 900, 450), 'head': (880, 0, 1400, 480),
}
POSE = lambda f: 'A' if f <= 885 else 'B' if f <= 887 else 'S' if f <= 889 else 'C' if f <= 898 else 'T' if f <= 900 else 'D' if f <= 911 else 'E' if f == 912 else 'R'
def g(p): return cv2.imread(p, 0).astype(np.float32)
rows = {}
for p in sorted(glob.glob(out + '/r*.png')):
    f = int(re.search(r'r(\d+)\.png', p).group(1)); r = g(p); s = g(f'{SRC}/f{f}.png')
    b8r, b8s = cv2.GaussianBlur(r, (0, 0), 8), cv2.GaussianBlur(s, (0, 0), 8)
    b3r, b3s = cv2.GaussianBlur(r, (0, 0), 3), cv2.GaussianBlur(s, (0, 0), 3)
    mr, ms = cv2.GaussianBlur(r, (0, 0), 1) > 70, cv2.GaussianBlur(s, (0, 0), 1) > 70
    d = {'s8': float(np.abs(b8r - b8s).mean()), 's3': float(np.abs(b3r - b3s).mean()),
         'raw': float(np.abs(r - s).mean()), 'dm': float((r - s).mean()),
         'iou': float((mr & ms).sum() / max(1, (mr | ms).sum()))}
    for k, (x0, y0, x1, y1) in REG.items():
        d[k] = float(np.abs(b8r[y0:y1, x0:x1] - b8s[y0:y1, x0:x1]).mean())
        d[k + '_dm'] = float((b8r[y0:y1, x0:x1] - b8s[y0:y1, x0:x1]).mean())
    rows[f] = d
if '--json' in sys.argv: json.dump(rows, open(sys.argv[sys.argv.index('--json') + 1], 'w'))
print('frame pose   s8    s3   raw    dm    iou')
for f, d in sorted(rows.items()):
    print(f"{f} {POSE(f)}   {d['s8']:5.2f} {d['s3']:5.2f} {d['raw']:5.2f} {d['dm']:+5.2f} {d['iou']:.3f}")
groups = {}
for f, d in rows.items():
    if 884 <= f <= 922: groups.setdefault(POSE(f), []).append(d); groups.setdefault('all', []).append(d)
print('group  n   s8    s3   iou')
for k in ['all', 'A', 'B', 'S', 'C', 'T', 'D', 'E', 'R']:
    if k in groups:
        L = groups[k]; print(f"{k:5s} {len(L):2d} {np.mean([d['s8'] for d in L]):5.2f} {np.mean([d['s3'] for d in L]):5.2f} {np.mean([d['iou'] for d in L]):.3f}")
if '--regions' in sys.argv:
    print('region (C poses 890-898 | D 901-911 | all): mae / dm')
    for k in REG:
        vals = []
        for sel in [range(890, 899), range(901, 912), range(884, 923)]:
            L = [rows[f] for f in sel if f in rows]
            if L: vals.append(f"{np.mean([d[k] for d in L]):5.2f}/{np.mean([d[k+'_dm'] for d in L]):+5.2f}")
        print(f"{k:9s}", ' | '.join(vals))
