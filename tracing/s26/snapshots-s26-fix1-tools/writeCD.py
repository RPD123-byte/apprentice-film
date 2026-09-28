#!/usr/bin/env python3
# cdfit.json -> src/shots/s26/owlCDfit.js, with a 3-tap temporal smoothing of every parameter inside each beat
import json, numpy as np
J = json.load(open('snapshots/s26-fix1-meas/cdfit.json'))
def vec(f):
    v = []
    for w in f['wings']: v += w['S'] + w['Wr'] + w['T'] + [np.arctan2(w['trail'][1], w['trail'][0]), w['len'], w['spread']]
    b = f['body']; v += [b['x'], b['y'], b['a'], b['b'], b['rot']]
    t = f['tail']; v += t['base'] + t['tip'] + [t['w']]
    return np.array(v, float)
def unvec(v):
    r = lambda x: round(float(x), 1)
    wings = []
    for s in (0, 1):
        o = s * 9
        wings.append({'S': [r(v[o]), r(v[o+1])], 'Wr': [r(v[o+2]), r(v[o+3])], 'T': [r(v[o+4]), r(v[o+5])], 'trail': [round(float(np.cos(v[o+6])), 4), round(float(np.sin(v[o+6])), 4)], 'len': r(v[o+7]), 'spread': round(float(v[o+8]), 3)})
    body = {'x': r(v[18]), 'y': r(v[19]), 'a': r(v[20]), 'b': r(v[21]), 'rot': round(float(v[22]), 4)}
    tail = {'base': [r(v[23]), r(v[24])], 'tip': [r(v[25]), r(v[26])], 'w': r(v[27]), 'n': 3}
    return {'wings': wings, 'body': body, 'tail': tail}
Fs = sorted(int(k) for k in J)
V = {F: vec(J[str(F)]['fit']) for F in Fs}
out = {}
for F in Fs:
    seg = (2791, 2817) if F <= 2817 else (2818, 2847)
    nb = [V[g] for g in (F - 1, F, F + 1) if seg[0] <= g <= seg[1] and g in V and g != 2847]
    w = np.array([0.25, 0.5, 0.25][:len(nb)]) if len(nb) == 3 else None
    v = (0.25 * nb[0] + 0.5 * nb[1] + 0.25 * nb[2]) if len(nb) == 3 else V[F]
    out[F] = unvec(v)
with open('src/shots/s26/owlCDfit.js', 'w') as f:
    f.write('// s26 C/D owl: per source frame, the kit owl\'s egg body, two layered spread wings (S, Wr, T, trail, len, spread) and\n')
    f.write('// tail, in frame px, fitted to the source owl silhouette with the head placed on the tracked eyes (coordinate descent on\n')
    f.write('// IoU, head area ignored; snapshots/s26-fix1-tools/fitCD.mjs, then a 3-tap smoothing inside each beat, writeCD.py).\n')
    f.write('// Mean IoU (body + wings + tail): C %.3f, D %.3f. Numbers only.\n' % (np.mean([J[str(F)]['iou'] for F in Fs if F <= 2817]), np.mean([J[str(F)]['iou'] for F in Fs if F > 2817])))
    f.write('export const CD_FIT = {\n')
    for F in Fs: f.write(f'  {F}: {json.dumps(out[F], separators=(",", ":"))},\n')
    f.write('};\n')
print('wrote', len(Fs))
