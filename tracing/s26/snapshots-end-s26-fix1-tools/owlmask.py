# owlmask.py: full-res source owl masks for s26 C-F (measurement only).
import cv2, numpy as np, re
ROOT = '/Users/computer/rootline/apprentice-film/'
S = ROOT + 'snapshots/s26c-meas/src/'
CLEAN = cv2.imread(ROOT + 'snapshots/end-s26-fix1-meas/cleanpage.png').astype(np.float32)
PA = [[112.7, 0.8219, 166.7, 100.5], [112.9, 0.8288, 165.8, 101.5], [113.1, 0.8505, 147.1, 91.6], [113.3, 0.8869, 110.1, 72.4],
      [113.45, 0.9211, 70.6, 52.0], [113.6, 0.9385, 55.2, 39.3], [113.8, 0.9616, 35.8, 25.7], [114.05, 0.9792, 18.9, 13.7],
      [114.3, 0.9912, 9.0, 6.7], [114.5, 0.9953, 5.1, 2.8], [114.7, 0.9992, 0.8, 0.4], [114.9, 1, 0, 0]]
MC = [0.83968, -0.00218, 149.22488, 0.00218, 0.83968, 91.48709]  # colour page px -> frame in C (hippie page px)
def arrival(t):
    if t <= PA[0][0]: return PA[0][1:]
    for i in range(1, len(PA)):
        if t <= PA[i][0]:
            a, b = PA[i - 1], PA[i]; u = (t - a[0]) / (b[0] - a[0]); return [a[k] + (b[k] - a[k]) * u for k in (1, 2, 3)]
    return [1, 0, 0]
def src(F): return cv2.imread(S + f'{F}.png')
def oldmask(F):
    try: m = np.fromfile(ROOT + f'snapshots/s26b-meas/fit/m/{F}.bin', np.uint8).reshape(473, 1103)
    except Exception: return None
    return (cv2.GaussianBlur(cv2.resize(m.astype(np.float32), (2206, 946), interpolation=cv2.INTER_LINEAR), (0, 0), 1.5) > 128).astype(np.uint8)
def pagewarp(F):
    t = F / 25
    if F <= 2817:
        # the hippie page px -> frame is MC; the clean page is in settled frame px = hippie page px (s = 1 at 114.9)
        A = np.float32([[MC[0], MC[1], MC[2]], [MC[3], MC[4], MC[5]]])
    else:
        s, tx, ty = arrival(t); A = np.float32([[s, 0, tx], [0, s, ty]])
    return cv2.warpAffine(CLEAN, A, (2206, 946), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
def pagediff(F, f=None):
    f = src(F).astype(np.float32) if f is None else f.astype(np.float32)
    w = pagewarp(F)
    return np.abs(cv2.GaussianBlur(f, (0, 0), 2) - cv2.GaussianBlur(w, (0, 0), 2)).sum(2)
import json
RIG = json.load(open(ROOT + 'snapshots/end-s26-fix1-meas/rig.json'))
def zone(F, dil=12, headk=1.6, leg=(90, 40, 120)):
    """generous owl zone for C/D (2790-2848): old mask dilated + a disc round the head (headphones, band) + a box under
    the body (the dangling legs). 2791-2794: the motion-blurred left wing is missing from the old masks -> add the zones
    of 2796/2797 (wings spread over the same place). 2790: the standing owl (no rig) -> a disc on the mask's top."""
    if 2791 <= F <= 2794: return zone0(F, dil, headk, leg) | zone0(2796, dil, headk, leg) | zone0(2797, dil, headk, leg)
    if F == 2790:
        m = oldmask(F); z = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * dil + 9, 2 * dil + 9)))
        ys, xs = np.nonzero(m); top = ys.min(); sel = ys < top + 170
        cv2.circle(z, (int(xs[sel].mean()), int(top + 95)), 135, 1, -1)
        return z
    return zone0(F, dil, headk, leg)
def zone0(F, dil=12, headk=1.6, leg=(90, 40, 120)):
    m = oldmask(F)
    z = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * dil + 1, 2 * dil + 1)))
    R = RIG[str(min(2847, max(2791, F)))]
    h = R['kh']; r = max(h['rx'], h['ry'])
    cv2.circle(z, (int(h['x']), int(h['y'])), int(headk * r), 1, -1)
    ys, xs = np.nonzero(m)
    if len(ys):
        # body bottom: lowest mask row near the body centre column
        bx = R['body']['x']; sel = np.abs(xs - bx) < 100
        yb = ys[sel].max() if sel.any() else ys.max()
        x0, x1 = int(bx - leg[0] - 20), int(bx + leg[0] + 90); cv2.rectangle(z, (x0, int(yb - leg[1])), (x1, int(yb + leg[2])), 1, -1)
        # the measured ankles (s26/owlCD.js FEET_C / FEET_D): a box round the feet and the shanks up to the body
        fx0, fy0, fx1, fy1 = feet(F)
        cv2.rectangle(z, (int(min(fx0, fx1) - 80), int(min(fy0, fy1) - 110)), (int(max(fx0, fx1) + 90), int(max(fy0, fy1) + 100)), 1, -1)
    return z
FEET_C = [[2791, 1175, 745, 1240, 718], [2800, 1190, 722, 1262, 712], [2810, 1188, 728, 1262, 716], [2817, 1182, 728, 1258, 716]]
FEET_D = [[2818, 1080, 702, 1130, 716], [2819, 1082, 700, 1130, 715], [2825, 1096, 690, 1130, 705], [2832, 1085, 685, 1160, 700], [2839, 1099, 660, 1160, 690], [2846, 1115, 670, 1190, 690]]
def feet(F):
    rows = FEET_C if F <= 2817 else FEET_D
    if F <= rows[0][0]: return rows[0][1:]
    for i in range(len(rows) - 1):
        if F <= rows[i + 1][0]:
            u = (F - rows[i][0]) / (rows[i + 1][0] - rows[i][0]); return [a + (b - a) * u for a, b in zip(rows[i][1:], rows[i + 1][1:])]
    return rows[-1][1:]
