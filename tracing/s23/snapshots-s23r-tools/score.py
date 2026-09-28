#!/usr/bin/env python3
# score.py outdir "page k x0 y0 x1 y1 name plate [white]" ...   -> runs fit.py for each and prints IoU lines, makes a sheet
import sys, subprocess, cv2, numpy as np, os
out = sys.argv[1]; O = '/Users/computer/rootline/apprentice-film/snapshots/s23r-src'; names = []
for a in sys.argv[2:]:
    p = a.split(); page, k, x0, y0, x1, y1, name, pl = p[:8]; wh = p[8] if len(p) > 8 else '150'
    f = f'{out}/frame-{int(page):02d}-at-{int(page)}.5s.png'
    env = dict(os.environ, WHITE=wh)
    r = subprocess.run(['python3', os.path.dirname(__file__) + '/fit.py', f, k, x0, y0, x1, y1, f'{O}/fp-{name}.jpg', pl, '40', '1.2'], capture_output=True, text=True, env=env)
    print(name, r.stdout.replace('\n', ' ') or r.stderr[-300:]); names.append(name)
ims = [cv2.imread(f'{O}/fp-{n}.jpg') for n in names]; ims = [i for i in ims if i is not None]
w = max(i.shape[1] for i in ims); ims = [cv2.copyMakeBorder(i, 0, 4, 0, w - i.shape[1], cv2.BORDER_CONSTANT) for i in ims]
cv2.imwrite(f'{O}/fp-sheet.jpg', np.vstack(ims), [cv2.IMWRITE_JPEG_QUALITY, 85])
