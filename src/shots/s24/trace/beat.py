# Per-frame measurement for the speed-line beats: line angle, speed lines (as bars), and the bright non-line
# objects (scissors, glints) as tone traces. Output: out/lines_kNN.json. Measurement only.
import sys, json, os; sys.path.insert(0, '.')
from common import *
from lines import objects
from lines3 import detect3, to_frame3
from track_lines import track, merge_collinear
from tone import trace
from mask import silhouette
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
def med_angle(u, occ):
    m = ((cv2.GaussianBlur(u, (0, 0), 0.8) > 40) & (occ == 0)).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(m, connectivity=4)
    angs = []; wts = []
    for i in range(1, n):
        if st[i, 4] < 150: continue
        ys, xs = np.nonzero(lab[st[i, 1]:st[i, 1] + st[i, 3], st[i, 0]:st[i, 0] + st[i, 2]] == i)
        pts = np.stack([xs, ys], 1).astype(np.float64)
        C = np.cov((pts - pts.mean(0)).T); ev, evec = np.linalg.eigh(C)
        L = np.sqrt(12 * ev[1]); Wd = np.sqrt(12 * max(ev[0], 1e-9))
        if L < 120 or Wd > 14 or L / Wd < 12: continue
        d = evec[:, 1]; angs.append(np.degrees(np.arctan2(d[1], d[0])) % 180); wts.append(L)
    if len(angs) < 5: return None
    a = np.array(angs); w = np.array(wts); o = np.argsort(a); cw = np.cumsum(w[o]) / w.sum()
    return float(a[o][np.searchsorted(cw, 0.5)])
OBJ_LEVELS = [14, 70, 140, 200, 232]
def process(k, occ, theta=None, objs=True, tag='', field=None):
    u = U(k) if field is None else field
    th = theta or med_angle(u, occ) or 32.3
    obj = objects(u, occ, th) if objs else np.zeros_like(occ)
    occ2 = (occ | obj).astype(np.uint8)
    # lines are measured above the local haze (the lit margins of the framed-screen frames): a 31 px grey opening
    # removes the lines and keeps the haze
    bgm = cv2.GaussianBlur(cv2.morphologyEx(u, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))), (0, 0), 4)
    ul = np.clip(u - bgm, 0, None).astype(np.float32)
    bars, R, O = detect3(ul, occ2, th)
    caps = track(to_frame3(bars, th), ul, occ2)
    caps = track([c[:4] + [c[4], float(np.mean(c[5]))] for c in caps], ul, occ2)
    caps = merge_collinear(caps, ul)
    caps = track([c[:4] + [c[4], float(np.mean(c[5]))] for c in caps], ul, occ2)
    res = {'k': k, 'theta': th, 'lines': [[round(float(x), 2) for x in c[:5]] + [[round(v, 1) for v in c[5]]] + c[6:] for c in caps]}
    if objs and obj.any():
        # silhouette of the objects: lit pixels inside the object mask, closed so keylines stay opaque
        lit = ((cv2.GaussianBlur(u, (0, 0), 1.0) > 14) & (obj > 0)).astype(np.uint8)
        sil = cv2.morphologyEx(lit, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
        sil = cv2.dilate(sil, np.ones((3, 3), np.uint8)) & obj
        L = trace(u, sil, OBJ_LEVELS, sigma=0.9, eps=0.5, min_area=4.0)
        res['obj'] = [{'t': l['t'], 'v': round(l['v'], 1), 'paths': [p.round(2).tolist() for p in l['paths']]} for l in L]
    json.dump(res, open(f'{OUT}/lines{tag}_k{k:02d}.json', 'w'))
    return k, th, len(caps)
