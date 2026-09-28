# end-s27-tfix: read / rasterize the s27 trace format (REGIONS: [colour, outer, ...holes]; INK: [colour, [outer, ...holes], ...];
# polygons frame px x2, codec strings as in src/shots/s27/codec.js). Measurement helper, not part of the film.
import re, json, cv2, numpy as np
def dec(s):
    if isinstance(s, list): return s
    vals = []; z = sh = 0
    for ch in s:
        b = ord(ch) - 63; z |= (b & 31) << sh; sh += 5
        if b < 32: vals.append((z >> 1) if not (z & 1) else -((z + 1) >> 1)); z = sh = 0
    out = []; px = py = 0
    for i in range(0, len(vals), 2): px += vals[i]; py += vals[i + 1]; out += [px, py]
    return out
def enc(a):
    out = []; px = py = 0
    for i in range(0, len(a), 2):
        for v, p in ((a[i], px), (a[i + 1], py)):
            d = v - p; z = (d << 1) if d >= 0 else ((-d) << 1) - 1
            while z >= 32: out.append(chr((32 | (z & 31)) + 63)); z >>= 5
            out.append(chr(z + 63))
        px, py = a[i], a[i + 1]
    return ''.join(out)
def load_js(path):
    txt = open(path).read(); out = {}
    for m in re.finditer(r'export const (\w+) = (.*?);\n', txt, re.S): out[m.group(1)] = json.loads(m.group(2))
    return out
def hexc(c): return (int(c[5:7], 16), int(c[3:5], 16), int(c[1:3], 16))
def raster(REG, INK, W=2206, H=946, x0=0, y0=0, S=2, ink=True):
    """BGR uint8 raster of a trace (frame px), supersampled S x. Regions are painted largest first (as the trace lists
    them), so a region's holes are covered by the regions inside them; outer rings only."""
    img = np.zeros((H * S, W * S, 3), np.uint8)
    sh = 4
    def pts(p): a = np.array(dec(p), np.float64).reshape(-1, 2) / 2; return np.int32(np.round((a - [x0, y0]) * S * (1 << sh)))
    for r in REG:
        P = [pts(p) for p in r[1:]]
        cv2.fillPoly(img, P[:1], hexc(r[0]), cv2.LINE_8, sh); cv2.polylines(img, P, True, hexc(r[0]), max(1, int(round(1.2 * S))), cv2.LINE_8, sh)
    if ink:
        for grp in INK:
            m = np.zeros((H * S, W * S), np.uint8)
            for q in grp[1:]:
                o = pts(q[0]); x, y, w, h = cv2.boundingRect(o >> sh)
                cv2.fillPoly(m, [pts(p) for p in q], 1, cv2.LINE_8, sh)
            img[m > 0] = hexc(grp[0])
    return cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)
