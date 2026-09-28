import cv2, numpy as np, re, sys, os
ROOT = '/Users/computer/rootline/apprentice-film'
sys.path.insert(0, ROOT + '/src/shots/s02/trace')
import invgrade as ig
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
W, H = 2206, 946
cam = open(ROOT + '/src/shots/s02/cam.js').read()
CAM0 = int(re.search(r'CAM0 = (\d+)', cam).group(1)); CAM = [float(v) for v in re.search(r'CAM = \[(.*?)\]', cam, re.S).group(1).split(',')]
def off(f):
    if f < CAM0: return (0.0, 0.0)
    i = min(len(CAM) // 2 - 1, f - CAM0); return (CAM[2 * i], CAM[2 * i + 1])
def pandir(f):
    for k in range(f, max(CAM0, f - 4), -1):
        a, b = off(k - 1), off(k); d = np.hypot(b[0] - a[0], b[1] - a[1])
        if d > 0.8: return ((b[0] - a[0]) / d, (b[1] - a[1]) / d)
    a, b = off(f), off(f + 1); d = np.hypot(b[0] - a[0], b[1] - a[1])
    return ((b[0] - a[0]) / d, (b[1] - a[1]) / d) if d > 0.8 else (0.0, 0.0)
SRC = ROOT + '/snapshots/s02-fix1r-src'
_cache = {}
def srcpath(f):
    for e in ('png', 'webp'):
        p = f'{SRC}/{f:04d}.{e}'
        if os.path.exists(p): return p
    return None
def frame(f, gray=True):
    p = srcpath(f)
    if p is None:
        extract([f]); p = srcpath(f)
    im = cv2.imread(p)
    return cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255 if gray else im
def paint(f): return ig.paint_of(frame(f), f / 25)
def extract(fs):
    need = [f for f in fs if srcpath(f) is None]
    if not need: return
    cap = cv2.VideoCapture(V); i = 0; mx = max(need); ns = set(need)
    while i <= mx:
        ok, im = cap.read()
        if not ok: break
        if i in ns: cv2.imwrite(f'{SRC}/{i:04d}.webp', im, [cv2.IMWRITE_WEBP_QUALITY, 101])
        i += 1
def smear(img, L, d):
    if L < 1: return img
    n = int(np.ceil(L)) + 3; n += (n + 1) % 2; k = np.zeros((n, n), np.float32); c = n // 2
    N = max(8, int(L * 4))
    for j in range(N):
        u = (j / (N - 1) - 0.5) * L; x, y = c + d[0] * u, c + d[1] * u
        x0, y0 = int(np.floor(x)), int(np.floor(y)); fx, fy = x - x0, y - y0
        for dx, dy, w in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
            k[y0 + dy, x0 + dx] += w
    k /= k.sum(); return cv2.filter2D(img, -1, k, borderType=cv2.BORDER_REFLECT)
def blur(img, L, d, s):
    o = smear(img, L, d)
    return cv2.GaussianBlur(o, (0, 0), s) if s > 0.05 else o
def shift(img, dx, dy, border=0):
    M = np.float32([[1, 0, dx], [0, 1, dy]]); return cv2.warpAffine(img, M, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR, borderValue=border)
def rd(p, flag=cv2.IMREAD_COLOR):
    # read p (.png or .webp, whichever exists)
    base = p.rsplit('.', 1)[0]
    for e in ('.png', '.webp'):
        if os.path.exists(base + e): return cv2.imread(base + e, flag)
    return None
def src(f, flag=cv2.IMREAD_COLOR): return rd(f'{SRC}/{f:04d}.png', flag)
