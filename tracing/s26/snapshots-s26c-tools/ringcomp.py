import cv2, numpy as np, json, sys
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
F = 2818
src = cv2.imread(f'{M}/src/{F}.png'); st = cv2.imread(f'{M}/stageA.png')
our = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s26c-out/pages/r2500.png')   # bwPlain (raw)
cells = json.load(open(f'{M}/ringcells.json')); res = json.load(open(f'{M}/ringmatch_2818_stageA.json'))
H, W = src.shape[:2]
A = np.zeros_like(src); B = np.zeros_like(src); Cold = np.zeros_like(src)
for k, c in enumerate(cells):
    P = np.array(c['p'], np.float32).reshape(-1, 2).astype(np.int32)
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [P], 255)
    v = res.get(str(k))
    if c['lab'] == 1:
        A[m > 0] = B[m > 0] = Cold[m > 0] = c['M'][:3][::-1]; continue
    Mo = np.array(c['M'], np.float64).reshape(2, 3)
    Cold[m > 0] = cv2.warpAffine(our, Mo, (W, H))[m > 0]
    if v and v[2] is not None:
        Mn = np.array(v[2], np.float64).reshape(2, 3)
        A[m > 0] = cv2.warpAffine(st, Mn, (W, H))[m > 0]
        B[m > 0] = cv2.warpAffine(our, Mn, (W, H))[m > 0]
cv2.imwrite(f'{M}/ringcomp.jpg', cv2.resize(np.vstack([np.hstack([src, A]), np.hstack([B, Cold])]), None, fx=0.4, fy=0.4))
lab = lambda im: cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), 8), cv2.COLOR_BGR2LAB)
allm = np.zeros((H, W), np.uint8)
for c in cells: cv2.fillPoly(allm, [np.array(c['p'], np.float32).reshape(-1, 2).astype(np.int32)], 255)
for n, X in [('stage-new', A), ('our-new', B), ('our-old', Cold)]:
    d = np.sqrt(((lab(X) - lab(src)) ** 2).sum(2)); print(n, 'dE8 in cells', round(float(d[allm > 0].mean()), 2))
