# Measurement composites for s20 (NOT loaded by the film). Every source frame is un-graded (grade_inv) and mapped into
# a common frame; a robust temporal median over the frames where a pixel shows the static room gives a clean view to
# trace (trace_room.py). Frames that are covered at a pixel (owl, dust, the moving card, the glint, the scissors before
# they are cleaned) are rejected by explicit masks plus a foreground test against a first-pass low percentile.
#   A.npy      setup-A frame (+ margin M): room with the scissors CLEAN (66.72–67.08), no cobwebs, no dust, no owl
#   grimy.npy  setup-A frame: scissors + cobweb area only, as they are before the owl reaches them (63.12–64.32)
#   B2.npy     setup-B2 frame (67.52–69.40, its own coordinates + margin): the redrawn room; under the held owl it
#              is filled from A warped by the measured B2 camera
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import grade_inv as G
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s20-rev1-src/n%d.png'
OUT = '/Users/computer/rootline/apprentice-film/snapshots/s20-f2-trace'
M = 60; W, H = 2206, 946; WW, HH = W + 2 * M, H + 2 * M
B1 = [0.9846, -0.0002, 0.0000, 0.9703, 0.95, -3.6]
B2 = [0.9910, -0.0004, -0.0004, 0.9646, -8.15, 1.3]
def camA(n):
    return None if n < 1671 else B1
def affine_to(c):
    """cv2 inverse map: dst (X,Y) in A-frame+margin -> src pixel in a frame whose camera is c (A -> frame)."""
    if c is None: return np.array([[1, 0, -M], [0, 1, -M]], np.float32)
    a, b, cc, d, e, ff = c
    return np.array([[a, cc, e - a * M - cc * M + 0], [b, d, ff - b * M - d * M]], np.float32)
def pre(n):
    g = cv2.cvtColor(cv2.imread(SRC % n), cv2.COLOR_BGR2GRAY)
    f = G.inverse(g, n / 25).astype(np.float32)
    # setup B1 (66.84–67.48) shows the A drawing with a mid-tone dip, measured B = A·(0.88 + 0.12·A): normalise to A
    if 1671 <= n < 1688: f = b1_to_a(f)
    return f
def b1_to_a(b):
    return np.clip((-0.88 + np.sqrt(0.7744 + 0.48 * np.clip(b, 0, 1))) / 0.24, 0, 1).astype(np.float32)
def to_margin(f, A):
    img = cv2.warpAffine(f, A, (WW, HH), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderValue=0)
    val = cv2.warpAffine(np.ones_like(f), A, (WW, HH), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderValue=0) > 0.999
    return img, val
def poly_mask(polys, grow=0):
    m = np.zeros((HH, WW), np.uint8)
    for P in polys: cv2.fillPoly(m, [np.array([[x + M, y + M] for x, y in P], np.int32)], 1)
    if grow: m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1)))
    return m > 0
# scissors + cobweb area in the A frame (generous), dust cloud box, card quads (s20.js cardQuad)
SC_POLY = [(555, 245), (705, 250), (795, 275), (805, 450), (835, 600), (905, 675), (995, 755), (995, 835), (885, 905), (755, 905), (700, 710), (635, 565), (555, 490)]
DUST = [(630, 360), (1080, 360), (1080, 880), (630, 880)]
CARD_Q0 = [[1040, 232], [1245, 197], [1346, 748], [1144, 674]]
CARD_Q1 = [[1305, 247], [1503, 222], [1444, 813], [1227, 722]]
CARD_F = [[63.12, 0], [63.16, 0.063], [63.2, 0.138], [63.24, 0.224], [63.28, 0.351], [63.32, 0.48], [63.36, 0.647], [63.4, 0.99], [63.44, 1]]
def card_quad(t):
    f = 1
    if t < 63.44:
        f = 0
        for i in range(1, len(CARD_F)):
            if t < CARD_F[i][0] + 1e-6:
                (ta, fa), (tb, fb) = CARD_F[i - 1], CARD_F[i]; f = fa + (fb - fa) * min(1, max(0, (t - ta) / (tb - ta))); break
    lift = -15 * np.sin(np.pi * f)
    return [(p[0] + (q[0] - p[0]) * f + (8 if i in (1, 2) else 0), p[1] + (q[1] - p[1]) * f + lift) for i, (p, q) in enumerate(zip(CARD_Q0, CARD_Q1))]

