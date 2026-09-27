#!/usr/bin/env python3
# s16: everything that changes from frame to frame. For every source frame 1143..1192 the model (static plate +
# the matched irises + the dazed owl from 1175 once it sits) is moved by that frame's camera and compared with the
# frame; what differs (the owl in flight, the steam, the in-between eye drawings) is outlined, and the frame is traced
# inside that outline (tone levels + ink centre-lines with fitted strengths). Identical frames share one drawing.
# Writes src/shots/s16/data/dyn.js (DYN drawings in frame px, FRAME -> drawing id), data/hold.js (the dazed owl,
# plate px) and data/cams.js (the camera table).
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
import tr, cv2, numpy as np
from multiprocessing import Pool
from trace_plate import CFG, js_drawing, enc_ring

OUT = '/Users/computer/rootline/apprentice-film/snapshots/s16-p2-tools'
DATA = '/Users/computer/rootline/apprentice-film/src/shots/s16/data'
W, H, M = 2206, 946, 90
E = np.load(f'{OUT}/plateE.npy')
from eyes import EZ
IR = {int(k): v for k, v in json.load(open(f'{OUT}/irises.json')).items()}
BOX = {'L': (1276, 198, 1366, 238), 'R': (1448, 194, 1546, 238)}
A1175 = tr.pre(1175); A1153 = tr.pre(1153)

def cams_all():
    return {int(k) for k in json.load(open(f'{OUT}/cams.json'))}

def fit_cam(f, init=None):
    """plate(E, extended) -> frame affine; returns 2x3 in frame<-plate(frame px) convention"""
    cams = json.load(open(f'{OUT}/cams.json'))
    if str(f) in cams: return np.array(cams[str(f)]['A'], np.float32)
    return np.float32([[1, 0, 0], [0, 1, 0]])

def model_plate(f):
    """E with the irises of frame f pasted in (and the dazed owl from 1175 once it sits)"""
    Em = E.copy()
    for k, (x0, y0, x1, y1) in BOX.items():
        t, dx, dy = IR[f][k]['t'], IR[f][k]['dx'], IR[f][k]['dy']
        if t == 'N': continue
        src = A1175 if t == 'L' else A1153
        tm = cv2.dilate(EZ[f'{k}_iris' + ('A' if t == 'L' else 'B')], np.ones((3, 3), np.uint8)).astype(np.float32)
        tpl = src[y0:y1, x0:x1]
        Mx = np.float32([[1, 0, dx], [0, 1, dy]])
        tt = cv2.warpAffine(tpl, Mx, (x1 - x0, y1 - y0)); mm = cv2.warpAffine(tm, Mx, (x1 - x0, y1 - y0)) * EZ[f'{k}_open_mask']
        reg = Em[M + y0:M + y1, M + x0:M + x1]
        Em[M + y0:M + y1, M + x0:M + x1] = reg * (1 - mm) + tt * mm
    if f >= 1165:
        hm = hold_mask()
        sub = Em[M:M + H, M:M + W]; sub[hm] = A1175[hm]
    return Em

_HM = None
def hold_mask():
    global _HM
    if _HM is not None: return _HM
    d = np.abs(cv2.GaussianBlur(A1175, (0, 0), 1.2) - cv2.GaussianBlur(E[M:M + H, M:M + W], (0, 0), 1.2))
    m = (d > 0.05).astype(np.uint8)
    m[360:718, 690:905] = 0; m[:, 1000:] = 0; m[:450, :] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] > 200: keep[lab == i] = 1
    ff = keep.copy(); cv2.floodFill(ff, None, (0, 0), 2); keep = ((ff != 2) | (keep > 0)).astype(np.uint8)
    _HM = cv2.dilate(keep, np.ones((11, 11), np.uint8)) > 0
    return _HM

def warp_to_frame(Em, A):
    """frame(q) = plate(A^-1 q), the plate indexed at +M"""
    Ai = np.linalg.inv(np.vstack([A, [0, 0, 1]]).astype(np.float64))
    T = np.array([[1, 0, M], [0, 1, M], [0, 0, 1]], np.float64)
    return cv2.warpAffine(Em, (T @ Ai)[:2].astype(np.float32), (W, H), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP, borderValue=0)

