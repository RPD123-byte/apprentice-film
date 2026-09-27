#!/usr/bin/env python3
# trace_plate2.py in_P.npy out.pkl [--crop x0 y0 x1 y1] [--p key=val ...] - trace a static plate into an ink drawing
import sys, pickle, numpy as np, cv2, time
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from inktrace import *

DEF = dict(T=0.5, rc=2.5, ro=2.5, sm=1.4, HId=14, LOd=6, HIb=20, LOb=8, dots=1, holeA=40, minA=60, sigd='1.0,1.8', sigb='1.0,1.8',
           minlen=6, eps=0.6, dotthr=0.45, fitpaper=0, oc=0, specks=1, spthr=0.25, facemin=0, nms=0, blobs=0, blobA=2000, basev=-1, darkfields=1, spmax=150, rim=0, blobsig='6,10,16,26')

def trace_image(P, prm, allowed=None):
    p = dict(DEF); p.update(prm)
    H, W = P.shape
    lit = lit_mask(P, p['T'], p['rc'], p['ro'], allowed=allowed, minA=p['minA'], order='oc' if p['oc'] else 'co')
    # holes smaller than holeA px are filled (they are dark strokes / specks inside the face)
    inv = (1 - lit).astype(np.uint8)
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    small = np.isin(lab2, [i for i in range(1, n2) if st2[i, 4] < p['holeA']])
    lit = (lit | small).astype(np.uint8)
    # a 'face' whose own pixels are mostly dark is dense line texture, not a lit face: leave it to the strokes
    if p['facemin'] > 0:
        n3, lab3, st3, _ = cv2.connectedComponentsWithStats(lit, connectivity=8)
        for i in range(1, n3):
            mm = lab3 == i
            if np.median(P[mm]) < p['facemin']: lit[mm] = 0
    comps = mask_rings(lit, smooth=p['sm'])
    sigd = tuple(float(v) for v in str(p['sigd']).split(',')); sigb = tuple(float(v) for v in str(p['sigb']).split(','))
    Rd = ridge_map(P, +1, sigd) * 255
    dk = (Rd > p['LOd']).astype(np.uint8); dk = cv2.dilate(dk, np.ones((3, 3), np.uint8))
    paper = cv2.GaussianBlur(cv2.dilate(cv2.GaussianBlur(P, (0, 0), 0.8), np.ones((5, 5), np.uint8)), (0, 0), 1.5)
    base = np.zeros_like(P); masses = []
    litd = np.zeros_like(lit)
    for rings in comps:
        xs = np.concatenate([R[:, 0] for R in rings]); ys = np.concatenate([R[:, 1] for R in rings])
        x0, y0 = int(max(0, xs.min() - 2)), int(max(0, ys.min() - 2)); x1, y1 = int(min(W, xs.max() + 3)), int(min(H, ys.max() + 3))
        m = np.zeros((y1 - y0, x1 - x0), np.uint8)
        for R in rings:
            t = np.zeros_like(m); cv2.fillPoly(t, [np.round((R - [x0, y0]) * 16).astype(np.int32)], 1, shift=4); m ^= t
        if m.sum() < 20: continue
        sub = (paper if p['fitpaper'] else P)[y0:y1, x0:x1]; fm = m.astype(bool) & (dk[y0:y1, x0:x1] == 0)
        if fm.sum() < 10: fm = m.astype(bool)
        fd = fit_field(sub, fm, lo_q=0.1)
        if fd[0] == 'p': fd = ['p', fd[1] - fd[2] * x0 - fd[3] * y0, fd[2], fd[3]]
        elif fd[0] == 'q':
            _, A0, B, C, D_, E, F = fd
            fd = ['q', A0 - B * x0 - C * y0 + D_ * x0 * x0 + E * x0 * y0 + F * y0 * y0, B - 2 * D_ * x0 - E * y0, C - 2 * F * y0 - E * x0, D_, E, F]
        yy, xx = np.mgrid[y0:y1, x0:x1]
        dist = None
        if p['rim'] and m.sum() > p['blobA']:
            # rim shading: the face darkens toward its outline; quadratic from the interior, then k, lam from the
            # residual's depth profile
            dist = cv2.distanceTransform(m, cv2.DIST_L2, 5)
            fi = fm & (dist > 14)
            if fi.sum() > 200:
                fq = fit_field(sub, fi, kind='q', lo_q=0.1)
                if fq[0] == 'q':
                    _, A0, B, C, D_, E, F = fq
                    fq = ['q', A0 - B * x0 - C * y0 + D_ * x0 * x0 + E * x0 * y0 + F * y0 * y0, B - 2 * D_ * x0 - E * y0, C - 2 * F * y0 - E * x0, D_, E, F]
                    r0 = P[y0:y1, x0:x1] - eval_field(fq, xx, yy)
                    ds_ = np.arange(2, 22); mv = np.array([np.median(r0[fm & (dist > dd) & (dist <= dd + 1)]) if (fm & (dist > dd) & (dist <= dd + 1)).sum() > 20 else 0 for dd in ds_])
                    best = None
                    for lam in (2, 3, 4, 5, 6, 8, 10, 13, 16):
                        e = np.exp(-(ds_ + 0.5) / lam); kk = -float((mv * e).sum() / (e * e).sum())
                        err = float(((mv + kk * e) ** 2).sum())
                        if best is None or err < best[0]: best = (err, max(0.0, kk), lam)
                    fd = fq; rimk, riml = best[1], best[2]
                    fd = ['r', rimk, riml, fd]
        if p['blobs'] > 0 and m.sum() > p['blobA'] and fd[0] in ('q', 'r'):
            inner = fd[3] if fd[0] == 'r' else fd
            fv0 = eval_field(fd, xx, yy, dist=dist)
            res = np.where(fm, P[y0:y1, x0:x1] - fv0, 0).astype(np.float32)
            bl = fit_blobs(res, fm.astype(np.uint8), n=int(p['blobs']), sigmas=tuple(float(v) for v in str(p['blobsig']).split(',')))
            inner = ['qb'] + inner[1:7] + [v for b in bl for v in (b[0] + x0, b[1] + y0, b[2], b[3])]
            fd = ['r', fd[1], fd[2], inner] if fd[0] == 'r' else inner
        fv = np.clip(eval_field(fd, xx, yy, dist=dist), 0, 1)
        base[y0:y1, x0:x1] = np.where(m > 0, fv, base[y0:y1, x0:x1])
        litd[y0:y1, x0:x1] |= m
        masses.append([rings, fd])
    litf = litd.astype(bool)
    inner = cv2.erode(litd, disk(1.0)) > 0
    bb = cv2.GaussianBlur(cv2.erode(P, np.ones((7, 7), np.uint8)), (0, 0), 3); bb = np.minimum(bb, 0.25)
    outer = (cv2.dilate(litd, disk(1.0)) == 0)
    if allowed is not None: inner &= allowed > 0; outer &= allowed > 0
    dbase = np.where(litf, base, 1.0)
    dkb = (ridge_map(P, -1, (1.0,)) * 255 > p['LOb']).astype(np.uint8) if p['basev'] >= 0 and p['darkfields'] else None
    drows = trace_strokes(P, +1, inner, dbase, p['HId'], p['LOd'], ridge=None if p['nms'] else Rd, sigmas=sigd, minlen=p['minlen'], eps=p['eps'], nms=bool(p['nms']))
    brows = trace_strokes(P, -1, outer, bb, p['HIb'], p['LOb'], sigmas=sigb, minlen=p['minlen'], eps=p['eps'], nms=bool(p['nms']))
    dark = finalize(drows, +1, dbase)
    bright = finalize(brows, -1, bb)
    dots = []
    if p['dots']:
        near = np.zeros((H, W), np.uint8)
        for tone, pts, ws in bright + dark:
            cv2.polylines(near, [np.round(np.array(pts) * 4).astype(np.int32)], False, 1, 9, shift=2)
        dots = [d for d in find_dots(P, cv2.dilate(litd, disk(1.5)), p['dotthr'], allowed=allowed)
                if not near[int(min(H - 1, d[1])), int(min(W - 1, d[0]))]]
    D = dict(masses=masses, dark=dark, bright=bright, dots=dots, shape=(H, W))
    if p['basev'] >= 0 and allowed is not None:
        D['base'] = [[rings, ['c', float(p['basev'])]] for rings in mask_rings((allowed > 0).astype(np.uint8), smooth=1.0)]
        if p['darkfields']:
            # the dark parts inside the silhouette (pupils, headphone shells, ...) each get their own measured value
            dmask = ((allowed > 0) & (litd == 0)).astype(np.uint8)
            dmask = cv2.morphologyEx(dmask, cv2.MORPH_OPEN, disk(1.0))
            for rings in mask_rings(dmask, smooth=1.0):
                mm = rings_mask(rings, (H, W))
                if mm.sum() < 25: continue
                fd = fit_field(P, (mm > 0) & (cv2.dilate(dkb, np.ones((3, 3), np.uint8)) == 0) if mm.sum() > 60 else mm > 0, kind='auto')
                if fd[0] == 'c' and abs(fd[1] - p['basev']) < 0.03: continue
                D['base'].append([rings, fd])
    if p['specks']:
        R = render_preview(D, (H, W), soft=0.6)
        D['specks'] = residual_specks(P, R, -1, p['spthr'], amax=p['spmax'], allowed=allowed) + residual_specks(P, R, +1, p['spthr'], amax=p['spmax'], allowed=allowed)
    return D