def robust(frames, loader, excl, fg_thr=0.07, fg_grow=12, pct=15):
    S = np.full((len(frames), HH, WW), np.nan, np.float32)
    for k, n in enumerate(frames):
        img, val = loader(n)
        img[~val] = np.nan
        e = excl(n)
        if e is not None: img[e] = np.nan
        S[k] = img
    bg1 = np.nanpercentile(S, pct, axis=0)
    b1 = cv2.GaussianBlur(np.nan_to_num(bg1), (0, 0), 2)
    se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * fg_grow + 1, 2 * fg_grow + 1))
    bad1 = np.isnan(bg1)
    for k in range(len(frames)):
        fk = cv2.GaussianBlur(np.nan_to_num(S[k]), (0, 0), 2)
        d = np.abs(fk - b1) > fg_thr
        # only where both the frame and the reference are real data (not near an excluded area)
        inval = cv2.dilate((np.isnan(S[k]) | bad1).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        d &= ~inval
        fg = cv2.dilate(d.astype(np.uint8), se)
        S[k][fg > 0] = np.nan
    cnt = np.sum(~np.isnan(S), axis=0)
    with np.errstate(all='ignore'):
        med = np.nanmedian(S, axis=0)
    return med, bg1, cnt

def inpaint(med, cnt, need=2, dark=None):
    hole = (np.isnan(med) | (cnt < need)).astype(np.uint8)
    u = np.clip(np.nan_to_num(med) * 255, 0, 255).astype(np.uint8)
    f = cv2.inpaint(u, hole, 5, cv2.INPAINT_TELEA).astype(np.float32) / 255
    if dark is not None:
        # large never-seen areas (always behind the owl): near-black, feathered into the inpaint at their rims
        dt = cv2.distanceTransform(hole, cv2.DIST_L2, 5)
        k = np.clip((dt - 4) / 10, 0, 1)
        f = f * (1 - k) + np.minimum(f, dark) * k
    return np.where(hole > 0, f, np.nan_to_num(med))

# the owl's extent per stretch of frames (A frame, generous; measured on the source strips / moving-pixel boxes)
OWL_BOX = [(1578, 1591, [[1000, 400, 1350, 940]]), (1592, 1595, [[930, 390, 1360, 940]]), (1596, 1607, [[900, 390, 1320, 940]]),
           (1608, 1609, [[850, 380, 1300, 940]]), (1610, 1639, [[640, 330, 1000, 940], [1000, 385, 1250, 940]]),
           (1640, 1644, [[850, 290, 1310, 940]]), (1645, 1677, [[930, 280, 1320, 940]])]
_KEYMASK = {}
_SEL = None
def key_owl_mask(n):
    # the owl's own silhouette on this frame, from the film's own per-frame choice (data/owlframes.js: a held key
    # through its measured affine, or a single-frame trace), grown 10 px; None where the rig draws the owl
    global _SEL
    import json
    if _SEL is None:
        _SEL = {}
        p = os.path.join(os.path.dirname(__file__), '..', 'data', 'owlframes.js')
        if os.path.exists(p):
            for line in open(p):
                line = line.strip()
                if line.startswith('"'):
                    t = line.split('"')[1]; _SEL[t] = json.loads('[' + line.split('[', 1)[1].rstrip(',').rstrip(']') + ']')
    w = _SEL.get('%.2f' % (n / 25))
    if not w: return None
    k = w[0]
    if not os.path.exists(OUT + '/key_%s_mask.npy' % k): return None
    if k not in _KEYMASK: _KEYMASK[k] = np.load(OUT + '/key_%s_mask.npy' % k).astype(np.uint8)
    a, b, c, d, e, f = w[1:7]
    if len(w) > 8 and w[8] == 'screen':
        cam = camA(n)                                  # screen coords -> A frame: inverse camera
        if cam is not None:
            A = np.array([[cam[0], cam[2], cam[4]], [cam[1], cam[3], cam[5]], [0, 0, 1]]); Ai = np.linalg.inv(A)
            a, c, e = Ai[0]; b, d, f = Ai[1]
    Mm = np.array([[a, c, e + M - a * M - c * M], [b, d, f + M - b * M - d * M]], np.float32)
    m = cv2.warpAffine(_KEYMASK[k], Mm, (WW, HH), flags=cv2.INTER_NEAREST)
    return cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))) > 0

