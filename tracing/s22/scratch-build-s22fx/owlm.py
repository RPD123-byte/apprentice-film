import cv2, numpy as np, sys, re, json
# owlm.py rdir F1,F2,...   metrics of the cut-drawing owl: render vs source inside the source silhouette
fr = np.load('../s22/frames.npy', mmap_mode='r')
src = open('/Users/computer/rootline/apprentice-film/src/shots/s22.js').read()
def table(name):
    m = re.search(r'const ' + name + r' = (\[\[.*?\]\]);', src, re.S)
    return json.loads(m.group(1))
T = {k: table(k) for k in ['TOP_CUP', 'RIGHT_CUP', 'BOT_CUP', 'LEFT_CUP']}
def hold(keys, t):
    r = keys[0]
    for k in keys:
        if k[0] <= t + 0.005: r = k
        else: break
    return r[1:]
def state(t):
    if t < 76.54: return 0, hold(T['TOP_CUP'], t)
    if t < 77.46: return 1, hold(T['RIGHT_CUP'], t)
    if t < 79.22: return 2, hold(T['BOT_CUP'], t)
    return 3, hold(T['LEFT_CUP'], t)
R = [[1, 0, 0, 1], [0, 1, -1, 0], [-1, 0, 0, -1], [0, -1, 1, 0]]
M0 = cv2.imread('cut_mask.png', 0).astype(np.float32) / 255
def maskAt(side, cup):
    a, b, c, d = R[side]
    # frame = cup + [[a c],[b d]] @ local ; local = crop - (115,60)
    A = np.array([[a, c, 0], [b, d, 0]], np.float32)
    A[:, 2] = np.array(cup) - A[:, :2] @ np.array([115, 60])
    return cv2.warpAffine(M0, A, (2206, 946), flags=cv2.INTER_LINEAR) > 0.5
def g(im): return im.astype(np.float32).mean(axis=2)
rd = sys.argv[1]
rows = []
for F in map(int, sys.argv[2].split(',')):
    t = F / 25; side, cup = state(t)
    m = maskAt(side, cup)
    a = g(__import__('rmap').rimg(F)); b = g(np.array(fr[F - 1863]))
    md = cv2.dilate(m.astype(np.uint8), np.ones((9, 9))) > 0; me = cv2.erode(m.astype(np.uint8), np.ones((5, 5))) > 0
    e3 = np.abs(cv2.GaussianBlur(a, (0, 0), 3) - cv2.GaussianBlur(b, (0, 0), 3))[md].mean()
    hp = lambda x: (x - cv2.GaussianBlur(x, (0, 0), 3))[me].std()
    pa, pb = np.percentile(a[me], [10, 50, 90]), np.percentile(b[me], [10, 50, 90])
    ring = (cv2.dilate(m.astype(np.uint8), np.ones((41, 41))) > 0) & ~md
    hr = (a[ring].mean() - b[ring].mean())
    rows.append((t, side, e3, hp(a), hp(b), pa, pb, hr))
    print('%.2f s%d  e3 %.1f  hp %.1f/%.1f  p10/50/90 R %s S %s  halo %+.1f' % (t, side, e3, hp(a), hp(b), np.round(pa).astype(int), np.round(pb).astype(int), hr))
print('mean e3 %.2f' % np.mean([r[2] for r in rows]))
