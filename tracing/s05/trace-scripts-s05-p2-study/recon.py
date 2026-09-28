# python approximation of the JS stroke renderer, for tuning the tracer
import numpy as np, cv2
def draw_strokes(img, strokes, ss=4, wscale=1.0, order=None):
    """img: float32 HxW (0..1) modified in place (painted over). strokes: list of (n,>=4) arrays x,y,w,v"""
    H, W = img.shape
    # paint into a supersampled value+coverage buffer tile by tile would be heavy; draw directly at ss on full frame
    big = cv2.resize(img, (W*ss, H*ss), interpolation=cv2.INTER_LINEAR)
    for S in strokes:
        pts = S[:, :2] * ss; w = S[:, 2] * wscale * ss; v = S[:, 3]
        n = len(S)
        # taper ends: first/last point width * 0.5
        for k in range(n - 1):
            p0, p1 = pts[k], pts[k+1]; w0, w1 = w[k], w[k+1]
            if k == 0: w0 *= 0.6
            if k == n - 2: w1 *= 0.6
            d = p1 - p0; L = np.linalg.norm(d) + 1e-9; nn = np.array([-d[1], d[0]]) / L
            q = np.array([p0 + nn*w0/2, p1 + nn*w1/2, p1 - nn*w1/2, p0 - nn*w0/2])
            val = float((v[k] + v[k+1]) / 2)
            cv2.fillConvexPoly(big, np.round(q).astype(np.int32), val, lineType=cv2.LINE_8)
            cv2.circle(big, tuple(np.round(p1).astype(int)), int(round(w1/2)), val, -1)
    return cv2.resize(big, (W, H), interpolation=cv2.INTER_AREA)
