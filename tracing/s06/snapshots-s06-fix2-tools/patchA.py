#!/usr/bin/env python3
# measure the smile hair patch at the left brow's inner end (fix pass 2, defect 1): transition amount per frame and
# the pale strand ridges of the held smile (measurement only; prints numbers)
import json, sys
from util import *
P = [(806,178),(800,188),(794,197),(788,205),(782,212),(776,220),(771,228),(767,236),(765,243),(784,243),(792,233),(798,223),(804,213),(810,203),(816,193),(821,183),(818,175)]
H, W = 946, 2206
mask = np.zeros((H, W), np.uint8); cv2.fillPoly(mask, [np.array(P, np.int32)], 1); m = mask.astype(bool)
S = smean(712, 725); N = smean(668, 677)
if 'ramp' in sys.argv:
    s1 = cv2.GaussianBlur(S, (0,0), 1); n1 = cv2.GaussianBlur(N, (0,0), 1); dS = (s1 - n1)[m]
    out = {}
    for n in range(668, 726):
        f = cv2.GaussianBlur(src(n), (0,0), 1)[m]
        out[n] = round(float(np.dot(f - n1[m], dS) / np.dot(dS, dS)), 3)
    print(json.dumps(out))

def ridges(A, m, thr=70, prom=25, link=2.2):
    # per-row bright peaks (sub-pixel), linked row to row into chains; each point: x, y, peak, ground, fwhm_x
    H_, W_ = A.shape; ys, xs = np.nonzero(m); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    rows = {}
    for y in range(y0, y1 + 1):
        r = A[y]; pk = []
        for x in range(max(x0, 2), min(x1, W_ - 3) + 1):
            if not m[y, x]: continue
            if r[x] >= r[x-1] and r[x] > r[x+1] and r[x] > thr:
                # ground: min within 4 px each side
                gl = r[x-4:x].min(); gr = r[x+1:x+5].min(); g = max(gl, gr)
                if r[x] - g < prom: continue
                a, b, c = r[x-1], r[x], r[x+1]; den = a - 2*b + c; off = 0.5 * (a - c) / den if den != 0 else 0
                half = g + (r[x] - g) / 2
                # fwhm by linear interpolation left and right
                xl = x
                while xl > x - 6 and r[xl] > half: xl -= 1
                xl = xl + (half - r[xl]) / (r[xl+1] - r[xl] + 1e-6)
                xr = x
                while xr < x + 6 and r[xr] > half: xr += 1
                xr = xr - (half - r[xr]) / (r[xr-1] - r[xr] + 1e-6)
                pk.append([x + off, y, float(r[x]), float(g), float(xr - xl)])
        rows[y] = pk
    chains = []; open_ = []
    for y in range(y0, y1 + 1):
        nxt = []
        used = set()
        for ch in open_:
            px = ch[-1][0] + (ch[-1][0] - ch[-2][0] if len(ch) > 1 else 0)
            best = None
            for i, p in enumerate(rows[y]):
                if i in used: continue
                d = abs(p[0] - px)
                if d <= link and (best is None or d < best[0]): best = (d, i)
            if best: used.add(best[1]); ch.append(rows[y][best[1]]); nxt.append(ch)
            else: chains.append(ch)
        for i, p in enumerate(rows[y]):
            if i not in used: nxt.append([p])
        open_ = nxt
    chains += open_
    return [c for c in chains if len(c) >= 5]
if 'ridges' in sys.argv:
    for nm, A in (('S', S), ('N', N)):
        C = ridges(A, m)
        print(nm, len(C))
        for c in C:
            print(' len %d  (%.1f,%d)->(%.1f,%d) peak %d ground %d fwhm %.1f' % (len(c), c[0][0], c[0][1], c[-1][0], c[-1][1], np.mean([p[2] for p in c]), np.mean([p[3] for p in c]), np.mean([p[4] for p in c])))
if 'export' in sys.argv:
    sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s06/trace'); import grade
    vig = grade.vignette()
    C = ridges(S, m); out = []
    for c in C:
        pts = []
        for i, p in enumerate(c):
            if i % 2 and i != len(c) - 1: continue
            x, y, pk, g, fw = p
            # perpendicular width: fwhm along the row times |cos| of the chain's angle to the row normal
            j0, j1 = max(0, i - 2), min(len(c) - 1, i + 2); dx = c[j1][0] - c[j0][0]; dy = c[j1][1] - c[j0][1]
            cosn = abs(dy) / max(1e-6, np.hypot(dx, dy))
            v = float(grade.inv_scurve(np.array([pk / 255 / vig[y, int(x)]]))[0])
            gg = float(grade.inv_scurve(np.array([g / 255 / vig[y, int(x)]]))[0])
            pts += [round(x, 1), y, round(fw * cosn, 2), round(v, 3), round(gg, 3)]
        out.append(pts)
    print(json.dumps(out))
