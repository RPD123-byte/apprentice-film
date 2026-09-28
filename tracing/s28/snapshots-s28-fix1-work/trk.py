# python port of shot.js trackMap (figure track of a key drawing): key-frame px -> frame(t) px
import json, re, numpy as np
_T = None
def tracks():
    global _T
    if _T is None:
        _T = json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s28-fix1-work/tracks.json'))
    return _T
def track(key, t, x, y):
    T = tracks()[key]; ts = sorted(float(k) for k in T['f']); tt = min(max(round(t * 25) / 25, ts[0]), ts[-1])
    r = T['f'][f'{tt:.2f}']; H = r['H']; D = r['D']; G = T['grid']
    w = H[6] * x + H[7] * y + H[8]; X = (H[0] * x + H[1] * y + H[2]) / w; Y = (H[3] * x + H[4] * y + H[5]) / w
    nx, ny = G['nx'], G['ny']
    u = min(max((x - G['x0']) / G['w'] * (nx - 1), 0), nx - 1.0001); v = min(max((y - G['y0']) / G['h'] * (ny - 1), 0), ny - 1.0001)
    i, j = int(u), int(v); fu, fv = u - i, v - j
    at = lambda a, b, c: D[(b * nx + a) * 2 + c]
    d = lambda c: (at(i, j, c) * (1 - fu) + at(i + 1, j, c) * fu) * (1 - fv) + (at(i, j + 1, c) * (1 - fu) + at(i + 1, j + 1, c) * fu) * fv
    return X + d(0), Y + d(1)
