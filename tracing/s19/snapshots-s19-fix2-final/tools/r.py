# quick render+compare: r.py tag t1,t2,... [--box x0,y0,x1,y1] [--scale s] [--ungraded]
import sys; sys.path.insert(0, '.')
from lab import *
import os, time
args = sys.argv[1:]; tag = args[0]; ts = [float(v) for v in args[1].split(',')]
box = None; sc = 0.5
if '--box' in args: box = [int(v) for v in args[args.index('--box') + 1].split(',')]
if '--scale' in args: sc = float(args[args.index('--scale') + 1])
out = f'../s19-fix2-{tag}'; os.makedirs(out, exist_ok=True)
L = Lab()
for t in ts:
    a = time.time(); r = L.render(t, '--ungraded' not in args); dt = time.time() - a; s = src(t)
    cv2.imwrite(f'{out}/r-{t:.2f}.png', r)
    m = mae(r, s, 8); mb = mae(r, s, 8, box) if box else None
    pair(r, s, f'{out}/pair-{t:.2f}.jpg', sc, box)
    print(f'{t:.2f} mae {m:5.2f}' + (f' box {mb:5.2f}' if mb is not None else '') + f'  {dt*1000:5.0f} ms')
L.close()
