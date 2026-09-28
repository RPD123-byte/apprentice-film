# owldump.py OUTDIR ids... -> owl layer alone on mid grey (to see its parts), plus box
import sys, os, json, cv2, numpy as np
from lab import Lab
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
L = Lab()
for a in sys.argv[2:]:
    n = int(a)
    info = L.js('(n) => { const l = S16H.owlL(n); return [l.x, l.y, l.c.width, l.c.height]; }', n)
    im = L.png('(n) => { const l = S16H.owlL(n); const c = document.createElement("canvas"); c.width = l.c.width; c.height = l.c.height; const g = c.getContext("2d"); g.fillStyle = "#804080"; g.fillRect(0,0,c.width,c.height); g.drawImage(l.c, 0, 0); return c; }', n)
    cv2.imwrite(f'{out}/owl{n}.png', im); print(n, info)
L.close()
