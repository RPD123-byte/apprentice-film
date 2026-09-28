# beats.py label=pattern{F} ... : per-beat mean blurred CIE76 dE (sigma 4 / 12) over 2763-2937 vs the source by index;
# writes OUT (json, per frame) if set (end fix round 3 scratch)
import cv2, numpy as np, sys, json, os
from multiprocessing import Pool
SRC = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s26f3/src/s{F}.png'
BEATS = [('A', 2763, 2788), ('B', 2789, 2789), ('C', 2790, 2817), ('D', 2818, 2842), ('E', 2843, 2853), ('F1', 2854, 2887), ('F2', 2888, 2937)]
pats = [a.split('=', 1) for a in sys.argv[1:]]
def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), s), cv2.COLOR_BGR2LAB)
def one(F):
    S = cv2.imread(SRC.format(F=F)); out = {}
    for l, p in pats:
        R = cv2.imread(p.format(F=F))
        if R is None: continue
        out[l] = [round(float(np.sqrt(((lab(R, s) - lab(S, s)) ** 2).sum(-1)).mean()), 3) for s in (4, 12)]
    return F, out
def main():
  with Pool(6) as pool: res = dict(pool.map(one, range(2763, 2938)))
  for l, _ in pats:
      row = []
      for b, a, z in BEATS + [('All', 2763, 2937)]:
          v = [res[F][l] for F in range(a, z + 1) if l in res[F]]
          row.append(f'{b} {np.mean([x[0] for x in v]):.2f}/{np.mean([x[1] for x in v]):.2f}' if v else f'{b} -')
      print(l.ljust(6), ' | '.join(row))
  if os.environ.get('OUT'): json.dump(res, open(os.environ['OUT'], 'w'))
if __name__ == '__main__': main()