def owl_box(n):
    km = key_owl_mask(n)
    if km is not None: return km
    for a, b, bxs in OWL_BOX:
        if a <= n <= b:
            return poly_mask([[(x0, y0), (x1, y0), (x1, y1), (x0, y1)] for x0, y0, x1, y1 in bxs])
    return None

def build_A():
    frames = [n for n in range(1578, 1678)]            # 63.12 .. 67.08 (A + B1 before the crouch)
    loader = lambda n: to_margin(pre(n), affine_to(camA(n)))
    sc = poly_mask([SC_POLY], 4); dust = poly_mask([DUST]); q1 = poly_mask([CARD_Q1], 10)
    def excl(n):
        t = n / 25; e = np.zeros((HH, WW), bool)
        if n < 1668: e |= sc                          # scissors only once clean (66.72 on)
        if 1609 <= n < 1668: e |= dust                 # the dust cloud and its haze (64.36–66.70)
        if n >= 1586: e |= q1                          # the card at rest
        else: e |= poly_mask([card_quad(t)], 12)
        ob = owl_box(n)
        if ob is not None: e |= ob
        return e
    med, bg1, cnt = robust(frames, loader, excl, fg_thr=0.10, fg_grow=6, pct=30)
    return inpaint(med, cnt, dark=0.02), cnt

def build_card():
    # the card at rest (63.44 on), with its rim and edge strip: everything inside Q1 grown by 16 px
    frames = [n for n in range(1586, 1678)]
    loader = lambda n: to_margin(pre(n), affine_to(camA(n)))
    q = poly_mask([CARD_Q1], 16); dust = poly_mask([DUST])
    def excl(n):
        e = ~q
        ob = owl_box(n)
        if ob is not None: e |= ob
        if 1609 <= n < 1668: e |= dust
        return e
    med, bg1, cnt = robust(frames, loader, excl, fg_thr=0.10, fg_grow=6, pct=30)
    return inpaint(med, cnt), cnt

def build_behindcard():
    # what the moving card uncovers during the push (63.12–63.40): frames 1578–1585 outside the card and the owl
    frames = [n for n in range(1578, 1587)]
    loader = lambda n: to_margin(pre(n), affine_to(None))
    q = poly_mask([CARD_Q1], 16)
    def excl(n):
        e = ~q
        e |= poly_mask([card_quad(n / 25)], 10)
        ob = owl_box(n)
        if ob is not None: e |= ob
        return e
    med, bg1, cnt = robust(frames, loader, excl, fg_thr=0.10, fg_grow=6, pct=30)
    return inpaint(med, cnt, dark=0.02), cnt

def build_grimy():
    frames = [n for n in range(1578, 1609)]            # 63.12 .. 64.32
    loader = lambda n: to_margin(pre(n), affine_to(None))
    sc = poly_mask([SC_POLY], 4)
    def excl(n):
        e = ~sc
        e |= poly_mask([card_quad(n / 25)], 12)
        ob = owl_box(n)
        if ob is not None: e |= ob
        return e
    med, bg1, cnt = robust(frames, loader, excl, fg_thr=0.10, fg_grow=6, pct=30)
    return inpaint(med, cnt), cnt

