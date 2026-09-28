# Trace the chair back at the left edge of the end orbit (128.68-129.28) per source frame: mask by colour (dark red-brown,
# the component that reaches above the jacket's lower edge), grown ~14 px under the jacket (the designer is drawn over it),
# then colour regions (k-means on the un-graded, denoised frame) + ink + outline, as s27-k-tools/owl_vec.py.
# Writes src/shots/s27/chairTrace.js (frame px x2, codec strings). Measurement -> vector data only.
import cv2, numpy as np, json, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from codec import enc
from ungrade import ungrade
W = '/Users/computer/rootline/apprentice-film/snapshots/end-s27-fix1-work'
S = 3
def contours_of(mk, eps, minarea, smooth, off):
    M = cv2.resize(mk.astype(np.float32), None, fx=S, fy=S, interpolation=cv2.INTER_LINEAR)
    if smooth: M = cv2.GaussianBlur(M, (0, 0), smooth * S)
    B = (M > 0.5).astype(np.uint8)
    cnts, hier = cv2.findContours(B, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None: return out
    for i, c in enumerate(cnts):
        if hier[0][i][3] >= 0 or cv2.contourArea(c) < minarea * S * S: continue
        o = cv2.approxPolyDP(c, eps * S, True).reshape(-1, 2) / S + off
        holes = []; j = hier[0][i][2]
        while j >= 0:
            if cv2.contourArea(cnts[j]) >= minarea * S * S * 0.5: holes.append(cv2.approxPolyDP(cnts[j], eps * S, True).reshape(-1, 2) / S + off)
            j = hier[0][j][0]
        out.append((o, holes))
    return out
fl = lambda p: [int(round(v * 2)) for xy in p for v in xy]
X0, Y0, X1, Y1 = 0, 480, 360, 900
rows = []; ov = []
for F in range(3217, 3233):
    f = cv2.imread(f'{W}/src/s{F}.png'); crop = f[Y0:Y1, X0:X1]
    hsv = cv2.cvtColor(cv2.GaussianBlur(crop, (0, 0), 2), cv2.COLOR_BGR2HSV).astype(int)
    Hh, Ss, Vv = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    m = (((Hh <= 10) | (Hh >= 170)) & (Ss > 70) & (Vv > 30) & (Vv < 140)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, cc, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a > 150 and y < 760 - Y0 and x < 60: keep[cc == i] = 1      # the chair: touches the left edge, starts above the jacket's hem
    if keep.sum() < 150: continue
    # drop thin runs (a reddish strip along the jacket's outline), keep the chair's body
    keep = cv2.morphologyEx(keep, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    # the desk's lit top at the left edge: nothing of the chair below it (the desk's shadow is the same red-brown)
    xl = np.nonzero(keep.any(0))[0].min() + 6
    ys = np.nonzero(keep[:, xl - 6:xl + 6].any(1))[0]
    if len(ys):
        col = hsv[:, xl]; ok = lambda y: col[y][2] > 135 and 10 <= col[y][0] <= 25
        below = [y for y in range(ys.max() - 40 if ys.max() - 40 > ys.min() else ys.min(), keep.shape[0] - 3) if ok(y) and ok(y + 1) and ok(y + 2)]
        if below: keep[below[0] - 1:] = 0
    if keep.sum() < 150: continue
    n2, cc2, st2, _ = cv2.connectedComponentsWithStats(keep); keep = (cc2 == 1 + np.argmax(st2[1:, 4])).astype(np.uint8)
    # the dark rim line along the chair's top is part of it: grow 3 px up/left into dark pixels
    dark = (Vv < 90).astype(np.uint8)
    keep = keep | (cv2.dilate(keep, np.ones((7, 7), np.uint8)) & dark)
    # (fix) plus the jacket next to it (x < 230, from 60 px above the chair's top to the desk): the designer is drawn over
    # this, so it only shows where the drawn designer's outline falls short of the source's (a light wedge of wall showed)
    ys_ = np.nonzero(keep.any(1))[0]; ytop = max(0, ys_.min() - 60)
    ydesk = below[0] - 1 if (len(ys) and below) else keep.shape[0]
    jacket = (((Hh >= 28) & (Hh <= 95) & (Ss > 12)) | (Vv < 85)).astype(np.uint8)
    box = np.zeros_like(keep); box[ytop:ydesk, :230] = 1
    jk = jacket & box
    n3, cc3, st3, _ = cv2.connectedComponentsWithStats(jk | keep)
    lab0 = cc3[keep > 0]; main = np.bincount(lab0[lab0 > 0]).argmax() if (lab0 > 0).any() else 0
    mk = ((cc3 == main) & ((jk | keep) > 0)).astype(np.uint8)
    mk = cv2.morphologyEx(mk, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    U = np.clip(ungrade(f, F / 25) * 255 + 0.5, 0, 255).astype(np.uint8)[Y0:Y1, X0:X1]
    den = cv2.fastNlMeansDenoisingColored(U, None, 7, 7, 5, 15)
    clean = cv2.bilateralFilter(den, 7, 20, 5)
    lab = cv2.cvtColor(clean, cv2.COLOR_BGR2LAB).astype(np.float32)
    yy, xx = np.nonzero(mk); cv2.setRNGSeed(3)
    k = 7
    _, lb, cen = cv2.kmeans(lab[yy, xx], k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.3), 3, cv2.KMEANS_PP_CENTERS)
    Lb = np.full(mk.shape, -1, np.int32); Lb[yy, xx] = lb.ravel()
    for it in range(3):
        votes = np.stack([cv2.boxFilter((Lb == j).astype(np.float32), -1, (5, 5)) for j in range(k)])
        Lb = np.where(mk > 0, np.argmax(votes, 0), -1)
    off = np.array([X0, Y0], float)
    regs = []; cf = clean.astype(np.float32)
    for j in range(k):
        for o, h in contours_of(Lb == j, 0.8, 6, 1.0, off):
            M = np.zeros(mk.shape, np.uint8); cv2.fillPoly(M, [np.int32(np.round(o - off))], 1)
            for hh in h: cv2.fillPoly(M, [np.int32(np.round(hh - off))], 0)
            M &= (Lb == j).astype(np.uint8); q = np.nonzero(M)
            if len(q[0]) == 0: continue
            col = cf[q].mean(0)[::-1]; regs.append((len(q[0]), '#%02x%02x%02x' % tuple(int(v) for v in col), o, h))
    regs.sort(key=lambda r: -r[0])
    cnts, _ = cv2.findContours(mk, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cnts, key=cv2.contourArea)
    outl = cv2.approxPolyDP(c, 1.0, True).reshape(-1, 2) + off
    rows.append([round(F / 25, 2), [[r[1], enc(fl(r[2]))] + [enc(fl(x)) for x in r[3]] for r in regs], enc(fl(outl))])
    o = crop.copy(); o[mk > 0] = (o[mk > 0] * 0.4 + np.array([255, 0, 255]) * 0.6).astype(np.uint8)
    cv2.putText(o, f'{F/25:.2f} regs {len(regs)}', (5, 15), 0, 0.5, (255, 255, 255), 1); ov.append(o)
with open('/Users/computer/rootline/apprentice-film/src/shots/s27/chairTrace.js', 'w') as fo:
    fo.write('// s27 (end-s27-fix1): the chair back at the left edge as the camera swings behind the laptop, traced from the source on\n')
    fo.write('// every frame 128.68-129.28 (mask by colour, grown under the jacket; colour regions on the un-graded, denoised frame):\n')
    fo.write('// [t, regions [colour, outer, ...holes], outline]; frame px x2, codec strings (codec.js poly()). Painted in s27.js over\n')
    fo.write('// the room keys, under the designer. Script: snapshots/end-s27-fix1-tools/chair_trace.py.\n')
    fo.write('export const CHAIR = %s;\n' % json.dumps(rows, separators=(',', ':')))
cv2.imwrite(f'{W}/chair_masks.jpg', np.vstack([np.hstack(ov[i:i + 4]) for i in range(0, len(ov) - len(ov) % 4, 4)]))
print('frames', [r[0] for r in rows])
