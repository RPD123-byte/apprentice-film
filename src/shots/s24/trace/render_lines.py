import numpy as np, cv2
def render3(caps, shape=(946, 2206), ss=4, soft=0.6):
    """bars with square ends and a linear value ramp end to end, max-composited, supersampled"""
    H, W = shape
    img = np.zeros((H * ss, W * ss), np.float32)
    for x0, y0, x1, y1, w, val, va, vb in caps:
        L = np.hypot(x1 - x0, y1 - y0)
        if L < 1: continue
        d = np.array([x1 - x0, y1 - y0]) / L; n = np.array([-d[1], d[0]]) * w / 2
        P = np.array([[x0, y0] + n, [x1, y1] + n, [x1, y1] - n, [x0, y0] - n]) * ss + (ss - 1) / 2
        bx0, by0 = np.floor(P.min(0)).astype(int); bx1, by1 = np.ceil(P.max(0)).astype(int) + 1
        bx0, by0 = max(bx0, 0), max(by0, 0); bx1, by1 = min(bx1, W * ss), min(by1, H * ss)
        if bx1 <= bx0 or by1 <= by0: continue
        m = np.zeros((by1 - by0, bx1 - bx0), np.uint8)
        cv2.fillPoly(m, [np.int32(np.round((P - [bx0, by0]) * 16))], 1, cv2.LINE_8, 4)
        yy, xx = np.mgrid[by0:by1, bx0:bx1]
        t = np.clip(((xx - (x0 * ss + (ss - 1) / 2)) * d[0] + (yy - (y0 * ss + (ss - 1) / 2)) * d[1]) / (L * ss), 0, 1)
        vv = (va + (vb - va) * t).astype(np.float32)
        sub = img[by0:by1, bx0:bx1]
        np.maximum(sub, np.where(m > 0, vv, 0), out=sub)
    img = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)
    return cv2.GaussianBlur(img, (0, 0), soft) if soft else img
