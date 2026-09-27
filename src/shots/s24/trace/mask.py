# Silhouette mask of a bright drawing on black with speed lines around it (measurement only).
import numpy as np, cv2
from scipy import ndimage
def recon(seed, m, lim_px):
    lim = cv2.dilate(seed, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * lim_px + 1,) * 2)) if lim_px else np.ones_like(seed)
    rec = seed.copy()
    for it in range(400):
        nr = cv2.dilate(rec, np.ones((3, 3), np.uint8)) & m & lim
        if (nr == rec).all(): break
        rec = nr
    return rec
def elong(lab, i, st):
    ys, xs = np.nonzero(lab[st[i, 1]:st[i, 1] + st[i, 3], st[i, 0]:st[i, 0] + st[i, 2]] == i)
    C = np.cov(np.stack([xs, ys]).astype(np.float64)); ev = np.linalg.eigvalsh(C)
    return float(np.sqrt(ev[1] / max(ev[0], 1e-6)))
def silhouette(P, thr_hi=30, thr_lo=10, lo_polys=(), open_r=10, lim=40, dilate=2, keep=1, add_polys=(), cut_polys=(), blur=1.5, min_comp=0, max_elong=0, strip_lines=0):
    P = np.nan_to_num(P, nan=0).astype(np.float32)
    Pb = cv2.GaussianBlur(P, (0, 0), blur)
    m = (Pb > thr_hi).astype(np.uint8)
    op = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * open_r + 1,) * 2))
    nl, lab, st, _ = cv2.connectedComponentsWithStats(op)
    order = np.argsort(-st[1:, 4]) + 1
    if max_elong: order = [o for j, o in enumerate(order) if j == 0 or elong(lab, o, st) <= max_elong]
    order = order[:keep]
    seed = np.isin(lab, [o for o in order if st[o, 4] >= min_comp]).astype(np.uint8)
    rec = recon(seed, m, lim)
    if lo_polys:
        pm = np.zeros_like(m)
        for p in lo_polys: cv2.fillPoly(pm, [np.int32(p)], 1)
        ml = ((Pb > thr_lo) & (pm > 0)).astype(np.uint8)
        rec = recon(rec, rec | ml, 0)
    for p in add_polys: cv2.fillPoly(rec, [np.int32(p)], 1)
    for p in cut_polys: cv2.fillPoly(rec, [np.int32(p)], 0)
    fill = ndimage.binary_fill_holes(rec).astype(np.uint8)
    if strip_lines:
        # thin appendages running along the speed-line angle (a line touching the drawing) are cut off
        op2 = cv2.morphologyEx(fill, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
        D = (fill & (1 - op2)).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(D)
        for i in range(1, n):
            if st[i, 4] < 60: continue
            ys, xs = np.nonzero(lab == i)
            C = np.cov(np.stack([xs, ys]).astype(np.float64)); ev, evec = np.linalg.eigh(C)
            L = np.sqrt(12 * ev[1]); Wd = np.sqrt(12 * max(ev[0], 1e-6))
            ang = np.degrees(np.arctan2(evec[1, 1], evec[0, 1])) % 180
            if L > 150 and L / Wd > 6 and abs(ang - strip_lines) < 4: fill[lab == i] = 0
    if dilate: fill = cv2.dilate(fill, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * dilate + 1,) * 2))
    return fill
def show(P, M, fn, box=None, z=1):
    vis = cv2.cvtColor(np.clip(np.nan_to_num(P), 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    cs, _ = cv2.findContours(M.astype(np.uint8), cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(vis, cs, -1, (0, 0, 255), 1)
    if box: vis = vis[box[1]:box[3], box[0]:box[2]]
    if z != 1: vis = cv2.resize(vis, None, fx=z, fy=z, interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(fn, vis)
