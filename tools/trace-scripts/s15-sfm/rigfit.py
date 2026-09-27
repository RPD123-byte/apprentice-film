# joint fit of a take: per-frame camera (x, z, yaw, pitch, roll; eye height fixed 0.33, fov 60) and STATIC boxes
# (footprint front edge X0,Z0 -> X1,Z1 and height h; stacked boxes sit on their parent) to corners tracked on the source.
# spec: {"set", "frames": [f0, f1], "out": path.json, "boxes": [{id, track, c: {bl|br|tr|tl: [idx, f0, f1(, track)]},
#        d, y0: number | parent id, alb, b, prior: {L, h, yaw}}], "smooth": [wx, wz, wyaw]}
import json, subprocess, sys, numpy as np
from scipy.optimize import least_squares
from scipy.sparse import lil_matrix
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s15-ov')
from proj import W, H, K
from common import FRAMES
HERE = '/Users/computer/rootline/apprentice-film/snapshots/s15-ov'
HC = 0.33
def cams_for(key, frames):
    times = ','.join(f'{f/25:.2f}' for f in frames)
    js = json.loads(subprocess.check_output(['node', f'{HERE}/cams.mjs', key, times]))
    return [js[f'{f/25:.2f}'] for f in frames]
def project(P, cam):
    # P (N,3) world; cam (N,5) = x, z, yaw, pitch, roll
    x, z, yaw, pitch, roll = cam.T
    cy, sy, cp, sp = np.cos(yaw), np.sin(yaw), np.cos(pitch), np.sin(pitch)
    f = np.stack([sy * cp, sp, cy * cp], 1); r = np.stack([cy, 0 * cy, -sy], 1); u = np.stack([-sy * sp, cp, -cy * sp], 1)
    cr, sr = np.cos(roll)[:, None], np.sin(roll)[:, None]
    r2 = r * cr - u * sr; u2 = r * sr + u * cr
    d = P - np.stack([x, np.full_like(x, HC), z], 1)
    zc = (d * f).sum(1)
    zs = np.where(zc < 0.02, 0.02, zc)
    return np.stack([W / 2 + (d * r2).sum(1) * K / zs, H / 2 - (d * u2).sum(1) * K / zs], 1), zc
