# The gap view's light: source(t) / source(40.00) warped by the room similarity (s14.js roomSim), pre-grade values,
# blurred. Shows where and how strongly the room is lit in the gap view. gapratio.py t,t,... out.jpg
import sys, re, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
s = open(ROOT + '/src/shots/s14.js').read()
Z = eval('[' + re.search(r'const ZOOM = \[(.*?)\];', s, re.S).group(1).replace('\n', '') + ']')
Z40 = eval(re.search(r'const Z40 = (\[.*?\]);', s).group(1))
GAPC = [1515, 420]
def rowAt(t):
    r = Z[0]
    for x in Z:
        if x[0] <= t + 1e-4: r = x
    return r
def heldT(t):
    i = Z.index(rowAt(t))
    while i > 0 and Z[i - 1][1:] == Z[i][1:]: i -= 1
    return Z[i][0]
def roomSim(t):
    if t >= 38.48: t = heldT(t)
    sc, tx, ty = [1, 0, 0] if t < 38.48 else rowAt(t)[1:]
    a = sc / Z40[0]
    k = 1 + 0.03 * max(0, min(1, (39.8 - t) / 1.32))
    Q = [GAPC[0] * sc + tx, GAPC[1] * sc + ty]
    return [k * a, Q[0] * (1 - k) + k * (tx - a * Z40[1]), Q[1] * (1 - k) + k * (ty - a * Z40[2])]
def ratio(t, sig=10):
    a, bx, by = roomSim(t)
    V40 = pregrade(luma(src(40.0)), 40.0)
    M = np.float32([[a, 0, bx], [0, a, by]])
    Wp = cv2.warpAffine(V40, M, (W, H), flags=cv2.INTER_AREA if a < 1 else cv2.INTER_LINEAR)
    Vt = pregrade(luma(src(t)), t)
    num = cv2.GaussianBlur(Vt, (0, 0), sig); den = cv2.GaussianBlur(Wp, (0, 0), sig)
    R = num / np.maximum(den, 0.03)
    R[den < 0.03] = 0
    return R, den, (a, bx, by)
if __name__ == '__main__':
    ts = [float(x) for x in sys.argv[1].split(',')]
    tiles = []
    for t in ts:
        R, den, sim = ratio(t)
        im = np.clip(R / 1.2 * 255, 0, 255).astype(np.uint8)
        im = cv2.applyColorMap(im, cv2.COLORMAP_JET); im[den < 0.03] = 0
        cv2.putText(im, f'{t:.2f}', (20, 60), 0, 2, (255, 255, 255), 3)
        # contour of ratio levels
        tiles.append(cv2.resize(im, None, fx=0.4, fy=0.4))
        ys, xs = np.nonzero(den > 0.05)
        print(t, 'sim', [round(v, 4) for v in sim], 'ratio p50', round(float(np.median(R[den > 0.05])), 3), 'p90', round(float(np.percentile(R[den > 0.05], 90)), 3))
    while len(tiles) % 2: tiles.append(np.zeros_like(tiles[0]))
    cv2.imwrite(sys.argv[2], np.vstack([np.hstack(tiles[i:i + 2]) for i in range(0, len(tiles), 2)]))
