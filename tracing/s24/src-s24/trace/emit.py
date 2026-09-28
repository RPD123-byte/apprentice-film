# JSON measurements -> compact JS literals for the film (vector data only).
import json, numpy as np
from tone import ALPH, _enc_int, encode_path
def enc_ints(vals):
    out = []
    for v in vals: _enc_int(int(v), out)
    return ''.join(out)
def tone_js(levels, q=4):
    """levels: [{v, paths}] -> JS literal {q, L: [[v, "p p p"], ...]}"""
    parts = []
    for L in levels:
        ps = ' '.join(encode_path(np.asarray(p), q) for p in L['paths'] if len(p) >= 3)
        if ps: parts.append('[%d,"%s"]' % (int(round(L['v'])), ps))
    return '{q:%d,L:[%s]}' % (q, ','.join(parts))
def lines_js(lines, q=2):
    vals = []
    for x0, y0, x1, y1, w, vv, *rest in lines:
        a = [round(x0 * q), round(y0 * q)]
        vals += [a[0], a[1], round(x1 * q) - a[0], round(y1 * q) - a[1], max(1, round(w * q)), len(vv)] + [int(np.clip(round(v), 0, 255)) for v in vv]
    return '"%s"' % enc_ints(vals)
