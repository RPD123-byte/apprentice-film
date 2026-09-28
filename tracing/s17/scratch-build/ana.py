import cv2, numpy as np, glob, re, sys, json
D = '/Users/computer/rootline/apprentice-film/snapshots/'
out = sys.argv[1] if len(sys.argv) > 1 else D + 's13-rev2-all'
fs = sorted(glob.glob(out + '/frame-*.png'), key=lambda p: int(re.search(r'frame-(\d+)', p).group(1)))
def fidx(p):
    t = float(re.search(r'at-([\d.]+)s', p).group(1))
    k = int(np.floor(t * 30 + 1e-6))
    return int(np.floor(k / 30 * 25 + 1e-3)), t
src = {}
def S(n):
    if n not in src:
        src[n] = cv2.imread(D + f's13-rev2-src/f{n:04d}.png', 0).astype(np.float32)
    return src[n]
def blur(a, s=8): return cv2.GaussianBlur(a, (0, 0), s)
REG = {
 'underCup': (1400, 380, 1560, 445), 'cushion3q': (1380, 190, 1430, 390), 'plate': (1480, 215, 1545, 340),
 'cheekL': (900, 420, 1000, 520), 'nub': (820, 280, 915, 460), 'feet': (1160, 870, 1600, 946),
 'tail': (1640, 700, 1830, 946), 'wing': (1620, 280, 2090, 720), 'face': (920, 200, 1300, 540),
 'belly': (1100, 600, 1560, 860), 'chestL': (950, 480, 1100, 720), 'flank': (1500, 420, 1650, 650),
 'crown': (1000, 0, 1450, 110), 'bg_near': (700, 500, 900, 900), 'bg_right': (2100, 750, 2206, 946),
}
rows = []
for p in fs:
    f, t = fidx(p)
    R = cv2.imread(p, 0).astype(np.float32)
    s = S(f)
    bR, bS = blur(R), blur(s)
    mae = np.abs(bR - bS).mean()
    iou = ((R > 60) & (s > 60)).sum() / max(1, ((R > 60) | (s > 60)).sum())
    best = min(range(max(876, f - 3), min(930, f + 4)), key=lambda n: np.abs(bR - blur(S(n))).mean())
    reg = {k: round(float(R[y0:y1, x0:x1].mean() - s[y0:y1, x0:x1].mean()), 1) for k, (x0, y0, x1, y1) in REG.items()}
    # texture energy: high-pass std inside owl
    m = (blur(s, 3) > 80)
    hpR = (R - blur(R, 3))[m].std(); hpS = (s - blur(s, 3))[m].std()
    rows.append(dict(f=f, t=t, mae=round(float(mae), 2), iou=round(float(iou), 3), best=best, meanR=round(float(R.mean()), 1), meanS=round(float(s.mean()), 1), hpR=round(float(hpR), 1), hpS=round(float(hpS), 1), **reg))
keys = list(rows[0].keys())
print(' '.join(k[:7].rjust(7) for k in keys))
for r in rows: print(' '.join(str(r[k])[:7].rjust(7) for k in keys))
json.dump(rows, open(out + '-ana.json', 'w'))
