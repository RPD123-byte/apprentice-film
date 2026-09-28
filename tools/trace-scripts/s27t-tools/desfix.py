# Per-view mesh correction for the designer key views of the end orbit (127.6-129.28), measurement only.
# The tracked mesh (s27/data3.js DES_MESH) was fitted on silhouettes that cut off the near sleeve, so it does not move
# the sleeve; neighbouring key views then cross-fade with the sleeve in two places. Here each key view's own pixels are
# carried from its key frame by chained dense flow of the SOURCE (DIS, frame to frame, forward-backward checked) and
# the right-hand part of the (extended) mesh is re-solved per frame so the view lands on them:
#   min  sum_samples |sum_i w_i q_i - target|^2 (Huber) + lam |q - P(t)|^2 + mu |(q_i - q_j) - (P_i - P_j)|^2
# Output: src/shots/s27/desfix.js  DES_FIX[key] = {t0, nodes, d: per frame [dx0,dy0,dx1,dy1,...]} (extended-grid nodes).
import cv2, numpy as np, json, re, subprocess, sys, os
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/tools/trace-scripts/s27t-tools')
from codec import dec
P_ = '/Users/computer/rootline/apprentice-film'
REF = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/ref/src'
FC = '/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/flows'
os.makedirs(FC, exist_ok=True)
D = json.loads(subprocess.check_output(['node', '-e', f"Promise.all([import('{P_}/src/shots/s27/data.js'),import('{P_}/src/shots/s27/data3.js')]).then(([a,b])=>console.log(JSON.stringify({{G:a.DES_GRID,M:b.DES_MESH}})))"]))
MESH = {round(r[0], 2): np.array(r[1:], float).reshape(-1, 2) for r in D['M']}
GX, GY, EX, EY = 12, 9, 14, 11
def extend(P):
    out = []
    for j in range(-1, GY + 1):
        for i in range(-1, GX + 1):
            ci, cj = max(0, min(GX - 1, i)), max(0, min(GY - 1, j))
            ni = ci + (1 if i < 0 else -1 if i >= GX else 0); nj = cj + (1 if j < 0 else -1 if j >= GY else 0)
            a = P[cj * GX + ci]; bi = P[cj * GX + ni]; bj = P[nj * GX + ci]
            x, y = a
            if i < 0 or i >= GX: x += a[0] - bi[0]; y += a[1] - bi[1]
            if j < 0 or j >= GY: x += a[0] - bj[0]; y += a[1] - bj[1]
            out.append((x, y))
    return np.array(out)
TRI = []
for j in range(EY - 1):
    for i in range(EX - 1):
        k = j * EX + i; TRI += [(k, k + 1, k + EX), (k + 1, k + EX + 1, k + EX)]
TRI = np.array(TRI)
FREE = [j * EX + i for j in range(EY) for i in range(EX)]      # all nodes (incl. the extrapolated ring)
FI = {n: m for m, n in enumerate(FREE)}
NB = [(a, b) for a in FREE for b in (a + 1, a + EX) if b in FI]
def gray(k): return cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'{REF}/{k:05d}.png'), cv2.COLOR_BGR2GRAY), (0, 0), 1.2)
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); dis.setFinestScale(1); dis.setPatchSize(12); dis.setPatchStride(4)
def flow(ka, kb):
    fn = f'{FC}/f{ka}_{kb}.npy'
    if os.path.exists(fn): return np.load(fn).astype(np.float32)
    f = dis.calc(gray(ka), gray(kb), None); np.save(fn, f.astype(np.float16)); return f
def samp(F, pts):
    n = len(pts); m = int(np.ceil(n / 4096)) * 4096
    px = np.zeros(m, np.float32); py = np.zeros(m, np.float32); px[:n] = pts[:, 0]; py[:n] = pts[:, 1]
    px = px.reshape(-1, 4096); py = py.reshape(-1, 4096)
    return np.stack([cv2.remap(F[..., c], px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).ravel()[:n] for c in (0, 1)], 1)
def outline(tk):
    n = ('%.2f' % tk).rstrip('0').rstrip('.').replace('.', '_')
    s = open(f'{P_}/src/shots/s27/dkeys/d_{n}.js').read()
    m = re.search(r'export const \w+_OUTLINE = "((?:[^"\\]|\\.)*)";', s)
    return np.array(dec(m.group(1).encode().decode('unicode_escape')), float).reshape(-1, 2) / 2
