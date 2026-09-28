# Robust refinement of detected bars on the (pre-grade) source frame: perpendicular profiles every STEP px along
# each bar -> per-sample centroid, ink mass and peak; outliers dropped; centre line refitted; the bar is cut where
# its samples go dark (the first/last lit sample); its value is kept as a few samples along its length.
import numpy as np
from scipy.ndimage import map_coordinates
STEP = 6.0
def track(caps, u, occ, pad=7.0, nval=150.0):
    H, W = u.shape
    out = []
    for c in caps:
        x0, y0, x1, y1, w, val = c[:6]
        L = np.hypot(x1 - x0, y1 - y0)
        if L < 6: continue
        d = np.array([x1 - x0, y1 - y0]) / L; n = np.array([-d[1], d[0]])
        ts = np.arange(-8, L + 8.01, STEP)
        half = w / 2 + pad
        ss = np.arange(-half, half + 1e-6, 0.5)
        P = np.array([x0, y0])[None, None, :] + ts[:, None, None] * d[None, None, :] + ss[None, :, None] * n[None, None, :]
        xs, ys = P[..., 0], P[..., 1]
        cx, cy = P[:, len(ss) // 2, 0], P[:, len(ss) // 2, 1]
        inside = (cx >= 1) & (cy >= 1) & (cx <= W - 2) & (cy <= H - 2)
        xi = np.clip(xs.round().astype(int), 0, W - 1); yi = np.clip(ys.round().astype(int), 0, H - 1)
        occl = occ[yi, xi].any(1) if occ is not None else np.zeros(len(ts), bool)
        prof = map_coordinates(u, [ys.ravel(), xs.ravel()], order=1, mode='nearest').reshape(xs.shape)
        nS = len(ss); mid = nS // 2
        rad = int(round((w / 2 + 1.5) / 0.5))
        pk = np.zeros(len(ts)); mass = np.zeros(len(ts)); cen = np.zeros(len(ts)); bg = np.zeros(len(ts))
        for i in range(len(ts)):
            pr = prof[i]
            j0 = max(0, mid - rad); j1 = min(nS, mid + rad + 1)
            jp = j0 + int(np.argmax(pr[j0:j1]))
            top = pr[jp]
            a = jp
            while a > 0 and pr[a - 1] <= pr[a] + 2 and pr[a - 1] > 0.1 * top: a -= 1
            b = jp
            while b < nS - 1 and pr[b + 1] <= pr[b] + 2 and pr[b + 1] > 0.1 * top: b += 1
            base = min(pr[a], pr[b], np.min(pr))
            base = max(base, 0.0)
            qq = np.clip(pr[a:b + 1] - base - 2, 0, None)
            bg[i] = base; pk[i] = top - base - 2
            mass[i] = qq.sum() * 0.5
            cen[i] = (qq * ss[a:b + 1]).sum() / max(qq.sum(), 1e-6)
        ok = inside & ~occl & (pk > 12)
        if ok.sum() < 2: continue
        med = np.median(pk[ok])
        ok &= pk >= 0.4 * med
        if ok.sum() < 2: continue
        T = ts[ok]; C = cen[ok]; Wt = mass[ok]
        keep = np.ones(len(T), bool)
        for it in range(3):
            if keep.sum() < 2: break
            A = np.c_[np.ones(keep.sum()), T[keep]]
            co = np.linalg.lstsq(A * np.sqrt(Wt[keep])[:, None], C[keep] * np.sqrt(Wt[keep]), rcond=None)[0]
            res = C - (co[0] + co[1] * T)
            keep = np.abs(res) < max(1.2, 2.5 * np.median(np.abs(res[keep])))
        if keep.sum() < 2: continue
        Tk = T[keep]
        # ends: extend to the lit extent (samples with pk >= 0.4 med, contiguous with the kept core); the true end
        # is between the last lit sample and the next: put it half a step beyond
        tA = Tk.min() - STEP / 2; tB = Tk.max() + STEP / 2
        # an end next to an occluder/frame edge is left where it was (the line continues under it)
        oc = occl | ~inside
        iA = np.searchsorted(ts, Tk.min()); iB = np.searchsorted(ts, Tk.max())
        occA = bool(iA > 0 and oc[iA - 1]); occB = bool(iB + 1 < len(ts) and oc[iB + 1])
        if occA: tA = min(tA, ts[max(0, iA - 1)], 0.0 if inside[max(0, iA - 1)] else -40.0)
        if occB: tB = max(tB, ts[min(len(ts) - 1, iB + 1)], L if inside[min(len(ts) - 1, iB + 1)] else L + 40.0)
        oA = co[0] + co[1] * tA; oB = co[0] + co[1] * tB
        pA = np.array([x0, y0]) + d * tA + n * oA; pB = np.array([x0, y0]) + d * tB + n * oB
        pkk = (pk + 2)[ok][keep]; mk = mass[ok][keep]
        wid = float(np.median(mk) / max(np.median(pkk), 1))
        bgv = float(np.median(bg[ok][keep]))
        # values along the bar: medians of the peak (plus background) in nv equal spans
        nv = int(max(1, min(6, np.ceil((tB - tA) / nval))))
        vals = []
        for j in range(nv):
            a_, b_ = tA + (tB - tA) * j / nv, tA + (tB - tA) * (j + 1) / nv
            s = (Tk >= a_) & (Tk <= b_)
            vals.append(float(np.median(pkk[s]) + bgv) if s.any() else float(np.median(pkk) + bgv))
        out.append([pA[0], pA[1], pB[0], pB[1], wid, vals, int(occA), int(occB)])
    return out
def render_tracked(caps, shape=(946, 2206), ss=4, soft=0.6):
    import cv2
    H, W = shape
    img = np.zeros((H * ss, W * ss), np.float32)
    for x0, y0, x1, y1, w, vals, *_ in caps:
        L = np.hypot(x1 - x0, y1 - y0)
        if L < 1: continue
        d = np.array([x1 - x0, y1 - y0]) / L; n = np.array([-d[1], d[0]]) * w / 2
        P = np.array([[x0, y0] + n, [x1, y1] + n, [x1, y1] - n, [x0, y0] - n]) * ss + (ss - 1) / 2
        bx0, by0 = np.floor(P.min(0)).astype(int); bx1, by1 = np.ceil(P.max(0)).astype(int) + 1
        bx0, by0 = max(bx0, 0), max(by0, 0); bx1, by1 = min(bx1, W * ss), min(by1, H * ss)
        if bx1 <= bx0 or by1 <= by0: continue
        m = np.zeros((by1 - by0, bx1 - bx0), np.uint8)
        cv2.fillPoly(m, [np.int32(np.round((P - [bx0, by0]) * 16))], 1, cv2.LINE_8, 4)
        yy, xx = np.mgrid[by0:by1, bx0:bx1]
        t = np.clip(((xx - (x0 * ss + (ss - 1) / 2)) * d[0] + (yy - (y0 * ss + (ss - 1) / 2)) * d[1]) / (L * ss), 0, 1)
        nv = len(vals)
        if nv == 1: vv = np.full(t.shape, vals[0], np.float32)
        else:
            xp = (np.arange(nv) + 0.5) / nv
            vv = np.interp(t, xp, vals).astype(np.float32)
        sub = img[by0:by1, bx0:bx1]
        np.maximum(sub, np.where(m > 0, vv, 0), out=sub)
    img = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)
    return cv2.GaussianBlur(img, (0, 0), soft) if soft else img
