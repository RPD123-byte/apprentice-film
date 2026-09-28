# The owl's held key drawings in s20 (MEASUREMENT script, not loaded by the film). For each key: the median of the
# source frames where the drawing is held (un-graded, in the setup-A frame), its silhouette (difference against the
# traced room composite, inside a hand-set region, holes filled), then the same tracer as the room -> data module
# src/shots/s20/data/owl_<key>.js (value bands + ink centre-lines + silhouette rings). `fit` prints the affine that
# places a key on each listed frame (ECC on the silhouette): the film draws the key through it.
#   python3 owlkeys.py build rear|front|stare1|stare2|flap0..3|flapbody      python3 owlkeys.py fit KEY n1,n2,...
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
import composite2 as C, trace_room as T, trace_all as TA
M = C.M; OUT = C.OUT
def frameA(n):
    cam = C.camA(n) if n < 1685 else None
    f, _ = C.to_margin(C.pre(n), C.affine_to(cam)); return f
KEYS = {
    # frames held, region (A frame px) the silhouette must lie in
    'rear': dict(frames=list(range(1586, 1591)), poly=[(1030, 395), (1350, 395), (1375, 560), (1400, 620), (1395, 700), (1340, 780), (1300, 900), (1080, 900), (1030, 700)],
                 bridge=([(1250, 540), (1400, 560), (1400, 720), (1300, 760), (1250, 700)], 31)),
    'front': dict(frames=list(range(1599, 1606)), poly=[(975, 400), (1300, 400), (1305, 650), (1270, 860), (1200, 910), (1040, 910), (975, 700)]),
    'stare1': dict(frames=list(range(1650, 1665)), poly=[(985, 280), (1310, 280), (1318, 620), (1300, 880), (1200, 920), (1010, 920), (985, 700)]),
    'stare2': dict(frames=list(range(1668, 1678)), poly=[(985, 280), (1310, 280), (1318, 620), (1300, 880), (1200, 920), (1010, 920), (985, 700)]),
}
# the flap: the body is one static drawing 64.64–65.40, the wing a 4-frame loop (phase = (n − 1616) mod 4): one key per
# phase, the median of that phase over the first three loops (least dust)
FLAP_POLY = [(840, 395), (1000, 380), (1100, 440), (1200, 560), (1215, 720), (1150, 850), (900, 850), (870, 760), (820, 740), (740, 732), (712, 660), (728, 575), (800, 535), (850, 470)]
for ph in range(4):
    KEYS['flap%d' % ph] = dict(frames=[1616 + ph, 1620 + ph, 1624 + ph], poly=FLAP_POLY, bright=(0.7, 905))

