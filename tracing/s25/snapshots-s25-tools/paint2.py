#!/usr/bin/env python3
# paint2.py NAME [x0 y0 x1 y1 scale] -- python mirror of the JS painter for a pose-NAME.json (pre-grade values) over
# the ungraded source frame's surroundings; writes ../s25-meas/p2-NAME.jpg (paint | source) and prints the
# figure error (mean |diff| inside the hull, sigma 1 and sigma 4, /255)
import cv2, numpy as np, json, sys
from extract2 import pre
def paint(d, shape, ss=4):
    H, W = shape
    img = np.zeros((H * 1, W * 1), np.float32)
    sh = 3
    def fill(dst, ps, v, rule_evenodd=True):
        m = np.zeros(dst.shape, np.uint8)
        cv2.fillPoly(m, [np.round(np.array(q) * 8).astype(np.int32) for q in ps], 1, cv2.LINE_AA if False else cv2.LINE_8, shift=sh)
        return m
    hull = np.zeros(shape, np.uint8)
    cv2.fillPoly(hull, [np.round(np.array(q) * 8).astype(np.int32) for q in d['hull']], 1, cv2.LINE_8, shift=sh)
    img[hull > 0] = d['base']
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    for q in d['parts']:
        m = np.zeros(shape, np.uint8)
        for r in q['p']:  # even-odd: XOR the rings
            mm = np.zeros(shape, np.uint8); cv2.fillPoly(mm, [np.round(np.array(r) * 8).astype(np.int32)], 1, cv2.LINE_8, shift=sh); m ^= mm
        t = q['t']
        if t is None: continue
        if len(t) == 7 and q.get('tier') == 0: img[m > 0] = t[0]; continue
        a, bx, by, cx, cy, rim, rw = t
        v = a + bx * (xx - cx) / 100 + by * (yy - cy) / 100
        if rim > 0:
            dd = cv2.distanceTransform(m, cv2.DIST_L2, 5)
            v = v - rim * np.exp(-dd / rw)
        img[m > 0] = np.clip(v[m > 0], 0, 1)
    for s in d['ink']:
        m = np.zeros(shape, np.uint8)
        for r in s['p']:
            mm = np.zeros(shape, np.uint8); cv2.fillPoly(mm, [np.round(np.array(r) * 8).astype(np.int32)], 1, cv2.LINE_8, shift=sh); m ^= mm
        img[m > 0] = s['v']
    for l in d.get('lines', []):
        p = np.array(l['p']).reshape(-1, 2)
        m = np.zeros(shape, np.uint8)
        cv2.polylines(m, [np.round(p * 8).astype(np.int32)], False, 1, max(1, int(round(l['w']))), cv2.LINE_AA, shift=3)
        img[m > 0] = l['v']
    for (cx, cy, a, b, ang, v) in d.get('dots', []):
        m = np.zeros(shape, np.uint8)
        cv2.ellipse(m, (int(round(cx * 8)), int(round(cy * 8))), (int(round(a * 8)), int(round(b * 8))), np.degrees(ang), 0, 360, 1, -1, cv2.LINE_AA, 3)
        img[m > 0] = v
    if d.get('edge'):
        k, sg = d['edge']
        b = cv2.GaussianBlur((1 - hull).astype(np.float32), (0, 0), sg)
        img = img * (1 - k * b)
    return img, hull
if __name__ == '__main__':
    name = sys.argv[1]
    d = json.load(open(f'../s25-meas/pose-{name}.json'))
    f = d['frame']; P = pre(f)
    img, hull = paint(d, P.shape)
    out = P.copy(); out[hull > 0] = img[hull > 0]
    out = cv2.GaussianBlur(out, (0, 0), 0.5)
    ys, xs = np.nonzero(hull)
    x0, y0, x1, y1 = (xs.min() - 20, ys.min() - 20, xs.max() + 20, ys.max() + 20) if len(sys.argv) < 7 else [int(v) for v in sys.argv[2:6]]
    x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(2206, x1), min(946, y1)
    sc = float(sys.argv[6]) if len(sys.argv) > 6 else min(1.5, 900 / (x1 - x0))
    e1 = np.abs(cv2.GaussianBlur(out, (0, 0), 1) - cv2.GaussianBlur(P, (0, 0), 1))[hull > 0].mean() * 255
    e4 = np.abs(cv2.GaussianBlur(out, (0, 0), 4) - cv2.GaussianBlur(P, (0, 0), 4))[hull > 0].mean() * 255
    print(f'{name}: figure err s1 {e1:.2f} s4 {e4:.2f}')
    a = (np.clip(out[y0:y1, x0:x1], 0, 1) * 255).astype(np.uint8); b = (np.clip(P[y0:y1, x0:x1], 0, 1) * 255).astype(np.uint8)
    im = np.hstack([a, b]); im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
    cv2.imwrite(f'../s25-meas/p2-{name}.jpg', im)
