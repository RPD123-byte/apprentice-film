# Generic patch tracer for s28 (end-s28-fix1): vector trace of a masked area of one SOURCE frame (pre-grade colours):
# colour regions (traceview.py), two ink levels + the faint hatching level (as faintink.py / trace_bottom.py), and the
# clip polygon(s) of the mask. Run with cwd = project root.
import sys, json, subprocess, os, numpy as np, cv2
ROOT='/Users/computer/rootline/apprentice-film'
os.chdir(ROOT); sys.path.insert(0, 'snapshots/s28t-tools/t')
from grade import hexc
import traceview
from traceview import rings_of
import grade as _grade
_OVR = {}
def pre_frame(t, blur=0):
    return _OVR['img'] if 'img' in _OVR else _grade.pre_frame(t, blur)
traceview.pre_frame = pre_frame
def median_pre(ts):
    return np.median(np.stack([_grade.pre_frame(t) for t in ts]), 0).astype(np.float32)
T='snapshots/s28t-tools/t'; K='snapshots/end-s28-fix1-tools/k'
os.makedirs(K, exist_ok=True)
def faint(t, area_mask, LMAX=0.78, CON=0.07):
    pre = pre_frame(t).astype(np.float32); H, W = pre.shape[:2]; S = 2
    P2 = cv2.resize(pre, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
    L = cv2.GaussianBlur(0.299 * P2[..., 0] + 0.587 * P2[..., 1] + 0.114 * P2[..., 2], (0, 0), 0.6 * S)
    bg = cv2.dilate(L, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(8 * S) + 1,) * 2)); bg = cv2.GaussianBlur(bg, (0, 0), 2.5 * S)
    a2 = cv2.resize(area_mask, (W * S, H * S), interpolation=cv2.INTER_NEAREST)
    strong = cv2.dilate((((L < 0.50) & ((bg - L) > 0.18)) | (L < 0.24)).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    m = ((L < LMAX) & ((bg - L) > CON) & ~strong & (a2 > 0)).astype(np.uint8) * 255
    out = []
    for rs in rings_of(m, 0.6, 3, 2, S=S):
        mm = np.zeros((H * S, W * S), np.uint8); cv2.fillPoly(mm, [np.int32(np.array(rs[0]) * S)], 255)
        for h_ in rs[1:]: cv2.fillPoly(mm, [np.int32(np.array(h_) * S)], 0)
        px = P2[(mm > 0) & (m > 0)]
        if len(px): out.append({'c': hexc(np.clip(np.median(px, 0), 0, 1)), 'l': 2, 'r': [[[round(x, 1), round(y, 1)] for x, y in ring] for ring in rs]})
    return out
def mask_polys(mask, eps=0.8):
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None: return out
    for i, c in enumerate(cs):
        if cv2.contourArea(c) < 20: continue
        ap = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
        if len(ap) >= 3: out.append([[int(x), int(y)] for x, y in ap])
    return out
def trace(name, t, mask, pad=5, spec_extra=None, clip_dilate=0, img=None):
    """mask: full-frame uint8 (the patch's area). The trace covers mask dilated by pad; clip = mask dilated by clip_dilate."""
    area = cv2.dilate(mask.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * pad + 1,) * 2))
    polys = mask_polys(area, 1.0)
    spec = {"t": t, "area": polys, "exclude": [], "fill_hidden": [], "merge": 0, "scale": 30, "min_size": 30, "sp": 6, "sr": 6, "min_area": 10,
            "ink": [{"lmax": 0.55, "contrast": 0.14, "eps": 0.8, "min_area": 5}, {"lmax": 0.28, "eps": 0.7, "min_area": 4}]}
    if spec_extra: spec.update(spec_extra)
    sp = f'{K}/{name}.json'; out = f'{K}/{name}_out.json'
    json.dump(spec, open(sp, 'w'))
    if img is not None: _OVR['img'] = img
    try:
        argv = sys.argv; sys.argv = ['traceview.py', sp, out]; traceview.main(); sys.argv = argv
    finally: _OVR.pop('img', None)
    D = json.load(open(out))
    for R in D['regions']: R['r'] = [[[round(x, 1), round(y, 1)] for x, y in ring] for ring in R['r']]
    for R in D['ink']: R['r'] = [[[round(x, 1), round(y, 1)] for x, y in ring] for ring in R['r']]
    if img is not None: _OVR['img'] = img
    try: D['ink'] = faint(t, area) + D['ink']
    finally: _OVR.pop('img', None)
    cm = cv2.dilate(mask.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * clip_dilate + 1,) * 2)) if clip_dilate else mask.astype(np.uint8)
    D['clip'] = mask_polys(cm, 0.7)
    ys, xs = np.nonzero(area)
    D['box'] = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    return D
def write_module(path, const, items, comment):
    s = comment + f"export const {const} = " + json.dumps(items, separators=(',', ':')) + ";\n"
    open(path, 'w').write(s)
    print(path, len(items), 'items', len(s) // 1024, 'KB')
