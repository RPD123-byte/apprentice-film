import cv2, numpy as np, glob, re, sys, json
P = '/Users/computer/rootline/apprentice-film/snapshots/'
dirs = sys.argv[1:] or ['s17-rev2-a', 's17-rev2-b', 's17-rev2-c']
rows = []
def lap(g):
    return np.abs(cv2.Laplacian(g, cv2.CV_32F, ksize=3)).mean()
for d in dirs:
    for f in sorted(glob.glob(P + d + '/frame-*.png')):
        t = float(re.search(r'at-([\d.]+)s', f).group(1))
        r = cv2.imread(f, 0).astype(np.float32)
        s = cv2.imread(f.replace('frame-', 'ref-'), 0)
        if s is None: continue
        s = s.astype(np.float32)
        b6 = lambda a: cv2.GaussianBlur(a, (0, 0), 6)
        full6 = np.abs(b6(r) - b6(s)).mean()
        rows.append(dict(t=t, full6=round(float(full6), 2), meanR=round(float(r.mean()), 1), meanS=round(float(s.mean()), 1),
                         p50R=float(np.percentile(r, 50)), p50S=float(np.percentile(s, 50)),
                         p95R=float(np.percentile(r, 95)), p95S=float(np.percentile(s, 95)),
                         lapR=round(float(lap(r)), 2), lapS=round(float(lap(s)), 2)))
rows.sort(key=lambda x: x['t'])
for x in rows: print(json.dumps(x))