def diff_mask(Y, Mf, thr=0.06):
    """what differs from the model by more than it could from a 1 px misregistration: Y outside the model's local
    3x3 range (after a light blur)"""
    Yb = cv2.GaussianBlur(Y, (0, 0), 1.0); Mb = cv2.GaussianBlur(Mf, (0, 0), 1.0)
    k = np.ones((3, 3), np.uint8)
    d = np.maximum(0, np.maximum(Yb - cv2.dilate(Mb, k), cv2.erode(Mb, k) - Yb))
    m = (d > thr).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, 4] > 150: keep[lab == i] = 1
    ff = keep.copy(); cv2.floodFill(ff, None, (0, 0), 2); keep = ((ff != 2) | (keep > 0)).astype(np.uint8)
    return cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))

def trace_region(Y, mask, box):
    """levels covering the whole mask + strokes inside it (eroded), strengths fitted over the box; Y is denoised"""
    Bm = cv2.medianBlur((np.clip(Y, 0, 1) * 255).astype(np.uint8), CFG['med_dyn']).astype(np.float32) / 255
    mb = mask > 0
    L = tr.levels(Bm, mb, [-1.0] + [(k + 0.5) / CFG['K'] for k in range(1, CFG['K'])], minarea=4, eps=0.7)
    Br = tr.render_levels(L, Y.shape, ss=4, blur=CFG['blur'])
    Bfull = np.where(mb, Br, Y)                     # outside the mask the frame itself (only used for fitting)
    inner = cv2.erode(mask, np.ones((5, 5), np.uint8)) > 0
    Sd = tr.strokes3(Y, Bfull, inner, 'dark', **CFG['s3']); Sb = tr.strokes3(Y, Bfull, inner, 'bright', **CFG['s3'])
    (Sd, Sb), g = tr.fit_gains(Y, Bfull, [(Sd, 'dark'), (Sb, 'bright')], box)
    return L, Sd, Sb, Br

def outline(mask):
    """the mask's outline in canvas units (half a pixel outside the boundary pixels' centres)"""
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for i, c in enumerate(cs):
        if len(c) < 3: continue
        a = cv2.approxPolyDP(c, 1.0, True).reshape(-1, 2).astype(float)
        if len(a) < 3: continue
        out.append(tr.offset_ring(a, 0.5, grow=hier[0][i][3] == -1) + 0.5)
    return out

def job(f):
    A = fit_cam(f)
    Mf = warp_to_frame(model_plate(f), A)
    Y = tr.pre(f)
    m = diff_mask(Y, Mf)
    # eyes without a model iris: the whole opening (and its rim) comes from this frame
    for k, (x0, y0, x1, y1) in BOX.items():
        if IR[f][k]['t'] != 'N': continue
        op = np.zeros((H, W), np.uint8); op[y0:y1, x0:x1] = EZ[f'{k}_open_mask']
        if f in cams_all():
            op = cv2.warpAffine(op, fit_cam(f), (W, H), flags=cv2.INTER_NEAREST)
        m = np.maximum(m, cv2.dilate(op, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))))
    ys, xs = np.nonzero(m)
    if len(xs) == 0: return f, None
    box = (max(0, xs.min() - 6), max(0, ys.min() - 6), min(W, xs.max() + 7), min(H, ys.max() + 7))
    L, Sd, Sb, Br = trace_region(tr.denoise(Y, CFG['nlm']), m, box)
    sh = lambda S: [[[p[0] + 0.5, p[1] + 0.5, p[2], p[3]] for p in st] for st in S]
    np.save(f'{OUT}/dynmask_{f}.npy', m)
    return f, dict(box=box, L=L, D=sh(Sd), B=sh(Sb), out=outline(m), area=int(m.sum()))

