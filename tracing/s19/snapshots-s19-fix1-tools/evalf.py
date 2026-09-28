# full-frame graded comparison: evalf.py tag [times|all|every:N] [--pairs t1,t2] [--box x0,y0,x1,y1]
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2, time, os
args = sys.argv[1:]; tag = args[0]
spec = args[1] if len(args) > 1 else 'every:6'
pairs = []; box = None
if '--pairs' in args: pairs = [float(v) for v in args[args.index('--pairs') + 1].split(',')]
if '--box' in args: box = [int(v) for v in args[args.index('--box') + 1].split(',')]
if spec == 'all': ts = [k / 25 for k in range(1433, 1578)]
elif spec.startswith('every:'): n = int(spec[6:]); ts = [k / 25 for k in range(1433, 1578, n)]
else: ts = [float(v) for v in spec.split(',')]
out = f'../s19b-{tag}'; os.makedirs(out, exist_ok=True)
L = Lab(); res = []
for t in sorted(set(ts + pairs)):
    a = time.time(); r = L.render(t); dt = time.time() - a; s = src(t)
    m = mae(r, s, 8); mb = mae(r, s, 8, box) if box else None
    res.append((t, m, mb, dt))
    if t in pairs: pair(r, s, f'{out}/pair-{t:.2f}.jpg', 0.5, None)
L.close()
for t, m, mb, dt in res: print(f'{t:.2f} mae {m:5.2f}' + (f' box {mb:5.2f}' if mb is not None else '') + f'  {dt*1000:5.0f} ms')
print('mean', round(float(np.mean([r[1] for r in res])), 2), 'max', round(float(np.max([r[1] for r in res])), 2))
