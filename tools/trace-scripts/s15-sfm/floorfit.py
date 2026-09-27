# planar odometry from tracked floor-contact points: camera (x, z, yaw) per frame, one horizon row (pitch) and roll,
# height 0.33, fixed focal (fov 60); points static on the floor.
import numpy as np, json, sys
from scipy.optimize import least_squares
W, H = 2206, 946; K = (H / 2) / np.tan(np.radians(30)); HC = 0.33
def project(Pw, cam, pitch, roll):
    x, z, yaw = cam
    cy, sy = np.cos(yaw), np.sin(yaw); cp, sp = np.cos(pitch), np.sin(pitch)
    f = np.array([sy * cp, sp, cy * cp]); r = np.array([cy, 0, -sy]); u = np.array([-sy * sp, cp, -cy * sp])
    cr, sr = np.cos(roll), np.sin(roll); r2 = r * cr - u * sr; u2 = r * sr + u * cr
    d = Pw - np.array([x, HC, z])
    zc = d @ f
    return np.stack([W / 2 + (d @ r2) * K / zc, H / 2 - (d @ u2) * K / zc], -1), zc
def fit(obs, frames, speed0=0.08, fix_pitch=None):
    # obs: list of (frame_index, point_index, x, y)
    nF = len(frames); nP = 1 + max(o[1] for o in obs)
    def unpack(p):
        cams = np.vstack([[0, 0, 0], p[:3 * (nF - 1)].reshape(nF - 1, 3)])
        o = 3 * (nF - 1); pitch = p[o] if fix_pitch is None else fix_pitch; roll = p[o + 1]; pts = p[o + 2:].reshape(nP, 2)
        return cams, pitch, roll, pts
    def res(p):
        cams, pitch, roll, pts = unpack(p)
        r = []
        for fi, pi, x, y in obs:
            P = np.array([pts[pi][0], 0.0, pts[pi][1]])
            q, zc = project(P[None], cams[fi], pitch, roll)
            r += [q[0][0] - x, q[0][1] - y]
        # smoothness of camera path (second differences), weak
        sm = []
        for i in range(1, nF - 1): sm += list((cams[i + 1] - 2 * cams[i] + cams[i - 1]) * np.array([300, 300, 3000]))
        return np.array(r + sm)
    p0 = []
    for i in range(1, nF): p0 += [0, speed0 * i, 0]
    p0 += [np.radians(-5), 0]
    # init points from frame-0 camera
    for pi in range(nP):
        o = [q for q in obs if q[1] == pi][0]
        p0 += [0.0, 1.5]
    p0 = np.array(p0, float)
    # better point init: back-project with the initial camera at its first observation
    cams, pitch, roll, pts = unpack(p0)
    for pi in range(nP):
        fi, _, x, y = [q for q in obs if q[1] == pi][0]
        m = (y - H / 2) / K
        zc = HC / max(0.02, np.tan(-pitch + np.arctan(m)))
        X = (x - W / 2) / K * zc
        p0[3 * (nF - 1) + 2 + 2 * pi:3 * (nF - 1) + 4 + 2 * pi] = [cams[fi][0] + X, cams[fi][1] + zc]
    r = least_squares(res, p0, loss='soft_l1', f_scale=4)
    cams, pitch, roll, pts = unpack(r.x)
    n = 2 * len(obs); rr = r.fun[:n].reshape(-1, 2)
    return cams, pitch, roll, pts, np.hypot(rr[:, 0], rr[:, 1])
if __name__ == '__main__':
    d = json.load(open(sys.argv[1])); spec = json.loads(sys.argv[2])   # spec: {point_index_in_track: [f0, f1]}
    frames = d['frames']; fidx = {f: i for i, f in enumerate(frames)}
    obs = []; pmap = {}
    for k, (a, b) in spec.items():
        k = int(k); pmap.setdefault(k, len(pmap))
        for f in frames:
            if a <= f <= b: x, y = d['T'][str(f)][k]; obs.append((fidx[f], pmap[k], x, y))
    used = sorted({o[0] for o in obs}); frames2 = [frames[i] for i in used]; remap = {i: j for j, i in enumerate(used)}
    obs = [(remap[a], b, x, y) for a, b, x, y in obs]
    for fp in ([None] if len(sys.argv) < 4 else [np.radians(float(v)) for v in sys.argv[3].split(',')]):
        cams, pitch, roll, pts, e = fit(obs, frames2, fix_pitch=fp)
        print(f'pitch {np.degrees(pitch):+.2f} deg (horizon y {H/2 - K*np.tan(pitch):.0f}) roll {np.degrees(roll):+.2f}  err med {np.median(e):.1f} p90 {np.percentile(e,90):.1f}')
        for f, c in zip(frames2, cams): print(f'  {f/25:.2f} x={c[0]:+.3f} z={c[1]:+.3f} yaw={np.degrees(c[2]):+.2f}')
        print('  pts', np.round(pts, 2).tolist())
