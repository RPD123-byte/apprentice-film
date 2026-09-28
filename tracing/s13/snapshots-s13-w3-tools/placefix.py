# placefix.py OUT frames... : per layer region, the (dx, dy) that best moves the render onto the source (sigma-1.5 MAE,
# coarse 1 px then 0.25 px); for the body, a least-squares similarity correction from its four regions.
import cv2, numpy as np, sys, json
out = sys.argv[1]; fr = [int(f) for f in sys.argv[2:]]
S = '/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
import os
REG = {'cupLD': (820, 180, 990, 500), 'cupRD': (1380, 140, 1540, 450), 'faceD': (1000, 230, 1400, 480), 'bandD': (880, 0, 1480, 200), 'face': (930, 190, 1290, 470), 'cup': (1420, 60, 1580, 430), 'wing': (1720, 240, 2150, 700), 'tail': (1600, 700, 1800, 900), 'feet': (1140, 850, 1600, 946),
       'b_chestU': (1050, 480, 1350, 620), 'b_bellyE': (1000, 540, 1300, 870), 'b_bellyR': (1300, 700, 1600, 880), 'b_flank': (1480, 560, 1650, 880)}
def sh(img, dx, dy): return cv2.warpAffine(img, np.float32([[1, 0, dx], [0, 1, dy]]), (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR)
P = 10; res = {}
for f in fr:
    r = cv2.imread(f'{out}/r{f}.png', 0).astype(np.float32); s = cv2.GaussianBlur(cv2.imread(f'{S}/f{f}.png', 0).astype(np.float32), (0, 0), 1.5)
    rp = cv2.copyMakeBorder(r, P, P, P, P, cv2.BORDER_REPLICATE); row = {}
    for k, (x0, y0, x1, y1) in [(k, v) for k, v in REG.items() if not os.environ.get('PARTS') or k in os.environ['PARTS'].split(',')]:
        crop = rp[y0:y1 + 2 * P, x0:x1 + 2 * P]; tgt = s[y0:y1, x0:x1]
        def err(dx, dy): return np.abs(cv2.GaussianBlur(sh(crop, dx, dy), (0, 0), 1.5)[P:-P, P:-P] - tgt).mean()
        base = err(0, 0); best = (base, 0, 0)
        for dx in range(-5, 6):
            for dy in range(-5, 6):
                e = err(dx, dy)
                if e < best[0]: best = (e, dx, dy)
        b0 = best
        for dx in np.arange(b0[1] - 0.75, b0[1] + 0.76, 0.25):
            for dy in np.arange(b0[2] - 0.75, b0[2] + 0.76, 0.25):
                e = err(dx, dy)
                if e < best[0]: best = (e, dx, dy)
        row[k] = (round(float(base), 2), round(float(best[0]), 2), float(best[1]), float(best[2]))
    # body similarity fit: d = t + th * perp(p - c)
    B = [(k, v) for k, v in row.items() if k.startswith('b_')]
    if len(B) < 3: print(f, ' '.join(f"{k}:{v[2]:+.2f},{v[3]:+.2f}({v[0]:.1f}->{v[1]:.1f})" for k, v in row.items()), flush=True); continue
    A = []; y = []
    for k, v in B:
        x0, y0, x1, y1 = REG[k]; cx, cy = (x0 + x1) / 2 - 1250, (y0 + y1) / 2 - 650
        A += [[1, 0, -cy], [0, 1, cx]]; y += [v[2], v[3]]
    sol = np.linalg.lstsq(np.array(A, float), np.array(y, float), rcond=None)[0]
    row['body_fit'] = [round(float(sol[0]), 2), round(float(sol[1]), 2), round(float(np.degrees(sol[2])), 3)]
    res[f] = row
    print(f, ' '.join(f"{k}:{v[2]:+.2f},{v[3]:+.2f}({v[0]:.1f}->{v[1]:.1f})" for k, v in row.items() if k != 'body_fit'), 'BODY dx,dy,deg@(1250,650)', row['body_fit'], flush=True)
json.dump(res, open(out + '/placefix.json', 'w'))
