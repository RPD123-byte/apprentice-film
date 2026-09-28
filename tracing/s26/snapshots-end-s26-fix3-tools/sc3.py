# sc3.py FRAMES label=pattern{F} ... [--box x0,y0,x1,y1] : mean blurred CIE76 dE (sigma 1.5/4/12) vs the source frame by
# index, full frame or a box; prints per frame and the mean (end fix round 3 scratch)
import cv2, numpy as np, sys
SRC = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s26f3/src/s{F}.png'
args = sys.argv[1:]; box = None; sig = (1.5, 4, 12); quiet = False
if '--box' in args: i = args.index('--box'); box = [int(v) for v in args[i + 1].split(',')]; del args[i:i + 2]
if '-q' in args: args.remove('-q'); quiet = True
spec = args[0]; Fs = []
for part in spec.split(','):
    if '-' in part: a, b = part.split('-'); Fs += list(range(int(a), int(b) + 1))
    else: Fs.append(int(part))
pats = [a.split('=', 1) for a in args[1:]]
def lab(im, s): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), s), cv2.COLOR_BGR2LAB)
acc = {l: [] for l, _ in pats}
for F in Fs:
    S = cv2.imread(SRC.format(F=F)); row = []
    for l, p in pats:
        R = cv2.imread(p.format(F=F))
        if R is None: row.append(None); continue
        v = []
        for s in sig:
            d = np.sqrt(((lab(R, s) - lab(S, s)) ** 2).sum(-1))
            if box: d = d[box[1]:box[3], box[0]:box[2]]
            v.append(round(float(d.mean()), 2))
        acc[l].append(v); row.append(v)
    if not quiet: print(F, ' '.join(f'{l}={v}' for (l, _), v in zip(pats, row)), flush=True)
for l, v in acc.items():
    if v: print('MEAN', l, [round(float(x), 3) for x in np.mean(v, 0)], 'n', len(v))
