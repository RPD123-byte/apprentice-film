# fit keyed boxes (world units) to tracked face corners, through the set's camera at each frame.
# spec: {"set": "E", "out": ".../keysE.js", "boxes": [{"id": "LB", "track": "file.json", "c": {"bl": [i, f0, f1], ...},
#        "d": 0.4, "y0": 0 | "LB" (stack on that box: y0 = its height), "alb": 1.0, "prior": {"L": .., "h": ..}}]}
import json, subprocess, sys, numpy as np
from scipy.optimize import least_squares
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s15-ov')
from proj import basis, W, H, K
HERE = '/Users/computer/rootline/apprentice-film/snapshots/s15-ov'
def cams_for(key, frames):
    times = ','.join(f'{f/25:.2f}' for f in frames)
    js = json.loads(subprocess.check_output(['node', f'{HERE}/cams.mjs', key, times]))
    return {f: js[f'{f/25:.2f}'] for f in frames}
def proj(P, c):
    f, r, u = basis(c['yaw'], c['pitch'], c['roll']); d = np.asarray(P) - np.asarray(c['eye'])
    z = d @ f
    return np.array([W / 2 + (d @ r) * K / z, H / 2 - (d @ u) * K / z]), z
def floor_hit(sx, sy, c, y):
    f, r, u = basis(c['yaw'], c['pitch'], c['roll'])
    a = (sx - W / 2) / K; b = -(sy - H / 2) / K
    d = f + r * a + u * b; e = np.asarray(c['eye'])
    t = (y - e[1]) / d[1]
    return e + d * t if t > 0 else e + f * 3
def corners(p, y0):
    X0, Z0, X1, Z1, h = p
    return {'bl': (X0, y0, Z0), 'br': (X1, y0, Z1), 'tr': (X1, y0 + h, Z1), 'tl': (X0, y0 + h, Z0)}
def fit_frame(obs, c, y0, init, prior=None, wP=(400, 400, 60)):
    def res(p):
        C = corners(p, y0); r = []
        for k, (x, y) in obs.items():
            q, z = proj(C[k], c)
            if z < 0.02: r += [500, 500]
            else: r += [q[0] - x, q[1] - y]
        if prior:
            L = np.hypot(p[2] - p[0], p[3] - p[1]); yaw = np.arctan2(-(p[3] - p[1]), p[2] - p[0])
            if 'L' in prior: r.append((L - prior['L']) * wP[0])
            if 'h' in prior: r.append((p[4] - prior['h']) * wP[1])
            if 'yaw' in prior: r.append(np.angle(np.exp(1j * (yaw - prior['yaw']))) * wP[2])
            if 'tie' in prior:
                q = prior['tie']
                # depth of the front edge midpoint along the parent's normal, and the yaw, stay close
                mx, mz = (p[0] + p[2]) / 2, (p[1] + p[3]) / 2; qx, qz = (q[0] + q[2]) / 2, (q[1] + q[3]) / 2
                ux, uz = q[2] - q[0], q[3] - q[1]; L_ = np.hypot(ux, uz) + 1e-9
                r.append(((mx - qx) * uz - (mz - qz) * ux) / L_ * 300)
                r.append(np.angle(np.exp(1j * (yaw - np.arctan2(-uz, ux)))) * 60)
        return np.array(r)
    s = least_squares(res, np.asarray(init, float), loss='soft_l1', f_scale=3)
    rr = s.fun[:2 * len(obs)].reshape(-1, 2)
    return s.x, float(np.hypot(rr[:, 0], rr[:, 1]).mean()) if len(rr) else 0