def fmask(F, thr=48, near=40, grow=3, dark=48):
    """colour owl mask (F >= 2852): frame minus the warped clean page, kept near the old half-res mask, holes filled"""
    f = src(F).astype(np.float32); w = pagewarp(F)
    # per-channel gain/offset of the page (robust fit on pixels away from the owl)
    om = oldmask(F); far = cv2.dilate(om, np.ones((81, 81), np.uint8)) == 0
    fb, wb = cv2.GaussianBlur(f, (0, 0), 2), cv2.GaussianBlur(w, (0, 0), 2)
    for c in range(3):
        a, b = wb[..., c][far], fb[..., c][far]
        A = np.vstack([a, np.ones_like(a)]).T; g, o = np.linalg.lstsq(A, b, rcond=None)[0]
        wb[..., c] = wb[..., c] * g + o
    d = np.abs(fb - wb).sum(2)
    m = (d > thr).astype(np.uint8)
    m &= cv2.dilate(om, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * near + 1, 2 * near + 1)))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] >= 40 and (om[lab == i] > 0).mean() > 0.2: keep[lab == i] = 1
    cs, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros_like(keep); cv2.drawContours(out, cs, -1, 1, -1)
    if grow: out = cv2.dilate(out, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))
    if dark:
        # a margin over the dark page round the owl (the thin dark band of the headphones over the navy is invisible to
        # the difference): traced too, it is the page itself there
        # weak differences within `dark` px of the owl (the headband over the navy, faint glitter), closed and grown
        weak = cv2.morphologyEx((d > 22).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        weak = cv2.dilate(cv2.morphologyEx(weak, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))), np.ones((7, 7), np.uint8))
        out |= cv2.dilate(out, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * dark + 1, 2 * dark + 1))) & weak
        cs, _ = cv2.findContours(out, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); out = np.zeros_like(out)
        cv2.drawContours(out, [c for c in cs if cv2.contourArea(c) > 400], -1, 1, -1)
    return out, d
_fx = open(ROOT + 'archive/prev-builds/s26-end1-prev/s26/fx.js').read()
SCK = {int(r[0]): [float(v) for v in r[1:]] for r in [l.strip('[], \n').split(',') for l in re.findall(r'\[(27\d\d,[^\]]+|28\d\d,[^\]]+)\]', _fx[:_fx.index('export const SPEED')])]}
_fc = open(ROOT + 'src/shots/s26/fieldCam.js').read()
CAM = {int(k): [float(x) for x in v.split(',')] for k, v in re.findall(r'(\d{4}): \[([^\]]+)\]', _fc)}
def sczone(F, pad=22, ring=60, echo=(1, 2)):
    """the flung scissors of frame F (blades: pivot->tip hull + pad; finger loops: discs of radius `ring` round the
    tracked loop centres of F and of the `echo` frames before it — the source trails the loops with faint echoes)"""
    z = np.zeros((946, 2206), np.uint8)
    r = SCK.get(F)
    if r is None: return z
    for (px, py, a, L, lx, ly, ux, uy) in ((r[0], r[1], r[2], r[3], r[8], r[9], r[10], r[11]), (r[4], r[5], r[6], r[7], r[12], r[13], r[14], r[15])):
        pts = np.float32([[px, py], [px + L * np.cos(a), py + L * np.sin(a)], [lx, ly], [ux, uy]])
        cv2.fillConvexPoly(z, np.int32(cv2.convexHull(pts)), 1)
    z = cv2.dilate(z, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * pad + 1, 2 * pad + 1)))
    for k in (0,) + tuple(echo):
        q = SCK.get(F - k)
        if q is None: continue
        for (lx, ly) in ((q[8], q[9]), (q[10], q[11]), (q[12], q[13]), (q[14], q[15])):
            cv2.circle(z, (int(lx), int(ly)), ring, 1, -1)
    return z
def M3(a): return np.array([[a[0], a[1], a[2]], [a[3], a[4], a[5]], [0, 0, 1]])
def ringmask(F, thr=70, sig=4):
    """D/E: where the source is not the arriving page (the ring's shards, the ghost, the lens shard, the owl)"""
    f = src(F).astype(np.float32); w = pagewarp(F)
    d = np.abs(cv2.GaussianBlur(f, (0, 0), sig) - cv2.GaussianBlur(w, (0, 0), sig)).sum(2)
    m = (d > thr).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    small = np.nonzero(st[1:, 4] < 400)[0] + 1
    if len(small): m[np.isin(lab, small)] = 0
    return m, d
_s26 = open(ROOT + 'src/shots/s26.js').read()
RD = {int(a): (float(b), float(c), float(d)) for a, b, c, d in re.findall(r'\[(28\d\d), ([\d.]+), (-?[\d.]+), (-?[\d.]+)\]', _s26[_s26.index('const RING_D = '):_s26.index(']];', _s26.index('const RING_D = ')) + 3])}
def ringA(K, F):
    """ring motion K-frame -> F-frame (RING_D: frame = s*r + t)"""
    s1, tx1, ty1 = RD[K]; s2, tx2, ty2 = RD[F]
    return np.float32([[s2 / s1, 0, tx2 - s2 * tx1 / s1], [0, s2 / s1, ty2 - s2 * ty1 / s1]])
