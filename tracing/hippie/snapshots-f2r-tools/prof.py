import sys, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/f2r-tools')
from cls import profile, runs
im = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-pre.png')
for a in sys.argv[1:]:
    x0, y0, x1, y1 = [float(v) for v in a.split(',')]
    s = profile(im, (x0, y0), (x1, y1))
    print(a, ' '.join(f"{c}{i}+{n}" for c, i, n in runs(s) if n >= 2))
