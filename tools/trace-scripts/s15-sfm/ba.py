# bundle adjustment of a stretch: per-frame camera (rotation vector, centre), shared focal, 3D points from flow tracks.
import numpy as np, pickle, sys, cv2
from scipy.optimize import least_squares
from scipy.sparse import lil_matrix
from common import W, H
def rot(rv):
    th = np.linalg.norm(rv, axis=-1, keepdims=True)
    k = rv / np.maximum(th, 1e-12); th = th[..., 0]
    K = np.zeros(rv.shape[:-1] + (3, 3))
    K[..., 0, 1] = -k[..., 2]; K[..., 0, 2] = k[..., 1]; K[..., 1, 0] = k[..., 2]; K[..., 1, 2] = -k[..., 0]; K[..., 2, 0] = -k[..., 1]; K[..., 2, 1] = k[..., 0]
    I = np.eye(3)
    s = np.sin(th)[..., None, None]; c = np.cos(th)[..., None, None]
    return I + s * K + (1 - c) * (K @ K)
def solve(frames, tracks, f0=819.0, iters=200, fix_f=False, init=None, verbose=1, loss='soft_l1', fscale=2.0):
    N = len(frames); fi = {f: i for i, f in enumerate(frames)}
    obs_c, obs_p, obs_xy = [], [], []
    for j, t in enumerate(tracks):
        for f, (x, y) in t.items(): obs_c.append(fi[f]); obs_p.append(j); obs_xy.append((x, y))
    obs_c = np.array(obs_c); obs_p = np.array(obs_p); obs_xy = np.array(obs_xy)
    M = len(tracks)
    # init
    if init is None:
        rv = np.zeros((N, 3)); C = np.zeros((N, 3)); C[:, 2] = np.arange(N)
        X = np.zeros((M, 3))
        for j, t in enumerate(tracks):
            f = min(t); x, y = t[f]; i = fi[f]
            d = np.array([(x - W / 2) / f0, (y - H / 2) / f0, 1.0])
            X[j] = C[i] + d * 6.0
        f = f0
    else:
        rv, C, X, f = init
    def pack(rv, C, X, f): return np.concatenate([rv[1:].ravel(), C[1:].ravel(), X.ravel(), [f]])
    def unpack(p):
        rv_ = np.vstack([np.zeros(3), p[:3 * (N - 1)].reshape(N - 1, 3)])
        o = 3 * (N - 1)
        C_ = np.vstack([np.zeros(3), p[o:o + 3 * (N - 1)].reshape(N - 1, 3)]); o += 3 * (N - 1)
        X_ = p[o:o + 3 * M].reshape(M, 3); o += 3 * M
        return rv_, C_, X_, p[o]
    def resid(p):
        rv_, C_, X_, f_ = unpack(p)
        if fix_f: f_ = f0
        R = rot(rv_)
        d = X_[obs_p] - C_[obs_c]
        q = np.einsum('nij,nj->ni', R[obs_c], d)
        z = q[:, 2]
        zs = np.where(np.abs(z) < 1e-3, 1e-3, z)
        u = f_ * q[:, 0] / zs + W / 2; v = f_ * q[:, 1] / zs + H / 2
        r = np.concatenate([u - obs_xy[:, 0], v - obs_xy[:, 1]])
        # gauge: mean speed 1 unit per frame along the path
        g = np.array([(np.linalg.norm(C_[-1] - C_[0]) - (N - 1)) * 10.0])
        # points in front
        cheir = np.minimum(z, 0) * 100
        return np.concatenate([r, g, cheir])
    no = len(obs_c)
    nparam = 6 * (N - 1) + 3 * M + 1
    S = lil_matrix((2 * no + 1 + no, nparam), dtype=int)
    for k in range(no):
        i, j = obs_c[k], obs_p[k]
        for rr in (k, no + k, 2 * no + 1 + k):
            if i > 0:
                S[rr, 3 * (i - 1):3 * i] = 1; S[rr, 3 * (N - 1) + 3 * (i - 1):3 * (N - 1) + 3 * i] = 1
            S[rr, 6 * (N - 1) + 3 * j:6 * (N - 1) + 3 * j + 3] = 1
            S[rr, nparam - 1] = 1
    S[2 * no, 3 * (N - 1):6 * (N - 1)] = 1
    p0 = pack(rv, C, X, f)
    res = least_squares(resid, p0, jac_sparsity=S, method='trf', loss=loss, f_scale=fscale, x_scale='jac', max_nfev=iters, verbose=verbose)
    rv, C, X, f = unpack(res.x)
    r = res.fun[:2 * no].reshape(2, no).T
    err = np.hypot(r[:, 0], r[:, 1])
    return dict(rv=rv, C=C, X=X, f=f, err=err, obs_c=obs_c, obs_p=obs_p, frames=frames)
if __name__ == '__main__':
    fr, tr = pickle.load(open(sys.argv[1], 'rb'))
    out = solve(fr, tr, iters=int(sys.argv[2]) if len(sys.argv) > 2 else 100)
    e = out['err']
    print('f', out['f'], 'err median', np.median(e), 'p90', np.percentile(e, 90))
    pickle.dump(out, open(sys.argv[1].replace('tr_', 'ba_'), 'wb'))
