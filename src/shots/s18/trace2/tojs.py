# Encode an ink drawing (inktrace.py) as a compact JS value: masses/specks = [field, [ring strings]], strokes =
# [tone 0..255, point string (x, y in 1/4 px, width in 1/8 px, delta-coded varints)], dots = [x, y, r, v].
import numpy as np, json
AL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

def varint(n):
    z = 2 * n if n >= 0 else -2 * n - 1
    s = ''
    while True:
        c = z & 31; z >>= 5
        if z: s += AL[c | 32]
        else: s += AL[c]; break
    return s

def enc_seq(vals_list):
    """vals_list: list of tuples of ints; delta-coded per component"""
    out = []; prev = None
    for t in vals_list:
        if prev is None: out.extend(varint(v) for v in t)
        else: out.extend(varint(v - p) for v, p in zip(t, prev))
        prev = t
    return ''.join(out)

def enc_ring(R):
    q = [(int(round((x + 0.5) * 4)), int(round((y + 0.5) * 4))) for x, y in R]   # canvas coords (pixel i spans [i, i+1])
    # drop repeated points
    qq = [q[0]]
    for p in q[1:]:
        if p != qq[-1]: qq.append(p)
    return enc_seq(qq)

def enc_field(fd):
    if fd[0] == 'c': return round(fd[1] * 255, 1)
    if fd[0] == 'r': return ['r', float(f'{fd[1]:.4g}'), float(fd[2]), enc_field(fd[3])]
    if fd[0] == 'qb':
        # blob centres to canvas coords (+0.5); the quadratic stays in pixel-index coords (the JS evaluates it so)
        q = [float(f'{v:.6g}') for v in fd[1:7]]; bl = []
        for i in range(7, len(fd), 4):
            x, y, s, a = fd[i:i + 4]; bl += [round(x, 1), round(y, 1), round(s, 2), round(a, 4)]
        return ['qb'] + q + bl
    return [fd[0]] + [float(f'{v:.6g}') for v in fd[1:]]

def enc_stroke(tone, pts, ws):
    q = [(int(round((x + 0.5) * 4)), int(round((y + 0.5) * 4)), int(round(w * 8))) for (x, y), w in zip(pts, ws)]
    return [int(round(tone * 255)), enc_seq(q)]

def drawing_js(D, extra=None):
    o = {
        'm': [[enc_field(fd), [enc_ring(R) for R in rings]] for rings, fd in D['masses']],
        's': [[enc_field(fd), [enc_ring(R) for R in rings]] for rings, fd in D.get('specks', [])],
        'd': [enc_stroke(*s) for s in D['dark']],
        'b': [enc_stroke(*s) for s in D['bright']],
        'o': [[round(x + 0.5, 2), round(y + 0.5, 2), round(r, 2), int(round(v * 255))] for x, y, r, v in D.get('dots', [])],
    }
    if 'base' in D: o['base'] = [[enc_field(fd), [enc_ring(R) for R in rings]] for rings, fd in D['base']]
    if extra: o.update(extra)
    return o

def write_module(path, name, obj, header):
    s = json.dumps(obj, separators=(',', ':'))
    with open(path, 'w') as f:
        f.write(header.rstrip() + '\n')
        f.write(f'export const {name} = {s};\n')
    return len(s)
