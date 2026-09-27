# evalall.py OUTDIR [step] : render every source frame of s07 through the dev harness (graded) and score vs source
import subprocess, sys, os, cv2, numpy as np
out = sys.argv[1]; step = int(sys.argv[2]) if len(sys.argv) > 2 else 1
os.makedirs(out, exist_ok=True)
D = 'snapshots/s07-p2-dev'
idx = list(range(0, 38, step))
if 37 not in idx: idx.append(37)
args = []
for i in idx:
  t = 29.04 + 0.04 * i
  args += [f'{out}/r_{i:02d}.png', f't={t:.4f}']
root = '/Users/computer/rootline/apprentice-film'
subprocess.run(['node', D + '/dev.mjs', D + '/h.html'] + args, cwd=root, check=True, stdout=subprocess.DEVNULL)
bl = lambda x, s: cv2.GaussianBlur(x, (0, 0), s)
scr = np.zeros((946, 2206), np.uint8); cv2.fillPoly(scr, [np.array([[315, 246], [834, 168], [898, 519], [409, 648]])], 1); scr = scr > 0
hand = np.zeros((946, 2206), bool); hand[470:860, 560:1200] = True
rows = []
for i in idx:
  a = cv2.imread(f'{root}/{out}/r_{i:02d}.png', 0).astype(np.float32); b = cv2.imread(f'{root}/{D}/w/frames/f_{i:02d}.png', 0).astype(np.float32)
  e8 = np.abs(bl(a, 8) - bl(b, 8)); e2 = np.abs(bl(a, 2) - bl(b, 2))
  rows.append((i, e8.mean(), e2.mean(), e8[scr].mean(), e8[hand & ~scr].mean(), e8[~scr & ~hand].mean(), a.mean() - b.mean()))
  print('%2d %.2f  mae8 %.2f mae2 %.2f | screen %.2f hands %.2f rest %.2f | dmean %+.2f' % ((i, 29.04 + 0.04 * i) + rows[-1][1:]))
r = np.array(rows); print('MEAN mae8 %.2f mae2 %.2f screen %.2f hands %.2f rest %.2f dmean %+.2f' % tuple(r[:, 1:].mean(0)))