KEYS = [127.88, 128.2, 128.44, 128.68, 128.92, 129.12, 129.28]
WIN = {k: (KEYS[i - 1] if i else 127.6, KEYS[i + 1] if i + 1 < len(KEYS) else 129.28) for i, k in enumerate(KEYS)}
OUT = {}
for tk in KEYS:
    kk = round(tk * 25); Sx = extend(MESH[tk])
    M = np.zeros((946, 2206), np.uint8); cv2.fillPoly(M, [np.int32(np.round(outline(tk)))], 1)
    M = cv2.erode(M, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    # triangle id raster in the key's frame
    TID = np.full((946, 2206), -1, np.int32)
    for n, (a, b, c) in enumerate(TRI):
        if not any(v in FI for v in (a, b, c)): continue
        cv2.fillPoly(TID, [np.int32(np.round(Sx[[a, b, c]]))], n)
    ys, xs = np.nonzero((M > 0) & (TID >= 0)); sel = (xs % 4 == 0) & (ys % 4 == 0); xs, ys = xs[sel], ys[sel]
    tri = TRI[TID[ys, xs]]; pts0 = np.stack([xs, ys], 1).astype(float)
    A_, B_, C_ = Sx[tri[:, 0]], Sx[tri[:, 1]], Sx[tri[:, 2]]
    v0, v1, v2 = B_ - A_, C_ - A_, pts0 - A_
    den = v0[:, 0] * v1[:, 1] - v1[:, 0] * v0[:, 1]
    wb = (v2[:, 0] * v1[:, 1] - v1[:, 0] * v2[:, 1]) / den; wc = (v0[:, 0] * v2[:, 1] - v2[:, 0] * v0[:, 1]) / den; wa = 1 - wb - wc
    W3 = np.stack([wa, wb, wc], 1)
    print('key', tk, 'samples', len(xs), flush=True)
    t0, t1 = WIN[tk]; res = {}
    for direction in (1, -1):
        pos = pts0.copy(); ok = np.ones(len(pos), bool); k = kk
        kend = round((t1 if direction > 0 else t0) * 25)
        while k != kend:
            kn = k + direction
            F = flow(k, kn); Bk = flow(kn, k)
            d = samp(F, pos); back = samp(Bk, pos + d)
            ok &= np.hypot(*(d + back).T) < 1.0
            pos = pos + d; k = kn
            Pt = extend(MESH[round(k / 25, 2)])
            # solve
            nF = len(FREE); rows = []; rhs = []
            idx = np.nonzero(ok)[0]
            fixed_part = np.zeros((len(idx), 2)); Acoef = np.zeros((len(idx), nF))
            for c in range(3):
                nodes = tri[idx, c]; w = W3[idx, c]
                isf = np.array([n in FI for n in nodes])
                Acoef[np.nonzero(isf)[0], [FI[n] for n in nodes[isf]]] += w[isf]
                fixed_part[~isf] += w[~isf, None] * Pt[nodes[~isf]]
            tgt = pos[idx] - fixed_part
            lam, mu = 0.01 * max(1, len(idx)) / nF, 0.04 * max(1, len(idx)) / nF
            Pf = Pt[FREE]
            q = Pf.copy(); wt = np.ones(len(idx))
            for it in range(4):
                AtA = (Acoef * wt[:, None]).T @ Acoef + lam * np.eye(nF)
                Atb = (Acoef * wt[:, None]).T @ tgt + lam * Pf
                for a, b in NB:
                    ia, ib = FI[a], FI[b]
                    AtA[ia, ia] += mu; AtA[ib, ib] += mu; AtA[ia, ib] -= mu; AtA[ib, ia] -= mu
                    dP = Pt[a] - Pt[b]; Atb[ia] += mu * dP; Atb[ib] -= mu * dP
                q = np.linalg.solve(AtA, Atb)
                r = np.hypot(*(Acoef @ q - tgt).T); wt = np.where(r < 10, 1, 10 / np.maximum(r, 1e-6))
            res[k] = (q - Pf)
            sl = (pts0[idx, 0] > 1000) & (pts0[idx, 1] > 560) & (pts0[idx, 1] < 720)
            print('  %.2f valid %d resid med %.1f  sleeve n %d resid med %.1f  corr max %.1f' % (k / 25, len(idx), np.median(r), sl.sum(), np.median(r[sl]) if sl.any() else -1, np.abs(q - Pf).max()), flush=True)
    res[kk] = np.zeros((len(FREE), 2))
    ks = sorted(res)
    OUT['%.2f' % tk] = {'k0': ks[0], 'd': [np.round(res[k], 1).ravel().tolist() for k in ks]}
with open(f'{P_}/src/shots/s27/desfix.js', 'w') as f:
    f.write('// s27 designer key views: per-view corrections of the extended designer mesh (14 x 11 nodes) in the end orbit, so each\n')
    f.write('// traced key view follows its own pixels between keys (chained dense flow of the source from its key frame; generated by\n')
    f.write('// tools/trace-scripts/s27t-tools/desfix.py, measurement only). DES_FIX_NODES: extended-grid node indices; DES_FIX[key] =\n')
    f.write('// { k0: first frame index (25 fps), d: per frame [dx, dy per node] } in frame px, added to the mesh\'s own positions.\n')
    f.write('export const DES_FIX_NODES = ' + json.dumps(FREE) + ';\n')
    f.write('export const DES_FIX = ' + json.dumps(OUT, separators=(',', ':')) + ';\n')
print('written')
