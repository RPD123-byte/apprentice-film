#!/usr/bin/env python3
# tojs3.py NAME [NAME...] -- pose-NAME.json (extract2, key-frame px) -> src/shots/s25/v2/data/NAME.js in 104.60 page px
# (inverse of the measured camera CAM at the key frame; frames before 103.08 have no camera drift).
# Numbers are rounded to 0.1 px (coordinates) and 1/1000 (values).
import json, sys, os, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
MEAS = os.path.join(HERE, '..', 's25-meas')
OUT = os.path.join(HERE, '..', '..', 'src', 'shots', 's25', 'v2', 'data')
os.makedirs(OUT, exist_ok=True)
MOT = json.load(open(os.path.join(MEAS, 'motion.json')))
def cam(f):
    i = f - MOT['CAM_F0']
    if i < 0: return np.eye(3)
    c = MOT['CAM'][min(i, len(MOT['CAM']) - 1)]
    return np.array([[c[0], c[2], c[4]], [c[1], c[3], c[5]], [0, 0, 1]])
def flat(A, ring):
    p = np.array(ring, float).reshape(-1, 2)
    q = (A[:2, :2] @ p.T).T + A[:2, 2]
    return [round(float(v), 1) for v in q.reshape(-1)]
def conv(name, space='page'):
    d = json.load(open(os.path.join(MEAS, f'pose-{name}.json')))
    A = np.linalg.inv(cam(d['frame'])) if space == 'page' else np.eye(3)
    sc = float(np.sqrt(abs(np.linalg.det(A[:2, :2]))))
    parts = []
    for q in d['parts']:
        t = q['t']
        c = A[:2, :2] @ np.array([t[3], t[4]]) + A[:2, 2]
        parts.append(dict(tier=q.get('tier', 1), area=q.get('area', 0), p=[flat(A, r) for r in q['p']], t=[round(t[0], 3), round(t[1] / sc, 4), round(t[2] / sc, 4), round(float(c[0]), 1), round(float(c[1]), 1), round(t[5], 3), round(t[6] * sc, 2)], **({'n': q['n']} if 'n' in q else {})))
    ink = [dict(p=[flat(A, r) for r in s['p']], v=round(s['v'], 3)) for s in d.get('ink', [])]
    lines = [dict(p=flat(A, l['p']), w=round(l['w'] * sc, 2), v=l['v']) for l in d.get('lines', [])]
    dots = []
    for (x, y, a, b, ang, v) in d.get('dots', []):
        c = A[:2, :2] @ np.array([x, y]) + A[:2, 2]
        dots.append([round(float(c[0]), 1), round(float(c[1]), 1), round(a * sc, 2), round(b * sc, 2), ang, v])
    D = dict(key=name, frame=d['frame'], base=round(d['base'], 3), edge=d.get('edge'), hull=[flat(A, r) for r in d['hull']], parts=parts, ink=ink, lines=lines, dots=dots)
    for k in ('anchor',):
        if k in d: D[k] = d[k]
    js = f"// s25 v2 drawing '{name}': measured on source frame {d['frame']} ({d['frame'] / 25:.2f} s) by snapshots/s25-tools/extract3.py —\n"
    js += "// the figure's outline, its major light areas and dark pieces (smoothed outlines, a linear tone plane each), the major\n"
    js += "// ink lines (coarse polylines, one width and value each) and compact dark dots; coordinates and scalars only, 104.60 page px.\n"
    js += f"export const D_{name.upper()} = " + json.dumps(D, separators=(',', ':')) + ";\n"
    open(os.path.join(OUT, f'{name}.js'), 'w').write(js)
    return len(js)
if __name__ == '__main__':
    for n in sys.argv[1:]: print(n, conv(n), 'bytes')
