# rasterize a shape-set export (e.g. PAN_OUT in panInk.js) to a float image: shapes [v*1000, nRings, len, x0, y0, dx, dy..]
import re, json, numpy as np, cv2
def load_arrays(path, name):
    s = open(path).read()
    i = s.index('export const ' + name + ' = ') + len('export const ' + name + ' = ')
    j = s.index('\n];', i) + 3
    return json.loads(s[i:j - 1])
def raster(levels, w, h, scale=1.0, ox=0.0, oy=0.0, paper=0.0, half=True, div=1000):
    img = np.full((h, w), paper, np.float32)
    for lev in levels:
        for sh in lev:
            v = sh[0] / div; nr = sh[1]; i = 2; rings = []
            for r in range(nr):
                n = sh[i]; i += 1; x, y = sh[i], sh[i + 1]; i += 2; pts = [(x, y)]
                for k in range(1, n): x += sh[i]; y += sh[i + 1]; i += 2; pts.append((x, y))
                pts = np.array(pts, np.float64)
                if half: pts = (pts + 0.5) / 2
                rings.append(np.round((pts * scale + [ox, oy]) * 4).astype(np.int32))
            m = np.zeros((h, w), np.uint8)
            for q in rings:
                t = np.zeros((h, w), np.uint8); cv2.fillPoly(t, [q], 1, lineType=cv2.LINE_8, shift=2); m ^= t
            img[m > 0] = v
    return img
