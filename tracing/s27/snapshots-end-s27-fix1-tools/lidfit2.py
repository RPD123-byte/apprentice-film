# Lid back sunlit patch, per frame, in lid-back coords (the shot's own mapping, lidwarp.py).
#   fit:     lidfit2.py fit OUT.json F1,F2,..            (source: boundary v_b(u), patch colour, dark face 4 corners, graded)
#   measure: lidfit2.py measure FIT.json DIR prefix       (region colours of a render with the source's boundaries)
import cv2, numpy as np, sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s27-fix1-tools')
import lidwarp
NU, NV = lidwarp.NU, lidwarp.NV
US = [round(x, 4) for x in list(np.linspace(0, 0.8, 11)) + list(np.linspace(0.84, 1, 9))]
SRC = '/Users/computer/rootline/apprentice-film/snapshots/end-s27-fix1-work/src'
def warp(path, F):
    X, Y = lidwarp.maps(F)
    return cv2.remap(cv2.GaussianBlur(cv2.imread(path).astype(np.float32), (0, 0), 1.2), X, Y, cv2.INTER_LINEAR)
iu0, iu1, iv0, iv1 = int(0.035 * NU), int(0.965 * NU), int(0.045 * NV), int(0.94 * NV)
def masks(vb):
    m = np.zeros((NV, NU), bool)
    for i in range(NU):
        v = np.interp(i / (NU - 1), US, vb); m[:int(round(v * NV)), i] = True
    ins = np.zeros((NV, NU), bool); ins[iv0:iv1, iu0:iu1] = True
    k = np.ones((7, 7), np.uint8)
    light = ins & cv2.erode(m.astype(np.uint8), k).astype(bool)
    dark = ins & ~cv2.dilate(m.astype(np.uint8), k).astype(bool)
    return light, dark
def colours(w, vb):
    light, dark = masks(vb)
    lc = np.median(w[light], 0)[::-1].tolist() if light.sum() > 40 else None
    vv, uu = np.nonzero(dark); uu = uu / (NU - 1); vv = vv / (NV - 1)
    A = np.stack([(1 - uu) * (1 - vv), uu * (1 - vv), uu * vv, (1 - uu) * vv], 1)
    dc = np.linalg.lstsq(A, w[dark][:, ::-1], rcond=None)[0].tolist()
    return lc, dc
def fit(F):
    w = warp(f'{SRC}/s{F}.png', F); L = cv2.GaussianBlur(w, (0, 0), 3).mean(2)
    inner = L[iv0:iv1, iu0:iu1]
    if F <= 3225:
        th, _ = cv2.threshold(np.clip(inner, 0, 255).astype(np.uint8), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    else: th = 160
    vb = []
    for u in US:
        c = int(np.clip(u * (NU - 1), iu0 + 3, iu1 - 4))
        col = L[iv0:iv1, c - 3:c + 4].mean(1) > th
        k = 0
        while k < len(col) and col[k]: k += 1
        vb.append(0.0 if k == 0 else round((iv0 + k) / NV, 3))
    return w, vb
if __name__ == '__main__':
    if sys.argv[1] == 'fit':
        out = {}
        for F in map(int, sys.argv[3].split(',')):
            w, vb = fit(F); lc, dc = colours(w, vb); out[F] = {'vb': vb, 'light': lc, 'dark': dc}
            print(F / 25, [round(v, 2) for v in vb], lc and [round(x) for x in lc], [[round(x) for x in c] for c in dc])
        json.dump(out, open(sys.argv[2], 'w'))
    else:
        fitd = json.load(open(sys.argv[2])); d, p = sys.argv[3], sys.argv[4]; out = {}
        for F, r in fitd.items():
            F = int(F); w = warp(f'{d}/{p}{F}.png', F); lc, dc = colours(w, r['vb']); out[F] = {'light': lc, 'dark': dc}
            ls = r['light']; print(F / 25, 'light src', ls and [round(x) for x in ls], 'got', lc and [round(x) for x in lc], '| dark TL src', [round(x) for x in r['dark'][0]], 'got', [round(x) for x in dc[0]], 'BL src', [round(x) for x in r['dark'][3]], 'got', [round(x) for x in dc[3]])
        json.dump(out, open(sys.argv[5] if len(sys.argv) > 5 else '/dev/null', 'w'))