def run(spec):
    tracks = {}
    allf = set()
    for b in spec['boxes']:
        if b['track'] not in tracks: tracks[b['track']] = json.load(open(b['track']))
        for k, v in b['c'].items():
            if len(v) > 3 and v[3] not in tracks: tracks[v[3]] = json.load(open(v[3]))
            allf |= set(range(v[1], v[2] + 1))
    frames = sorted(f for f in allf if any(str(f) in t['T'] for t in tracks.values()))
    cams = cams_for(spec['set'], frames)
    sol = {}
    out = []
    for b in spec['boxes']:
        T = tracks[b['track']]
        TT = lambda v: tracks[v[3]] if len(v) > 3 else T
        fr = sorted({f for k, v in b['c'].items() for f in range(v[1], v[2] + 1) if str(f) in TT(v)['T']})
        def obs_at(f): return {k: TT(v)['T'][str(f)][v[0]] for k, v in b['c'].items() if v[1] <= f <= v[2]}
        def y0_at(f):
            if isinstance(b.get('y0', 0), str): return sol[b['y0']].get(f, list(sol[b['y0']].values())[0])[4] + sol[b['y0']].get('y0', 0)
            return b.get('y0', 0)
        # pass 1: frames with >= 3 corners, no prior
        P = {}; errs = {}
        prior = dict(b.get('prior', {}))
        for f in fr:
            o = obs_at(f)
            c = cams[f]; y0 = y0_at(f)
            bl = o.get('bl') or o.get('tl'); br = o.get('br') or o.get('tr')
            yb = y0 if 'bl' in o else y0 + prior.get('h', 0.4)
            A = floor_hit(*bl, c, yb) if bl else None; B = floor_hit(*br, c, yb) if br else None
            if A is None: A = B - np.array([prior.get('L', 0.4), 0, 0])
            if B is None: B = A + np.array([prior.get('L', 0.4), 0, 0])
            init = [A[0], A[2], B[0], B[2], prior.get('h', 0.4)]
            if 'yaw' in b.get('prior', {}):
                L0 = b['prior'].get('L', 0.4); yw = b['prior']['yaw']; A0 = np.array([init[0], 0, init[1]])
                if 'bl' not in o and 'tl' not in o: A0 = np.array([init[2], 0, init[3]]) - L0 * np.array([np.cos(yw), 0, -np.sin(yw)])
                init = [A0[0], A0[2], A0[0] + L0 * np.cos(yw), A0[2] - L0 * np.sin(yw), init[4]]
            if len(o) >= 3:
                p, e = fit_frame(o, c, y0, init, b.get('prior') if 'yaw' in b.get('prior', {}) else None, (5, 5, 1)); P[f] = p; errs[f] = e
        if P:
            Ls = [np.hypot(p[2] - p[0], p[3] - p[1]) for p in P.values()]; hs = [p[4] for p in P.values()]
            ys = [np.arctan2(-(p[3] - p[1]), p[2] - p[0]) for p in P.values()]
            prior.setdefault('L', float(np.median(Ls))); prior.setdefault('h', float(np.median(hs))); prior.setdefault('yaw', float(np.median(ys)))
        prior.setdefault('L', 0.35); prior.setdefault('h', 0.4); prior.setdefault('yaw', 0.0)
        # pass 2: every frame with the prior (weak for full frames)
        S = {}
        prev = None
        for f in fr:
            o = obs_at(f)
            if not o: continue
            c = cams[f]; y0 = y0_at(f)
            init = P.get(f, prev)
            if init is None:
                bl = o.get('bl') or o.get('tl'); yb = y0 if 'bl' in o else y0 + prior['h']
                A = floor_hit(*bl, c, yb) if bl else floor_hit(*(o.get('br') or o.get('tr')), c, yb) - np.array([prior['L'], 0, 0])
                init = [A[0], A[2], A[0] + prior['L'] * np.cos(prior['yaw']), A[2] - prior['L'] * np.sin(prior['yaw']), prior['h']]
            w = (5, 5, 1) if len(o) >= 3 else (400, 400, 60)
            par = sol.get(b['y0']) if isinstance(b.get('y0', 0), str) else None
            pp = par.get(f) if par else None
            if pp is not None and len(o) < 4:
                # a stacked box: its front edge stays near the parent's (same depth, offset allowed along the edge)
                pr2 = dict(prior); pr2['tie'] = pp
                p, e = fit_frame(o, c, y0, pp if init is None else init, pr2, w)
            else:
                p, e = fit_frame(o, c, y0, init, prior, w)
            S[f] = p; errs[f] = e; prev = p
        # temporal smoothing: local weighted quadratic fit of each parameter over +-3 frames (the per-frame fits jitter
        # where a face shows few corners); weights from each frame's corner count and fit error
        fs_ = sorted(k for k in S)
        if len(fs_) >= 4 and b.get('smooth', False):
            Pm = np.array([S[f] for f in fs_]); tt = np.array(fs_, float)
            wts = np.array([len(obs_at(f)) / (1 + errs.get(f, 0) / 4) for f in fs_])
            Sm = {}
            for k, f in enumerate(fs_):
                sel = np.abs(tt - f) <= b.get('win', 3)
                if sel.sum() < 3: Sm[f] = S[f]; continue
                A_ = np.c_[np.ones(sel.sum()), tt[sel] - f, (tt[sel] - f) ** 2 * (1 if sel.sum() >= 5 else 0)]
                ww = np.sqrt(wts[sel])[:, None]
                coef, *_ = np.linalg.lstsq(A_ * ww, Pm[sel] * ww, rcond=None)
                Sm[f] = coef[0]
            for f in fs_:
                o = obs_at(f); c = cams[f]; y0 = y0_at(f)
                C_ = corners(Sm[f], y0); r_ = []
                for kk, (x, y) in o.items():
                    q, z = proj(C_[kk], c); r_.append(np.hypot(q[0] - x, q[1] - y) if z > 0.02 else 500)
                errs[f] = float(np.mean(r_)) if r_ else 0
            S = Sm
        S['y0'] = y0_at(fr[0]) if not isinstance(b.get('y0', 0), str) else 0
        sol[b['id']] = S
        keys = []
        for f in sorted(k for k in S if k != 'y0'):
            X0, Z0, X1, Z1, h = S[f]; y0 = y0_at(f)
            ux, uz = X1 - X0, Z1 - Z0; w_ = np.hypot(ux, uz); yaw = np.arctan2(-uz / w_, ux / w_)
            nx, nz = np.sin(yaw), np.cos(yaw); d = b.get('d', 0.4)
            keys.append([round(f / 25, 2), round((X0 + X1) / 2 + nx * d / 2, 4), round(y0, 4), round((Z0 + Z1) / 2 + nz * d / 2, 4), round(w_, 4), round(h, 4), d, round(yaw, 4)])
        print(b['id'], 'frames', len(keys), 'err', {f / 25: round(e, 1) for f, e in errs.items()}, 'prior', {k: round(v, 3) for k, v in prior.items()})
        out.append({'id': b['id'], 'alb': b.get('alb', 0.95), 'o': b.get('o', {}), 'b': b.get('b', {}), 'keys': keys})
    js = '// generated by snapshots/s15-sfm/fitboxes.py from tracked face corners (source measurements): keyed boxes in world units\n'
    js += '// [t, x, y, z, w, h, d, yaw] per key\nexport const KEYS = ' + json.dumps(out) + ';\n'
    open(spec['out'], 'w').write(js)
if __name__ == '__main__':
    run(json.load(open(sys.argv[1])))
