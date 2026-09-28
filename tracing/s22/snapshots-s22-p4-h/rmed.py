# rmed.py DIR side out: the render's cup-aligned median of the edge drawing
import sys, cv2, numpy as np, os
sys.path.insert(0,'.')
exec(open('edgecmp.py').read().split("d = sys.argv[1]")[0])
d, side, out = sys.argv[1:4]
rot, keys, rr = {'bot': (2, BOT, (1938, 1978)), 'top': (0, TOP, (1870, 1913))}[side]
K = {round(t * 25): (x, y) for t, x, y in keys}
Fs = [F for F in range(rr[0], rr[1] + 1) if F in K and os.path.exists(f'{d}/r{F:04d}.png')]
Rm = np.median(np.stack([cv2.cvtColor(crop_img(cv2.imread(f'{d}/r{F:04d}.png'), *K[F], rot), cv2.COLOR_BGR2GRAY) for F in Fs]), 0)
cv2.imwrite(out, np.clip(Rm, 0, 255).astype(np.uint8)); print(side, len(Fs))
