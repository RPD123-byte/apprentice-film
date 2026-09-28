# end-s27-tfix: smooth background warp between two source frames, as a mesh (measurement -> numbers).
# fit(A, B): for every node of a regular grid in frame A, where that point of the ROOM (background) is in frame B.
# Dense DIS flow on grain-blurred luma (A -> B, chained through the frames in between), kept only on background pixels
# (our own room-mask renders: magenta = room visible, eroded) that pass a forward-backward check, then a least-squares
# mesh (bilinear) with a membrane + bending regulariser, so the holes behind the foreground are bridged smoothly.
import cv2, numpy as np, scipy.sparse as sp, scipy.sparse.linalg as spl, json, sys, os
WORK = '/Users/computer/rootline/apprentice-film/snapshots/end-s27-tfix-work'
H, W = 946, 2206
GS = int(os.environ.get('FM_GS', 64))                                        # node spacing (px)
NX = int(np.ceil((W + 2 * GS) / GS)) + 1       # nodes from -GS .. W+GS
NY = int(np.ceil((H + 2 * GS) / GS)) + 1
GXS = -GS + GS * np.arange(NX); GYS = -GS + GS * np.arange(NY)
_c = {}
def gray(F):
    k = ('g', F)
    if k not in _c:
        g = cv2.cvtColor(cv2.imread(f'{WORK}/src/s{F}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
        _c[k] = np.clip(cv2.GaussianBlur(g, (0, 0), 2.0), 0, 255).astype(np.uint8)
    return _c[k]
def bgmask(F, ero=9):
    k = ('m', F, ero)
    if k not in _c:
        m = cv2.imread(f'{WORK}/mask/v0_r{F}.png')
        b = ((m[..., 2] > 240) & (m[..., 1] < 20) & (m[..., 0] > 240)).astype(np.uint8)
        _c[k] = cv2.erode(b, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * ero + 1, 2 * ero + 1))) if ero else b
    return _c[k]
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
dis.setFinestScale(1); dis.setPatchSize(16); dis.setPatchStride(4); dis.setVariationalRefinementIterations(5)
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
def flow(A, B):
    k = ('f', A, B)
    if k not in _c: _c[k] = dis.calc(gray(A), gray(B), None)
    return _c[k]
def chain(A, B):
    """dense map A -> B (absolute coords in B for every pixel of A), chained frame by frame"""
    step = 1 if B > A else -1
    mx, my = XX.copy(), YY.copy()
    f = A
    while f != B:
        fl = flow(f, f + step)
        dx = cv2.remap(fl[..., 0], mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        dy = cv2.remap(fl[..., 1], mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        mx, my = mx + dx, my + dy; f += step
    return mx, my
def reg_matrix():
    idx = lambda i, j: j * NX + i
    rows = []; r = 0; I = []; J = []; V = []
    def add(terms):
        nonlocal r
        for n, v in terms: I.append(r); J.append(n); V.append(v)
        r += 1
    for j in range(NY):
        for i in range(NX):
            if i + 1 < NX: add([(idx(i, j), -1), (idx(i + 1, j), 1)])
            if j + 1 < NY: add([(idx(i, j), -1), (idx(i, j + 1), 1)])
    nm = r
    for j in range(NY):
        for i in range(1, NX - 1): add([(idx(i - 1, j), 1), (idx(i, j), -2), (idx(i + 1, j), 1)])
    for j in range(1, NY - 1):
        for i in range(NX): add([(idx(i, j - 1), 1), (idx(i, j), -2), (idx(i, j + 1), 1)])
    M = sp.csr_matrix((V, (I, J)), shape=(r, NX * NY))
    return M[:nm], M[nm:]
RM, RB = reg_matrix()
def fit(A, B, lam_m=0.3, lam_b=3.0, step=4, ero=9, extra_mask=None):
    """node displacement (NY, NX, 2) so that node + d = position in B of the room point at node in A"""
    mx, my = chain(A, B)
    bx, by = chain(B, A)
    # forward-backward consistency
    rx = cv2.remap(bx, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=-1e4)
    ry = cv2.remap(by, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=-1e4)
    fb = np.hypot(rx - XX, ry - YY)
    mA = bgmask(A, ero).astype(bool)
    mB = cv2.remap(bgmask(B, ero), mx, my, cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=0).astype(bool)
    ok = mA & mB & (fb < 1.5) & (mx > 2) & (mx < W - 3) & (my > 2) & (my < H - 3)
    if extra_mask is not None: ok &= extra_mask
    g = gray(A).astype(np.float32); gm = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1)) / 8
    wgt = np.clip((gm - float(os.environ.get('FM_G0', 0))) / 3.0, float(os.environ.get('FM_WMIN', 0.15)), 1.0)
    sel = np.zeros_like(ok); sel[::step, ::step] = True; sel &= ok
    ys, xs = np.nonzero(sel)
    dx = mx[ys, xs] - xs; dy = my[ys, xs] - ys; w = wgt[ys, xs]
    fx = (xs - GXS[0]) / GS; fy = (ys - GYS[0]) / GS
    i0 = np.floor(fx).astype(int); j0 = np.floor(fy).astype(int); ux = fx - i0; uy = fy - j0
    n = len(xs); rr = np.repeat(np.arange(n), 4)
    cols = np.stack([j0 * NX + i0, j0 * NX + i0 + 1, (j0 + 1) * NX + i0, (j0 + 1) * NX + i0 + 1], 1).ravel()
    vals = np.stack([(1 - ux) * (1 - uy), ux * (1 - uy), (1 - ux) * uy, ux * uy], 1).ravel()
    Aobs = sp.csr_matrix((vals, (rr, cols)), shape=(n, NX * NY))
    Wd = sp.diags(w)
    # normalise the regulariser to the data count so lam means the same thing for any mask size
    s = n / (NX * NY)
    LHS = (Aobs.T @ Wd @ Aobs) + s * lam_m * (RM.T @ RM) + s * lam_b * (RB.T @ RB) + 1e-6 * sp.eye(NX * NY)
    out = np.zeros((NY, NX, 2), np.float32)
    for c, d in ((0, dx), (1, dy)):
        out[..., c] = spl.spsolve(LHS.tocsc(), Aobs.T @ (w * d)).reshape(NY, NX)
    return out, dict(n=int(n))
def dense(mesh):
    """per-pixel map A -> B from the node mesh (bilinear)"""
    D = [cv2.resize(mesh[..., c], None, fx=GS, fy=GS, interpolation=cv2.INTER_LINEAR) for c in range(2)]
    # resize maps node k to pixel k*GS + (GS-1)/2 ; sample at pixel (x - GXS0) exactly instead:
    fx = (XX - GXS[0]) / GS; fy = (YY - GYS[0]) / GS
    return [XX + cv2.remap(mesh[..., c], fx, fy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE) for c in (0, 1)][0], \
           [YY + cv2.remap(mesh[..., c], fx, fy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE) for c in (1,)][0]
def warp_to(imgB, mesh):
    """image of frame B brought into frame A's coordinates"""
    mx, my = dense(mesh)
    return cv2.remap(imgB, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