# the held owl + scissors + glint in the B2 frame (generous)
HOLD = [(700, 60), (1330, 60), (1340, 420), (1330, 900), (700, 900), (690, 460)]
GLINT = [(1020, 20), (1320, 20), (1320, 330), (1020, 330)]
def build_B2(A):
    frames = [n for n in range(1696, 1735)]            # 67.84 .. 69.36 (the hold)
    loader = lambda n: to_margin(pre(n), affine_to(None))
    hold = poly_mask([HOLD]); gl = poly_mask([GLINT])
    def excl(n):
        e = hold.copy()
        if n <= 1727: e |= gl
        return e
    med, bg1, cnt = robust(frames, loader, excl)
    # A warped by B2 into the B2 frame (+margin): X_b = B2 · X_a
    a, b, c, d, e, f = B2
    Mf = np.array([[a, c, e], [b, d, f]], np.float64)
    T = np.array([[1, 0, M], [0, 1, M], [0, 0, 1]]); Ti = np.array([[1, 0, -M], [0, 1, -M], [0, 0, 1]])
    Mm = (T @ np.vstack([Mf, [0, 0, 1]]) @ Ti)[:2].astype(np.float32)
    Aw = cv2.warpAffine(A, Mm, (WW, HH), flags=cv2.INTER_LINEAR, borderValue=0)
    out = np.where(np.isnan(med) | (cnt < 3), Aw, med)
    return out, cnt, Aw

def build_B2full():
    # the hold is one static drawing 68.04–69.36: plain median (the glint area from 69.08 on, after it has gone)
    frames = [n for n in range(1701, 1735)]
    loader = lambda n: to_margin(pre(n), affine_to(None))
    gl = poly_mask([GLINT])
    S = np.full((len(frames), HH, WW), np.nan, np.float32)
    for k, n in enumerate(frames):
        img, val = loader(n); img[~val] = np.nan
        if n <= 1726: img[gl] = np.nan
        S[k] = img
    with np.errstate(all='ignore'):
        med = np.nanmedian(S, axis=0)
    return np.nan_to_num(med)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    which = sys.argv[1:] or ['A', 'grimy', 'B2']
    if 'A' in which:
        A, cnt = build_A(); np.save(OUT + '/A.npy', A.astype(np.float32)); np.save(OUT + '/A_cnt.npy', cnt.astype(np.int16))
        cv2.imwrite(OUT + '/A.png', np.clip(A * 255, 0, 255).astype(np.uint8)); cv2.imwrite(OUT + '/A_cnt.png', np.clip(cnt * 4, 0, 255).astype(np.uint8))
        print('A done; pixels with <3 clean', int((cnt < 3).sum()))
    if 'grimy' in which:
        g, cnt = build_grimy(); np.save(OUT + '/grimy.npy', g.astype(np.float32))
        cv2.imwrite(OUT + '/grimy.png', np.clip(g * 255, 0, 255).astype(np.uint8)); print('grimy done')
    if 'B2' in which:
        A = np.load(OUT + '/A.npy')
        b, cnt, Aw = build_B2(A); np.save(OUT + '/B2.npy', b.astype(np.float32))
        cv2.imwrite(OUT + '/B2.png', np.clip(b * 255, 0, 255).astype(np.uint8)); print('B2 done')
    if 'card' in which:
        c, cnt = build_card(); np.save(OUT + '/card.npy', c.astype(np.float32)); np.save(OUT + '/card_cnt.npy', cnt.astype(np.int16))
        cv2.imwrite(OUT + '/card.png', np.clip(c * 255, 0, 255).astype(np.uint8)); print('card done')
    if 'full' in which:
        A = np.load(OUT + '/A.npy'); c = np.load(OUT + '/card.npy'); q = poly_mask([CARD_Q1], 16)
        # feather the seam over 3 px
        k = cv2.GaussianBlur(q.astype(np.float32), (0, 0), 1.2)
        F = A * (1 - k) + c * k
        np.save(OUT + '/Afull.npy', F.astype(np.float32)); cv2.imwrite(OUT + '/Afull.png', np.clip(F * 255, 0, 255).astype(np.uint8)); print('full done')
    if 'behind' in which:
        b, cnt = build_behindcard(); np.save(OUT + '/behind.npy', b.astype(np.float32))
        cv2.imwrite(OUT + '/behind.png', np.clip(b * 255, 0, 255).astype(np.uint8)); print('behind done')
    if 'B2full' in which:
        b = build_B2full(); np.save(OUT + '/B2full.npy', b.astype(np.float32))
        cv2.imwrite(OUT + '/B2full.png', np.clip(b * 255, 0, 255).astype(np.uint8)); print('B2full done')
