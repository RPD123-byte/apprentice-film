# fitell.py FRAMES "cx,cy,rx,ry,rot,band[,a0,a1]" ... : refine an ellipse guess to the strongest edge ring near it:
# along each of 90 rays (angles a0..a1 of the guess), the position of the largest |gradient| within +-band px of the
# guess (pre-grade, sigma 1.2); an ellipse fitted to those points (outliers > 3 px dropped once). Prints the ellipse.
import sys, numpy as np, cv2
from common import *
fr = sys.argv[1]
P = cv2.GaussianBlur(srcpre(fr), (0, 0), 1.2)
gx = cv2.Sobel(P, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(P, cv2.CV_32F, 0, 1, ksize=3); G = np.hypot(gx, gy)
def samp(A, x, y): return cv2.getRectSubPix(A, (1, 1), (float(x), float(y)))[0, 0]
for spec in sys.argv[2:]:
    v = [float(x) for x in spec.split(',')]; cx, cy, rx, ry, rot, band = v[:6]; a0, a1 = (v[6], v[7]) if len(v) > 7 else (0, 2 * np.pi)
    pts = []
    for a in np.linspace(a0, a1, 90, endpoint=a1 - a0 < 6.2):
        ex, ey = rx * np.cos(a), ry * np.sin(a); px = cx + ex * np.cos(rot) - ey * np.sin(rot); py = cy + ex * np.sin(rot) + ey * np.cos(rot)
        nx, ny = px - cx, py - cy; L = np.hypot(nx, ny); nx, ny = nx / L, ny / L
        ss = np.arange(-band, band + 0.01, 0.5); g = [samp(G, px + nx * s, py + ny * s) for s in ss]
        k = int(np.argmax(g)); pts.append((px + nx * ss[k], py + ny * ss[k], g[k]))
    pts = np.array(pts, np.float32)
    pts = pts[pts[:, 2] > np.percentile(pts[:, 2], 25)]
    for it in range(2):
        (ex, ey), (w, h), ang = cv2.fitEllipse(np.ascontiguousarray(pts[:, :2], np.float32))
        # residual: distance proxy
        th = np.radians(ang); c, s = np.cos(th), np.sin(th)
        dx, dy = pts[:, 0] - ex, pts[:, 1] - ey; u = (dx * c + dy * s) / (w / 2); vv = (-dx * s + dy * c) / (h / 2); r = np.abs(np.hypot(u, vv) - 1) * (w + h) / 4
        if it == 0: pts = pts[r < 3] if (r < 3).sum() > 10 else pts
    # express as rx (along x-ish) / ry
    if w / 2 > h / 2: rx2, ry2, rot2 = h / 2, w / 2, np.radians(ang) - np.pi / 2
    else: rx2, ry2, rot2 = w / 2, h / 2, np.radians(ang)
    print(f'{{ x: {ex:.1f}, y: {ey:.1f}, rx: {rx2:.1f}, ry: {ry2:.1f}, rot: {rot2:.3f} }}  // n {len(pts)} resid {np.median(r):.2f}')