def run(spec):
    f0, f1 = spec['frames']; frames = [f for f in FRAMES if f0 <= f <= f1]; fi = {f: i for i, f in enumerate(frames)}
    nF = len(frames)
    cam0 = cams_for(spec['set'], frames)
    C0 = np.array([[c['eye'][0], c['eye'][2], c['yaw'], c['pitch'], c['roll']] for c in cam0])
    tracks = {}
    boxes = spec['boxes']; bid = {b['id']: i for i, b in enumerate(boxes)}
    obs = []   # (frame i, box j, corner code, x, y)
    CODE = {'bl': 0, 'br': 1, 'tr': 2, 'tl': 3}
    for j, b in enumerate(boxes):
        for k, v in b['c'].items():
            tf = v[3] if len(v) > 3 else b['track']
            if tf not in tracks: tracks[tf] = json.load(open(tf))
            T = tracks[tf]['T']
            for f in range(v[1], v[2] + 1):
                if f in fi and str(f) in T: x, y = T[str(f)][v[0]]; obs.append((fi[f], j, CODE[k], x, y))
    obs = np.array(obs); oi = obs[:, 0].astype(int); oj = obs[:, 1].astype(int); oc = obs[:, 2].astype(int); oxy = obs[:, 3:5]
    nB = len(boxes)
    # init boxes from the initial cameras: back-project the first observation of each corner
    def ray_hit_y(sx, sy, c, y):
        x, z, yaw, pitch, roll = c
        cy, sy_, cp, sp = np.cos(yaw), np.sin(yaw), np.cos(pitch), np.sin(pitch)
        f = np.array([sy_ * cp, sp, cy * cp]); r = np.array([cy, 0, -sy_]); u = np.array([-sy_ * sp, cp, -cy * sp])
        cr, sr = np.cos(roll), np.sin(roll); r2 = r * cr - u * sr; u2 = r * sr + u * cr
        d = f + r2 * (sx - W / 2) / K - u2 * (sy - H / 2) / K; e = np.array([x, HC, z])
        t = (y - HC) / d[1] if abs(d[1]) > 1e-4 else 5
        if t <= 0 or t > 20: t = 3
        return e + d * t
    B0 = np.zeros((nB, 5))
    order = sorted(range(nB), key=lambda j: 0 if not isinstance(boxes[j].get('y0', 0), str) else 1)
    y0s = {}
    for j in order:
        b = boxes[j]; pr = b.get('prior', {})
        y0 = b.get('y0', 0)
        if isinstance(y0, str): p = bid[y0]; y0 = y0s[p] + B0[p][4]
        y0s[j] = y0
        h = pr.get('h', 0.4)
        sel = np.where(oj == j)[0]
        pts = {}
        for s in sel:
            if oc[s] not in pts: pts[oc[s]] = (oi[s], oxy[s])
        def hit(code):
            i, (x, y) = pts[code]; yy = y0 if code in (0, 1) else y0 + h
            return ray_hit_y(x, y, C0[i], yy)
        L = pr.get('L', 0.4); yaw = pr.get('yaw', 0.0)
        A = hit(0) if 0 in pts else hit(3) if 3 in pts else None
        Bp = hit(1) if 1 in pts else hit(2) if 2 in pts else None
        if A is None: A = Bp - L * np.array([np.cos(yaw), 0, -np.sin(yaw)])
        if Bp is None: Bp = A + L * np.array([np.cos(yaw), 0, -np.sin(yaw)])
        B0[j] = [A[0], A[2], Bp[0], Bp[2], h]
    def unpack(p):
        C = np.vstack([C0[:1], p[:5 * (nF - 1)].reshape(nF - 1, 5)])
        Bx = p[5 * (nF - 1):].reshape(nB, 5)
        return C, Bx
    y0fix = {j: boxes[j].get('y0', 0) for j in range(nB)}
    def ybase(Bx):
        y = np.zeros(nB)
        for j in order:
            v = y0fix[j]
            y[j] = (y[bid[v]] + Bx[bid[v]][4]) if isinstance(v, str) else v
        return y
    sm = spec.get('smooth', [30, 30, 60, 200, 200])
    def resid(p):
        C, Bx = unpack(p)
        yb = ybase(Bx)
        X0, Z0, X1, Z1, h = Bx[oj].T; y = yb[oj]
        cx = np.where((oc == 0) | (oc == 3), X0, X1); cz = np.where((oc == 0) | (oc == 3), Z0, Z1)
        cyv = np.where(oc <= 1, y, y + h)
        q, zc = project(np.stack([cx, cyv, cz], 1), C[oi])
        r = (q - oxy).ravel()
        # camera smoothness (2nd differences) and pitch/roll near their means
        d2 = (C[2:] - 2 * C[1:-1] + C[:-2]) * np.array(sm[:5])
        pr = []
        for j, b in enumerate(boxes):
            P = b.get('prior', {}); w = b.get('pw', 30)
            L = np.hypot(Bx[j][2] - Bx[j][0], Bx[j][3] - Bx[j][1])
            if 'L' in P: pr.append((L - P['L']) * w)
            if 'h' in P: pr.append((Bx[j][4] - P['h']) * w)
            if 'yaw' in P: pr.append(np.angle(np.exp(1j * (np.arctan2(-(Bx[j][3] - Bx[j][1]), Bx[j][2] - Bx[j][0]) - P['yaw']))) * w)
        return np.concatenate([r, d2.ravel(), np.array(pr), np.minimum(zc - 0.05, 0) * 1000])
    p0 = np.concatenate([C0[1:].ravel(), B0.ravel()])
    res = least_squares(resid, p0, loss='soft_l1', f_scale=4, x_scale='jac', max_nfev=400)
    C, Bx = unpack(res.x); yb = ybase(Bx)
    r = res.fun[:2 * len(obs)].reshape(-1, 2); e = np.hypot(r[:, 0], r[:, 1])
    print('obs', len(obs), 'err median', round(float(np.median(e)), 2), 'p90', round(float(np.percentile(e, 90)), 2))
    for j, b in enumerate(boxes): print('  ', b['id'], 'err', round(float(np.mean(e[oj == j])), 1), 'box', np.round(Bx[j], 3).tolist(), 'y0', round(float(yb[j]), 3))
    for i, f in enumerate(frames):
        print(f'  {f/25:.2f} cam x={C[i][0]:+.3f} z={C[i][1]:+.3f} yaw={np.degrees(C[i][2]):+6.2f} pitch={np.degrees(C[i][3]):+5.2f} roll={np.degrees(C[i][4]):+5.2f}  (init x={C0[i][0]:+.3f} z={C0[i][1]:+.3f} yaw={np.degrees(C0[i][2]):+6.2f})  err {np.mean(e[oi == i]) if (oi == i).any() else 0:.1f}')
    out = {'cams': [[round(f / 25, 2)] + [round(float(v), 5) for v in C[i]] for i, f in enumerate(frames)], 'boxes': []}
    for j, b in enumerate(boxes):
        X0, Z0, X1, Z1, h = Bx[j]; ux, uz = X1 - X0, Z1 - Z0; w_ = float(np.hypot(ux, uz)); yaw = float(np.arctan2(-uz / w_, ux / w_))
        d = b.get('d', 0.4); nx, nz = np.sin(yaw), np.cos(yaw)
        out['boxes'].append({'id': b['id'], 'x': round(float((X0 + X1) / 2 + nx * d / 2), 4), 'y': round(float(yb[j]), 4), 'z': round(float((Z0 + Z1) / 2 + nz * d / 2), 4), 'w': round(w_, 4), 'h': round(float(h), 4), 'd': d, 'yaw': round(yaw, 4), 'alb': b.get('alb', 0.95), **({'b': b['b']} if 'b' in b else {})})
    json.dump(out, open(spec['out'], 'w'))
if __name__ == '__main__':
    run(json.load(open(sys.argv[1])))
