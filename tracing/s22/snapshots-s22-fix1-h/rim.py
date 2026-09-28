# rim.py: the torn rim's centre-line measured on the source (82.64-84.0), per column/row, where no card/owl covers it
import sys, re, cv2, numpy as np, json
sys.path.insert(0, '.')
from run import src, gray
txt = open('../../src/shots/s22.js').read()
CARD = eval(re.search(r'const CARD = (\[.*?\]);', txt, re.S).group(1).replace('\n', ''))
def card_at(F):
    t = F / 25; r = CARD[0]
    for k in CARD:
        if k[0] <= t + 0.005: r = k
    v = r[1:]; return np.array([[v[0], v[1]], [v[2], v[3]], [v[4], v[5]], [v[6], v[7]]], np.float32)
Fs = list(range(2066, 2101))
stack = []; masks = []
for F in Fs:
    g = cv2.GaussianBlur(gray(src(F)), (0, 0), 0.8)
    m = np.zeros(g.shape, np.uint8)
    cv2.fillPoly(m, [np.round(card_at(F)).astype(np.int32)], 1)
    m = cv2.dilate(m, np.ones((15, 15), np.uint8))
    stack.append(g); masks.append(m > 0)
S = np.stack(stack); M = np.stack(masks)
Sm = np.where(M, np.nan, S)
med = np.nanmedian(Sm, 0)
np.save('../s22-p4-meas/rim_med.npy', med)
cv2.imwrite('../s22-p4-meas/rim_med.png', np.nan_to_num(med, nan=0).clip(0, 255).astype(np.uint8))
def ridge(prof, lo):
    p = np.nan_to_num(prof, nan=0)
    i = int(np.argmax(p))
    if p[i] < 90: return None, p[i]
    # sub-pixel: centroid of the part above half max
    j0, j1 = i, i
    while j0 > 0 and p[j0 - 1] > 0.5 * p[i]: j0 -= 1
    while j1 < len(p) - 1 and p[j1 + 1] > 0.5 * p[i]: j1 += 1
    w = p[j0:j1 + 1] - 0.5 * p[i]; c = (np.arange(j0, j1 + 1) * w).sum() / max(1e-6, w.sum())
    return lo + c, (j1 - j0 + 1)
res = {'top': [], 'bot': [], 'left': [], 'right': []}
for x in range(196, 1976):
    y, w = ridge(med[170:202, x], 170); res['top'].append([x, None if y is None else round(float(y), 2), float(w)])
    y, w = ridge(med[346:378, x], 346); res['bot'].append([x, None if y is None else round(float(y), 2), float(w)])
for y in range(186, 360):
    x, w = ridge(med[y, 180:208], 180); res['left'].append([y, None if x is None else round(float(x), 2), float(w)])
    x, w = ridge(med[y, 1962:1992], 1962); res['right'].append([y, None if x is None else round(float(x), 2), float(w)])
json.dump(res, open('../s22-p4-meas/rim.json', 'w'))
for k, v in res.items():
    ok = [r for r in v if r[1] is not None]
    print(k, len(v), 'found', len(ok), 'mean pos', np.mean([r[1] for r in ok]).round(2), 'std', np.std([r[1] for r in ok]).round(2), 'width', np.median([r[2] for r in ok]))
