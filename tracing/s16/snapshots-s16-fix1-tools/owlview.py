# owlview.py n -> image: source crop | D regions coloured by level over the source (grey) | L raster
import sys, json, cv2, numpy as np; sys.path.insert(0, '.')
import h16
O = json.load(open('../s16-fix1-work/owl2_data.json'))
n = int(sys.argv[1]); d = O[str(n)]
x0, y0, x1, y1 = d['box']; pad = 10; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad
S = 4
def rings(img, item, val, off=(0, 0)):
    ps = [np.round((np.array(r).reshape(-1, 2) - [x0, y0]) * S * 1).astype(np.int32) for r in item[1:]]
    m = np.zeros(img.shape[:2], np.uint8)
    for p in ps: 
        t = np.zeros_like(m); cv2.fillPoly(t, [p], 1, shift=0); m ^= t
    return m
w, h = (x1 - x0), (y1 - y0)
src = h16.src(n)[y0:y1, x0:x1]
big = cv2.resize(src, (w * S, h * S), interpolation=cv2.INTER_CUBIC)
g = cv2.cvtColor(cv2.cvtColor(big, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR) // 2
cols = [(0, 0, 255), (0, 128, 255), (0, 255, 255), (0, 255, 0), (255, 255, 0), (255, 0, 0), (255, 0, 255), (128, 0, 128)] * 4
over = g.copy()
for i, it in enumerate(d.get('D', [])):
    m = rings(over, it, 0)
    over[m > 0] = (0.5 * over[m > 0] + 0.5 * np.array(cols[i % len(cols)])).astype(np.uint8)
# silhouette
sil = rings(over, [0] + d['sil'], 0)
cs, _ = cv2.findContours(sil, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
cv2.drawContours(over, cs, -1, (255, 255, 255), 1)
sc = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
out = np.hstack([big, over]); out = cv2.resize(out, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
cv2.imwrite(sys.argv[3] if len(sys.argv) > 3 else f'../s16-fix1-crops/ov{n}.jpg', out)
