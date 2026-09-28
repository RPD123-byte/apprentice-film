# the seated owl's dazed eyes (1162, 1163, 1175): the thin dark ring (ellipse fit to the darkest point on rays from a
# rough centre) and the small pupil (dark blob inside, ellipse fit) + its tiny catchlight. Adds to eyes_fit.json.
import sys, json, cv2, numpy as np; sys.path.insert(0, '.')
import h16
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
F = '../s16-h1-work/eyes_fit.json'
EY = json.load(open(F))
# rough centres / half axes read off 5x grids of 1175 and 1162 (near eye, far eye)
INIT = {1175: [((493, 671), (25, 28)), ((544.5, 645), (13.5, 23))],
        1162: [((489, 673), (24, 26)), ((544, 657), (12, 22))]}
def ring(Yb, c, ax):
    pts = []
    for k in range(120):
        th = 2 * np.pi * k / 120; dx, dy = np.cos(th), np.sin(th)
        r0 = np.hypot(ax[0] * dx, ax[1] * dy) / np.hypot(dx, dy) if False else 1 / np.sqrt((dx / ax[0]) ** 2 + (dy / ax[1]) ** 2)
        rs = np.arange(r0 * 0.75, r0 * 1.25, 0.25)
        xs = (c[0] + dx * rs).astype(np.float32); ys = (c[1] + dy * rs).astype(np.float32)
        v = cv2.remap(Yb, xs[None], ys[None], cv2.INTER_LINEAR)[0]
        j = int(np.argmin(v))
        if v[j] < 0.5 and 0 < j < len(v) - 1: pts.append((xs[j], ys[j], v[j]))
    P = np.array(pts, np.float32)
    e = cv2.fitEllipse(np.ascontiguousarray(P[:, :2]))
    (ex, ey), (ew, eh), ea = e
    ca, sa = np.cos(np.radians(ea)), np.sin(np.radians(ea))
    q = P[:, :2] - [ex, ey]; u = (q[:, 0] * ca + q[:, 1] * sa) / (ew / 2); w_ = (-q[:, 0] * sa + q[:, 1] * ca) / (eh / 2)
    res = np.abs(np.hypot(u, w_) - 1); keep = res < max(0.03, np.quantile(res, 0.8))
    e = cv2.fitEllipse(np.ascontiguousarray(P[keep, :2]))
    return e, len(P), float(np.median(P[:, 2]))
for n in (1175, 1163, 1162):
    Y = h16.pre(n); Yb = cv2.GaussianBlur(Y, (0, 0), 0.8)
    init = INIT[1175 if n != 1162 else 1162]
    if n == 1163:
        # 1163 is 1175 a few px higher: shift the rough centres by the owl's measured offset (template match)
        a = cv2.GaussianBlur(h16.pre(1175)[600:720, 440:600], (0, 0), 1.5)
        r = cv2.matchTemplate(cv2.GaussianBlur(Y, (0, 0), 1.5)[570:750, 410:630], a, cv2.TM_CCOEFF_NORMED)
        _, _, _, loc = cv2.minMaxLoc(r); d = (loc[0] + 410 - 440, loc[1] + 570 - 600); print('1163 offset', d)
        init = [((c[0] + d[0], c[1] + d[1]), ax) for c, ax in init]
    out = []
    for c, ax in init:
        e, npt, vmed = ring(Yb, c, ax)
        (ex, ey), (ew, eh), ea = e
        # pupil: darkest compact blob inside the ring
        m = np.zeros(Y.shape, np.uint8); cv2.ellipse(m, ((ex, ey), (ew * 0.8, eh * 0.8), ea), 1, -1)
        dk = ((Yb < 0.45) & (m > 0)).astype(np.uint8)
        nc, lab, st, cen = cv2.connectedComponentsWithStats(dk)
        i = 1 + int(np.argmax(st[1:, 4]))
        cs, _ = cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        cc = max(cs, key=len)
        pe = cv2.fitEllipse(cc) if len(cc) >= 5 else ((cen[i][0], cen[i][1]), (4, 6), 0)
        # its catchlight: brightest point inside the pupil ellipse
        pm = np.zeros(Y.shape, np.uint8); cv2.ellipse(pm, pe, 1, -1)
        yy, xx = np.nonzero(pm); j = int(np.argmax(Yb[yy, xx]))
        cat = [float(xx[j]), float(yy[j]), 1.0] if Yb[yy[j], xx[j]] > 0.45 else None
        out.append(dict(t=1, iris=[pe[0][0], pe[0][1], pe[1][0], pe[1][1], pe[2]], sclera=[ex, ey, ew, eh, ea], catch=cat, ringv=vmed))
        print(n, 'ring', [round(v, 1) for v in (ex, ey, ew, eh, ea)], 'pts', npt, 'v %.2f' % vmed, 'pupil', [round(v, 1) for v in (pe[0][0], pe[0][1], pe[1][0], pe[1][1], pe[2])], 'catch', cat)
    EY[str(n)] = out
    im = cv2.cvtColor((np.clip(Y, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    for e in out:
        s = e['sclera']; cv2.ellipse(im, ((s[0], s[1]), (s[2], s[3]), s[4]), (0, 255, 0), 1)
        i = e['iris']; cv2.ellipse(im, ((i[0], i[1]), (i[2], i[3]), i[4]), (0, 0, 255), 1)
    cv2.imwrite(f'{S}/seye{n}.png', cv2.resize(im[600:720, 440:600], None, fx=4, fy=4, interpolation=cv2.INTER_NEAREST))
json.dump(EY, open(F, 'w'), indent=0)