def merge_collinear(caps, u, max_gap=120.0, max_off=2.0, max_dang=0.8):
    """join bars that lie on one line (angle within max_dang°, offset < max_off px) when the source is lit across
    the gap between them"""
    caps = [list(c) for c in caps]
    changed = True
    while changed:
        changed = False
        n = len(caps)
        order = sorted(range(n), key=lambda i: -np.hypot(caps[i][2] - caps[i][0], caps[i][3] - caps[i][1]))
        used = [False] * n
        out = []
        for i in order:
            if used[i]: continue
            A = caps[i]
            for j in order:
                if j == i or used[j]: continue
                B = caps[j]
                La = np.hypot(A[2] - A[0], A[3] - A[1]); Lb = np.hypot(B[2] - B[0], B[3] - B[1])
                if La < 1 or Lb < 1: continue
                da = np.array([A[2] - A[0], A[3] - A[1]]) / La; db = np.array([B[2] - B[0], B[3] - B[1]]) / Lb
                if np.degrees(np.arccos(np.clip(abs(da @ db), -1, 1))) > max_dang: continue
                n_ = np.array([-da[1], da[0]])
                o0 = (np.array(B[:2]) - A[:2]) @ n_; o1 = (np.array(B[2:4]) - A[:2]) @ n_
                if max(abs(o0), abs(o1)) > max_off + 0.25 * (A[4] + B[4]) / 2: continue
                tb0 = (np.array(B[:2]) - A[:2]) @ da; tb1 = (np.array(B[2:4]) - A[:2]) @ da
                lo_, hi_ = min(tb0, tb1), max(tb0, tb1)
                gap = max(lo_ - La, -hi_, 0)
                if gap > max_gap: continue
                if max(A[4], B[4]) > 1.8 * min(A[4], B[4]) + 1: continue
                # lit across the gap?
                if gap > 0:
                    g0, g1 = (La, lo_) if lo_ > La else (hi_, 0)
                    ts = np.linspace(g0, g1, max(3, int(gap / 4)))
                    P = np.array(A[:2])[None] + ts[:, None] * da[None]
                    vals = map_coordinates(u, [P[:, 1], P[:, 0]], order=1, mode='nearest')
                    va = min(np.median(A[5]), np.median(B[5]))
                    if np.median(vals) < 0.45 * va: continue
                # merge
                t0 = min(0, lo_); t1 = max(La, hi_)
                pA = np.array(A[:2]) + da * t0; pB = np.array(A[:2]) + da * t1
                segs = [(0, La, A[5]), (lo_, hi_, B[5] if tb0 <= tb1 else B[5][::-1])]
                segs.sort(key=lambda s: s[0])
                vv = [v for s in segs for v in s[2]]
                w = (A[4] * La + B[4] * Lb) / (La + Lb)
                A = [pA[0], pA[1], pB[0], pB[1], w, vv] + list(A[6:8])
                used[j] = True; changed = True
            used[i] = True
            out.append(A)
        caps = out
    return caps