def silhouette(ref, room, poly, thr=0.07, bridge=None, bright=None):
    reg = C.poly_mask([poly])
    d = np.abs(cv2.GaussianBlur(ref, (0, 0), 1.5) - cv2.GaussianBlur(room, (0, 0), 1.5))
    # where the room composite never saw the background (always behind the owl) its value is a guess: there the owl
    # is what is bright
    q = C.poly_mask([C.CARD_Q1], 16)
    seen = np.where(q, np.load(OUT + '/card_cnt.npy') >= 2, np.load(OUT + '/A_cnt.npy') >= 2)
    seen = cv2.erode(seen.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    m = (((d > thr) & seen) | ((cv2.GaussianBlur(ref, (0, 0), 1.5) > 0.4) & ~seen)) & reg
    if bright:
        # the flap: grey dust clouds sit round the white wing — left of x0 only the bright plumage counts
        lvl, x0 = bright
        left = np.zeros_like(m); left[:, :x0 + M] = True
        m = np.where(left, (cv2.GaussianBlur(ref, (0, 0), 1.5) > lvl) & reg, m)
    m = m.astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    if bridge:
        # white-on-white (a wing over the card): the feather lines differ, the fill between them does not — bridge them
        bp, k = bridge
        br = C.poly_mask([bp]).astype(np.uint8)
        mb = cv2.morphologyEx(m * br, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
        m = m | (mb & br)
    ff = m.copy(); mm = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8); cv2.floodFill(ff, mm, (0, 0), 1); m = m | (1 - ff)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    if n > 1:
        big = max(range(1, n), key=lambda i: st[i, 4])
        keep[lab == big] = 1
    return keep

def build(name, frames=None):
    K = KEYS[name]; frames = frames or K['frames']
    ref = np.median(np.stack([frameA(n) for n in frames]), axis=0).astype(np.float32)
    room = np.load(OUT + '/Afull.npy')
    m = silhouette(ref, room, K['poly'], bridge=K.get('bridge'), bright=K.get('bright'))
    np.save(OUT + '/key_%s.npy' % name, ref); np.save(OUT + '/key_%s_mask.npy' % name, m)
    md = cv2.dilate(m, np.ones((5, 5), np.uint8))
    tr, _ = T.trace(ref, md, **TA.P)
    cs, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    rings = [(cv2.approxPolyDP(c, 0.8, True)[:, 0, :] - M + 0.5).ravel().tolist() for c in cs if cv2.contourArea(c) > 30]
    ys, xs = np.nonzero(m)
    box = [int(xs.min() - M - 4), int(ys.min() - M - 4), int(xs.max() - M + 5), int(ys.max() - M + 5)]
    TA.finalize('owl_' + name, 'OWL_' + name.upper(), tr, ref, md, extra={'mask': rings, 'box': box})
    v = cv2.cvtColor(np.clip(ref * 255, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    cs2, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(v, cs2, -1, (0, 0, 255), 1)
    x0, y0, x1, y1 = box
    cv2.imwrite(OUT + '/key_%s.png' % name, v[M + y0 - 20:M + y1 + 20, M + x0 - 20:M + x1 + 20])

def fit(name, targets, mode=cv2.MOTION_AFFINE):
    ref = np.load(OUT + '/key_%s.npy' % name); m = np.load(OUT + '/key_%s_mask.npy' % name)
    ys, xs = np.nonzero(m); x0, y0, x1, y1 = xs.min() - 40, ys.min() - 40, xs.max() + 40, ys.max() + 40
    tpl = ref[y0:y1, x0:x1]; mk = cv2.dilate(m[y0:y1, x0:x1], np.ones((9, 9), np.uint8))
    res = {}
    for n in targets:
        cur = frameA(n)[y0:y1, x0:x1]
        best = None
        # try from identity and from a translation-only start
        for init in ('I', 'T'):
            w = np.eye(2, 3, dtype=np.float32)
            try:
                if init == 'T':
                    _, w = cv2.findTransformECC(tpl, cur, w, cv2.MOTION_TRANSLATION, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), mk, 9)
                cc, w = cv2.findTransformECC(tpl, cur, w, mode, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-7), mk, 5)
                if best is None or cc > best[0]: best = (cc, w.copy())
            except cv2.error: pass
        if best is None: print('%.2f fail' % (n / 25)); continue
        cc, w = best
        # express in frame px: X = W·(x − o) + o with o = crop origin in margin coords − M
        ox, oy = x0 - M, y0 - M
        a, c, e = w[0]; b, d, f = w[1]
        E = e + ox - a * ox - c * oy; F = f + oy - b * ox - d * oy
        res['%.2f' % (n / 25)] = [round(float(v), 4) for v in (a, b, c, d, E, F)] + [round(float(cc), 3)]
        print('%.2f cc %.3f' % (n / 25, cc), res['%.2f' % (n / 25)][:6])
    return res

if __name__ == '__main__':
    if sys.argv[1] == 'build':
        for k in sys.argv[2:]: build(k)
    elif sys.argv[1] == 'fit':
        r = fit(sys.argv[2], [int(v) for v in sys.argv[3].split(',')])
        p = OUT + '/fits_%s.json' % sys.argv[2]
        old = json.load(open(p)) if os.path.exists(p) else {}
        old.update(r); json.dump(old, open(p, 'w'), indent=0)

# ---------------------------------------------------------------- single-frame traces (the fast action frames)
# The expected room for frame n is the film's own render of s20 at n with the owl and its props switched off
# (shot.debug.noOwl, raw = pre-grade): noowl-<t>.png in OUT. The owl (+ what it holds) is what differs from it.
def build_frame(n, box=None, thr=0.07, soft=None, dust=False):
    t = '%.2f' % (n / 25)
    E = cv2.imread(OUT + '/noowl-%s.png' % t, 0)
    if E is None: raise SystemExit('missing noowl render for ' + t)
    E = E.astype(np.float32) / 255
    if 1671 <= n < 1688: E = C.b1_to_a(E)                 # the render carries the B1 tone; f is normalised to A
    E = cv2.copyMakeBorder(E, M, M, M, M, cv2.BORDER_CONSTANT, value=0)
    f, _ = C.to_margin(C.pre(n), C.affine_to(None))
    if box is None:
        ob = json.load(open(OUT + '/owlbox.json')).get(str(n)) or [600, 200, 1400, 900]
        box = [max(540, ob[0] - 40), max(0, ob[1] - 40), min(1500, ob[2] + 40), min(946, ob[3] + 40)]
    x0, y0, x1, y1 = box
    reg = C.poly_mask([[(x0, y0), (x1, y0), (x1, y1), (x0, y1)]])
    d = np.abs(cv2.GaussianBlur(f, (0, 0), 1.5) - cv2.GaussianBlur(E, (0, 0), 1.5))
    m = ((d > thr) & reg).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    ff = m.copy(); mm = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8); cv2.floodFill(ff, mm, (0, 0), 1); m = m | (1 - ff)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    k, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    if k > 1:
        big = max(st[i, 4] for i in range(1, k))
        for i in range(1, k):
            if st[i, 4] > 0.015 * big and st[i, 4] > 150: keep[lab == i] = 1
    m = keep
    if soft is None:
        # motion blur: the frame's fine detail inside the owl relative to a held key's (Laplacian energy)
        lap = np.abs(cv2.Laplacian(cv2.GaussianBlur(f, (0, 0), 0.7), cv2.CV_32F))
        e = float(lap[m > 0].mean()) if m.sum() else 1
        soft = round(max(0.0, min(3.0, (0.055 - e) / 0.055 * 3.0)), 2)
    md = cv2.dilate(m, np.ones((5, 5), np.uint8))
    P = TA.P
    if dust:
        # dust / haze frames: the cloud is soft — coarser band outlines (smoothed, simplified) keep the data small
        P = dict(TA.P, reg=dict(TA.P['reg'], eps=float(os.environ.get('EPS', '1.6')), minarea=24, blur=float(os.environ.get('RBLUR', '1.2'))))
    tr, _ = T.trace(f, md, **P)
    cs, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    rings = [(cv2.approxPolyDP(c, 0.8, True)[:, 0, :] - M + 0.5).ravel().tolist() for c in cs if cv2.contourArea(c) > 30]
    ys, xs = np.nonzero(m)
    bx = [int(xs.min() - M - 4), int(ys.min() - M - 4), int(xs.max() - M + 5), int(ys.max() - M + 5)]
    name = 'f%d' % n
    np.save(OUT + '/key_%s_mask.npy' % name, m.astype(np.uint8))
    TA.finalize('owl_' + name, 'OWL_' + name.upper(), tr, f, md, extra={'mask': rings, 'box': bx, 'soft': soft})
    v = cv2.cvtColor(np.clip(f * 255, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    cs2, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(v, cs2, -1, (0, 0, 255), 1)
    cv2.imwrite(OUT + '/key_%s.png' % name, v[M + max(0, bx[1] - 20):M + bx[3] + 20, M + max(0, bx[0] - 20):M + bx[2] + 20])
    sp = OUT + '/screen_frames.json'
    S = json.load(open(sp)) if os.path.exists(sp) else {}
    S[t] = [name, 'dust'] if dust else name; json.dump(S, open(sp, 'w'), indent=0)
    print(name, 'soft', soft, 'mask px', int(m.sum()))

if __name__ == '__main__' and sys.argv[1] == 'frame':
    for v in sys.argv[2].split(','): build_frame(int(v))
if __name__ == '__main__' and sys.argv[1] == 'framedust':
    # flap / haze frames: the owl AND the source's dust (the noowl render has no dust: shot.debug.noDust)
    thr = float(os.environ.get('THR', '0.07'))
    box = [int(x) for x in os.environ['BOX'].split(',')] if os.environ.get('BOX') else None
    for v in sys.argv[2].split(','): build_frame(int(v), dust=True, thr=thr, box=box)

# ---------------------------------------------------------------- haze layers (65.76–67.12: held stare + melting dust)
# While the owl holds a stare drawing (a key, placed by its fit) only the dust haze changes: each frame's haze is traced
# on its own — the A-frame region that differs from the clean room, minus the owl — as coarse value bands only (the
# haze is soft), and drawn under the key. Output data/haze_<n>.js (A frame px).
def build_haze(n, key, thr=0.03):
    t = '%.2f' % (n / 25)
    f, val = C.to_margin(C.pre(n), C.affine_to(C.camA(n)))
    Af = np.load(OUT + '/Afull.npy')
    fits = json.load(open(OUT + '/fits_%s.json' % key)); w = fits[t]
    a, b, c, d, e, g = w[:6]
    Mm = np.array([[a, c, e + M - a * M - c * M], [b, d, g + M - b * M - d * M]], np.float32)
    km = cv2.warpAffine(np.load(OUT + '/key_%s_mask.npy' % key).astype(np.uint8), Mm, (C.WW, C.HH), flags=cv2.INTER_NEAREST)
    reg = C.poly_mask([[(560, 250), (1180, 250), (1180, 920), (560, 920)]]) & val
    dd = np.abs(cv2.GaussianBlur(f, (0, 0), 3) - cv2.GaussianBlur(Af, (0, 0), 3))
    m = ((dd > thr) & reg).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    m &= (cv2.erode(1 - km, np.ones((3, 3), np.uint8)) > 0).astype(np.uint8)
    if m.sum() < 500: print('haze', t, 'empty'); return None
    # the haze as ADDED light (the room's own lines stay those of the room layer under it): the positive difference
    # from the clean room, smoothed, in fine value bands
    lift = np.clip(cv2.GaussianBlur(f, (0, 0), 2.0) - cv2.GaussianBlur(Af, (0, 0), 2.0), 0, 1)
    LVH = [0.012, 0.024, 0.038, 0.054, 0.072, 0.092, 0.115, 0.14, 0.17, 0.205, 0.245, 0.29, 0.34, 0.4, 0.47]
    tr = {'levels': T.regions(lift.astype(np.float32), m, levels=LVH, eps=1.5, minarea=30, blur=1.0), 'dark': [], 'bright': []}
    cs, _ = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    rings = [(cv2.approxPolyDP(c, 1.5, True)[:, 0, :] - M + 0.5).ravel().tolist() for c in cs if cv2.contourArea(c) > 60]
    ys, xs = np.nonzero(m)
    bx = [int(xs.min() - M - 6), int(ys.min() - M - 6), int(xs.max() - M + 7), int(ys.max() - M + 7)]
    name = 'haze_%d' % n
    TA.write_js(name, 'HAZE_%d' % n, tr, extra={'mask': rings, 'box': bx, 'add': 1}, calib=False)
    sp = OUT + '/haze_frames.json'
    S = json.load(open(sp)) if os.path.exists(sp) else {}
    S[t] = name; json.dump(S, open(sp, 'w'), indent=0)
    print(name, 'mask px', int(m.sum()))

if __name__ == '__main__' and sys.argv[1] == 'haze':
    key = sys.argv[2]
    for v in sys.argv[3].split(','): build_haze(int(v), key)
