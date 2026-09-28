# fitpair.py -- fit held scissors placements (occluded by the owl) on a key frame; occluders = owl part polygons of a pose json
import json, sys, numpy as np
from scisfit import *
def owl_occ(key, exclude_prefix='sc'):
    d = json.load(open(f'../s25-meas/pose-{key}.json'))
    occ = []
    if 'hull' in d:  # extract2 format: the figure hull
        return [np.array(q).reshape(-1, 2).astype(np.int32) for q in d['hull']]
    for p in d['parts']:
        if p.get('name', '').startswith(exclude_prefix): continue
        occ += [np.array(q).astype(np.int32) for q in p['polys']]
    return occ
if __name__ == '__main__':
    f = int(sys.argv[1]); key = sys.argv[2]; name = sys.argv[3]
    init = json.loads(sys.argv[4]); box = [int(v) for v in sys.argv[5].split(',')]
    occ = owl_occ(key) if key != '-' else None
    best = None
    for m in ([init['m']] if 'm' in init else [1, -1]):
        pl = dict(init, m=m)
        q, c0, c1 = fit(f, pl, occl=occ, iters=800)
        print(name, 'm', m, 'cost', round(c0, 3), '->', round(c1, 3))
        if best is None or c1 < best[1]: best = (q, c1)
    q = best[0]
    print(json.dumps(q))
    overlay(f, [q], f'../s25-meas/fit-{name}.jpg', box)
    try: allp = json.load(open('../s25-meas/scis.json'))
    except Exception: allp = {}
    allp[name] = dict(frame=f, pl=q, cost=best[1]); json.dump(allp, open('../s25-meas/scis.json', 'w'), indent=0)
