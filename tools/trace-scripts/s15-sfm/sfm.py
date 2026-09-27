# incremental SfM over a stretch from flow tracks: 2-view init, PnP registration, triangulation, then global BA.
import numpy as np, pickle, sys, cv2
from common import W, H
import ba
def Kmat(f): return np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1.0]])
def run(frames, tracks, f0=819.0, i1=4, verbose=0, ba_iters=150):
    N = len(frames); K = Kmat(f0)
    obs = [dict() for _ in range(N)]   # frame idx -> {track j: (x,y)}
    fi = {f: i for i, f in enumerate(frames)}
    for j, t in enumerate(tracks):
        for f, xy in t.items(): obs[fi[f]][j] = xy
    Rs = [None] * N; ts = [None] * N; X = {}
    def triang(a, b, js):
        if len(js) < 2: return
        P1 = K @ np.hstack([Rs[a], ts[a]]); P2 = K @ np.hstack([Rs[b], ts[b]])
        A = np.array([obs[a][j] for j in js]).T; B = np.array([obs[b][j] for j in js]).T
        Xh = cv2.triangulatePoints(P1, P2, A, B); Xe = (Xh[:3] / Xh[3]).T
        for j, x in zip(js, Xe):
            ok = True
            for c in (a, b):
                q = Rs[c] @ x + ts[c].ravel()
                if q[2] <= 0.05: ok = False; break
                u = K @ q; u = u[:2] / u[2]
                if np.hypot(*(u - obs[c][j])) > 4: ok = False; break
            # parallax angle
            c1 = -Rs[a].T @ ts[a].ravel(); c2 = -Rs[b].T @ ts[b].ravel()
            v1 = x - c1; v2 = x - c2
            ang = np.degrees(np.arccos(np.clip(v1 @ v2 / np.linalg.norm(v1) / np.linalg.norm(v2), -1, 1)))
            if ok and ang > 0.8: X[j] = x
    # 2-view init
    common = [j for j in obs[0] if j in obs[i1]]
    A = np.array([obs[0][j] for j in common]); B = np.array([obs[i1][j] for j in common])
    E, m = cv2.findEssentialMat(A, B, K, cv2.RANSAC, 0.999, 1.0)
    _, R, t, m2 = cv2.recoverPose(E, A, B, K, mask=m.copy())
    Rs[0] = np.eye(3); ts[0] = np.zeros((3, 1)); Rs[i1] = R; ts[i1] = t * i1
    triang(0, i1, [j for j, k in zip(common, m2.ravel()) if k])
    if verbose: print('init pts', len(X), 'of', len(common))
    order = [i for i in range(1, N) if i != i1]
    order.sort(key=lambda i: min(abs(i - 0), abs(i - i1)))
    done = {0, i1}
    while order:
        # pick the frame with most 2D-3D matches
        best = max(order, key=lambda i: sum(1 for j in obs[i] if j in X))
        js = [j for j in obs[best] if j in X]
        if len(js) < 8: print('stuck at', frames[best], len(js)); break
        P3 = np.array([X[j] for j in js]); P2 = np.array([obs[best][j] for j in js])
        ok, rv, tv, inl = cv2.solvePnPRansac(P3, P2, K, None, reprojectionError=3.0, iterationsCount=500, flags=cv2.SOLVEPNP_EPNP)
        if not ok: print('pnp fail', frames[best]); break
        inl = inl.ravel()
        rv, tv = cv2.solvePnPRefineLM(P3[inl], P2[inl], K, None, rv, tv)
        Rs[best] = cv2.Rodrigues(rv)[0]; ts[best] = tv.reshape(3, 1)
        done.add(best); order.remove(best)
        for d in sorted([d for d in done if 2 <= abs(d - best) <= 7], key=lambda d: -abs(d - best)):
            triang(d, best, [j for j in obs[best] if j in obs[d] and j not in X])
        if verbose: print('reg', frames[best], 'pnp pts', len(js), 'inl', len(inl), 'X', len(X))
    # global BA from this init (only tracks with a 3D point; registered frames only)
    reg = sorted(done)
    keep = [j for j in X]
    fr2 = [frames[i] for i in reg]
    tr2 = [{frames[i]: obs[i][j] for i in reg if j in obs[i]} for j in keep]
    # to ba's param (rv, C): camera centre C = -R^T t, R stays (world->cam); make camera reg[0] the origin
    R0, t0 = Rs[reg[0]], ts[reg[0]]
    rv = []; C = []
    for i in reg:
        Rw = Rs[i] @ R0.T   # re-express with camera reg[0] as world
        c = -Rs[i].T @ ts[i].ravel(); c0 = -R0.T @ t0.ravel()
        rv.append(cv2.Rodrigues(Rw)[0].ravel()); C.append(R0 @ (c - c0))
    rv = np.array(rv); C = np.array(C)
    Xa = np.array([R0 @ (X[j] - (-R0.T @ t0.ravel())) for j in keep])
    # scale so the path length is (N-1)
    L = np.linalg.norm(C[-1] - C[0]); s = (len(reg) - 1) / max(L, 1e-9)
    C *= s; Xa *= s
    out = ba.solve(fr2, tr2, f0=f0, iters=ba_iters, init=(rv, C, Xa, f0), verbose=0)
    return out
if __name__ == '__main__':
    fr, tr = pickle.load(open(sys.argv[1], 'rb'))
    out = run(fr, tr, verbose=1, i1=int(sys.argv[2]) if len(sys.argv) > 2 else 4)
    e = out['err']
    print('f', out['f'], 'err median', np.median(e), 'p90', np.percentile(e, 90), 'n', len(e))
    pickle.dump(out, open(sys.argv[1].replace('tr_', 'sfm_'), 'wb'))
def report(out):
    import cv2
    rv, C, f = out['rv'], out['C'], out['f']
    for k, fr in enumerate(out['frames']):
        R = ba.rot(rv[k][None])[0]
        # camera forward in world (cam 0 = world): row 2 of R
        fw = R[2]; yaw = np.degrees(np.arctan2(fw[0], fw[2])); pitch = np.degrees(np.arcsin(-fw[1]))
        up = -R[1]; roll = np.degrees(np.arctan2(R[0][1], R[1][1]))
        d = C[k] - C[k - 1] if k else C[1] - C[0]
        print(f'{fr/25:.2f} C=({C[k][0]:+6.2f},{C[k][1]:+6.2f},{C[k][2]:+6.2f}) yaw={yaw:+6.2f} pitch={pitch:+6.2f} roll={roll:+6.2f} step={np.linalg.norm(d):.2f}')
