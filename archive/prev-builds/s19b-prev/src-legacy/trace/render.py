# Python twin of the JS room renderer (s19/roomtrace.js), used to judge a trace before exporting it.
# Coordinates are canvas coordinates (pixel i spans [i, i+1]).
# base: [[level, rings...]] filled ascending (even-odd); dark strokes: darken; bright strokes: lighten.
import numpy as np, cv2
SH = 3; K = 1 << SH; SS = 3   # supersampling factor (cv2's AA polygons are ~1 px too fat, so fill hard and downsample)
def seg_quads(st):
    q = []
    for i in range(len(st) - 1):
        x0, y0, w0, v0 = st[i]; x1, y1, w1, v1 = st[i + 1]
        dx, dy = x1 - x0, y1 - y0; d = np.hypot(dx, dy) or 1; nx, ny = -dy / d, dx / d
        q.append(([[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]], (v0 + v1) / 2))
    return q
def draw_strokes(img, strokes, mode, taper=True):
    # quantise values to 64 groups like the JS side; per group one mask, then lighten/darken into img
    groups = {}
    for st in strokes:
        n = len(st)
        pts = []
        for i, (x, y, w, v) in enumerate(st):
            u = i / max(1, n - 1)
            f = (0.7 + 0.3 * np.sin(np.pi * u) ** 0.5) if taper else 1.0
            pts.append((x, y, max(0.6, w * f), v))
        for quad, v in seg_quads(pts):
            groups.setdefault(int(round(v * 63)), []).append(np.array(quad))
        # round joints only where the spine turns sharply (elsewhere adjacent quads meet cleanly)
        for i in range(1, len(pts) - 1):
            ax, ay = pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]; bx, by = pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]
            ca = (ax * bx + ay * by) / ((np.hypot(ax, ay) * np.hypot(bx, by)) or 1)
            if ca < 0.7:
                x, y, w, v = pts[i]; groups.setdefault(int(round(v * 63)), []).append(('c', x, y, w / 2))
    H, W = img.shape
    for g, items in groups.items():
        m = np.zeros((H * SS, W * SS), np.uint8)
        # one call per quad: cv2.fillPoly with several polygons is even-odd (overlaps would cancel); canvas is nonzero
        for it in items:
            if not isinstance(it, tuple): cv2.fillConvexPoly(m, np.round((it * SS - 0.5) * K).astype(np.int32), 255, cv2.LINE_8, shift=SH)
        for it in items:
            if isinstance(it, tuple): cv2.circle(m, (int(round((it[1] * SS - 0.5) * K)), int(round((it[2] * SS - 0.5) * K))), int(round(it[3] * SS * K)), 255, -1, cv2.LINE_8, shift=SH)
        a = cv2.resize(m, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255; v = g / 63
        if mode == 'lighten': img[:] = np.maximum(img, img * (1 - a) + v * a)
        else: img[:] = np.minimum(img, img * (1 - a) + v * a)
    return img
def draw_base(img, base):
    H, W = img.shape
    for level, rings in base:
        m = np.zeros((H * SS, W * SS), np.uint8)
        # even-odd: XOR each ring (pixel centres: ring vertices are pixel coordinates of the contour)
        for r in rings:
            t = np.zeros_like(m); cv2.fillPoly(t, [np.round((np.array(r, float) * SS - 0.5) * K).astype(np.int32)], 1, cv2.LINE_8, shift=SH); m ^= t
        m = cv2.resize(m * 255, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
        img[:] = img * (1 - m) + level * m
    return img
PSF = 0.6
def render(data, shape=(946, 2206), psf=None):
    img = np.zeros(shape, np.float32)
    draw_base(img, data.get('base', []))
    draw_strokes(img, data.get('dark', []), 'darken')
    draw_strokes(img, data.get('bright', []), 'lighten')
    s = PSF if psf is None else psf
    return cv2.GaussianBlur(img, (0, 0), s) if s > 0 else img
