#!/usr/bin/env python3
# tojs2.py KEY [KEY...] -- pose-KEY.json (key-frame px) -> src/shots/s25/v2/data/KEY.js (104.60 page space: the inverse
# of the measured camera CAM at the key frame). Coordinates only (0.1 px), one tone plane per part, one value per ink shape.
import json, sys, os, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
MEAS = os.path.join(HERE, '..', 's25-meas')
OUT = os.path.join(HERE, '..', '..', 'src', 'shots', 's25', 'v2', 'data')
os.makedirs(OUT, exist_ok=True)
M = json.load(open(os.path.join(MEAS, 'motion.json')))
def caminv(f):
    i = f - M['CAM_F0']
    if i < 0: return np.eye(3)
    c = M['CAM'][min(i, len(M['CAM']) - 1)]
    A = np.array([[c[0], c[2], c[4]], [c[1], c[3], c[5]], [0, 0, 1]])
    return np.linalg.inv(A)
def conv(A, p):
    p = np.array(p, float)
    q = (A[:2, :2] @ p.T).T + A[:2, 2]
    return [round(float(v), 1) for v in q.reshape(-1)]
for key in sys.argv[1:]:
    d = json.load(open(os.path.join(MEAS, f'pose-{key}.json')))
    A = caminv(d['frame'])
    parts = []
    for p in d['parts']:
        t = p['tone'] or dict(a=0.9, bx=0, by=0, rim=0, rimw=6, c=[0, 0])
        c = conv(A, [t['c']])
        parts.append(dict(n=p['name'], st=p['style'], p=[conv(A, q) for q in p['polys']],
                          t=[t['a'], t['bx'], t['by'], c[0], c[1], t['rim'], t['rimw']], pen=p.get('pen'), h=1 if p.get('holes') else 0))
    ink = [dict(q=p['part'], p=[conv(A, r) for r in p['p']], v=p['v']) for p in d['ink']]
    extra = d.get('extra', {})
    if d.get('scis'):
        sc = []
        for e in d['scis']:
            pl = dict(e['pl']); P = np.array(pl['P'], float)
            q = A[:2, :2] @ P + A[:2, 2]
            ang = []
            for th in pl['a']:
                u = A[:2, :2] @ np.array([np.cos(th), np.sin(th)]); ang.append(round(float(np.arctan2(u[1], u[0])), 5))
            pl['P'] = [round(float(q[0]), 2), round(float(q[1]), 2)]; pl['a'] = ang
            pl['s'] = round(pl['s'] * float(np.sqrt(abs(np.linalg.det(A[:2, :2])))), 5)
            for k in ('rr', 'rd', 'rb', 'rs'):
                if k in pl: pl[k] = [round(float(v), 4) for v in pl[k]]
            sc.append(dict(n=e['name'], before=e['before'], pl=pl))
        extra = dict(extra, scis=sc)
    name = 'P_' + key.upper()
    js = f"// s25 v2 pose '{key}': measured on source frame {d['frame']} ({d['frame']/25:.2f} s) by snapshots/s25-tools/extract.py;\n"
    js += "// 104.60 page space. Part outlines (polygons), a tone plane per part [a, bx, by, cx, cy, rim, rimw] and the dark ink\n"
    js += "// shapes (polygons with holes, one value each) — coordinates and scalars only.\n"
    js += f"export const {name} = " + json.dumps(dict(key=key, frame=d['frame'], parts=parts, ink=ink, **extra), separators=(',', ':')) + ";\n"
    open(os.path.join(OUT, f'{key}.js'), 'w').write(js)
    print(key, len(js), 'bytes')