if __name__ == '__main__':
    t0 = time.time()
    frames = list(range(1143, 1193))
    with Pool(8) as p:
        res = dict(p.map(job, frames))
    print('traced', round(time.time() - t0), 's', flush=True)
    # held frames (the source repeats a drawing: 1146 = 1145) share the previous frame's drawing and camera
    # (none: 1146 looks like a hold of 1145, but rendering it with 1145's drawing and camera measured worse than its
    # own trace and camera fit, 3.22 vs 2.95 at sigma 1)
    held = set()
    print('held frames', sorted(held), flush=True)
    # identical consecutive frames share a drawing
    ids = {}; uniq = []
    for f in frames:
        r = res[f]
        if r is None: ids[f] = -1; continue
        if f in held and (f - 1) in ids: ids[f] = ids[f - 1]; continue
        same = None
        if uniq:
            g = uniq[-1]
            mg = np.load(f'{OUT}/dynmask_{g}.npy'); mf = np.load(f'{OUT}/dynmask_{f}.npy'); U = (mg | mf) > 0
            dd = np.abs(cv2.GaussianBlur(tr.pre(f), (0, 0), 1.2) - cv2.GaussianBlur(tr.pre(g), (0, 0), 1.2))[U].mean() * 255
            if dd < 2.2 and fit_cam(f).tolist() == fit_cam(g).tolist(): same = g
            print(f, 'vs', g, 'diff %.2f' % dd, 'area', r['area'], flush=True)
        if same is None: uniq.append(f); ids[f] = f
        else: ids[f] = ids[same]
    out = ['// s16 per-frame drawings (frame px): what differs from the plate + irises (+ the dazed owl) on each source frame,',
           '// traced by src/shots/s16/trace/dyn.py. DYN[id] = { box, L, D, B, O (outline, for the soft edge) }; FRAME[f] = id.',
           'export const DYN = {']
    for f in uniq:
        r = res[f]
        extra = '  O: [%s],' % ','.join(enc_ring(c) for c in r['out'])
        s = js_drawing('X', r['L'], r['D'], r['B'], r['box'], extra).replace('export const X = {', '%d: {' % f).rstrip().rstrip(';') + ','
        out.append(s)
    out.append('};')
    out.append('export const FRAME = {' + ', '.join('%d: %d' % (f, ids[f]) for f in frames) + '};')
    open(f'{DATA}/dyn.js', 'w').write('\n'.join(out) + '\n')
    # the dazed owl (1165-1192), plate px = frame px of 1175
    hm = hold_mask().astype(np.uint8)
    ys, xs = np.nonzero(hm)
    box = (max(0, xs.min() - 6), max(0, ys.min() - 6), min(W, xs.max() + 7), min(H, ys.max() + 7))
    L, Sd, Sb, Br = trace_region(tr.denoise(A1175, CFG['nlm']), hm, box)
    sh = lambda S: [[[p[0] + 0.5, p[1] + 0.5, p[2], p[3]] for p in st] for st in S]
    s = js_drawing('HOLD', L, sh(Sd), sh(Sb), box, '  O: [%s],' % ','.join(enc_ring(c) for c in outline(hm)))
    open(f'{DATA}/hold.js', 'w').write('// s16: the dazed owl by the mug (source frame 1175; held 46.60-47.48 and carried by the pull-back), traced by\n// src/shots/s16/trace/dyn.py. Plate px.\n' + s)
    cams = json.load(open(f'{OUT}/cams.json'))
    for f in sorted(held):
        if str(f - 1) in cams: cams[str(f)] = cams[str(f - 1)]
        elif str(f) in cams: del cams[str(f)]
    rows = ['  %s: [%s],' % (k, ', '.join('%.5f' % v for v in np.array(c['A']).ravel())) for k, c in sorted(cams.items(), key=lambda kv: int(kv[0]))]
    open(f'{DATA}/cams.js', 'w').write('// s16 camera: plate px -> frame px affine [a, b, tx, c, d, ty] per source frame (ECC fits on the room with the owl\n'
        '// and steam masked, snapshots/s16-p2-tools/cams.json); frames not listed are the steady framing.\nexport const CAM = {\n' + '\n'.join(rows) + '\n};\n')
    print('wrote dyn.js', os.path.getsize(f'{DATA}/dyn.js') // 1024, 'KB', len(uniq), 'drawings', round(time.time() - t0), 's')
