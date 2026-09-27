# F owl: sub-pixel translation of every frame k24..53 relative to k53 (template = head/body of k53)
import sys, json; sys.path.insert(0, '.')
from common import *
ref = U(53)
x0, y0, x1, y1 = 930, 150, 1400, 620      # head + chest at k53
T = ref[y0:y1, x0:x1]
out = {}
guess = (0.0, 0.0)
for k in range(53, 23, -1):          # walk back from k53, each frame searched around the previous result
    dx0, dy0 = guess
    u = U(k)
    m = 40
    X0 = int(round(x0 + dx0)) - m; Y0 = int(round(y0 + dy0)) - m
    sx0, sy0 = max(0, X0), max(0, Y0)
    R = u[sy0:min(946, Y0 + (y1 - y0) + 2 * m), sx0:min(2206, X0 + (x1 - x0) + 2 * m)]
    r = cv2.matchTemplate(R, T[:min(T.shape[0], R.shape[0] - 1), :min(T.shape[1], R.shape[1] - 1)], cv2.TM_CCOEFF_NORMED)
    _, mx, _, (px, py) = cv2.minMaxLoc(r)
    def sub(a, b, c): d = a - 2 * b + c; return 0 if d == 0 else 0.5 * (a - c) / d
    fx = sub(r[py, px - 1], r[py, px], r[py, px + 1]) if 0 < px < r.shape[1] - 1 else 0
    fy = sub(r[py - 1, px], r[py, px], r[py + 1, px]) if 0 < py < r.shape[0] - 1 else 0
    dx = sx0 + px + fx - x0; dy = sy0 + py + fy - y0
    out[k] = [round(dx, 2), round(dy, 2), round(mx, 4)]
    guess = (dx + (dx - dx0) * 0.0, dy)
    print(k, out[k])
json.dump(out, open('ftrack.json', 'w'))