def shift(D, dx, dy):
    o = np.array([dx, dy], float)
    D['masses'] = [[[R + o for R in rings], shift_field(fd, dx, dy)] for rings, fd in D['masses']]
    for k in ('dark', 'bright'): D[k] = [[t, (np.array(pts) + o).tolist(), ws] for t, pts, ws in D[k]]
    D['dots'] = [[x + dx, y + dy, r, v] for x, y, r, v in D['dots']]
    D['specks'] = [[[R + o for R in rings], fd] for rings, fd in D.get('specks', [])]
    if 'base' in D: D['base'] = [[[R + o for R in rings], fd] for rings, fd in D['base']]
    return D

def shift_field(fd, dx, dy):
    # v'(x, y) = v(x - dx, y - dy)
    if fd[0] == 'c': return fd
    if fd[0] == 'r': return ['r', fd[1], fd[2], shift_field(fd[3], dx, dy)]
    if fd[0] == 'qb':
        q = shift_field(['q'] + fd[1:7], dx, dy)
        bl = fd[7:]
        return ['qb'] + q[1:] + [v + (dx if i % 4 == 0 else dy if i % 4 == 1 else 0) for i, v in enumerate(bl)]
    if fd[0] == 'p': return ['p', fd[1] - fd[2] * dx - fd[3] * dy, fd[2], fd[3]]
    _, A, B, C, D_, E, F = fd
    return ['q', A - B * dx - C * dy + D_ * dx * dx + E * dx * dy + F * dy * dy, B - 2 * D_ * dx - E * dy, C - 2 * F * dy - E * dx, D_, E, F]

