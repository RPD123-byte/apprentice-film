# celcal_all.py OUT lift_in.json lift_out.json [damp] : per cel trace and posterised level, mean render - source inside
# its groups (eroded 1 px) on the frames where that trace sits exactly on its reference drawing; writes updated lifts
# (pre-grade value offsets per level: lift -= damp * diff / 165).  Measurement only.
import json, numpy as np, cv2, sys, os
out, fin, fout = sys.argv[1], sys.argv[2], sys.argv[3]; damp = float(sys.argv[4]) if len(sys.argv) > 4 else 0.8
CEL = json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s13-w3-tools/data/celAll.json'))
LIFT = json.load(open(fin)) if os.path.exists(fin) else {}
C_ = list(range(891, 899)); D_ = [901, 902]; E_ = [912]; A_ = [884, 885]; B_ = [886, 887]
FR = {k: C_ for k in ['hpC', 'beakC', 'wrW', 'wrB', 'wrH', 'tailC', 'flankC', 'feetC', 'bgC', 'nubC', 'hlC', 'crC', 'eyeC0', 'eyeC1']}
FR.update({k: D_ for k in ['hpD', 'beakD', 'lfD', 'shD', 'bgD', 'eyeD0', 'eyeD1']})
FR.update({k: E_ for k in ['hpE', 'beakE', 'lfE', 'shE', 'bgE', 'eyeE0', 'eyeE1']})
FR.update({k: A_ for k in ['ovA1', 'ovA2', 'ovA3', 'ovA4']}); FR.update({k: B_ for k in ['ovB1', 'ovB2', 'ovB3']})
cacheR, cacheS = {}, {}
def img(p, cache):
    if p not in cache: cache[p] = cv2.imread(p, 0).astype(np.float32)
    return cache[p]
def mask(rings, m=None):
    m = np.zeros((946, 2206), np.uint8)
    for r in rings:
        t = np.zeros_like(m); p = np.array(r, np.float32).reshape(-1, 2); cv2.fillPoly(t, [np.round(p * 16).astype(np.int32)], 1, shift=4); m ^= t
    return m
tot_before = []
for key, frames in FR.items():
    if key not in CEL: continue
    frames = [f for f in frames if os.path.exists(f'{out}/r{f}.png')]
    if not frames: continue
    C = CEL[key]
    R = np.mean([img(f'{out}/r{f}.png', cacheR) for f in frames], 0); S = np.mean([img(f'/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src/f{f}.png', cacheS) for f in frames], 0)
    lab = np.full((946, 2206), -2, np.int16); lab[mask(C['region']) > 0] = -1
    for li, L in enumerate(C['levels']):
        for G in L: lab[mask(G['rings']) > 0] = li
    er = cv2.erode((lab > -2).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    # erode each level separately too (a level's pixels next to another level are edge pixels)
    L0 = LIFT.get(key, {}); L1 = {}
    line = []
    for li in range(-1, len(C['levels'])):
        m = (lab == li).astype(np.uint8); m = cv2.erode(m, np.ones((3, 3), np.uint8)) > 0; m &= er
        n = int(m.sum())
        old = L0.get(str(li), 0.0)
        if n < 40: L1[str(li)] = old; continue
        d = float(R[m].mean() - S[m].mean())
        tot_before.append((n, abs(d)))
        L1[str(li)] = round(max(-0.25, min(0.3, old - damp * d / 165.0)), 4)
        line.append(f'{li}:{d:+.1f}')
    LIFT[key] = L1
    print(f'{key:6s} ' + ' '.join(line))
json.dump(LIFT, open(fout, 'w'), indent=0)
w = sum(n for n, _ in tot_before); print('px-weighted mean |level diff|', sum(n * a for n, a in tot_before) / w)
