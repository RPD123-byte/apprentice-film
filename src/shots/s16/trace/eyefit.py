# automatic eye fits on the flying owl: iris ellipse (dark blob), sclera outline ellipse (the thin dark ring round the
# white), catchlight. Writes ../s16-h1-work/eyes_fit.json and an overlay sheet.
import sys, json, cv2, numpy as np; sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s16-h1-tools')
import h16
S = '/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
import re
t = open('/Users/computer/rootline/apprentice-film/src/shots/s16/data/owl.js').read()
boxes = {int(m.group(1)): [int(v) for v in m.group(2).split(',')] for m in re.finditer(r'(\d+): \{box:\[([^\]]+)\]', t)}
def fit_frame(n):
    Y = h16.pre(n); x0, y0, x1, y1 = boxes[n]
    Yc = Y[y0:y1, x0:x1]; Yb = cv2.GaussianBlur(Yc, (0, 0), 1.0)
    # the owl's lit mask (to reject dark background)
    lit = (cv2.GaussianBlur(Yc, (0, 0), 4) > 0.45).astype(np.uint8)
    lit = cv2.morphologyEx(lit, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    from scipy import ndimage as ndi
    lit = ndi.binary_fill_holes(lit).astype(np.uint8)
    dark = ((Yb < 0.38) & (cv2.erode(lit, np.ones((5, 5), np.uint8)) > 0)).astype(np.uint8)
    nc, lab, st, cen = cv2.connectedComponentsWithStats(dark)
    cands = []
    for i in range(1, nc):
        a = st[i, 4]
        if a < 120 or a > 2500: continue
        cs, _ = cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = max(cs, key=len)
        if len(c) < 12: continue
        (cx, cy), (w, h), ang = cv2.fitEllipse(c)
        fill = a / (np.pi * w * h / 4 + 1e-6)
        if fill < 0.6 or max(w, h) / max(1, min(w, h)) > 1.6: continue
        cands.append(dict(cx=cx, cy=cy, w=w, h=h, ang=ang, area=int(a), fill=float(fill)))
    cands.sort(key=lambda d: -d['area'])
    eyes = []
    for d in cands[:2]:
        cx, cy = d['cx'], d['cy']; ri = (d['w'] + d['h']) / 4
        # sclera outline: along rays, the darkest point beyond the white ring
        pts = []
        for k in range(90):
            th = 2 * np.pi * k / 90; dx, dy = np.cos(th), np.sin(th)
            rs = np.arange(ri + 2, ri * 2.6, 0.5)
            xs = cx + dx * rs; ys = cy + dy * rs
            ok = (xs >= 0) & (ys >= 0) & (xs < Yc.shape[1] - 1) & (ys < Yc.shape[0] - 1)
            if ok.sum() < 5: continue
            v = cv2.remap(Yb, xs[ok].astype(np.float32)[None], ys[ok].astype(np.float32)[None], cv2.INTER_LINEAR)[0]
            r_ = rs[ok]
            # first the white (> 0.75), then the dark ring minimum below 0.62
            wi = np.nonzero(v > 0.72)[0]
            if len(wi) == 0: continue
            j0 = wi[0]
            seg = v[j0:]
            if len(seg) < 3: continue
            j = j0 + int(np.argmin(seg[:int(ri * 1.2 / 0.5)]))
            if v[j] > 0.62: continue
            pts.append((cx + dx * r_[j], cy + dy * r_[j]))
        sc = None
        if len(pts) > 20:
            P = np.array(pts, np.float32)
            e = cv2.fitEllipse(P)
            # one refit without the worst quarter
            (ex, ey), (ew, eh), ea = e
            cth, sth = np.cos(np.radians(ea)), np.sin(np.radians(ea))
            q = P - [ex, ey]; u = (q[:, 0] * cth + q[:, 1] * sth) / (ew / 2); w_ = (-q[:, 0] * sth + q[:, 1] * cth) / (eh / 2)
            res = np.abs(np.hypot(u, w_) - 1)
            keep = res < np.quantile(res, 0.75)
            if keep.sum() > 12: e = cv2.fitEllipse(P[keep])
            sc = [e[0][0] + x0, e[0][1] + y0, e[1][0], e[1][1], e[2]]
        # catchlight: brightest small blob inside the iris
        m = np.zeros(Yc.shape, np.uint8); cv2.ellipse(m, ((cx, cy), (d['w'], d['h']), d['ang']), 1, -1)
        br = ((Yb > 0.7) & (m > 0)).astype(np.uint8)
        nb, lb, sb, cb = cv2.connectedComponentsWithStats(br)
        cat = None
        if nb > 1:
            i = 1 + int(np.argmax(sb[1:, 4])); cat = [float(cb[i][0] + x0), float(cb[i][1] + y0), float(np.sqrt(sb[i, 4] / np.pi))]
        eyes.append(dict(iris=[cx + x0, cy + y0, d['w'], d['h'], d['ang']], sclera=sc, catch=cat, fill=d['fill']))
    return eyes
out = {}
tiles = []
for n in [int(v) for v in sys.argv[1].split(',')] if len(sys.argv) > 1 else list(range(1148, 1162)):
    E = fit_frame(n); out[n] = E
    x0, y0, x1, y1 = boxes[n]
    im = cv2.cvtColor((np.clip(h16.pre(n), 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    cx = int(np.mean([e['iris'][0] for e in E])) if E else (x0 + x1) // 2; cy = int(np.mean([e['iris'][1] for e in E])) if E else (y0 + y1) // 2
    for e in E:
        i = e['iris']; cv2.ellipse(im, ((i[0], i[1]), (i[2], i[3]), i[4]), (0, 0, 255), 1)
        if e['sclera']: s = e['sclera']; cv2.ellipse(im, ((s[0], s[1]), (s[2], s[3]), s[4]), (0, 255, 0), 1)
        if e['catch']: c = e['catch']; cv2.circle(im, (int(c[0]), int(c[1])), max(1, int(c[2])), (255, 0, 0), 1)
    crop = im[max(0, cy - 70):cy + 70, max(0, cx - 110):cx + 110]
    crop = cv2.resize(crop, (440, 280)); cv2.putText(crop, str(n), (4, 16), 0, 0.5, (0, 255, 255), 1); tiles.append(crop)
    print(n, [(round(e['iris'][0]), round(e['iris'][1]), round(e['iris'][2]), round(e['iris'][3]), e['sclera'] and [round(v) for v in e['sclera'][:4]]) for e in E])
while len(tiles) % 4: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(S + '/eyefit.jpg', np.vstack([np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)]))
json.dump(out, open('/Users/computer/rootline/apprentice-film/snapshots/s16-h1-work/eyes_fit.json', 'w'), indent=0)
