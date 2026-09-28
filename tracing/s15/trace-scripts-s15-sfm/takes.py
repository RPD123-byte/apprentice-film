import sys, subprocess
out = subprocess.check_output(['python3', '/Users/computer/rootline/apprentice-film/snapshots/s15-sfm/score.py', sys.argv[1]]).decode()
v = []
for l in out.splitlines():
    if l.startswith('MEAN'): print(l); continue
    p = l.split(); v.append((float(p[0]), float(l.split('blurMAE=')[1].split()[0]), float(l.split('gradCorr=')[1].split()[0])))
for lo, hi, name in [(40.7,40.95,'A'),(40.95,41.7,'B'),(41.7,41.95,'C'),(41.95,42.7,'D'),(42.7,43.9,'E'),(43.9,44.46,'H'),(44.46,44.86,'I'),(44.86,45.15,'J'),(45.15,45.7,'J2')]:
    x = [e for t, e, c in v if lo <= t < hi]; c = [c for t, e, c in v if lo <= t < hi]
    print(name, round(sum(x) / len(x), 1), round(sum(c) / len(c), 2), len(x))
