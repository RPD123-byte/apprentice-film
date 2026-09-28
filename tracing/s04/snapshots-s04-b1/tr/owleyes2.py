# owleyes2.py : the owl's eyes per source frame through the turn (21.68-22.36), continuing owlface.js's FACE_FRAMES
# (which ends at 21.64): each eye = its dark iris blob (paint < thr) near the flow-predicted position, fitted with an
# ellipse; catchlights = the bright blobs inside it. Writes JSON of [cx, cy, a, b, angle, [[x, y, r], ...]] per eye
# (null when the eye is hidden) and a debug sheet.
import cv2, numpy as np, json, sys
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s04-b1/tr')
from grade import degrade
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
def frame(fi):
    cap.set(1, fi); ok, f = cap.read(); g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32); return g, degrade(g, fi / 25)
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
eyes = [[1861.2, 357.0], [1950.4, 362.6]]   # 21.64 (owlface.js)
g0, P0 = frame(541)
out = {}; dbg = []
for fi in range(542, 561):
    g1, P1 = frame(fi)
    fl = dis.calc(g0.astype(np.uint8), g1.astype(np.uint8), None)
    res = []
    for k, e in enumerate(eyes):
        if e is None: res.append(None); continue
        x, y = int(round(e[0])), int(round(e[1]))
        if not (0 <= x < 2206 and 0 <= y < 946): res.append(None); eyes[k] = None; continue
        dx, dy = np.median(fl[max(0, y - 15):y + 15, max(0, x - 15):x + 15].reshape(-1, 2), axis=0)
        px, py = e[0] + dx, e[1] + dy
        R = 45; x0, y0 = int(max(0, px - R)), int(max(0, py - R)); x1, y1 = int(min(2206, px + R)), int(min(946, py + R))
        sub = cv2.GaussianBlur(P1[y0:y1, x0:x1], (0, 0), 1.0)
        m = (sub < 75).astype(np.uint8)
        n, lab, st, cen = cv2.connectedComponentsWithStats(m)
        best = None
        for j in range(1, n):
            a = st[j, cv2.CC_STAT_AREA]
            if a < 150 or a > 2600: continue
            cx, cy = cen[j][0] + x0, cen[j][1] + y0
            d = np.hypot(cx - px, cy - py)
            ww, hh = st[j, cv2.CC_STAT_WIDTH], st[j, cv2.CC_STAT_HEIGHT]
            fill = a / max(1, ww * hh)
            if fill < 0.45 or max(ww, hh) > 3.2 * min(ww, hh): continue
            sc = d - 0.004 * a
            if best is None or sc < best[0]: best = (sc, j, d)
        if best is None or best[2] > 30: res.append(None); eyes[k] = None; continue
        j = best[1]
        # fill holes (catchlights) before fitting
        blob = (lab == j).astype(np.uint8)
        filled = blob.copy(); cs, _ = cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(filled, cs, -1, 1, -1)
        c = max(cs, key=cv2.contourArea)
        (ex, ey), (ea, eb), ang = cv2.fitEllipse(c)
        ex += x0; ey += y0
        # catchlights: bright blobs inside the filled iris
        inside = (filled > 0) & (sub > 170)
        n2, lab2, st2, cen2 = cv2.connectedComponentsWithStats(inside.astype(np.uint8))
        hl = []
        for q in range(1, n2):
            if st2[q, cv2.CC_STAT_AREA] < 3: continue
            hl.append([round(float(cen2[q][0] + x0), 1), round(float(cen2[q][1] + y0), 1), round(float(np.sqrt(st2[q, cv2.CC_STAT_AREA] / np.pi)), 1)])
        hl.sort(key=lambda h: -h[2]); hl = hl[:2]
        res.append([round(float(ex), 1), round(float(ey), 1), round(float(ea / 2), 1), round(float(eb / 2), 1), round(float(ang), 1), hl])
        eyes[k] = [ex, ey]
    out[f'{fi / 25:.2f}'] = res
    print(f'{fi / 25:.2f}', res, flush=True)
    vis = cv2.cvtColor(g1.astype(np.uint8), cv2.COLOR_GRAY2BGR)
    for r in res:
        if r: cv2.ellipse(vis, ((r[0], r[1]), (2 * r[2], 2 * r[3]), r[4]), (0, 0, 255), 1); [cv2.circle(vis, (int(h[0]), int(h[1])), max(1, int(h[2])), (0, 255, 0), 1) for h in r[5]]
    xs = [r[0] for r in res if r] or [1900]; cx = int(np.mean(xs)); x0 = max(0, min(2206 - 300, cx - 150))
    dbg.append(cv2.resize(vis[200:500, x0:x0 + 300], (300, 300)))
    g0 = g1
json.dump(out, open('/Users/computer/rootline/apprentice-film/snapshots/s04-b1/tr/owleyes2.json', 'w'))
while len(dbg) % 5: dbg.append(np.zeros_like(dbg[0]))
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/s04-b1/owleyes2.jpg', np.vstack([np.hstack(dbg[i:i + 5]) for i in range(0, len(dbg), 5)]))