if __name__ == '__main__':
    a = sys.argv
    P = np.load(a[1]).astype(np.float32); out = a[2]
    prm = {}; crop = None; allowed = None
    i = 3
    while i < len(a):
        if a[i] == '--crop': crop = [int(v) for v in a[i + 1:i + 5]]; i += 5
        elif a[i] == '--allowed': allowed = np.load(a[i + 1]); i += 2
        elif a[i] == '--p':
            k, v = a[i + 1].split('='); prm[k] = float(v) if k not in ('sigd', 'sigb') else v; i += 2
        else: i += 1
    t0 = time.time()
    if crop:
        x0, y0, x1, y1 = crop; mg = 12
        X0, Y0 = max(0, x0 - mg), max(0, y0 - mg)
        sub = P[Y0:y1 + mg, X0:x1 + mg]
        D = shift(trace_image(sub, prm, None if allowed is None else allowed[Y0:y1 + mg, X0:x1 + mg]), X0, Y0)
        D['shape'] = P.shape
    else:
        D = trace_image(P, prm, allowed)
    pickle.dump(D, open(out, 'wb'))
    print(f"masses {len(D['masses'])} dark {len(D['dark'])} bright {len(D['bright'])} dots {len(D['dots'])} pts {sum(len(s[1]) for s in D['dark']+D['bright'])} {time.time()-t0:.0f}s")
