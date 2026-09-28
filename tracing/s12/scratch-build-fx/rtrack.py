import json, sys, numpy as np, cv2
from rlib import *
# rtrack.py spec.json out.json : faces {id: {z, f:[f0,f1], keys:{f:[[x,y]*4]}}}
spec = json.load(open(sys.argv[1])); out = sys.argv[2]
faces = spec['faces']
ids = sorted(faces, key=lambda k: -faces[k]['z'])     # nearest first (for occlusion masks)
res = {k: {} for k in faces}
frames = [f for f in range(spec['f'][0], spec['f'][1] + 1) if f not in HOLDS]
def occl(f, zmin):
    m = np.zeros((H, W), bool)
    for k in faces:
        if faces[k]['z'] > zmin and str(f) in res[k]:
            m |= poly_mask(res[k][str(f)])
    return m
log = []
for k in ids:
    F = faces[k]; keys = {int(a): b for a, b in F['keys'].items()}
    f0, f1 = F.get('f', [frames[0], frames[-1]])
    fr = [f for f in frames if f0 <= f <= f1]
    fw = {}; bw = {}
    ks = sorted(keys)
    # forward from each key until the next key
    for f in fr:
        if f in keys: fw[f] = keys[f]; continue
        p = nxt(f, -1)
        if p in fw and p >= f0:
            q, n = homog_step(fw[p], p, f, occl(p, F['z']))
            if q is None:
                # fallback: repeat the previous displacement
                pp = nxt(p, -1)
                if pp in fw: q = (np.array(fw[p]) * 2 - np.array(fw[pp])).tolist()
                else: q = fw[p]
                log.append(f'{k} fw {p}->{f} fallback n={n}')
            fw[f] = q
    for f in reversed(fr):
        if f in keys: bw[f] = keys[f]; continue
        p = nxt(f, 1)
        if p in bw and p <= f1:
            q, n = homog_step(bw[p], p, f, occl(p, F['z']))
            if q is None:
                pp = nxt(p, 1)
                if pp in bw: q = (np.array(bw[p]) * 2 - np.array(bw[pp])).tolist()
                else: q = bw[p]
                log.append(f'{k} bw {p}->{f} fallback n={n}')
            bw[f] = q
    for f in fr:
        kp = max([a for a in ks if a <= f], default=None); kn = min([a for a in ks if a >= f], default=None)
        if f in fw and f in bw and kp is not None and kn is not None and kn > kp:
            w = (f - kp) / (kn - kp); q = ((1 - w) * np.array(fw[f]) + w * np.array(bw[f])).tolist()
        elif f in fw: q = fw[f]
        elif f in bw: q = bw[f]
        else: continue
        res[k][str(f)] = [[round(x, 1), round(y, 1)] for x, y in q]
json.dump(res, open(out, 'w'))
print('\n'.join(log))
