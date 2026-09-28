# end-s28-fix1: the locked figure keys' face (box x 1140-1480, y 330-700) re-traced finer: smaller colour regions (each
# with its fitted linear colour ramp), drawn as their own layer that the shot softens by FACEBLUR px and feathers into
# the key's own trace over FEATHER px at the box edge; the key's ink inside the box is replaced by a re-trace with a
# finer faint level (the cheek and nose hatching). Stored in the key as D.face = {box, feather, blur, regions, ink}: the
# shot draws the key's own ink outside the box and the face ink inside it.
# Usage: retrace_face.py name [name...]   (originals in snapshots/end-s28-fix1-tools/keys-orig; idempotent: always
# rebuilds from the original)
import sys, json, os, shutil, numpy as np, cv2
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s28-fix1-tools')
import tp
from traceview import rings_of
from fixbeanie import LEV
from grade import hexc
def fine_ink(t, mask, levels, S=3, blur=0.45, faint=None):
    # ink as polygons from a 3x upsampled pre-grade frame with little blur, so close hatch lines stay apart
    pre = tp.pre_frame(t).astype(np.float32); H, W = pre.shape[:2]
    P2 = cv2.resize(pre, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
    L = cv2.GaussianBlur(0.299 * P2[..., 0] + 0.587 * P2[..., 1] + 0.114 * P2[..., 2], (0, 0), blur * S)
    bg = cv2.dilate(L, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(9 * S) + 1,) * 2)); bg = cv2.GaussianBlur(bg, (0, 0), 2.5 * S)
    a2 = cv2.resize(mask, (W * S, H * S), interpolation=cv2.INTER_NEAREST) > 0
    out = []; taken = np.zeros_like(a2)
    for li, lay in enumerate(levels):
        m = (L < lay['lmax'])
        if 'contrast' in lay: m &= (bg - L) > lay['contrast']
        if lay.get('faint'): m &= ~taken
        m = (m & a2).astype(np.uint8) * 255
        if not lay.get('faint'): taken |= cv2.dilate(m, np.ones((3, 3), np.uint8)) > 0
        for rs in rings_of(m, lay.get('eps', 0.6), lay.get('min_area', 3), 1.5, S=S):
            mm = np.zeros((H * S, W * S), np.uint8); cv2.fillPoly(mm, [np.int32(np.array(rs[0]) * S)], 255)
            for h_ in rs[1:]: cv2.fillPoly(mm, [np.int32(np.array(h_) * S)], 0)
            px = P2[(mm > 0) & (m > 0)]
            if len(px): out.append({'c': hexc(np.clip(np.median(px, 0), 0, 1)), 'l': lay.get('l', li), 'r': [[[round(x, 1), round(y, 1)] for x, y in ring] for ring in rs]})
    return out
FACELEV = [{"lmax": 0.50, "contrast": 0.16, "eps": 0.5, "min_area": 3, "l": 0}, {"lmax": 0.24, "eps": 0.5, "min_area": 2, "l": 1},
           {"lmax": 0.84, "contrast": 0.05, "eps": 0.5, "min_area": 2, "l": 2, "faint": 1}]
BOX = [1140, 330, 1480, 700]; FEATHER = 14; FACEBLUR = 2.5; FAINTBLUR = 1.2; NOSE = (1195, 550, 1255, 590)
K = '/Users/computer/rootline/apprentice-film/src/shots/s28/keys'
KO = '/Users/computer/rootline/apprentice-film/snapshots/end-s28-fix1-tools/keys-orig'
def load(p):
    s = open(p).read(); i = s.index('export default '); return s[:i], json.loads(s[i + 15:].rstrip().rstrip(';'))
def cen(sh):
    r = np.array(sh['r'][0]); return r.mean(0)
for name in sys.argv[1:]:
    p = f'{K}/{name}.js'; bk = f'{KO}/{name}.js'
    if not os.path.exists(bk): shutil.copy(p, bk)
    _, D0 = load(bk); head, D = load(p)
    sil = np.zeros((946, 2206), np.uint8)
    for r in D['sil']: cv2.fillPoly(sil, [np.int32(np.round(np.array(r)))], 1)
    m = np.zeros_like(sil); x0, y0, x1, y1 = BOX; m[y0:y1, x0:x1] = 1; m &= sil
    spec = {"scale": 10, "min_size": 10, "sp": 4, "sr": 5, "min_area": 6, "eps": 0.8,
            "ink": [dict(LEV[0]), dict(LEV[1])]}
    F = tp.trace(f'face_{name}', D['t'], m, pad=3, spec_extra=spec)
    # finer faint hatching inside the box
    fa = tp.faint(D['t'], cv2.dilate(m, np.ones((5, 5), np.uint8)), LMAX=0.84, CON=0.05)
    # the underside of the nose: the source has fine hatch lines there, which the ink levels merge into one dark blob
    # (it read as a tooth-like shape); those blobs are left out, the traced skin tone underneath shows instead
    def nostril(sh):
        r = np.array(sh['r'][0]); x0_, y0_ = r.min(0); x1_, y1_ = r.max(0)
        a = 0.5 * abs(np.dot(r[:, 0], np.roll(r[:, 1], 1)) - np.dot(r[:, 1], np.roll(r[:, 0], 1)))
        return sh['l'] in (0, 1) and x0_ >= NOSE[0] and y0_ >= NOSE[1] and x1_ <= NOSE[2] and y1_ <= NOSE[3] and a > 30
    newink = [sh for sh in F['ink'] if sh['l'] != 2 and not nostril(sh)] + fa
    # the key's own ink is kept (drawn outside the box); the face ink is drawn inside the box only
    D['ink'] = D0['ink'] + [sh for sh in D['ink'] if sh.get('x') in ('bean', 'strand')]
    D['face'] = {'box': BOX, 'feather': FEATHER, 'blur': FACEBLUR, 'faintBlur': FAINTBLUR, 'regions': F['regions'], 'ink': newink}
    if 'face re-traced' not in head:
        head = head.rstrip('\n') + "\n// + the face (x 1140-1480, y 330-700) re-traced finer as its own region layer + ink by snapshots/end-s28-fix1-tools/retrace_face.py.\n"
    open(p, 'w').write(head + 'export default ' + json.dumps(D, separators=(',', ':')) + ';\n')
    print(name, D['t'], 'face regions', len(F['regions']), 'ink', len(newink), 'size', os.path.getsize(p) // 1024, 'KB', flush=True)
