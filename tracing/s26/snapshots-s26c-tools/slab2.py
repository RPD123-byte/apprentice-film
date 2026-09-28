import cv2, numpy as np, json
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
out = {}; vis = []
for F in range(2841, 2856):
    s = cv2.imread(f'{M}/src/{F}.png'); p = cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s26c-out/pagesE/r{F}.png')
    lab = lambda im: cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), 6), cv2.COLOR_BGR2LAB)
    dE = np.sqrt(((lab(s) - lab(p)) ** 2).sum(2))
    hsv = cv2.cvtColor(cv2.GaussianBlur(s, (0, 0), 3), cv2.COLOR_BGR2HSV)
    g = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY).astype(np.float32)
    hf = cv2.GaussianBlur(np.abs(g - cv2.GaussianBlur(g, (0, 0), 2)), (0, 0), 8)
    m = ((dE > 14) & (hsv[..., 1] < 90) & (hf < 4.0)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((11, 11), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((31, 31), np.uint8))
    n, labm, st, cen = cv2.connectedComponentsWithStats(m)
    if n < 2: continue
    i = 1 + np.argmax(st[1:, 4]); mk = (labm == i).astype(np.uint8)
    cs, _ = cv2.findContours(mk, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea); hull = cv2.convexHull(c)
    ap = cv2.approxPolyDP(hull, 12, True).reshape(-1, 2)
    out[F] = {'area': int(st[i, 4]), 'poly': ap.tolist()}
    ov = s.copy(); ov[mk > 0] = (0.5 * ov[mk > 0] + [0, 0, 120]).astype(np.uint8)
    cv2.polylines(ov, [ap.astype(np.int32)], True, (0, 255, 255), 3)
    cv2.putText(ov, str(F), (10, 60), 0, 2, (0, 255, 255), 3)
    vis.append(cv2.resize(ov, (551, 236)))
    print(F, st[i, 4], ap.tolist())
json.dump(out, open(f'{M}/slab2.json', 'w'))
while len(vis) % 3: vis.append(np.zeros_like(vis[0]))
cv2.imwrite(f'{M}/slab_masks2.jpg', np.vstack([np.hstack(vis[i:i + 3]) for i in range(0, len(vis), 3)]))
