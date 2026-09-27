#!/usr/bin/env python3
# s16: his irises. Two iris drawings are traced (looking right: frame 1153; looking left at the owl: frame 1175);
# for every frame the better of the two and its offset are found by matching inside the eye opening (in plate
# coordinates, through the camera). Writes src/shots/s16/data/eyes.js and prints the per-frame table.
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import tr, cv2, numpy as np
from trace_plate import CFG, base_of, js_drawing, enc_ring

OUT = '/Users/computer/rootline/apprentice-film/snapshots/s16-p2-tools'
DATA = '/Users/computer/rootline/apprentice-film/src/shots/s16/data'
W, H = 2206, 946
EZ0 = np.load(f'{OUT}/eyes.npz')
def _clean(m):
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n < 2: return m
    k = 1 + np.argmax(st[1:, 4]); m = (lab == k).astype(np.uint8)
    ff = m.copy(); cv2.floodFill(ff, None, (0, 0), 2); return ((ff != 2) | (m > 0)).astype(np.uint8)
EZ = {k: (_clean(v) if 'iris' in k else v) for k, v in EZ0.items()}
E = np.load(f'{OUT}/plateE.npy'); M = 90
P = E[M:M + H, M:M + W]
cams = {int(k): np.array(v['A'], np.float32) for k, v in json.load(open(f'{OUT}/cams.json')).items()}
BOX = {'L': (1276, 198, 1366, 238), 'R': (1448, 194, 1546, 238)}
RMS_MAX = 12.0

def to_plate(f):
    Y = tr.pre(f)
    if f in cams:
        return cv2.warpAffine(Y, cams[f], (W, H), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
    return Y

def model(scl, op, tpl, tm, dx, dy):
    Mx = np.float32([[1, 0, dx], [0, 1, dy]])
    t = cv2.warpAffine(tpl, Mx, (tpl.shape[1], tpl.shape[0]), flags=cv2.INTER_LINEAR)
    m = cv2.warpAffine(tm.astype(np.float32), Mx, (tpl.shape[1], tpl.shape[0]), flags=cv2.INTER_LINEAR)
    m = m * op
    return scl * (1 - m) + t * m

def main():
    A = tr.pre(1175); B = tr.pre(1153)
    res = {}
    tpls = {}
    for k, (x0, y0, x1, y1) in BOX.items():
        op = EZ[f'{k}_open_mask'].astype(np.float32)
        scl = P[y0:y1, x0:x1]
        ia = cv2.dilate(EZ[f'{k}_irisA'], np.ones((3, 3), np.uint8)); ib = cv2.dilate(EZ[f'{k}_irisB'], np.ones((3, 3), np.uint8))
        tpls[k] = {'L': (A[y0:y1, x0:x1], ia), 'R': (B[y0:y1, x0:x1], ib)}
        for f in range(1143, 1193):
            Yp = to_plate(f)[y0:y1, x0:x1]
            best = None
            for name, (tpl, tm) in tpls[k].items():
                for dy in range(-4, 5):
                    for dx in range(-48, 49, 1):
                        R = model(scl, op, tpl, tm, dx, dy)
                        e = float((((R - Yp) * op) ** 2).sum() / op.sum())
                        if best is None or e < best[0]: best = (e, name, dx, dy)
            # sub-pixel refine
            e0, name, dx, dy = best
            tpl, tm = tpls[k][name]
            for step in (0.5, 0.25):
                for ddx in (-step, 0, step):
                    for ddy in (-step, 0, step):
                        R = model(scl, op, tpl, tm, dx + ddx, dy + ddy)
                        e = float((((R - Yp) * op) ** 2).sum() / op.sum())
                        if e < best[0]: best = (e, name, dx + ddx, dy + ddy)
                e0, name, dx, dy = best
            rms = np.sqrt(best[0]) * 255
            # an in-between drawing (or a soft jolt frame) that neither traced iris fits: no model iris, the frame's
            # own drawing of the eye comes in with the per-frame layer (dyn.py)
            if rms > RMS_MAX: name = 'N'
            res.setdefault(f, {})[k] = dict(t=name, dx=dx, dy=dy, rms=rms)
            print(f, k, name, dx, dy, 'rms %.1f' % (np.sqrt(best[0]) * 255), flush=True)
    json.dump(res, open(f'{OUT}/irises.json', 'w'), indent=1)
    # trace the four iris drawings (levels + strokes of the frame inside the iris mask), frame px
    out = []
    for k, (x0, y0, x1, y1) in BOX.items():
        for name, f in (('L', 1175), ('R', 1153)):
            Y = tr.denoise(tr.pre(f), CFG['nlm'])
            tm = np.zeros((H, W), bool)
            tm[y0:y1, x0:x1] = cv2.dilate(EZ[f'{k}_iris' + ('A' if name == 'L' else 'B')], np.ones((3, 3), np.uint8)) > 0
            L = tr.levels(cv2.medianBlur((np.clip(Y, 0, 1) * 255).astype(np.uint8), 3).astype(np.float32) / 255, tm,
                          [-1.0] + [(i + 0.5) / 32 for i in range(1, 32)], minarea=2, eps=0.5)
            out.append(js_drawing(f'IRIS_{k}{name}', L, [], [], (x0, y0, x1, y1)))
        c = tr.offset_ring(EZ[f'{k}_opening'], 0.5, True) + 0.5
        out.append('export const OPEN_%s = %s;\n' % (k, enc_ring(c)))
    tab = []
    for f in range(1143, 1193):
        r = res[f]
        tab.append('  %d: [%s],' % (f, ', '.join('["%s", %g, %g]' % (r[k]['t'], r[k]['dx'], r[k]['dy']) for k in ('L', 'R'))))
    hdr = ('// s16: his irises (drawn per frame, clipped to the eye openings of the plate). IRIS_<eye><look>: the iris traced\n'
           '// from frame 1175 (look "L", at the owl) or 1153 (look "R"); OPEN_<eye>: the opening outline. LOOK[frame] =\n'
           '// [[look, dx, dy] for the viewer-left eye, same for the right]: which drawing and its offset, matched per frame\n'
           '// ("N": no traced iris fits that frame, its own drawing of the eye is in the per-frame layer).\n')
    open(f'{DATA}/eyes.js', 'w').write(hdr + ''.join(out) + 'export const LOOK = {\n' + '\n'.join(tab) + '\n};\n')
    print('wrote eyes.js')

if __name__ == '__main__':
    main()
