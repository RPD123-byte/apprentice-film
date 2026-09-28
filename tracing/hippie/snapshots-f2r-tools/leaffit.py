# Heart leaves as primitives (measurement): green regions bounded by ink -> [cx, cy, length, width, tipAngle, ink]
# Usage: leaffit.py x0,y0,x1,y1 [--min 60] [--dbg out.png]
import sys, json, numpy as np, cv2
a = sys.argv
x0, y0, x1, y1 = [int(v) for v in a[1].split(',')]
opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
amin = opt('--min', 60)
im = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-pre.png')
c = im[y0:y1, x0:x1]
hsv = cv2.cvtColor(c, cv2.COLOR_BGR2HSV).astype(int)
H, S, V = hsv[..., 0] * 2, hsv[..., 1], hsv[..., 2]
green = ((H >= 55) & (H <= 150) & (S > opt('--smin', 55)) & (V > opt('--vmin', 55))).astype(np.uint8)
green = cv2.morphologyEx(green, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
n, lb, st, cen = cv2.connectedComponentsWithStats(green, connectivity=4)
res = []; dbg = c.copy()
for i in range(1, n):
    if st[i, 4] < amin: continue
    m = (lb == i).astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cnt = max(cs, key=cv2.contourArea)
    if len(cnt) < 6: continue
    ys, xs = np.nonzero(m); pts = np.stack([xs, ys], 1).astype(np.float32)
    mu = pts.mean(0); C = np.cov((pts - mu).T); w, v = np.linalg.eigh(C)
    ax = v[:, 1]  # major axis
    proj = (pts - mu) @ ax; perp = (pts - mu) @ v[:, 0]
    lo, hi = np.percentile(proj, 1), np.percentile(proj, 99)
    L = hi - lo; Wd = np.percentile(perp, 99) - np.percentile(perp, 1)
    # tip = narrower end: width in the outer 25 % at each end
    def width(sel): return (np.percentile(perp[sel], 95) - np.percentile(perp[sel], 5)) if sel.sum() > 5 else 0
    wl = width(proj < lo + 0.25 * L); wh = width(proj > hi - 0.25 * L)
    d = ax if wh < wl else -ax
    # the heart's notch (the stem end) is its deepest convexity defect near one end of the axis
    hull = cv2.convexHull(cnt, returnPoints=False)
    try:
        df = cv2.convexityDefects(cnt, hull)
    except cv2.error:
        df = None
    if df is not None and len(df):
        k = int(np.argmax(df[:, 0, 3])); depth = df[k, 0, 3] / 256
        if depth > 2.0:
            fp = cnt[df[k, 0, 2], 0].astype(np.float32)
            t = (fp - mu) @ ax
            if abs(t) > 0.15 * L: d = -ax if t > 0 else ax
    ang = float(np.arctan2(d[1], d[0]))
    ctr = mu + ax * (lo + hi) / 2
    col = np.median(c[m > 0], axis=0).astype(int)[::-1]
    # darker/lighter half (two-tone leaves): colour on either side of the axis
    left = perp < 0
    c1 = np.median(c[ys[left], xs[left]], axis=0).astype(int)[::-1] if left.sum() > 5 else col
    c2 = np.median(c[ys[~left], xs[~left]], axis=0).astype(int)[::-1] if (~left).sum() > 5 else col
    res.append([round(float(ctr[0] + x0), 1), round(float(ctr[1] + y0), 1), round(float(L), 1), round(float(Wd), 1), round(ang, 2),
                '#%02x%02x%02x' % tuple(col), int(st[i, 4]), round(abs(wl - wh) / max(1, max(wl, wh)), 2)])
    p0 = ctr; p1 = ctr + d * L / 2
    cv2.arrowedLine(dbg, tuple(int(v) for v in p0), tuple(int(v) for v in p1), (0, 0, 255), 1, tipLength=0.3)
    cv2.drawContours(dbg, [cnt], -1, (0, 255, 0), 1)
print(json.dumps(res))
print(f"// {len(res)} leaves", file=sys.stderr)
if '--dbg' in a: cv2.imwrite(a[a.index('--dbg') + 1], cv2.resize(dbg, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST))
