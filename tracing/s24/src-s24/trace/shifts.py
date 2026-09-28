import sys, json; sys.path.insert(0, '.')
from common import *
def shift(k, ref_k, box, m=30):
    ref = U(ref_k); u = U(k)
    x0, y0, x1, y1 = box
    T = ref[y0:y1, x0:x1]
    R = u[max(0, y0 - m):y1 + m, max(0, x0 - m):x1 + m]
    r = cv2.matchTemplate(R, T, cv2.TM_CCOEFF_NORMED)
    _, mx, _, (px, py) = cv2.minMaxLoc(r)
    def sub(a, b, c): d = a - 2 * b + c; return 0 if d == 0 else 0.5 * (a - c) / d
    fx = sub(r[py, px - 1], r[py, px], r[py, px + 1]) if 0 < px < r.shape[1] - 1 else 0
    fy = sub(r[py - 1, px], r[py, px], r[py + 1, px]) if 0 < py < r.shape[0] - 1 else 0
    return round(max(0, x0 - m) + px + fx - x0, 2), round(max(0, y0 - m) + py + fy - y0, 2), round(mx, 4)
if __name__ == '__main__':
    ref_k = int(sys.argv[1]); box = [int(v) for v in sys.argv[2].split(',')]
    for k in [int(a) for a in sys.argv[3:]]: print(k, shift(k, ref_k, box))
